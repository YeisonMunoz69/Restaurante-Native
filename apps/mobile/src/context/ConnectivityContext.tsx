import React, { createContext, useContext } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';

const ConnectivityContext = createContext(true);

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, isInternetReachable } = useNetInfo();
  const online = isConnected === true && isInternetReachable !== false;
  return <ConnectivityContext.Provider value={online}>{children}</ConnectivityContext.Provider>;
}

export const useOnline = () => useContext(ConnectivityContext);
