import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, DeviceEventEmitter, NativeModules } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { ReservationSlot } from '@encanto/shared';
import type { CreateReservationResult } from '../services/reservations.service';
import { TransientNotice } from '../components/feedback/ContextOverlay';

export type ReservationStep = 'visit' | 'time' | 'order' | 'review' | 'sent';
export type DraftReceipt = { uri: string; fileName: string; type: string; copied?: boolean };
export type ReservationFields = {
  step: ReservationStep; date: string; people: string; slot: ReservationSlot | null;
  quantities: Record<string, number>; note: string; result: CreateReservationResult | null;
};
type Persisted = { fields?: ReservationFields; receipt?: DraftReceipt };
type DraftStore = {
  ready: boolean; saved: Persisted; openRequested: boolean;
  saveFields: (fields: ReservationFields) => Promise<void>;
  saveReceipt: (asset: DraftReceipt) => Promise<void>;
  clearReceipt: (fileName: string) => Promise<void>;
  reset: () => Promise<void>;
  consumeOpen: () => void;
};
type ReceiptBridge = {
  peek: (forAccount: boolean) => Promise<{ receipt?: DraftReceipt; error: boolean }>;
  acknowledge: (fileName: string) => Promise<void>;
  save: (uri: string) => Promise<DraftReceipt>;
  remove: (fileName: string) => Promise<void>;
};
export const receiptBridge = NativeModules.EncantoReceiptShare as ReceiptBridge | undefined;
const noop = async () => {};
const Context = createContext<DraftStore>({
  ready: true, saved: {}, openRequested: false, saveFields: noop, saveReceipt: noop, clearReceipt: noop,
  consumeOpen: () => {}, reset: noop,
});

const storageKey = (scope: string) => `encanto.reservation-draft.v1/${encodeURIComponent(scope)}`;
const removeLocal = (receipt?: DraftReceipt) => {
  if (receipt?.copied) void receiptBridge?.remove(receipt.fileName).catch(() => {});
};

// El borrador se aísla por cuenta, restaurante y servidor. La navegación conserva su estado al iniciar sesión.
export function ReservationDraftProvider({ scope, authLoading, canOpen, onOpen, children }: {
  scope: string | null; authLoading: boolean; canOpen: boolean; onOpen: () => void; children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const session = useMemo(() => ({ snapshot: {} as Persisted, write: Promise.resolve() }), [scope]);
  const [view, setView] = useState({ session, snapshot: session.snapshot, ready: !scope });
  const [openSession, setOpenSession] = useState<typeof session | null>(null);
  const ready = scope === null || (view.session === session && view.ready);
  const saved = view.session === session ? view.snapshot : session.snapshot;
  const openRequested = openSession === session;
  const [notice, setNotice] = useState<string | null>(null);
  const guestFields = useRef<ReservationFields | undefined>(undefined);
  const guestNotified = useRef('');
  const clearNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (!scope) {
      setView({ session, snapshot: session.snapshot, ready: true });
      return undefined;
    }
    let current = true;
    void AsyncStorage.getItem(storageKey(scope)).then(raw => {
      if (!current) return;
      if (raw) {
        const loaded: unknown = JSON.parse(raw);
        if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) session.snapshot = loaded as Persisted;
      }
    }).catch(() => {}).finally(() => {
      if (!current) return;
      if (guestFields.current && !session.snapshot.fields) session.snapshot = { ...session.snapshot, fields: guestFields.current };
      guestFields.current = undefined;
      setView({ session, snapshot: session.snapshot, ready: true });
    });
    return () => { current = false; };
  }, [scope, session]);

  const change = useCallback((update: (previous: Persisted) => Persisted) => {
    const next = update(session.snapshot);
    session.snapshot = next;
    setView(previous => previous.session === session ? { ...previous, snapshot: next } : previous);
    if (!scope) {
      guestFields.current = next.fields;
      return Promise.resolve();
    }
    const write = session.write.catch(() => {}).then(() => AsyncStorage.setItem(storageKey(scope), JSON.stringify(next)));
    session.write = write;
    return write;
  }, [scope, session]);

  const saveFields = useCallback((fields: ReservationFields) => change(previous => ({ ...previous, fields })), [change]);
  const saveReceipt = useCallback(async (receipt: DraftReceipt) => {
    const previous = session.snapshot.receipt;
    await change(state => ({ ...state, receipt }));
    if (previous?.fileName !== receipt.fileName) removeLocal(previous);
  }, [change, session]);
  const clearReceipt = useCallback(async (fileName: string) => {
    const receipt = session.snapshot.receipt;
    if (receipt?.fileName !== fileName) return;
    await change(state => ({ ...state, receipt: undefined }));
    removeLocal(receipt);
  }, [change, session]);
  const reset = useCallback(async () => {
    const receipt = session.snapshot.receipt;
    await change(() => ({}));
    removeLocal(receipt);
  }, [change, session]);
  const consumeOpen = useCallback(() => setOpenSession(null), []);

  useEffect(() => {
    if (!receiptBridge || !ready || authLoading) return;
    let active = true;
    let work = Promise.resolve();
    const receive = () => {
      work = work.then(async () => {
        const incoming = await receiptBridge!.peek(!!scope);
        if (!active) return;
        if (incoming.error) setNotice(t('reservations.incomingReceiptError'));
        if (!incoming.receipt) return;
        if (!scope) {
          if (guestNotified.current !== incoming.receipt.fileName) {
            guestNotified.current = incoming.receipt.fileName;
            setNotice(t('reservations.incomingReceiptGuest'));
          }
          return;
        }
        await saveReceipt({ ...incoming.receipt, copied: true });
        await receiptBridge!.acknowledge(incoming.receipt.fileName);
        if (active) {
          setNotice(t('reservations.incomingReceiptSaved'));
          setOpenSession(session);
        }
      }).catch(() => { if (active) setNotice(t('reservations.incomingReceiptError')); });
    };
    const events = DeviceEventEmitter.addListener('EncantoIncomingReceipt', receive);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') receive(); });
    receive();
    return () => { active = false; events.remove(); foreground.remove(); };
  }, [ready, authLoading, scope, session, saveReceipt, t]);

  useEffect(() => {
    if (openRequested && canOpen) onOpen();
  }, [openRequested, canOpen, onOpen]);

  return (
    <Context.Provider value={{ ready, saved, saveFields, saveReceipt, clearReceipt, reset, openRequested, consumeOpen }}>
      {children}
      <TransientNotice message={notice} clear={clearNotice} top={insets.top + 4} />
    </Context.Provider>
  );
}

export const useReservationDraft = () => useContext(Context);
