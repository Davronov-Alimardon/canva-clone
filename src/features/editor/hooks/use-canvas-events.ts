import { fabric } from "fabric";
import { useEffect } from "react";
import { ActiveTool, LayerAwareFabricObject } from "../types";
import { useLayersStore } from "../hooks/use-layer-store";

interface UseCanvasEventsProps {
  save: () => void;
  canvas: fabric.Canvas | null;
  setSelectedObjects: (objects: fabric.Object[]) => void;
  clearSelectionCallback?: () => void;
  activeTool?: ActiveTool;
}

interface SelectionEvent extends fabric.IEvent<Event> {
  selected?: fabric.Object[];
}

export const useCanvasEvents = ({
  save,
  canvas,
  setSelectedObjects,
  clearSelectionCallback,
  activeTool
}: UseCanvasEventsProps): void => {
  useEffect(() => {
    if (!canvas) return;

    // === PAN/ZOOM HANDLERS ===
    let isPanning = false;
    let lastPosX: number;
    let lastPosY: number;

    const handleMouseDown = (opt: fabric.IEvent): void => {
      const evt = opt.e as MouseEvent;
      
      // Enable panning when Ctrl key is held
      if (evt.ctrlKey) {
        isPanning = true;
        canvas.selection = false;
        canvas.defaultCursor = 'grabbing';
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        evt.preventDefault(); 
      }
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
        canvas.selection = true;
        canvas.defaultCursor = 'default';
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
          const layerAwareObj = obj as LayerAwareFabricObject;
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
        canvas.defaultCursor = 'default';
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

    const handleSelectionChange = (e: SelectionEvent): void => {
      if (activeTool === "draw") return;
      
      if (!canvas?.getContext() || !canvas.getElement()) {
        return;
      }
      
      if (Array.isArray(e.selected)) {
        setSelectedObjects(e.selected);
      }
    };

    const handleSelectionCleared = (): void => {
      if (activeTool === "draw") return;
      
      if (!canvas?.getContext() || !canvas.getElement()) {
        return;
      }
      
      setSelectedObjects([]);
      clearSelectionCallback?.();
    };

    // Only bind events if canvas is fully ready
    if (canvas.getContext() && canvas.getElement()) {
      // Mouse events
      canvas.on("mouse:down", handleMouseDown);
      canvas.on("mouse:move", handleMouseMove);
      canvas.on("mouse:up", handleMouseUp);
      canvas.on("mouse:wheel", handleMouseWheel);

      // Key listeners for Ctrl detection
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      // Canvas object events
      canvas.on("object:added", handleSave);
      canvas.on("object:removed", handleSave);
      canvas.on("object:modified", handleSave);
      
      // Selection events
      canvas.on("selection:created", handleSelectionChange);
      canvas.on("selection:updated", handleSelectionChange);
      canvas.on("selection:cleared", handleSelectionCleared);
    }

    return () => {
      // Clean up all event listeners
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("mouse:wheel", handleMouseWheel);
      
      // Remove document listeners
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      
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