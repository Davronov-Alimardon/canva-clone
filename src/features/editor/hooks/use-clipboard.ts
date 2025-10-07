import { fabric } from "fabric";
import { useCallback, useRef } from "react";

interface FabricObjectWithLayer extends fabric.Object {
  layerId?: string;
}

interface UseClipboardProps {
  canvas: fabric.Canvas | null;
  activeLayerId?: string;
  onObjectsAdded?: (objects: fabric.Object[]) => void;
}

export function useClipboard({
  canvas,
  activeLayerId,
  onObjectsAdded,
}: UseClipboardProps) {
  const clipboard = useRef<fabric.Object | fabric.ActiveSelection | null>(null);

  // Copy selected object(s)
  const copy = useCallback(() => {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject) return;

    activeObject.clone((cloned: fabric.Object | fabric.ActiveSelection) => {
      clipboard.current = cloned;
    });
  }, [canvas]);

  // Paste cloned object(s)
  const paste = useCallback(() => {
    if (!canvas || !clipboard.current) return;

    const stored = clipboard.current;

    stored.clone((clonedObj: fabric.Object | fabric.ActiveSelection) => {
      canvas.discardActiveObject();

      const left = (clonedObj.left ?? 0) + 10;
      const top = (clonedObj.top ?? 0) + 10;

      clonedObj.set({
        left,
        top,
        evented: true,
      });

      // If it’s an ActiveSelection (multiple objects)
      if (clonedObj instanceof fabric.ActiveSelection) {
        clonedObj.canvas = canvas;

        clonedObj.forEachObject((obj: fabric.Object) => {
          const target: FabricObjectWithLayer = obj;
          if (activeLayerId) {
           target.layerId = activeLayerId;
    }
    canvas.add(target);
  });

  clonedObj.setCoords();
} else {
  const target: FabricObjectWithLayer = clonedObj;
  if (activeLayerId) {
    target.layerId = activeLayerId;
  }
  canvas.add(target);
}

      // Offset next paste slightly
      stored.top = (stored.top ?? 0) + 10;
      stored.left = (stored.left ?? 0) + 10;

      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();

      if (onObjectsAdded) {
        const addedObjects =
          clonedObj instanceof fabric.ActiveSelection
            ? clonedObj.getObjects()
            : [clonedObj];
        onObjectsAdded(addedObjects);
      }
    });
  }, [canvas, activeLayerId, onObjectsAdded]);

  return { copy, paste };
}
