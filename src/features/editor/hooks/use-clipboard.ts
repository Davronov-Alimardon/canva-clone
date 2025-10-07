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

    // Only copy objects that belong to the active layer
    const objectsToCopy = activeObject instanceof fabric.ActiveSelection 
      ? activeObject.getObjects().filter(obj => {
          const objWithLayer = obj as FabricObjectWithLayer;
          return !activeLayerId || objWithLayer.layerId === activeLayerId;
        })
      : [activeObject];

    if (objectsToCopy.length === 0) return;

    // Create a new selection with only the layer-appropriate objects
    const selection = new fabric.ActiveSelection(objectsToCopy, {
      canvas: canvas!,
    });

    selection.clone((cloned: fabric.Object | fabric.ActiveSelection) => {
      clipboard.current = cloned;
    });
  }, [canvas, activeLayerId]);

  const paste = useCallback(() => {
  if (!canvas || !clipboard.current || !activeLayerId) return;

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

    const addedObjects: fabric.Object[] = [];

    // If it's an ActiveSelection (multiple objects)
    if (clonedObj instanceof fabric.ActiveSelection) {
      clonedObj.canvas = canvas;

      clonedObj.forEachObject((obj: fabric.Object) => {
        const target: FabricObjectWithLayer = obj;
        // Assign to active layer
        target.layerId = activeLayerId;
        canvas.add(target);
        addedObjects.push(target); // Track added objects
      });

      clonedObj.setCoords();
    } else {
      const target: FabricObjectWithLayer = clonedObj;
      // Assign to active layer
      target.layerId = activeLayerId;
      canvas.add(target);
      addedObjects.push(target); // Track added objects
    }

    // Offset next paste slightly
    if (stored.left !== undefined) stored.left += 10;
    if (stored.top !== undefined) stored.top += 10;

    canvas.setActiveObject(clonedObj);
    canvas.requestRenderAll();

    // ✅ Ensure the callback is called with the correct objects
    if (onObjectsAdded && addedObjects.length > 0) {
      onObjectsAdded(addedObjects);
    }
  });
}, [canvas, activeLayerId, onObjectsAdded]);

   // Check if copy is available (has selected objects in active layer)
  const canCopy = useCallback((): boolean => {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || !activeLayerId) return false;

    if (activeObject instanceof fabric.ActiveSelection) {
      return activeObject.getObjects().some(obj => {
        const objWithLayer = obj as FabricObjectWithLayer;
        return objWithLayer.layerId === activeLayerId;
      });
    } else {
      const objWithLayer = activeObject as FabricObjectWithLayer;
      return objWithLayer.layerId === activeLayerId;
    }
  }, [canvas, activeLayerId]);

  // Check if paste is available (has clipboard content and active layer)
  const canPaste = useCallback((): boolean => {
    return !!(clipboard.current && activeLayerId);
  }, [activeLayerId]);

  return { copy, paste, canCopy, canPaste };
}
