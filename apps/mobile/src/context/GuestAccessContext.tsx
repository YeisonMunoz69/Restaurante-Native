import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAccess } from '../components/GoogleAccess';

type Entry = 'cart' | 'settings';
const GuestAccessContext = createContext<((entry: Entry) => void)>(() => {});

// Mantengo la misma Carta o Ajustes detrás del acceso, incluso al completar la sesión.
export function GuestAccessProvider({ authenticated, children }: {
  authenticated: boolean;
  children: React.ReactNode;
}) {
  const [entry, setEntry] = useState<Entry | null>(null);
  useEffect(() => {
    if (authenticated) setEntry(null);
  }, [authenticated]);

  return (
    <GuestAccessContext.Provider value={setEntry}>
      {children}
      {!authenticated && entry && <GoogleAccess entry={entry} onClose={() => setEntry(null)} />}
    </GuestAccessContext.Provider>
  );
}

export const useGuestAccess = () => useContext(GuestAccessContext);
