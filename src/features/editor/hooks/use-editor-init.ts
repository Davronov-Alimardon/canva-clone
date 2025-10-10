import { fabric } from "fabric";
import { useCallback } from "react";
import { useLayersStore } from "./use-layer-store";
import { createWorkspace } from "./use-editor-utils";

export function useEditorInit(
  initialWidth: React.MutableRefObject<number>,
  initialHeight: React.MutableRefObject<number>,
) {

  return useCallback(({
    initialCanvas,
    initialContainer,
  }: {
    initialCanvas: fabric.Canvas;
    initialContainer: HTMLDivElement;
  }) => {
     const { setCanvas } = useLayersStore.getState();
     if (!initialCanvas || !initialCanvas.getContext()) {
      console.warn('Canvas not ready for initialization');
      return;
    }

    fabric.Object.prototype.set({
      cornerColor: "#FFF",
      cornerStyle: "circle",
      borderColor: "#3b82f6",
      borderScaleFactor: 1.5,
      transparentCorners: false,
      borderOpacityWhenMoving: 1,
      cornerStrokeColor: "#3b82f6",
    });

    const containerWidth = initialContainer.offsetWidth;
    const containerHeight = initialContainer.offsetHeight;

    const targetWidth = initialWidth.current > 0 ? initialWidth.current : containerWidth;
    const targetHeight = initialHeight.current > 0 ? initialHeight.current : containerHeight;

    // Create workspace using shared utility
    createWorkspace(initialCanvas, targetWidth, targetHeight);

    // Set canvas in store
    setCanvas(initialCanvas);
  }, [initialWidth, initialHeight])
}
