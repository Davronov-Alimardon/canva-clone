import { fabric } from "fabric";
import { JSON_KEYS } from "@/features/editor/types";
import { useCallback } from "react";

export function useEditorInit(
  canvasHistory: React.MutableRefObject<string[]>,
  setHistoryIndex: (n: number) => void,
  initialWidth: React.MutableRefObject<number>,
  initialHeight: React.MutableRefObject<number>,
) {
  // Debug: show when the hook is (re)creating the init callback
  // Note: this will log on every render where the hook is re-evaluated
  console.log("[useEditorInit] creating init callback", {
    initialWidth: initialWidth.current,
    initialHeight: initialHeight.current,
    canvasHistoryLength: canvasHistory.current?.length ?? 0,
  });

  return useCallback(({
    initialCanvas,
    initialContainer,
  }: {
    initialCanvas: fabric.Canvas;
    initialContainer: HTMLDivElement;
  }) => {
    fabric.Object.prototype.set({
      cornerColor: "#FFF",
      cornerStyle: "circle",
      borderColor: "#3b82f6",
      borderScaleFactor: 1.5,
      transparentCorners: false,
      borderOpacityWhenMoving: 1,
      cornerStrokeColor: "#3b82f6",
    });

    const workspace = new fabric.Rect({
      width: initialWidth.current,
      height: initialHeight.current,
      name: "clip",
      fill: "white",
      selectable: false,
      hasControls: false,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.8)",
        blur: 5,
      }),
    });

  // Prefer the configured initial width/height (project defaults). Fall back to container size
  const targetWidth = initialWidth.current ?? initialContainer.offsetWidth;
  const targetHeight = initialHeight.current ?? initialContainer.offsetHeight;

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
