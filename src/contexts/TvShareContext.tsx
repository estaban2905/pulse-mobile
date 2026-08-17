import React, { createContext, useContext, useState } from 'react';

interface TvShareValue {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
}

const TvShareContext = createContext<TvShareValue | null>(null);

export function TvShareProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return (
    <TvShareContext.Provider value={{ isVisible, show, hide }}>
      {children}
    </TvShareContext.Provider>
  );
}

export function useTvShare(): TvShareValue {
  const value = useContext(TvShareContext);
  if (!value) throw new Error('useTvShare debe usarse dentro de TvShareProvider.');
  return value;
}