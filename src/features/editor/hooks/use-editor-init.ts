import { fabric } from "fabric";
import { JSON_KEYS } from "@/features/editor/types";
import { useCallback } from "react";

export function useEditorInit(
  canvasHistory: React.MutableRefObject<string[]>,
  setHistoryIndex: (n: number) => void,
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

    const workspace = new fabric.Rect({
      width: targetWidth,
      height: targetHeight,
      name: "clip",
      fill: "white",
      selectable: false,
      hasControls: false,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.8)",
        blur: 5,
      }),
    });

  initialCanvas.setWidth(targetWidth);
  initialCanvas.setHeight(targetHeight);

  initialCanvas.add(workspace);
  initialCanvas.centerObject(workspace);
  initialCanvas.clipPath = workspace;

  const snapshot = JSON.stringify(initialCanvas.toJSON(JSON_KEYS));
    canvasHistory.current = [snapshot];
    setHistoryIndex(0);
  }, [canvasHistory, setHistoryIndex, initialWidth, initialHeight])
}
