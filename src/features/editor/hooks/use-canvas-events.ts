import { fabric } from "fabric";
import { useEffect } from "react";
import { ActiveTool } from "../types";

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

    const handleSave = (): void => save();

   const handleSelectionChange = (e: SelectionEvent): void => {
      if (activeTool === "draw") return;
      
      if (Array.isArray(e.selected)) {
        setSelectedObjects(e.selected);
      }
    };

    const handleSelectionCleared = (): void => {
      if (activeTool === "draw") return;
      setSelectedObjects([]);
      clearSelectionCallback?.();
    };

    canvas.on("object:added", handleSave);
    canvas.on("object:removed", handleSave);
    canvas.on("object:modified", handleSave);
    canvas.on("selection:created", handleSelectionChange);
    canvas.on("selection:updated", handleSelectionChange);
    canvas.on("selection:cleared", handleSelectionCleared);

    return () => {
      canvas.off("object:added", handleSave);
      canvas.off("object:removed", handleSave);
      canvas.off("object:modified", handleSave);
      canvas.off("selection:created", handleSelectionChange);
      canvas.off("selection:updated", handleSelectionChange);
      canvas.off("selection:cleared", handleSelectionCleared);
    };
  }, [canvas, save, setSelectedObjects, clearSelectionCallback, activeTool]);
};
