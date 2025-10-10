import { useEffect, useRef, useCallback, useState } from 'react';
import { useLayersStore } from './use-layer-store';
import { createSnapshot, saveToLocalStorage, loadFromLocalStorage, EditorSnapshot } from '../utils/snapshot';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseLocalAutosaveReturn {
  status: SaveStatus;
  lastSaved: Date | null;
  saveManually: () => Promise<void>;
  loadSnapshot: () => Promise<void>;
}

export const useLocalAutosave = (): UseLocalAutosaveReturn => {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // Get store state and methods
  const {
    layers,
    canvas,
    operationHistory,
    currentTransaction,
    commitTransaction
  } = useLayersStore();

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    // Don't save during transactions or undo/redo operations
    if (currentTransaction || useLayersStore.getState().isUndoRedoInProgress) {
      return;
    }

    setStatus('saving');

    try {
      const snapshot = createSnapshot(layers, canvas);
      const success = await saveToLocalStorage(snapshot);

      if (success) {
        setStatus('saved');
        setLastSaved(new Date());
        lastSaveTimeRef.current = Date.now();
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Autosave failed:', error);
      setStatus('error');
    }

    // Reset to idle after showing success/error for 2 seconds
    setTimeout(() => {
      setStatus('idle');
    }, 2000);
  }, [layers, canvas, currentTransaction]);

  // Trigger debounced save
  const triggerSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debouncedSave();
    }, 1500); // 1.5 second debounce
  }, [debouncedSave]);

  // Manual save function
  const saveManually = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await debouncedSave();
  }, [debouncedSave]);

  // Load snapshot function
  const loadSnapshot = useCallback(async () => {
    try {
      const snapshot = loadFromLocalStorage();
      if (snapshot) {
        // TODO: Implement restoration logic in next phase
        console.log('Snapshot loaded:', snapshot);
      }
    } catch (error) {
      console.error('Failed to load snapshot:', error);
    }
  }, []);

  // Watch for changes that should trigger autosave
  useEffect(() => {
    // Watch operation history length to detect new operations
    const currentOperationsLength = operationHistory.operations.length;

    // Skip initial render and only trigger on actual changes
    if (currentOperationsLength > 0) {
      triggerSave();
    }
  }, [operationHistory.operations.length, triggerSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    status,
    lastSaved,
    saveManually,
    loadSnapshot
  };
};