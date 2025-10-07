import { useState, useMemo, useCallback, useRef } from "react";
import { useHotkeys } from "./use-hotkeys";
import { useClipboard } from "./use-clipboard";
import { useCanvasEvents } from "./use-canvas-events";
import { useEditorInit } from "./use-editor-init";
import { buildEditor } from "./use-editor-build";
import { EditorHookProps, ActiveTool } from "@/features/editor/types";
import { useLayersStore } from "./use-layer-store";
import { useCanvasPanZoom } from "./use-canvas-pan-zoom";


/**
 * Main editor logic, unified with layer store (useLayersStore).
 */
export function useEditor({
  defaultHeight,
  defaultWidth,
  clearSelectionCallback,
  saveCallback,
}: EditorHookProps) {

  // --- Zustand store ---
  const {
    canvas,
    selectedObjects,
    setSelectedObjects,
    undo,
    redo,
  } = useLayersStore();


  // --- Local states ---
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
   const [activeTool, setActiveTool] = useState<ActiveTool>("select");

   const [fillColor, setFillColor] = useState("rgba(0,0,0,1)");
  const [strokeColor, setStrokeColor] = useState("rgba(0,0,0,1)");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeDashArray, setStrokeDashArray] = useState<number[]>([]);
  const [fontFamily, setFontFamily] = useState("Arial");

    // --- Initialize workspace ---
  // Create stable refs and a stable setter so `useEditorInit` returns a
  // stable `init` function (avoids re-creating the canvas on every render).
  const canvasHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(0);
  const setHistoryIndex = useCallback((n: number) => {
    historyIndexRef.current = n;
  }, []);

  const initialWidthRef = useRef<number>(defaultWidth ?? 0);
  const initialHeightRef = useRef<number>(defaultHeight ?? 0);

  const init = useEditorInit(
    canvasHistoryRef,
    setHistoryIndex,
    initialWidthRef,
    initialHeightRef,
  );

  const handleSave = useCallback(() => {
    const activeId = useLayersStore.getState().activeLayerId;
    if (!canvas || !activeId) return;
    const currentObjects = canvas.getObjects().filter((obj) => obj.name !== "clip");
    useLayersStore.getState().updateLayer(activeId, { objects: currentObjects });
    saveCallback?.({
      json: JSON.stringify(canvas.toJSON()),
      height: canvas.getHeight(),
      width: canvas.getWidth(),
    });
  }, [canvas, saveCallback]);


  const functionsRef = useRef({
    undo: () => useLayersStore.getState().undo(),
    redo: () => useLayersStore.getState().redo(),
    save: handleSave,
  });

  // --- Clipboard & utility hooks ---
  const { copy, paste } = useClipboard({
    canvas,
    activeLayerId: useLayersStore.getState().activeLayerId,
    onObjectsAdded: (objects) => {
      const activeId = useLayersStore.getState().activeLayerId;
      useLayersStore.getState().updateLayer(activeId, { objects });
    },
  });

  // --- Canvas event handlers ---
  useCanvasEvents({
    save: () => {
      const activeId = useLayersStore.getState().activeLayerId;
      if (!canvas || !activeId) return;

      const currentObjects = canvas.getObjects().filter((obj) => obj.name !== "clip");
      useLayersStore.getState().updateLayer(activeId, { objects: currentObjects });
      saveCallback?.({
        json: JSON.stringify(canvas.toJSON()),
        height: canvas.getHeight(),
        width: canvas.getWidth(),
      });
    },
    canvas: canvas!,
    setSelectedObjects,
    clearSelectionCallback,
    activeTool
  });

  // --- Hotkeys ---
  useHotkeys({
    canvas: canvas!,
    undo,
    redo,
    copy,
    paste,
    save: handleSave
  });

  // --- Memoized editor API ---
  const editor = useMemo(() => {
  if (!canvas) return undefined;

    return buildEditor({
      save: handleSave,
      undo,
      redo,
      canUndo: () => true, 
      canRedo: () => true, 
      copy,
      paste,
      canvas: canvas!,
      fillColor, 
      strokeColor, 
      strokeWidth, 
      fontFamily, 
      strokeDashArray,
      selectedObjects,
      setFillColor,
      setStrokeColor,
      setStrokeWidth,
      setStrokeDashArray,
      setFontFamily,
    });
  }, [canvas, copy, paste, undo, redo, handleSave, fillColor, strokeColor, strokeWidth, fontFamily, strokeDashArray, selectedObjects]);

  return {
    init,
    editor,
    setContainer,
    activeTool,
    setActiveTool,
  };
}
