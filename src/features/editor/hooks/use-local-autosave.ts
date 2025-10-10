import { useEffect, useRef, useCallback, useState } from 'react';
import { useLayersStore } from './use-layer-store';
import { createSnapshot, saveToLocalStorage, loadFromLocalStorage, restoreSnapshot } from '../utils/snapshot';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseLocalAutosaveReturn {
  status: SaveStatus;
  lastSaved: Date | null;
  saveManually: () => Promise<void>;
  loadSnapshot: () => Promise<void>;
  hasSnapshot: boolean;
}

export const useLocalAutosave = (): UseLocalAutosaveReturn => {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasSnapshot, setHasSnapshot] = useState<boolean>(false);


  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // Get store state and methods
  const {
    layers,
    canvas,
    operationHistory,
    currentTransaction,
    restoreFromSnapshot
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

  // Load snapshot function with stable dependencies
  const loadSnapshot = useCallback(async () => {
    try {
      const snapshot = loadFromLocalStorage();
      const currentCanvas = canvas;

      if (snapshot && currentCanvas) {
        setStatus('saving'); // Show loading state

        const success = await restoreSnapshot(
          snapshot,
          currentCanvas,
          restoreFromSnapshot
        );

        if (success) {
          setStatus('saved');
          setLastSaved(new Date(snapshot.lastModified));

          // Reset to idle after showing success
          setTimeout(() => {
            setStatus('idle');
          }, 2000);
        } else {
          setStatus('error');
          setTimeout(() => {
            setStatus('idle');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Failed to load snapshot:', error);
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    }
  }, [canvas, restoreFromSnapshot]); // Use hook values, not get()

  // Watch for changes that should trigger autosave
  useEffect(() => {
    // Watch operation history length to detect new operations
    const currentOperationsLength = operationHistory.operations.length;

    // Skip initial render and only trigger on actual changes
    if (currentOperationsLength > 0) {
      triggerSave();
    }
  }, [operationHistory.operations.length, triggerSave]);

  // Track auto-load state
  const autoLoadAttemptedRef = useRef(false);
  const autoLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUrlRef = useRef<string>('');

  // Reset auto-load flag on navigation to editor
  useEffect(() => {
    const currentUrl = window.location.pathname;
    const isEditorPage = currentUrl.includes('/editor/');

    // Reset auto-load flag when navigating to editor from different page
    if (isEditorPage && lastUrlRef.current && lastUrlRef.current !== currentUrl) {
      autoLoadAttemptedRef.current = false;
    }

    // Always update the current URL
    lastUrlRef.current = currentUrl;
  }, [canvas]); // Re-run when canvas changes (indicates new editor instance)

  // Enhanced canvas ready check
  const isCanvasReady = useCallback((canvasToCheck: fabric.Canvas | null): boolean => {
    if (!canvasToCheck) return false;
    try {
      // Check if canvas has essential methods and properties
      return !!(
        canvasToCheck.getContext &&
        canvasToCheck.getObjects &&
        canvasToCheck.width &&
        canvasToCheck.height &&
        canvasToCheck.getContext() && // Actually call getContext to verify it works
        Array.isArray(canvasToCheck.getObjects()) // Verify getObjects returns an array
      );
    } catch {
      return false;
    }
  }, []);

  // Canvas-Store sync validation
  const validateCanvasSync = useCallback((canvasToCheck: fabric.Canvas | null, layersToCheck: typeof layers) => {
    if (!canvasToCheck) return { hasSync: false, canvasObjects: 0, layerObjects: 0 };

    // Count non-workspace canvas objects
    const canvasObjects = canvasToCheck.getObjects().filter(obj => obj.name !== "clip");

    // Count layers that should have canvas objects (non-base layers with imageDataUrl)
    const layersWithImages = layersToCheck.filter(layer =>
      layer.id !== 'base-canvas' && layer.imageDataUrl
    );

    const canvasObjectCount = canvasObjects.length;
    const expectedObjectCount = layersWithImages.length;

    return {
      hasSync: canvasObjectCount === expectedObjectCount && expectedObjectCount > 0,
      canvasObjects: canvasObjectCount,
      layerObjects: expectedObjectCount,
      isEmpty: canvasObjectCount === 0 && expectedObjectCount > 0
    };
  }, []);

  // Auto-load with canvas ready polling
  const attemptAutoLoad = useCallback(async () => {
    const snapshot = loadFromLocalStorage();
    setHasSnapshot(!!snapshot);

    if (!snapshot) {
      autoLoadAttemptedRef.current = true;
      return;
    }

    // Use the canvas and layers from the hook scope, not get()
    const currentCanvas = canvas;
    const currentLayers = layers;

    // Check if canvas is ready
    if (!isCanvasReady(currentCanvas)) {
      return; // Don't mark as attempted - allow retry
    }

    // Validate canvas-store sync
    const syncStatus = validateCanvasSync(currentCanvas, currentLayers);

    // Enhanced auto-load conditions:
    // 1. Traditional: Few layers in store AND snapshot has content
    // 2. New: Layers exist but canvas is empty (navigation case)
    const hasMinimalLayers = currentLayers.length <= 1;
    const snapshotHasContent = snapshot.layers.length > 1;
    const canvasIsEmpty = syncStatus.isEmpty;

    const shouldAutoLoad = (hasMinimalLayers && snapshotHasContent) || canvasIsEmpty;

    if (shouldAutoLoad) {
      autoLoadAttemptedRef.current = true; // Mark attempted when actually doing auto-load
      await loadSnapshot();
    } else {
      setLastSaved(new Date(snapshot.lastModified));
      autoLoadAttemptedRef.current = true; // Mark attempted when conditions aren't met
    }
  }, [canvas, layers, loadSnapshot, isCanvasReady, validateCanvasSync]);

  // Auto-load effect with polling for canvas ready
  useEffect(() => {
    // If already attempted successfully, skip
    if (autoLoadAttemptedRef.current) {
      return;
    }

    // Start polling for canvas ready state
    const pollForCanvasReady = () => {
      attemptAutoLoad().catch(error => {
        console.error('Auto-load error:', error);
        autoLoadAttemptedRef.current = true;
      });

      // If not attempted yet, retry in 500ms (for up to 10 seconds)
      if (!autoLoadAttemptedRef.current) {
        autoLoadTimeoutRef.current = setTimeout(pollForCanvasReady, 500);
      }
    };

    // Start immediately
    pollForCanvasReady();

    // Cleanup timeout after 10 seconds
    const cleanupTimeout = setTimeout(() => {
      if (autoLoadTimeoutRef.current) {
        clearTimeout(autoLoadTimeoutRef.current);
        autoLoadTimeoutRef.current = null;
      }
      if (!autoLoadAttemptedRef.current) {
        autoLoadAttemptedRef.current = true;
      }
    }, 10000);

    return () => {
      if (autoLoadTimeoutRef.current) {
        clearTimeout(autoLoadTimeoutRef.current);
      }
      clearTimeout(cleanupTimeout);
    };
  }, [attemptAutoLoad]); // Only run once or when attemptAutoLoad changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (autoLoadTimeoutRef.current) {
        clearTimeout(autoLoadTimeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    lastSaved,
    saveManually,
    loadSnapshot,
    hasSnapshot
  };
};