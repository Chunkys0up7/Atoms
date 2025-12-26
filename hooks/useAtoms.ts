/**
 * Custom hook for managing atom data fetching and state.
 *
 * Provides centralized atom loading with error handling and loading states.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Atom } from '../types';

interface UseAtomsResult {
  atoms: Atom[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAtoms(autoLoad: boolean = true): UseAtomsResult {
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAtoms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/atoms?summary_only=true&limit=1000');

      if (!response.ok) {
        throw new Error(`Failed to fetch atoms: ${response.statusText}`);
      }

      const data = await response.json();
      setAtoms(data.atoms || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load atoms';
      setError(errorMessage);
      console.error('Error fetching atoms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      fetchAtoms();
    }
  }, [autoLoad, fetchAtoms]);

  return {
    atoms,
    loading,
    error,
    refetch: fetchAtoms
  };
}
