// use-layer-store - keep sectional layers but remove AI logic
import { fabric } from "fabric";
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Layer, LayerType, LayersState, LayerObjects, LayerObjectData, FabricObjectWithLayer, JSON_KEYS, CanvasOperation, OperationType, OperationHistory, OperationData, AddLayerData, RemoveLayerData, ModifyLayerData, AddObjectData, RemoveObjectData, ModifyObjectData, MoveObjectData, SetActiveLayerData, CanvasTransaction, TransactionData } from "../types";
import { createWorkspace } from "./use-editor-utils";

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
  activeSectionalLayerId: null,
  history: {},
  operationHistory: { operations: [], future: [] }, // Pure operations
  canvas: null,
  selectedObjects: [],
  isUndoRedoInProgress: false, // Flag to prevent recursive snapshots
  currentBatchId: null, // For operation batching
  currentTransaction: null, // For transaction batching 
  
  // ========== Operation-Based Undo System ==========

  createOperation: (
    type: OperationType,
    forward: OperationData,
    backward: OperationData,
    batchId?: string
  ): CanvasOperation => ({
    id: uuidv4(),
    type,
    timestamp: Date.now(),
    forward,
    backward,
    batchId: batchId || get().currentBatchId || undefined
  }),

  executeOperation: async (operation: CanvasOperation) => {
    const { operationHistory } = get();

    // Clear future operations when executing a new one
    const newHistory: OperationHistory = {
      operations: [...operationHistory.operations, operation].slice(-MAX_HISTORY),
      future: []
    };

    set({ operationHistory: newHistory });

    // Apply the forward operation
    await get().applyOperation(operation, 'forward');
  },

  applyOperation: async (operation: CanvasOperation, direction: 'forward' | 'backward') => {
    const data = direction === 'forward' ? operation.forward : operation.backward;
    const { canvas } = get();

    switch (operation.type) {
      case 'ADD_LAYER': {
        const layerData = data as AddLayerData;
        if (direction === 'forward') {
          set(state => ({ layers: [...state.layers, layerData.layer] }));

          // If this is a sectional layer being restored (redo), check if it should be active
          if (layerData.layer.type === LayerType.Sectional) {

            // Check if there are any objects on canvas that belong to this layer
            const { canvas } = get();
            if (canvas) {
              const layerObjects = canvas.getObjects().filter(obj => {
                const layerAwareObj = obj as FabricObjectWithLayer;
                return layerAwareObj.layerId === layerData.layer.id && obj.name !== "clip";
              });

              if (layerObjects.length > 0) {
                set({ activeSectionalLayerId: layerData.layer.id });
              }
            }

            // Check if this layer has objects in its serialized data that need to be restored
            if (layerData.layer.objects && layerData.layer.objects.length > 0) {
              const { canvas } = get();
              if (canvas) {
                for (const objectData of layerData.layer.objects) {
                  // Check if object already exists on canvas
                  const existingObj = canvas.getObjects().find(o => (o as any).objectId === objectData.objectId);
                  if (!existingObj) {
                    await get().restoreObjectToCanvas(objectData, layerData.layer.id);
                  }
                }
                // Set as active if we restored objects
                if (layerData.layer.type === LayerType.Sectional) {
                  set({ activeSectionalLayerId: layerData.layer.id });
                }
              }
            }
          }
        } else {
          const removeData = data as RemoveLayerData;
          // Remove layer AND associated canvas objects
          set(state => ({ layers: state.layers.filter(l => l.id !== removeData.layerId) }));
          if (canvas) {
            get().removeCanvasObjectsByLayerId(removeData.layerId);
          }
        }
        break;
      }

      case 'REMOVE_LAYER': {
        if (direction === 'forward') {
          const removeData = data as RemoveLayerData;
          // Remove layer AND associated canvas objects
          set(state => ({ layers: state.layers.filter(l => l.id !== removeData.layerId) }));
          if (canvas) {
            get().removeCanvasObjectsByLayerId(removeData.layerId);
          }
        } else {
          const addData = data as AddLayerData;
          set(state => ({ layers: [...state.layers, addData.layer] }));
        }
        break;
      }

      case 'SET_ACTIVE_LAYER': {
        const activeData = data as SetActiveLayerData;
        if (activeData.layerType === 'global') {
          get().setActiveGlobalLayer(activeData.newLayerId);
        } else {
          get().setActiveSectionalLayer(activeData.newLayerId);
        }
        break;
      }

      case 'ADD_OBJECT': {
        const objData = data as AddObjectData;
        if (direction === 'forward' && canvas) {
          // Check if object already exists before restoring to prevent duplicates
          const existingObj = canvas.getObjects().find(o => (o as any).objectId === objData.objectId);
          if (!existingObj) {
            // Check if target layer exists in store before restoration
            const targetLayer = get().layers.find(l => l.id === objData.layerId);
            if (!targetLayer) {
              // Skip restoration - the object will be restored when the layer is created
            } else {
              await get().restoreObjectToCanvas(objData.objectData, objData.layerId);
              // SYNC: Update layer objects array after canvas change
              get().syncLayerObjectsFromCanvas(objData.layerId);
            }
          } else {
          }
        } else if (canvas) {
          const objects = canvas.getObjects();

          // Find ALL objects with the same objectId (in case there are duplicates)
          const objectsToRemove = objects.filter(o => (o as any).objectId === objData.objectId);

          if (objectsToRemove.length > 0) {
            objectsToRemove.forEach(obj => {
              canvas.remove(obj);
            });
            canvas.renderAll();
            // SYNC: Update layer objects array after canvas change
            get().syncLayerObjectsFromCanvas(objData.layerId);
          }
        }
        break;
      }

      case 'REMOVE_OBJECT': {
        const removeData = data as RemoveObjectData;
        if (direction === 'forward' && canvas) {
          const objects = canvas.getObjects();
          const obj = objects.find(o => (o as any).objectId === removeData.objectId);
          if (obj) {
            canvas.remove(obj);
            canvas.renderAll();
            // SYNC: Update layer objects array after canvas change
            get().syncLayerObjectsFromCanvas(removeData.layerId);
          }
        } else if (canvas && removeData.objectData) {
          await get().restoreObjectToCanvas(removeData.objectData, removeData.layerId);
          // SYNC: Update layer objects array after canvas change
          get().syncLayerObjectsFromCanvas(removeData.layerId);
        }
        break;
      }

      case 'MODIFY_OBJECT': {
  const modifyData = data as ModifyObjectData;
  if (canvas) {
    const objects = canvas.getObjects();
    const obj = objects.find(o => (o as any).objectId === modifyData.objectId);
    if (obj) {
      const changes = direction === 'forward' ? modifyData.changes : modifyData.previousValues;
      if (changes) {
        obj.set(changes);
        canvas.renderAll();
      }
    }
  }
  break;
}

      case 'MOVE_OBJECT': {
        const moveData = data as MoveObjectData;
        if (canvas) {
          const objects = canvas.getObjects();
          const obj = objects.find(o => (o as any).objectId === moveData.objectId);
          if (obj) {
            const position = direction === 'forward' ? moveData.toPosition : moveData.fromPosition;
            obj.set(position);
            canvas.renderAll();
          }
        }
        break;
      }

      case 'TRANSACTION': {
        const transactionData = data as TransactionData;
        if (direction === 'forward') {
          // Forward: apply all operations in the transaction
          for (const operation of transactionData.transaction.operations) {
            await get().applyOperation(operation, 'forward');
          }
        } else {
          // Backward: apply all operations in reverse order
          const reversedOps = [...transactionData.transaction.operations].reverse();
          for (const operation of reversedOps) {
            await get().applyOperation(operation, 'backward');
          }
        }
        break;
      }
    }
  },

  removeCanvasObjectsByLayerId: (layerId: string) => {
    const { canvas } = get();
    if (!canvas) return;

    const objects = canvas.getObjects();
    const objectsToRemove = objects.filter(obj => {
      const layerAwareObj = obj as FabricObjectWithLayer;
      return layerAwareObj.layerId === layerId;
    });

    objectsToRemove.forEach(obj => {
      canvas.remove(obj);
    });

    if (objectsToRemove.length > 0) {
      canvas.renderAll();
    }
  },

  restoreObjectToCanvas: async (objectData: any, layerId: string) => {
    const { canvas } = get();
    if (!canvas) return;

    try {
      // Ensure objectData has required properties
      if (!objectData || !objectData.type) {
        return;
      }

      // Add unique objectId if missing
      if (!objectData.objectId) {
        objectData.objectId = uuidv4();
      }

      // Use the fixed fabric.util.enlivenObjects with callback
      await new Promise<void>((resolve, reject) => {
        (fabric.util.enlivenObjects as any)([objectData], (enlivenedObjects: fabric.Object[]) => {
          try {
            if (!enlivenedObjects || !Array.isArray(enlivenedObjects) || enlivenedObjects.length === 0) {
              resolve();
              return;
            }

            const obj = enlivenedObjects[0];
            if (!obj) {
              resolve();
              return;
            }

            // Set layer and object metadata
            const layerAwareObj = obj as FabricObjectWithLayer;
            layerAwareObj.layerId = layerId;
            (obj as any).objectId = objectData.objectId;

            // Add to canvas
            canvas.add(obj);

            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
    }
  },

  undoOperation: async () => {
    const { operationHistory } = get();

    if (operationHistory.operations.length === 0) {
      return;
    }

    const operation = operationHistory.operations[operationHistory.operations.length - 1];

    const newOperations = operationHistory.operations.slice(0, -1);
    const newFuture = [operation, ...operationHistory.future];

    set({
      operationHistory: {
        operations: newOperations,
        future: newFuture
      },
      isUndoRedoInProgress: true
    });

    // Apply the backward operation
    await get().applyOperation(operation, 'backward');

    set({ isUndoRedoInProgress: false });
  },

  redoOperation: async () => {
    const { operationHistory } = get();

    if (operationHistory.future.length === 0) {
      return;
    }

    const operation = operationHistory.future[0];
    const newOperations = [...operationHistory.operations, operation];
    const newFuture = operationHistory.future.slice(1);

    set({
      operationHistory: {
        operations: newOperations,
        future: newFuture
      },
      isUndoRedoInProgress: true
    });

    // Apply the forward operation
    await get().applyOperation(operation, 'forward');

    set({ isUndoRedoInProgress: false });
  },

  canUndo: () => get().operationHistory.operations.length > 0,
  canRedo: () => get().operationHistory.future.length > 0,

  startBatch: (batchId?: string) => {
    const id = batchId || uuidv4();
    set({ currentBatchId: id });
    return id;
  },

  endBatch: () => {
    set({ currentBatchId: null });
  },

  clearOperationHistory: () => {
    set({
      operationHistory: { operations: [], future: [] }
    });
  },

  syncLayerObjectsFromCanvas: (layerId: string) => {
    const { canvas } = get();
    if (!canvas) return;

    // Get all objects belonging to this layer from canvas
    const layerObjects = canvas.getObjects()
      .filter(obj => {
        const layerAwareObj = obj as FabricObjectWithLayer;
        return layerAwareObj.layerId === layerId && obj.name !== "clip";
      })
      .map(obj => obj.toObject(JSON_KEYS));


    const layer = get().layers.find(l => l.id === layerId);

    if (layer) {
      if (layer.type === LayerType.Sectional) {
        const inpaintingObjectsSerialized = layerObjects.filter(obj => obj.type === 'path');

        if (inpaintingObjectsSerialized.length === 0) {
          get().deleteLayer(layerId);
          return;
        }
      }
    }

    // Update the layer's objects array to match canvas reality
    get().updateLayer(layerId, { objects: layerObjects }, false); // false = don't add to history
  },

  // ========== Canvas management ==========
  setCanvas: (canvas) => set({ canvas }),

  setBrushMode: (enabled: boolean, activeSectionalLayerId?: string | null) => {
  const { canvas } = get();
  if (!canvas) return;

  canvas.discardActiveObject();
  canvas.renderAll();
  
  const allObjects = canvas.getObjects();
  
  allObjects.forEach(obj => {
  const layerAwareObj = obj as FabricObjectWithLayer;
    
    if (obj.name === "clip") {
      // Always keep workspace non-interactive
      obj.set({ selectable: false, evented: false });
    } else if (enabled && activeSectionalLayerId) {
      // In brush mode: only allow interaction with active sectional layer objects
      const isActiveSectionalObject = layerAwareObj.layerId === activeSectionalLayerId;
      obj.set({
        selectable: isActiveSectionalObject,
        evented: isActiveSectionalObject,
        hasControls: isActiveSectionalObject, 
        hasBorders: isActiveSectionalObject, 
        hoverCursor: isActiveSectionalObject ? 'crosshair' : 'default'
      });
    } else {
      // Normal mode: restore all object interaction based on active layer
      const activeGlobalLayerId = get().activeGlobalLayerId;
      const isFromActiveLayer = layerAwareObj.layerId === activeGlobalLayerId;
      obj.set({ 
        selectable: isFromActiveLayer, 
        evented: isFromActiveLayer,
        hasControls: isFromActiveLayer, 
        hasBorders: isFromActiveLayer, 
        hoverCursor: 'move'
      });
    }
  });
  
  // Set canvas-level properties
  canvas.defaultCursor = enabled ? 'crosshair' : 'default';
  canvas.selection = !enabled;

  // Ensure canvas selection is properly restored when disabling brush mode
  if (!enabled) {
    canvas.selection = true;

    // Force cursor reset to default when exiting brush mode
    const canvasElement = canvas.getElement();
    if (canvasElement) {
      canvasElement.style.cursor = 'default';
    }
  }

  canvas.renderAll();
},

  // ========== Hierarchical Layer Management ==========
  addGlobalLayer: async (name = `Layer ${get().layers.filter(l => l.type === LayerType.Global).length}`) => {
    const newLayer: Layer = {
      id: uuidv4(),
      name,
      type: LayerType.Global,
      imageDataUrl: null,
      referenceImageUrls: [],
      maskDataUrl: null,
      isVisible: true,
      isActive: false,
      prompt: "",
      objects: [],
      children: []
    };

    // Create operation for adding global layer
    const operation = get().createOperation(
      'ADD_LAYER',
      { layer: newLayer } as AddLayerData,
      { layerId: newLayer.id } as RemoveLayerData
    );

    await get().executeOperation(operation);

    // Set as active layer
    const setActiveOperation = get().createOperation(
      'SET_ACTIVE_LAYER',
      { newLayerId: newLayer.id, layerType: 'global', previousLayerId: get().activeGlobalLayerId } as SetActiveLayerData,
      { newLayerId: get().activeGlobalLayerId || '', layerType: 'global', previousLayerId: newLayer.id } as SetActiveLayerData
    );

    await get().executeOperation(setActiveOperation);
  },

  // ========== Sectional Layer Management ==========
  addSectionalLayer: async (parentGlobalId: string) => {
    // Verify parent exists and is global
    const parentLayer = get().layers.find(l => l.id === parentGlobalId && l.type === LayerType.Global);
    if (!parentLayer) {
      return null;
    }

    const existingSectionals = get().layers.filter(l =>
      l.type === LayerType.Sectional && l.parentId === parentGlobalId
    );
    const nextNumber = existingSectionals.length + 1;

    const newLayer: Layer = {
      id: uuidv4(),
      name: `Section ${nextNumber}`,
      type: LayerType.Sectional,
      parentId: parentGlobalId,
      imageDataUrl: null,
      referenceImageUrls: [],
      maskDataUrl: null,
      isVisible: true,
      prompt: "",
      objects: [],
    };

    // Create ADD_LAYER operation
    const operation = get().createOperation(
      'ADD_LAYER',
      { layer: newLayer } as AddLayerData,
      { layerId: newLayer.id } as RemoveLayerData
    );

    // Create SET_ACTIVE_LAYER operation
    const setActiveOperation = get().createOperation(
      'SET_ACTIVE_LAYER',
      { newLayerId: newLayer.id, layerType: 'sectional', previousLayerId: get().activeSectionalLayerId } as SetActiveLayerData,
      { newLayerId: get().activeSectionalLayerId || '', layerType: 'sectional', previousLayerId: newLayer.id } as SetActiveLayerData
    );

    // Check if there's an active transaction
    const { currentTransaction, addOperationToTransaction } = get();

    if (currentTransaction) {
      addOperationToTransaction(operation);
      addOperationToTransaction(setActiveOperation);
    } else {
      await get().executeOperation(operation);
      await get().executeOperation(setActiveOperation);
    }

    return newLayer.id;
  },

  getActiveSectionalLayer: () => {
    const { layers, activeSectionalLayerId } = get();
    if (!activeSectionalLayerId) return null;
    return layers.find(l => l.id === activeSectionalLayerId) || null;
  },

  setActiveSectionalLayer: (id: string | null) => {
    set({ activeSectionalLayerId: id });
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

  setActiveGlobalLayer: (id: string) => {
    const { canvas, layers } = get();

    if (!canvas) {
      return;
    }

    // Note: Layer change tracking handled by operations that call this method

    const globalLayers: Layer[] = layers.filter((layer: Layer): boolean =>
      layer.type === LayerType.Global
    );

    const newActiveLayer: Layer | undefined = globalLayers.find((layer: Layer): boolean =>
      layer.id === id
    );

    if (!newActiveLayer) {
      return;
    }

    // Update layer active states
    const updatedLayers: Layer[] = layers.map((layer: Layer): Layer => ({
      ...layer,
      isActive: layer.id === id && layer.type === LayerType.Global
    }));

    set({
      activeGlobalLayerId: id,
      layers: updatedLayers,
      activeSectionalLayerId: null
    });

    // Update visibility
    if (canvas) {
      const allObjects: fabric.Object[] = canvas.getObjects();

      allObjects.forEach((obj: fabric.Object) => {
        const layerAwareObj = obj as FabricObjectWithLayer;
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
  // Note: User should save before destructive operations

  const { canvas } = get();

  if (canvas) {
    const layerToDeleteForCanvas = get().layers.find(l => l.id === id);
    if (!layerToDeleteForCanvas) return;

    // Determine all layers to delete (including children for global layers)
    let layersToDelete = [id];
    if (layerToDeleteForCanvas.type === LayerType.Global) {
      const childSectionals = get().layers
        .filter(l => l.type === LayerType.Sectional && l.parentId === id)
        .map(l => l.id);
      layersToDelete = [...layersToDelete, ...childSectionals];
    }

    // Remove canvas objects from all layers being deleted
    const objectsToRemove = canvas.getObjects().filter(obj => {
      const layerAwareObj = obj as FabricObjectWithLayer;
      return layersToDelete.includes(layerAwareObj.layerId || '');
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

    // Handle active layer reassignment
    let newActiveGlobalId = state.activeGlobalLayerId;
    let newActiveSectionalId = state.activeSectionalLayerId;
    
    if (layerToDelete.type === LayerType.Global && layerToDelete.id === state.activeGlobalLayerId) {
      // Find another global layer to activate
      const otherGlobal = newLayers.find(l => l.type === LayerType.Global);
      newActiveGlobalId = otherGlobal?.id || '';
      newActiveSectionalId = null; // Clear sectional if its parent global is deleted
    } else if (layerToDelete.type === LayerType.Sectional && layerToDelete.id === state.activeSectionalLayerId) {
      // Clear active sectional if it's being deleted
      newActiveSectionalId = null;
    }

    return {
      layers: newLayers,
      history: newHistory,
      activeGlobalLayerId: newActiveGlobalId,
      activeSectionalLayerId: newActiveSectionalId,
    };
  });
},
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
      get().setActiveGlobalLayer(id);
    } else if (layer.type === LayerType.Sectional) {
      // Use setActiveSectionalLayer to trigger opacity changes
      get().setActiveSectionalLayer(id);
    }
  },

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
          const layerAwareObj = obj as FabricObjectWithLayer;
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
    const { activeGlobalLayerId, activeSectionalLayerId } = get();
    
    const layerAwareObj = obj as FabricObjectWithLayer;
    
    // Prefer sectional layer if active, otherwise use global layer
    const targetLayerId = activeSectionalLayerId || activeGlobalLayerId;
    layerAwareObj.layerId = targetLayerId || undefined;
    
  },

  addMultipleImageLayers: async (files: File[]) => {
    const layerIds: string[] = [];

    // Start batch operation to group all uploads
    const batchId = get().startBatch(`Upload ${files.length} images`);

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
        isActive: false,
        prompt: "",
        objects: [],
        children: []
      };

      // Create ADD_LAYER operation
      const addLayerOperation = get().createOperation(
        'ADD_LAYER',
        { layer: newLayer } as AddLayerData,
        { layerId: newLayer.id } as RemoveLayerData,
        batchId
      );

      await get().executeOperation(addLayerOperation);

      // Add image to canvas with operation tracking
      const canvas = get().canvas;
      if (canvas?.getContext()) {
        await new Promise<void>((resolve) => {
          fabric.Image.fromURL(dataUrl, async (img) => {
            if (canvas?.getContext()) {
              // Tag the object with the correct layer ID
              const layerAwareImg = img as FabricObjectWithLayer;
              layerAwareImg.layerId = id;

              // Add unique object ID for operation tracking
              (img as any).objectId = uuidv4();

              img.set({
                left: 100 + (i * 20),
                top: 100 + (i * 20),
                selectable: true,
                evented: true,
                visible: true,
                hasControls: true,
                hasBorders: true,
                cornerColor: '#FFF',
                borderColor: '#3b82f6',
                cornerSize: 8,
                transparentCorners: false
              });

              canvas.add(img);
              canvas.bringToFront(img);
              canvas.renderAll();

              // Create ADD_OBJECT operation
              const objectData = img.toObject(JSON_KEYS);
              objectData.objectId = (img as any).objectId;
              objectData.layerId = id;

              const addObjectOperation = get().createOperation(
                'ADD_OBJECT',
                {
                  layerId: id,
                  objectData,
                  objectId: objectData.objectId
                } as AddObjectData,
                {
                  layerId: id,
                  objectId: objectData.objectId,
                  objectData
                } as RemoveObjectData,
                batchId
              );

              await get().executeOperation(addObjectOperation);

              resolve();
            }
          });
        });
      }
    }

    // End batch operation
    get().endBatch();

    // Activate only the last layer
    if (layerIds.length > 0) {
      // Small delay to ensure all operations are complete
      setTimeout(() => {
        const setActiveOperation = get().createOperation(
          'SET_ACTIVE_LAYER',
          {
            newLayerId: layerIds[layerIds.length - 1],
            layerType: 'global',
            previousLayerId: get().activeGlobalLayerId
          } as SetActiveLayerData,
          {
            newLayerId: get().activeGlobalLayerId || '',
            layerType: 'global',
            previousLayerId: layerIds[layerIds.length - 1]
          } as SetActiveLayerData
        );

        get().executeOperation(setActiveOperation);
      }, 200);
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
            const layerAwareObj = obj as FabricObjectWithLayer;
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
    const { activeGlobalLayerId, layers, history } = get();

    if (!activeGlobalLayerId) return;

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
    const { activeGlobalLayerId, layers, history } = get();

    if (!activeGlobalLayerId) return;

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

  // Layer ordering methods
  bringForward: () => {
    const { activeGlobalLayerId, layers } = get();
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

  // ========== Transaction System ==========

  createTransaction: (name: string, operations: CanvasOperation[]): CanvasTransaction => ({
    id: uuidv4(),
    name,
    timestamp: Date.now(),
    operations
  }),

  executeTransaction: async (transaction: CanvasTransaction) => {
    const { operationHistory } = get();

    // Create a TRANSACTION operation that wraps the entire transaction
    const transactionOperation = get().createOperation(
      'TRANSACTION',
      { transaction },
      { transaction }
    );

    // Clear future operations when executing a new transaction
    const newHistory: OperationHistory = {
      operations: [...operationHistory.operations, transactionOperation].slice(-MAX_HISTORY),
      future: []
    };

    set({ operationHistory: newHistory });

    // Apply all operations in the transaction sequentially
    for (const operation of transaction.operations) {
      await get().applyOperation(operation, 'forward');
    }
  },

  startTransaction: (name: string): string => {
    const transaction: CanvasTransaction = {
      id: uuidv4(),
      name,
      timestamp: Date.now(),
      operations: []
    };

    set({ currentTransaction: transaction });
    return transaction.id;
  },

  addOperationToTransaction: (operation: CanvasOperation) => {
    const { currentTransaction } = get();
    if (!currentTransaction) {
      return;
    }

    currentTransaction.operations.push(operation);
    set({ currentTransaction });
  },

  commitTransaction: async () => {
    const { currentTransaction } = get();
    if (!currentTransaction) {
      return;
    }

    // Execute the transaction
    await get().executeTransaction(currentTransaction);

    // Clear current transaction
    set({ currentTransaction: null });
  },

  rollbackTransaction: async () => {
    const { currentTransaction } = get();
    if (!currentTransaction) {
      return;
    }

    // Simply clear the current transaction without executing
    set({ currentTransaction: null });
  },

  // Restore from snapshot
  restoreFromSnapshot: (
    layers: Layer[],
    canvasConfig: { width: number; height: number; backgroundColor: string }
  ) => {
    // Set the first global layer as active
    const firstGlobalLayer = layers.find(l => l.type === LayerType.Global);
    const activeGlobalLayerId = firstGlobalLayer?.id || null;

    set({
      layers,
      activeGlobalLayerId,
      activeSectionalLayerId: null,
      // Clear history and operations as this is a fresh start
      history: {},
      operationHistory: { operations: [], future: [] }
    });

    // Update canvas background if canvas is available
    const { canvas } = get();
    if (canvas) {
      canvas.setBackgroundColor(canvasConfig.backgroundColor, () => {
        canvas.renderAll();
      });
    }
  },
}));