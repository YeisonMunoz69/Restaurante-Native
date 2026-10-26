import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { MenuDish } from '@encanto/shared';

export type DraftLine = { dish: MenuDish; cantidad: number };
type Draft = {
  fecha: string | null; lines: DraftLine[]; pending: boolean; requestId: number;
  setQuantity: (dish: MenuDish, cantidad: number, fecha: string) => void;
  clear: () => void; request: () => void; consume: () => void;
};
const empty: Draft = { fecha: null, lines: [], pending: false, requestId: 0, setQuantity: () => {}, clear: () => {}, request: () => {}, consume: () => {} };
const Context = createContext<Draft>(empty);

// Conservo el borrador entre pestañas y primer login; no mezclo sedes ni cuentas anteriores.
export function OrderDraftProvider({ children, scope, ownerId }: { children: React.ReactNode; scope: string; ownerId?: string }) {
  const [state, setState] = useState<{ fecha: string | null; lines: DraftLine[] }>({ fecha: null, lines: [] });
  const [pending, setPending] = useState(false);
  const [requestId, setRequestId] = useState(0);
  const previous = useRef({ scope, ownerId });
  const clear = useCallback(() => { setState({ fecha: null, lines: [] }); setPending(false); }, []);
  useEffect(() => {
    if (previous.current.scope !== scope || (previous.current.ownerId && previous.current.ownerId !== ownerId)) clear();
    previous.current = { scope, ownerId };
  }, [scope, ownerId, clear]);
  const setQuantity = useCallback((dish: MenuDish, cantidad: number, fecha: string) => {
    if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > 99) return;
    setState(current => ({
      fecha,
      lines: [...current.lines.filter(line => line.dish.id !== dish.id), ...(cantidad ? [{ dish, cantidad }] : [])],
    }));
  }, []);
  const request = useCallback(() => { setPending(true); setRequestId(id => id + 1); }, []);
  const consume = useCallback(() => setPending(false), []);
  const value = useMemo(() => ({ ...state, pending, requestId, setQuantity, clear, request, consume }), [state, pending, requestId, setQuantity, clear, request, consume]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useOrderDraft = () => useContext(Context);
