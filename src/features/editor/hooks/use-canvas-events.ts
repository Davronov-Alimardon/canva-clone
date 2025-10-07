import { fabric } from "fabric";
import { useEffect } from "react";
import { ActiveTool } from "../types";
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

    const handleSave = (): void => {
      // Enhanced safety check - ensure canvas is fully ready
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

    const handleObjectRemoved = (): void => {
      // When objects are removed from canvas, update the layer store
      const activeGlobalLayer = useLayersStore.getState().getActiveGlobalLayer();
      if (activeGlobalLayer && canvas) {
        const currentObjects = canvas.getObjects().filter(obj => obj.name !== "clip");
        useLayersStore.getState().updateLayer(activeGlobalLayer.id, { objects: currentObjects });
      }
    };

    const handleSelectionChange = (e: SelectionEvent): void => {
      if (activeTool === "draw") return;
      
      // Safety check
      if (!canvas?.getContext() || !canvas.getElement()) {
        return;
      }
      
      if (Array.isArray(e.selected)) {
        setSelectedObjects(e.selected);
      }
    };

    const handleSelectionCleared = (): void => {
      if (activeTool === "draw") return;
      
      // Safety check
      if (!canvas?.getContext() || !canvas.getElement()) {
        return;
      }
      
      setSelectedObjects([]);
      clearSelectionCallback?.();
    };

    // Only bind events if canvas is fully ready
    if (canvas.getContext() && canvas.getElement()) {
      canvas.on("object:added", handleSave);
      canvas.on("object:removed", handleSave);
      canvas.on("object:modified", handleSave);
      canvas.on("selection:created", handleSelectionChange);
      canvas.on("selection:updated", handleSelectionChange);
      canvas.on("selection:cleared", handleSelectionCleared);
    }

    return () => {
      // Clean up all event listeners
      canvas.off("object:added", handleSave);
      canvas.off("object:removed", handleSave);
      canvas.off("object:modified", handleSave);
      canvas.off("selection:created", handleSelectionChange);
      canvas.off("selection:updated", handleSelectionChange);
      canvas.off("selection:cleared", handleSelectionCleared);
    };
  }, [canvas, save, setSelectedObjects, clearSelectionCallback, activeTool]);
};