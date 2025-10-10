import { Layer, LayerType } from "../types";
import { fabric } from "fabric";

// EditorSnapshot interface matching requirements
export interface EditorSnapshot {
  version: 1;
  lastModified: number;
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  layers: SnapshotLayer[];
}

export interface SnapshotLayer {
  id: string;
  name: string;
  type: string;
  src: string | null; // Base64 data URL
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  zIndex: number;
}

// Create snapshot from current Zustand state
export const createSnapshot = (
  layers: Layer[],
  canvas: fabric.Canvas | null
): EditorSnapshot => {
  return {
    version: 1,
    lastModified: Date.now(),
    canvas: {
      width: canvas?.width || 800,
      height: canvas?.height || 600,
      backgroundColor: canvas?.backgroundColor as string || '#ffffff'
    },
    layers: layers.map((layer, index) => ({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      src: layer.imageDataUrl, // Base64 string already stored
      x: 0, // Will be updated from objects if available
      y: 0,
      width: 100, // Default values
      height: 100,
      rotation: 0,
      visible: layer.isVisible,
      zIndex: index
    }))
  };
};

// Validate snapshot structure
export const validateSnapshot = (data: any): data is EditorSnapshot => {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== 1) return false;
  if (!data.canvas || !data.layers || !Array.isArray(data.layers)) return false;

  // Basic canvas validation
  const canvas = data.canvas;
  if (typeof canvas.width !== 'number' || typeof canvas.height !== 'number') return false;

  // Basic layers validation
  return data.layers.every((layer: any) =>
    typeof layer.id === 'string' &&
    typeof layer.name === 'string' &&
    typeof layer.visible === 'boolean'
  );
};

// localStorage functions
const STORAGE_KEY = 'project_snapshot';

export const saveToLocalStorage = async (snapshot: EditorSnapshot): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const jsonString = JSON.stringify(snapshot);

      // Check if we're exceeding 5MB limit (rough estimate)
      const sizeInMB = new Blob([jsonString]).size / (1024 * 1024);
      if (sizeInMB > 5) {
        console.warn('Snapshot exceeds 5MB limit, may fail to save');
      }

      // Use setTimeout to make it async and non-blocking
      setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, jsonString);
          resolve(true);
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
          resolve(false);
        }
      }, 0);
    } catch (error) {
      console.error('Failed to serialize snapshot:', error);
      resolve(false);
    }
  });
};

export const loadFromLocalStorage = (): EditorSnapshot | null => {
  try {
    const jsonString = localStorage.getItem(STORAGE_KEY);
    if (!jsonString) return null;

    const data = JSON.parse(jsonString);
    if (!validateSnapshot(data)) {
      console.warn('Invalid snapshot format in localStorage');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

export const clearLocalStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};