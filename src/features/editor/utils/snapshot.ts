import { Layer, LayerType, FabricObjectWithLayer, FabricWorkspace } from "../types";
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

// Helper function to get canvas object data for a layer
const getCanvasObjectData = (canvas: fabric.Canvas | null, layerId: string) => {
  if (!canvas) {
    return { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
  }

  // Find the first canvas object that belongs to this layer
  const layerObjects = canvas.getObjects().filter(obj => {
    const layerAwareObj = obj as FabricObjectWithLayer;
    return layerAwareObj.layerId === layerId && obj.name !== "clip";
  });

  if (layerObjects.length === 0) {
    return { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
  }

  // For multiple objects, use the first one or calculate bounds
  const firstObject = layerObjects[0];
  return {
    x: firstObject.left || 0,
    y: firstObject.top || 0,
    width: firstObject.width || 100,
    height: firstObject.height || 100,
    rotation: firstObject.angle || 0
  };
};

// Create snapshot from current Zustand state
export const createSnapshot = (
  layers: Layer[],
  canvas: fabric.Canvas | null
): EditorSnapshot => {
  const canvasWidth = canvas?.width || 800;
  const canvasHeight = canvas?.height || 600;
  const backgroundColor = canvas?.backgroundColor as string || '#ffffff';

  return {
    version: 1,
    lastModified: Date.now(),
    canvas: {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor
    },
    layers: layers.map((layer, index) => {
      const objectData = getCanvasObjectData(canvas, layer.id);
      return {
        id: layer.id,
        name: layer.name,
        type: layer.type,
        src: layer.imageDataUrl, // Base64 string already stored
        x: objectData.x,
        y: objectData.y,
        width: objectData.width,
        height: objectData.height,
        rotation: objectData.rotation,
        visible: layer.isVisible,
        zIndex: index
      };
    })
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
      const sizeInMB = new Blob([jsonString]).size / (1024 * 1024);

      // Check if we're exceeding 5MB limit
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

    if (!jsonString) {
      return null;
    }

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

// Restore snapshot to canvas and layer store
export const restoreSnapshot = async (
  snapshot: EditorSnapshot,
  canvas: fabric.Canvas,
  updateLayerStore: (layers: Layer[], canvasConfig: { width: number; height: number; backgroundColor: string }) => void
): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Clear existing canvas
      canvas.clear();

      // Restore canvas properties
      canvas.setDimensions({
        width: snapshot.canvas.width,
        height: snapshot.canvas.height
      });
      canvas.setBackgroundColor(snapshot.canvas.backgroundColor, () => {
        canvas.renderAll();
      });

      // Recreate workspace (clipping rectangle)
      const workspace = new fabric.Rect({
        name: "clip",
        width: snapshot.canvas.width,
        height: snapshot.canvas.height,
        fill: snapshot.canvas.backgroundColor,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false
      }) as FabricWorkspace;

      canvas.add(workspace);
      canvas.sendToBack(workspace);

      // Convert snapshot layers back to Layer format
      const restoredLayers: Layer[] = snapshot.layers.map(snapshotLayer => ({
        id: snapshotLayer.id,
        name: snapshotLayer.name,
        type: snapshotLayer.type as LayerType,
        imageDataUrl: snapshotLayer.src,
        referenceImageUrls: [],
        maskDataUrl: null,
        isVisible: snapshotLayer.visible,
        isActive: false,
        prompt: "",
        objects: [], // Will be populated as objects are added to canvas
        children: []
      }));

      // Sort layers by zIndex to restore in correct order
      const sortedLayers = [...snapshot.layers].sort((a, b) => a.zIndex - b.zIndex);

      let loadedCount = 0;
      const totalLayers = sortedLayers.filter(layer => layer.src).length;

      // If no image layers to restore, complete immediately
      if (totalLayers === 0) {
        updateLayerStore(restoredLayers, snapshot.canvas);
        resolve(true);
        return;
      }

      // Restore each layer as a Fabric.js image
      sortedLayers.forEach((snapshotLayer) => {
        if (!snapshotLayer.src) {
          loadedCount++;
          if (loadedCount === totalLayers) {
            updateLayerStore(restoredLayers, snapshot.canvas);
            resolve(true);
          }
          return;
        }

        // Create Fabric.js image from Base64 data URL
        fabric.Image.fromURL(snapshotLayer.src, (img) => {
          // Set object properties from snapshot
          img.set({
            left: snapshotLayer.x,
            top: snapshotLayer.y,
            width: snapshotLayer.width,
            height: snapshotLayer.height,
            angle: snapshotLayer.rotation,
            visible: snapshotLayer.visible,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            cornerColor: '#FFF',
            borderColor: '#3b82f6',
            cornerSize: 8,
            transparentCorners: false
          });

          // Tag with layer ID
          const layerAwareImg = img as FabricObjectWithLayer;
          layerAwareImg.layerId = snapshotLayer.id;

          // Add to canvas
          canvas.add(img);

          loadedCount++;

          // Check if all images are loaded
          if (loadedCount === totalLayers) {
            canvas.renderAll();
            updateLayerStore(restoredLayers, snapshot.canvas);
            resolve(true);
          }
        }, {
          crossOrigin: 'anonymous'
        });
      });

    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      resolve(false);
    }
  });
};