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
    activeGlobalLayerId,
    getActiveGlobalLayer,
    updateLayer,
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
    const activeGlobalLayer = getActiveGlobalLayer();
    if (!canvas || !activeGlobalLayer) return;
    
    // Get all objects except the workspace clip
    const currentObjects = canvas.getObjects().filter((obj) => obj.name !== "clip");
    
    // Update the active global layer with current canvas state
    updateLayer(activeGlobalLayer.id, { objects: currentObjects });
    
    // Call the project save callback
    saveCallback?.({
      json: JSON.stringify(canvas.toJSON()),
      height: canvas.getHeight(),
      width: canvas.getWidth(),
    });
  }, [canvas, getActiveGlobalLayer, updateLayer, saveCallback]);

  // --- Clipboard & utility hooks ---
const { copy, paste, canCopy, canPaste } = useClipboard({
  canvas,
  activeLayerId: activeGlobalLayerId,
  onObjectsAdded: (objects) => {
    const activeGlobalLayer = getActiveGlobalLayer();
    if (activeGlobalLayer) {
      updateLayer(activeGlobalLayer.id, { objects });
    }
  },
});

  // --- Canvas event handlers ---
  useCanvasEvents({
    save: handleSave,
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
      canCopy,
      canPaste,
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
  }, [canvas, copy, paste, canCopy, canPaste, undo, redo, handleSave, fillColor, strokeColor, strokeWidth, fontFamily, strokeDashArray, selectedObjects]);

  return {
    init,
    editor,
    setContainer,
    activeTool,
    setActiveTool,
    activeGlobalLayerId,
    getActiveGlobalLayer,
  };
}
