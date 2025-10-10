import { fabric } from "fabric";
import { useEvent } from "react-use";
import { useLayersStore } from "../hooks/use-layer-store";
import { ActiveTool, Editor } from "../types";

interface UseHotkeysProps {
  canvas: fabric.Canvas | null;
  editor: Editor | undefined;
  undo: () => void;
  redo: () => void;
  save: (skip?: boolean) => void;
  copy: () => void;
  paste: () => void;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const useHotkeys = ({
  canvas,
  editor,
  undo,
  redo,
  save,
  copy,
  paste,
  activeTool,
  onChangeActiveTool,
}: UseHotkeysProps): void => {
  useEvent("keydown", (event: KeyboardEvent) => {
    const isCtrlKey = event.ctrlKey || event.metaKey;
    const isInput =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable);

    if (isInput) return;

    // Exit drawing/masking mode with ESC key
    if (event.key === "Escape") {
      if (activeTool === "draw" || activeTool === "brush") {
        event.preventDefault();
        console.log('🔄 ESC pressed - exiting drawing/masking mode');

        // Perform the same cleanup as the close buttons
        if (activeTool === "brush") {
          // Reset brush mode for mask tool
          useLayersStore.getState().setBrushMode(false);
        }

        // For both tools, reset the canvas drawing mode and cursor immediately
        if (canvas) {
          canvas.isDrawingMode = false;
          canvas.defaultCursor = 'default';
          canvas.selection = true;

          // Force cursor reset
          const canvasElement = canvas.getElement();
          if (canvasElement) {
            canvasElement.style.cursor = 'default';
          }

          canvas.renderAll();
        }

        onChangeActiveTool("select");
      }
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      const selectedObjects = canvas?.getActiveObjects() ?? [];

      if (selectedObjects.length > 0 && editor) {
        event.preventDefault();
        // Use our custom delete function with inpainting/other object classification
        editor.delete();
      }
      return;
    }
    // Undo
    if (isCtrlKey && event.key === "z") {
      event.preventDefault();
      undo();
      return;
    }

    // Redo
    if (isCtrlKey && event.key === "y") {
      event.preventDefault();
      redo();
      return;
    }

    // Copy
    if (isCtrlKey && event.key === "c") {
      event.preventDefault();
      copy();
      return;
    }

    // Paste
    if (isCtrlKey && event.key === "v") {
      event.preventDefault();
      paste();
      return;
    }

    // Save
    if (isCtrlKey && event.key === "s") {
      event.preventDefault();
      save(true);
      return;
    }

    // Select All
    if (isCtrlKey && event.key === "a") {
      event.preventDefault();
      const allObjects = (canvas?.getObjects() ?? []).filter(
        (object) => object.selectable
      );
      if (canvas && allObjects.length > 0) {
        const selection = new fabric.ActiveSelection(allObjects, { canvas });
        canvas.setActiveObject(selection);
        canvas.renderAll();
      }
    }
  });
};
