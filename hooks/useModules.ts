/**
 * Custom hook for managing module data fetching and state.
 *
 * Provides centralized module loading with error handling and loading states.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Module } from '../types';

interface UseModulesResult {
  modules: Module[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useModules(autoLoad: boolean = true): UseModulesResult {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/modules');

      if (!response.ok) {
        throw new Error(`Failed to fetch modules: ${response.statusText}`);
      }

      const data = await response.json();
      setModules(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load modules';
      setError(errorMessage);
      console.error('Error fetching modules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      fetchModules();
    }
  }, [autoLoad, fetchModules]);

  return {
    modules,
    loading,
    error,
    refetch: fetchModules
  };
}
