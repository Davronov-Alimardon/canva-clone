"use client";

import { fabric } from "fabric";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useRef, useState } from "react";

import { ResponseType } from "@/features/projects/api/use-get-project";
import { useUpdateProject } from "@/features/projects/api/use-update-project";

import { ActiveTool, selectionDependentTools } from "@/features/editor/types";
import { Navbar } from "@/features/editor/components/navbar";
import { Footer } from "@/features/editor/components/footer";
import { useEditor } from "@/features/editor/hooks/use-editor";
import { Sidebar } from "@/features/editor/components/sidebar";
import { Toolbar } from "@/features/editor/components/toolbar";
import { FillColorSidebar } from "@/features/editor/components/fill-color-sidebar";
import { StrokeColorSidebar } from "@/features/editor/components/stroke-color-sidebar";
import { StrokeWidthSidebar } from "@/features/editor/components/stroke-width-sidebar";
import { OpacitySidebar } from "@/features/editor/components/opacity-sidebar";
import { TextSidebar } from "@/features/editor/components/text-sidebar";
import { FontSidebar } from "@/features/editor/components/font-sidebar";
import { ImageSidebar } from "@/features/editor/components/image-sidebar";
import { FilterSidebar } from "@/features/editor/components/filter-sidebar";
import { DrawSidebar } from "@/features/editor/components/draw-sidebar";
import { AiSidebar } from "@/features/editor/components/ai-sidebar";
import { SettingsSidebar } from "@/features/editor/components/settings-sidebar";
import { useLayersStore } from "../hooks/use-layer-store";
import { LayersPanel } from "./layers-panel";

interface EditorProps {
  initialData: ResponseType["data"];
}

export const Editor = ({ initialData }: EditorProps) => {
   const [activeTool, setActiveTool] = useState<ActiveTool>("select");
   const [isCanvasInitialized, setIsCanvasInitialized] = useState(false);

  const onClearSelection = useCallback(() => {
    if (selectionDependentTools.includes(activeTool)) {
      setActiveTool("select");
    }
  }, [activeTool]);

  const { mutate } = useUpdateProject(initialData.id);

   // === Editor setup ===
  const { init, editor, setContainer } = useEditor({
    defaultState: initialData.json,
    defaultWidth: initialData.width,
    defaultHeight: initialData.height,
    clearSelectionCallback: onClearSelection
  });

  // === Active tool handling ===
  const onChangeActiveTool = useCallback(
    (tool: ActiveTool) => {
      if (tool === "draw") editor?.enableDrawingMode?.();
      if (activeTool === "draw") editor?.disableDrawingMode?.();

      if (tool === activeTool) return setActiveTool("select");
      setActiveTool(tool);
    },
    [activeTool, editor]
  );

  // === Refs ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // === Initialize canvas ===
useEffect(() => {
  if (!canvasRef.current || !containerRef.current) return;

  let canvas: fabric.Canvas | null = null;

  try {
    canvas = new fabric.Canvas(canvasRef.current, {
      controlsAboveOverlay: true,
      preserveObjectStacking: true,
    });

    useLayersStore.getState().setCanvas(canvas);

    init({
      initialCanvas: canvas,
      initialContainer: containerRef.current,
    });

    // Delay zoom and pan to ensure canvas is fully initialized
    setTimeout(() => {
  if (canvas?.getContext()) {
    try {
      canvas.setZoom(0.8);
      
      const centerCanvas = () => {
        const containerWidth = containerRef.current?.offsetWidth || 0;
        const containerHeight = containerRef.current?.offsetHeight || 0;
        const canvasWidth = (canvas?.getWidth() ?? 0) * 0.8;
        const canvasHeight = (canvas?.getHeight() ?? 0) * 0.8;
        
        const centerX = (containerWidth - canvasWidth) / 2;
        const centerY = (containerHeight - canvasHeight) / 2;
        
        canvas?.absolutePan(new fabric.Point(centerX, centerY));
      };

      centerCanvas();
      setIsCanvasInitialized(true);
    } catch (error) {
      console.warn('Canvas zoom/pan failed:', error);
    }
  }
}, 200);

  } catch (error) {
    console.error('Failed to initialize canvas:', error);
  }

  return () => {
    if (canvas) {
      canvas.dispose();
    }
  };
}, [init]);

  const editorRef = useRef(editor);

useEffect(() => {
  if (editor) {
    editorRef.current = editor;
  }
}, [editor]);

  // === Layout ===
  return (
    <div className="h-full flex flex-col">
      <Navbar
        id={initialData.id}
        editor={editorRef.current}
        activeTool={activeTool}
        onChangeActiveTool={onChangeActiveTool}
      />
      <div className="w-full h-full flex">
        <Sidebar activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <StrokeColorSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <StrokeWidthSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <OpacitySidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <TextSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <FontSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <ImageSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <FilterSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <AiSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <DrawSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <SettingsSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />

        <main className="w-full bg-muted flex-1 overflow-auto relative flex flex-col">
          <Toolbar
            editor={editor}
            activeTool={activeTool}
            onChangeActiveTool={onChangeActiveTool}
          />
          <div
            className="flex-1 h-[calc(100%-124px)] bg-muted relative"
            ref={(node) => {
              containerRef.current = node;
              setContainer(node);
            }}
          >
            <div className="absolute right-0 top-0 z-50 p-2">
            <LayersPanel className="" />
            </div>
            <canvas ref={canvasRef}/>
          </div>
          <Footer editor={editor} />
        </main>
      </div>
    </div>
  );
};
