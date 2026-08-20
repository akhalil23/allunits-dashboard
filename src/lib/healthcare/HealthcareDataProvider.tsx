import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHealthcareDataset } from './data';
import { EMPTY_HC_DATASET, type HCDataset } from './model';

interface Ctx {
  data: HCDataset;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const HealthcareDataContext = createContext<Ctx>({
  data: EMPTY_HC_DATASET, isLoading: false, error: null, refetch: () => {},
});

export function HealthcareDataProvider({ children }: { children: ReactNode }) {
  const q = useQuery({
    queryKey: ['healthcare-dataset'],
    queryFn: fetchHealthcareDataset,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <HealthcareDataContext.Provider
      value={{
        data: q.data ?? EMPTY_HC_DATASET,
        isLoading: q.isLoading,
        error: (q.error as Error) ?? null,
        refetch: () => { void q.refetch(); },
      }}
    >
      {children}
    </HealthcareDataContext.Provider>
  );
}

export const useHealthcareData = () => useContext(HealthcareDataContext);
