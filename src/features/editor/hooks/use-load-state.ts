import { fabric } from "fabric";
import { useEffect, useRef } from "react";

import { useLayersStore } from "./use-layer-store";

interface UseLoadStateProps {
  autoZoom: () => void;
  canvas: fabric.Canvas | null;
  initialState: React.MutableRefObject<string | undefined>;
}

type CanvasWithContextContainer = fabric.Canvas & {
  contextContainer?: CanvasRenderingContext2D | null;
};

export const useLoadState = ({
  canvas,
  autoZoom,
  initialState,
}: UseLoadStateProps) => {
  const initialized = useRef(false);
  // Load state will create initial baseline only on project load

  const renderCanvas = (target: fabric.Canvas | null) => {
    if (!target) {
      return;
    }

    const canvasWithContext = target as CanvasWithContextContainer;

    if (!canvasWithContext.contextContainer) {
      return;
    }

    target.renderAll();
  };

  const clearCanvasObjects = (target: fabric.Canvas | null) => {
    if (!target) return;

    const objects = target.getObjects();

    objects
      .filter((object) => object.name !== "clip")
      .forEach((object) => target.remove(object));

    target.discardActiveObject();
  };

  useEffect(() => {
    if (!initialized.current && initialState?.current && canvas) {
      const data = JSON.parse(initialState.current);

      canvas.loadFromJSON(data, () => {
        // TODO: Create baseline after loading project state
        autoZoom();
      });
      initialized.current = true;
      return;
    }

    if (!initialized.current && canvas) {
      clearCanvasObjects(canvas);
      renderCanvas(canvas);

      autoZoom();
      initialized.current = true;
    }
  }, [canvas, autoZoom, initialState]);
};
