import { createContext, useContext, type ReactNode } from 'react';

interface TargetingContextType {
  activeTarget: string | number | null;
  toggleTarget: (id: string | number) => void;
}

const TargetingContext = createContext<TargetingContextType | null>(null);

export const TargetingProvider = ({ activeTarget, toggleTarget, children }: TargetingContextType & { children: ReactNode }) => (
  <TargetingContext.Provider value={{ activeTarget, toggleTarget }}>
    {children}
  </TargetingContext.Provider>
);

export const useTargeting = () => useContext(TargetingContext);