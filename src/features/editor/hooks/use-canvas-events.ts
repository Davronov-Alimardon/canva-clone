import { fabric } from "fabric";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { ActiveTool, FabricObjectWithLayer } from "../types";
import { useLayersStore } from "../hooks/use-layer-store";

interface UseCanvasEventsProps {
  save: () => void;
  canvas: fabric.Canvas | null;
  setSelectedObjects: (objects: fabric.Object[]) => void;
  clearSelectionCallback?: () => void;
  activeTool?: ActiveTool;
}

const isSelectionEvent = (opt: fabric.IEvent): opt is fabric.IEvent & { selected?: fabric.Object[] } => {
  return 'selected' in opt;
};

export const useCanvasEvents = ({
  save,
  canvas,
  setSelectedObjects,
  clearSelectionCallback,
  activeTool
}: UseCanvasEventsProps): void => {
  useEffect(() => {
    if (!canvas) return

    // === PAN/ZOOM HANDLERS ===
    let isPanning = false;
    let lastPosX: number;
    let lastPosY: number;

    const handleMouseDown = (opt: fabric.IEvent): void => {
      const evt = opt.e as MouseEvent;
      
      // Enable panning when Ctrl key is held or when in pan tool
      if (evt.ctrlKey || activeTool === "pan") {
        isPanning = true;
        canvas.selection = false;
        canvas.defaultCursor = 'grabbing';
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        evt.preventDefault(); 
      }
      
      // REMOVED: Brush-specific logic that was interfering
    };

    const handleMouseMove = (opt: fabric.IEvent): void => {
      if (isPanning) {
        const evt = opt.e as MouseEvent;
        const deltaX = evt.clientX - lastPosX;
        const deltaY = evt.clientY - lastPosY;
        
        // Pan the canvas
        canvas.relativePan(new fabric.Point(deltaX, deltaY));
        
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    };

    const handleMouseUp = (): void => {
      if (isPanning) {
        isPanning = false;
        // Restore appropriate cursor based on current tool
        if (activeTool === "pan") {
          canvas.defaultCursor = 'grab';
        } else if (activeTool === "brush") {
          canvas.defaultCursor = 'crosshair';
        } else {
          canvas.defaultCursor = 'default';
        }
      }
    };

    // Mouse wheel for layer-specific zoom
    const handleMouseWheel = (opt: fabric.IEvent): void => {
      const evt = opt.e as WheelEvent;
      const delta = evt.deltaY;
      
      // Get active layer
      const activeGlobalLayer = useLayersStore.getState().getActiveGlobalLayer();
      if (!activeGlobalLayer) return;
      
      // Don't zoom the base canvas layer - only other layers
      if (activeGlobalLayer.id === "base-canvas") {
        // Use canvas zoom for base canvas only
        let zoom = canvas.getZoom();
        const zoomFactor = 0.01;
        
        if (delta > 0) {
          zoom = Math.max(0.1, zoom - zoomFactor);
        } else {
          zoom = Math.min(5, zoom + zoomFactor);
        }
        
        const point = new fabric.Point(evt.offsetX, evt.offsetY);
        canvas.zoomToPoint(point, zoom);
      } else {
        // For other layers, scale only the layer's objects
        const zoomFactor = 0.01;
        
        canvas.getObjects().forEach(obj => {
          const layerAwareObj = obj as FabricObjectWithLayer;
          const isActiveLayer = layerAwareObj.layerId === activeGlobalLayer.id && obj.name !== "clip";
          const isWorkspace = obj.name === "clip";
          
          if (isWorkspace) return;
          
          if (isActiveLayer) {
            // Scale active layer objects
            let scaleX = obj.scaleX || 1;
            let scaleY = obj.scaleY || 1;
            
            if (delta > 0) {
              // Zoom out - scale down
              scaleX = Math.max(0.1, scaleX - zoomFactor);
              scaleY = Math.max(0.1, scaleY - zoomFactor);
            } else {
              // Zoom in - scale up
              scaleX = Math.min(5, scaleX + zoomFactor);
              scaleY = Math.min(5, scaleY + zoomFactor);
            }
            
            obj.set({
              scaleX: scaleX,
              scaleY: scaleY
            });
            
            // Visual feedback
            obj.set({ 
              cornerColor: '#3b82f6',
              borderColor: '#3b82f6',
              borderScaleFactor: 2 
            });
          } else {
            // Reset other layers' visual feedback
            obj.set({ 
              cornerColor: '#FFF',
              borderColor: '#3b82f6',
              borderScaleFactor: 1.5 
            });
          }
        });
      }
      
      canvas.renderAll();
      
      // Remove highlight after delay
      setTimeout(() => {
        canvas.getObjects().forEach(obj => {
          if (obj.name !== "clip") {
            obj.set({ 
              cornerColor: '#FFF',
              borderColor: '#3b82f6',
              borderScaleFactor: 1.5 
            });
          }
        });
        canvas.renderAll();
      }, 500);
      
      evt.preventDefault();
      evt.stopPropagation();
    };

    // Track Ctrl key state using document events
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey && !isPanning) {
        canvas.defaultCursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      if (!e.ctrlKey && !isPanning) {
        // Restore appropriate cursor based on current tool
        if (activeTool === "pan") {
          canvas.defaultCursor = 'grab';
        } else if (activeTool === "brush") {
          canvas.defaultCursor = 'crosshair';
        } else {
          canvas.defaultCursor = 'default';
        }
      }
    };

    const handleSave = (): void => {
      if (!canvas?.getContext() || !canvas.getElement()) {
        console.warn('Canvas not ready for save operation');
        return;
      }
      try {
        save();
      } catch (error) {
        console.warn('Save operation failed:', error);
      }
    };

    const handleObjectAdding = async (e: fabric.IEvent) => {

      if (!canvas || !e.path) return;

      const { executeOperation, createOperation, tagObjectWithActiveLayer } = useLayersStore.getState();

      // Tag the new object with the active layer
      setTimeout(async () => {
        const newObjects = canvas.getObjects().filter(obj => !(obj as any).objectId);

        if (newObjects.length > 0) {
          const newObject = newObjects[newObjects.length - 1];

          // Get FRESH state right before tagging to ensure we have the latest sectional layer
          const freshState = useLayersStore.getState();

          // Tag with active layer
          tagObjectWithActiveLayer(newObject);

          // Add unique objectId
          const objectId = uuidv4();
          (newObject as any).objectId = objectId;

          // Get the appropriate layer ID with FRESH state
          const layerId = freshState.activeSectionalLayerId || freshState.activeGlobalLayerId;
          if (!layerId) {
            console.warn(`No active layer ID found!`);
            return;
          }

          // Serialize the object
          const objectData = newObject.toObject(['objectId', 'layerId']);

          // Create ADD_OBJECT operation
          const operation = createOperation(
            'ADD_OBJECT',
            { layerId, objectData, objectId },
            { layerId, objectId }
          );

          // Check if there's an active transaction
          const { currentTransaction, addOperationToTransaction, commitTransaction } = useLayersStore.getState();

          if (currentTransaction) {
            addOperationToTransaction(operation);

            // If this is a mask operation, commit the transaction
            if (newObject.type === 'path') {
              await commitTransaction();
            }
          } else {
            await executeOperation(operation);
          }
        }
      }, 10);
    };

    const handleObjectModifying = async (e: fabric.IEvent) => {

      if (!canvas || !e.target) return;

      const { executeOperation, createOperation } = useLayersStore.getState();
      const obj = e.target;
      const objectId = (obj as any).objectId;
      const layerId = (obj as any).layerId;

      if (!objectId || !layerId) return;

      // Store the current state as "before" and capture "after" on next tick
      const beforeState = {
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle
      };

      setTimeout(async () => {
        const afterState = {
          left: obj.left,
          top: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          angle: obj.angle
        };

        const operation = createOperation(
          'MODIFY_OBJECT',
          { layerId, objectId, changes: afterState, previousValues: beforeState },
          { layerId, objectId, changes: beforeState, previousValues: afterState }
        );

        await executeOperation(operation);
      }, 10);
    };

    const handleObjectRemoving = async (e: fabric.IEvent) => {

      if (!canvas || !e.target) return;

      const { executeOperation, createOperation } = useLayersStore.getState();
      const obj = e.target;
      const objectId = (obj as any).objectId;
      const layerId = (obj as any).layerId;

      if (!objectId || !layerId) return;

      // Serialize the object for restoration
      const objectData = obj.toObject(['objectId', 'layerId']);

      const operation = createOperation(
        'REMOVE_OBJECT',
        { layerId, objectId },
        { layerId, objectId, objectData }
      );

      await executeOperation(operation);
    };

    const handleSelectionChange = (opt: fabric.IEvent): void => {
      // Disable selection during drawing OR masking
      if (!activeTool || ["draw", "brush", "eraser"].includes(activeTool)) return;
      
      if (!canvas?.getContext() || !canvas.getElement()) {
        return;
      }
      
      if (isSelectionEvent(opt) && Array.isArray(opt.selected)) {
        setSelectedObjects(opt.selected);
      }
    };

    const handleSelectionCleared = (): void => {
      // Disable selection clearing during masking
      if (!activeTool || ["draw", "brush", "eraser"].includes(activeTool)) return;
      
      if (!canvas?.getContext() || !canvas.getElement()) {
        return;
      }
      
      setSelectedObjects([]);
      clearSelectionCallback?.();
    };

    // Add event listeners
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("mouse:wheel", handleMouseWheel);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Operation-based events (instead of snapshots)
    canvas.on("before:path:created", handleObjectAdding);
    canvas.on("object:scaling", handleObjectModifying);
    canvas.on("object:moving", handleObjectModifying);
    canvas.on("object:rotating", handleObjectModifying);
    canvas.on("before:object:removed", handleObjectRemoving);

    // Save events (after actions)
    canvas.on("object:added", handleSave);
    canvas.on("object:removed", handleSave);
    canvas.on("object:modified", handleSave);
    canvas.on("selection:created", handleSelectionChange);
    canvas.on("selection:updated", handleSelectionChange);
    canvas.on("selection:cleared", handleSelectionCleared);

    return () => {
      // Clean up all event listeners
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("mouse:wheel", handleMouseWheel);

      // Remove document listeners
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);

      // Clean up operation events
      canvas.off("before:path:created", handleObjectAdding);
      canvas.off("object:scaling", handleObjectModifying);
      canvas.off("object:moving", handleObjectModifying);
      canvas.off("object:rotating", handleObjectModifying);
      canvas.off("before:object:removed", handleObjectRemoving);

      // Clean up canvas events
      canvas.off("object:added", handleSave);
      canvas.off("object:removed", handleSave);
      canvas.off("object:modified", handleSave);
      canvas.off("selection:created", handleSelectionChange);
      canvas.off("selection:updated", handleSelectionChange);
      canvas.off("selection:cleared", handleSelectionCleared);
    };
  }, [canvas, save, setSelectedObjects, clearSelectionCallback, activeTool]);
};