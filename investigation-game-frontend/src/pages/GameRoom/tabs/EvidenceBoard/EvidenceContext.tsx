import { createContext, useContext } from 'react';

export const EvidenceContext = createContext({
  isFullscreen: false
});

export const useEvidenceContext = () => useContext(EvidenceContext);