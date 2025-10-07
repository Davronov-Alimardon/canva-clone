import { fabric } from "fabric";
import { useEvent } from "react-use";

interface UseHotkeysProps {
  canvas: fabric.Canvas | null;
  undo: () => void;
  redo: () => void;
  save: (skip?: boolean) => void;
  copy: () => void;
  paste: () => void;
}

export const useHotkeys = ({
  canvas,
  undo,
  redo,
  save,
  copy,
  paste,
}: UseHotkeysProps): void => {
  useEvent("keydown", (event: KeyboardEvent) => {
    const isCtrlKey = event.ctrlKey || event.metaKey;
    const isInput =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable);

    if (isInput) return;

    // Delete or Backspace → remove selected objects
    if (event.key === "Delete" || event.key === "Backspace") {
      const selectedObjects = canvas?.getActiveObjects() ?? [];
      selectedObjects.forEach((obj) => canvas?.remove(obj));
      canvas?.discardActiveObject();
      canvas?.renderAll();
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
