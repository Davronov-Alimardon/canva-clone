// src/store/useLayersStore.ts
import { fabric } from "fabric";
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Layer, LayerType, LayersState, LayerObjects, LayerObjectData, LayerAwareFabricObject } from "../types";

const MAX_HISTORY = 20;

export const BASE_CANVAS_ID = "base-canvas";

// Create initial global layer
const initialGlobalLayer: Layer = {
  id: BASE_CANVAS_ID,
  name: "Base Canvas",
  type: LayerType.Global,
  imageDataUrl: null,
  referenceImageUrls: [],
  maskDataUrl: null,
  isVisible: true,
  isActive: true,
  prompt: "",
  objects: [],
  children: []
};

export const useLayersStore = create<LayersState>((set, get) => ({
  // Initial state with one global layer
  layers: [initialGlobalLayer],
  activeGlobalLayerId: initialGlobalLayer.id,
  history: {},
  canvas: null,
  selectedObjects: [], 
  
  // ========== Canvas management ==========
  setCanvas: (canvas) => set({ canvas }),

  // ========== Hierarchical Layer Management ==========
  addGlobalLayer: (name = `Layer ${get().layers.filter(l => l.type === LayerType.Global).length}`) => {
    const newLayer: Layer = {
      id: uuidv4(),
      name,
      type: LayerType.Global,
      imageDataUrl: null,
      referenceImageUrls: [],
      maskDataUrl: null,
      isVisible: true,
      isActive: false, // New globals start inactive
      prompt: "",
      objects: [],
      children: []
    };
    
    set(state => {
    const baseCanvasIndex = state.layers.findIndex(l => l.id === BASE_CANVAS_ID);
    const newLayers = [...state.layers];
    
    if (baseCanvasIndex !== -1) {
      newLayers.splice(baseCanvasIndex, 0, newLayer);
    } else {
      newLayers.push(newLayer);
    }
    
    return {
      layers: newLayers,
      activeGlobalLayerId: newLayer.id, 
    };
  });
  },

  addSectionalLayer: (parentGlobalId: string, name = `Inpaint ${Date.now()}`) => {
    // Verify parent exists and is global
    const parentLayer = get().layers.find(l => l.id === parentGlobalId && l.type === LayerType.Global);
    if (!parentLayer) {
      console.warn('Cannot add sectional layer: parent global layer not found');
      return;
    }

     // Count existing sectional layers for this parent
    const existingSectionals = get().layers.filter(l => 
    l.type === LayerType.Sectional && l.parentId === parentGlobalId
    );
    const nextNumber = existingSectionals.length + 1;

    const newLayer: Layer = {
      id: uuidv4(),
      name: `Inpaint ${nextNumber}`,
      type: LayerType.Sectional,
      parentId: parentGlobalId,
      imageDataUrl: null,
      referenceImageUrls: [],
      maskDataUrl: null,
      isVisible: true,
      prompt: "",
      objects: [],
    };
    
    set(state => ({
      layers: [...state.layers, newLayer]
    }));
  },

  getLayerTree: () => {
    const { layers } = get();
    const globals = layers.filter(l => l.type === LayerType.Global);
    const sectionals = layers.filter(l => l.type === LayerType.Sectional);
    
    return globals.map(global => ({
      ...global,
      children: sectionals.filter(s => s.parentId === global.id)
    }));
  },

  getActiveGlobalLayer: () => {
    const { layers, activeGlobalLayerId } = get();
    return layers.find(l => l.id === activeGlobalLayerId && l.type === LayerType.Global) || null;
  },

  setActiveGlobalLayer: (id: string): void => {
  const { canvas, layers } = get();
  
  if (!canvas) return;

  const globalLayers: Layer[] = layers.filter((layer: Layer): boolean => 
    layer.type === LayerType.Global
  );
  
  const newActiveLayer: Layer | undefined = globalLayers.find((layer: Layer): boolean => 
    layer.id === id
  );
  
  if (!newActiveLayer) return;

  // Update layer active states
  const updatedLayers: Layer[] = layers.map((layer: Layer): Layer => ({
    ...layer,
    isActive: layer.id === id && layer.type === LayerType.Global
  }));

  set({ 
    activeGlobalLayerId: id,
    layers: updatedLayers
  });

  // Update visibility
  if (canvas) {
    const allObjects: fabric.Object[] = canvas.getObjects();
    
    allObjects.forEach((obj: fabric.Object) => {
      const layerAwareObj = obj as LayerAwareFabricObject;
      const isWorkspace = obj.name === "clip";
      const objectLayerId = layerAwareObj.layerId;
      
      if (isWorkspace) {
        obj.set({ selectable: false, evented: false });
        canvas.sendToBack(obj);
      } else if (objectLayerId) {
        // Show objects from active layer, hide others
        const isFromActiveLayer = objectLayerId === id;
        obj.set({ 
          selectable: isFromActiveLayer,
          evented: isFromActiveLayer,
          visible: true
        });
      }
    });

    canvas.discardActiveObject();
    canvas.renderAll();
  }
},

  // ========== Delete Method ==========
  deleteLayer: (id: string) => {
    const { canvas } = get();

    if (canvas) {
    const objectsToRemove = canvas.getObjects().filter(obj => {
      const layerAwareObj = obj as LayerAwareFabricObject;
      return layerAwareObj.layerId === id;
    });
    
    objectsToRemove.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();

    canvas.isDrawingMode = false;
    canvas.selection = true; 
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move'; 

    canvas.renderAll();
  }

  // Then delete from store 
  set((state) => {
    const layerToDelete = state.layers.find(l => l.id === id);
    if (!layerToDelete) return state;

      // Cascade delete: if global layer, delete all its sectionals
      let layersToDelete = [id];
      if (layerToDelete.type === LayerType.Global) {
        const childSectionals = state.layers
          .filter(l => l.type === LayerType.Sectional && l.parentId === id)
          .map(l => l.id);
        layersToDelete = [...layersToDelete, ...childSectionals];
      }

      const newLayers = state.layers.filter(l => !layersToDelete.includes(l.id));
      const newHistory = { ...state.history };
      
      // Clean up history for deleted layers
      layersToDelete.forEach(layerId => {
        delete newHistory[layerId];
      });

      // Handle active layer reassignment if needed
      let newActiveGlobalId = state.activeGlobalLayerId;
      if (layerToDelete.type === LayerType.Global && layerToDelete.id === state.activeGlobalLayerId) {
        // Find another global layer to activate
        const otherGlobal = newLayers.find(l => l.type === LayerType.Global);
        newActiveGlobalId = otherGlobal?.id || '';
      }

      return {
        layers: newLayers,
        history: newHistory,
        activeGlobalLayerId: newActiveGlobalId,
      };
    });
  },

  // Add this to your useLayersStore
resetCanvasState: () => {
  const { canvas } = get();
  if (canvas) {
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    canvas.discardActiveObject();
    canvas.renderAll();
  }
},

  selectLayer: (id) => {
    const layer = get().layers.find(l => l.id === id);
    if (!layer) return;

    if (layer.type === LayerType.Global) {
      // Selecting a global layer makes it active
      get().setActiveGlobalLayer(id);
    }
  },

 // In useLayersStore, update reorderLayers:
reorderLayers: (reordered: Layer[]) => {
  const { canvas } = get();
  
  if (canvas) {
    // Get all objects except workspace
    const allObjects = canvas.getObjects().filter(obj => obj.name !== "clip");

     // Start with workspace at bottom
    const workspace = canvas.getObjects().find(obj => obj.name === "clip");
      if (workspace) {
        canvas.sendToBack(workspace);
      }
    
    // Reorder objects to match new layer order
    reordered.forEach((layer, index) => {
      const layerObjects = allObjects.filter(obj => {
        const layerAwareObj = obj as LayerAwareFabricObject;
        return layerAwareObj.layerId === layer.id;
      });
      
      // Move objects to correct z-position
      layerObjects.forEach(obj => {
        // Higher index in array = higher z-index (top of panel = top visually)
        const targetIndex = index + 1; // +1 to account for workspace
        canvas.moveTo(obj, targetIndex);
      });
    });
    
    canvas.renderAll();
  }
  
  set({ layers: reordered });
},

  // ========== Image related ==========
  addLayer: () => {
    get().addGlobalLayer();
  },

  tagObjectWithActiveLayer: (obj: fabric.Object): void => {
  const { activeGlobalLayerId } = get();
  const layerAwareObj = obj as LayerAwareFabricObject;
  layerAwareObj.layerId = activeGlobalLayerId;
},

  addMultipleImageLayers: async (files: File[]) => {
  const layerIds: string[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const id = uuidv4();
    layerIds.push(id);

    const newLayer: Layer = {
      id,
      name: file.name.replace(/\.[^/.]+$/, ""),
      type: LayerType.Global,
      imageDataUrl: dataUrl,
      referenceImageUrls: [],
      maskDataUrl: null,
      isVisible: true,
      isActive: false, // Start as inactive
      prompt: "",
      objects: [],
      children: []
    };

    // Add layer to store (inactive)
    set((state) => ({
      layers: [...state.layers, newLayer]
    }));

    // Add image to canvas
    const canvas = get().canvas;
    if (canvas?.getContext()) {
      fabric.Image.fromURL(dataUrl, (img) => {
        if (canvas?.getContext()) {
          const originalActiveLayerId = get().activeGlobalLayerId;
          
          set((state) => ({
            ...state,
            activeGlobalLayerId: id
          }));
          
          // Tag the object with the correct layer ID
          get().tagObjectWithActiveLayer(img);
          
          // Restore the original active layer
          set((state) => ({
            ...state,
            activeGlobalLayerId: originalActiveLayerId
          }));
          
          img.set({ 
            left: 100 + (i * 20),
            top: 100 + (i * 20), 
            selectable: false, 
            visible: true     
          });
          
          canvas.add(img);
          canvas.bringToFront(img);
          canvas.renderAll();
        }
      });
    }
  }

  // Activate only the last layer 
  if (layerIds.length > 0) {
    // Small delay to ensure all images are loaded
    setTimeout(() => {
      get().setActiveGlobalLayer(layerIds[layerIds.length - 1]);
    }, 100);
  }
},

  toggleVisibility: (id: string) => {
  const { canvas } = get();
  
  set((state) => {
    const updatedLayers = state.layers.map((l) =>
      l.id === id ? { ...l, isVisible: !l.isVisible } : l
    );
    
    // Also update canvas object visibility
    if (canvas) {
      const allObjects: fabric.Object[] = canvas.getObjects();
      const layer = updatedLayers.find(l => l.id === id);
      
      if (layer) {
        allObjects.forEach((obj: fabric.Object) => {
          const layerAwareObj = obj as LayerAwareFabricObject;
          // Only update objects that belong to this layer and are not the workspace
          if (layerAwareObj.layerId === id && obj.name !== "clip") {
            obj.set({ visible: layer.isVisible });
          }
        });
        canvas.renderAll();
      }
    }
    
    return { layers: updatedLayers };
  });
},

  updateLayer: (id, updates, addToHistory = true) => {
    // Existing implementation - will work with new structure
    set((state) => {
      const existingLayer = state.layers.find((l) => l.id === id);
      if (!existingLayer) return state;

      const newLayers = state.layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );

      if (addToHistory && updates.objects) {
        const layerHistory = state.history[id] ?? { past: [], future: [] };
        const prevObjects = existingLayer.objects;

        const isSame =
          JSON.stringify(layerHistory.past.at(-1)) ===
          JSON.stringify(prevObjects);

        if (!isSame) {
          const newPast =
            layerHistory.past.length >= MAX_HISTORY
              ? [...layerHistory.past.slice(1), prevObjects]
              : [...layerHistory.past, prevObjects];

          return {
            layers: newLayers,
            history: {
              ...state.history,
              [id]: { past: newPast, future: [] },
            },
          };
        }
      }

      return { layers: newLayers };
    });
  },

  undo: () => {
    // Existing implementation
    const { activeGlobalLayerId, layers, history } = get();
    const layerHistory = history[activeGlobalLayerId];
    if (!layerHistory || layerHistory.past.length === 0) return;

    const previous = layerHistory.past[layerHistory.past.length - 1];
    const newPast = layerHistory.past.slice(0, -1);
    const currentObjects =
      layers.find((l) => l.id === activeGlobalLayerId)?.objects ?? [];

    set({
      layers: layers.map((l) =>
        l.id === activeGlobalLayerId ? { ...l, objects: previous } : l
      ),
      history: {
        ...history,
        [activeGlobalLayerId]: {
          past: newPast,
          future: [currentObjects, ...layerHistory.future],
        },
      },
    });
  },

  redo: () => {
    // Existing implementation
    const { activeGlobalLayerId, layers, history } = get();
    const layerHistory = history[activeGlobalLayerId];
    if (!layerHistory || layerHistory.future.length === 0) return;

    const next = layerHistory.future[0];
    const newFuture = layerHistory.future.slice(1);
    const currentObjects =
      layers.find((l) => l.id === activeGlobalLayerId)?.objects ?? [];

    set({
      layers: layers.map((l) =>
        l.id === activeGlobalLayerId ? { ...l, objects: next } : l
      ),
      history: {
        ...history,
        [activeGlobalLayerId]: {
          past: [...layerHistory.past, currentObjects],
          future: newFuture,
        },
      },
    });
  },

  // Layer ordering methods (keep existing for now)
  bringForward: () => {
  const { activeGlobalLayerId, layers, canvas } = get();
  const index = layers.findIndex((l) => l.id === activeGlobalLayerId);
  if (index === -1 || index >= layers.length - 1) return;

  const reordered = [...layers];
  const [layer] = reordered.splice(index, 1);
  reordered.splice(index + 1, 0, layer);
  
  // Update both store and canvas
  get().reorderLayers(reordered);
},

  sendBackward: () => {
  const { activeGlobalLayerId, layers } = get();
  const index = layers.findIndex((l) => l.id === activeGlobalLayerId);
  if (index <= 1) return;

  const reordered = [...layers];
  const [layer] = reordered.splice(index, 1);
  reordered.splice(index - 1, 0, layer);
  
  get().reorderLayers(reordered);
},

  bringToFront: () => {
    const { activeGlobalLayerId, layers } = get();
    const index = layers.findIndex((l) => l.id === activeGlobalLayerId);
    if (index === -1 || index >= layers.length - 1) return;

    const reordered = [...layers];
    const [layer] = reordered.splice(index, 1);
    reordered.push(layer);
    set({ layers: reordered });
  },

  sendToBack: () => {
    const { activeGlobalLayerId, layers } = get();
    const index = layers.findIndex((l) => l.id === activeGlobalLayerId);
    if (index <= 1) return;

    const reordered = [...layers];
    const [layer] = reordered.splice(index, 1);
    reordered.splice(1, 0, layer);
    set({ layers: reordered });
  },

  setSelectedObjects: (objects: fabric.Object[]) => set({ selectedObjects: objects }),
}));