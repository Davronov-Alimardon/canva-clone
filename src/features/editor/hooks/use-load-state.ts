  import { fabric } from "fabric";
  import { useEffect, useRef } from "react";

  import { JSON_KEYS } from "@/features/editor/types";

  interface UseLoadStateProps {
    autoZoom: () => void;
    canvas: fabric.Canvas | null;
    initialState: React.MutableRefObject<string | undefined>;
    canvasHistory: React.MutableRefObject<string[]>;
    setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  }

  type CanvasWithContextContainer = fabric.Canvas & {
    contextContainer?: CanvasRenderingContext2D | null;
  };

  export const useLoadState = ({
    canvas,
    autoZoom,
    initialState,
    canvasHistory,
    setHistoryIndex,
  }: UseLoadStateProps) => {
    const initialized = useRef(false);

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
          const currentState = JSON.stringify(canvas.toJSON(JSON_KEYS));

          canvasHistory.current = [currentState];
          setHistoryIndex(0);
          autoZoom();
        });
        initialized.current = true;
        return;
      }

      if (!initialized.current && canvas) {
        clearCanvasObjects(canvas);
        renderCanvas(canvas);

        const currentSnapshot = JSON.stringify(canvas.toJSON(JSON_KEYS));
        canvasHistory.current = [currentSnapshot];
        setHistoryIndex(0);
        autoZoom();
        initialized.current = true;
      }
    }, [
      canvas,
      autoZoom,
      initialState, 
      canvasHistory,
      setHistoryIndex, 
    ]);
  };
