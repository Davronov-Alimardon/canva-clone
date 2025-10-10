// editor.tsx - with AI sidebar
"use client";

import { fabric } from "fabric";
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

  const clearSelectionRef = useRef<() => void>(() => {
    console.log('Clear selection placeholder');
  });

  // === Editor setup ===
  const { init, editor, setContainer } = useEditor({
    defaultState: initialData.json,
    defaultWidth: initialData.width,
    defaultHeight: initialData.height,
    clearSelectionCallback: () => clearSelectionRef.current(),
    activeTool: activeTool, 
    onChangeActiveTool: setActiveTool 
  });

  useEffect(() => {
    clearSelectionRef.current = () => {
      if (selectionDependentTools.includes(activeTool)) {
        setActiveTool("select");
      }
    };
  }, [activeTool, setActiveTool]);

  const onChangeActiveTool = useCallback((tool: ActiveTool) => {
  console.log('🛠️ Tool changing to:', tool);

   if (tool === activeTool && tool !== "select") {
    console.log('⏭️ Tool already active, skipping');
    return;
  }

  setActiveTool(tool);
  
  // If switching to brush, ensure we're not in a state that would conflict
  if (tool === "brush") {
    console.log('🎯 Brush tool activated - ensuring proper state');
    
    // Small delay to ensure state is updated before any canvas operations
    setTimeout(() => {
      if (editorRef.current?.canvas) {
        console.log('🔧 Setting canvas for brush tool');
        editorRef.current.canvas.defaultCursor = 'crosshair';
        editorRef.current.canvas.selection = false;
        editorRef.current.canvas.renderAll();

        setTimeout(() => {
          if (editorRef.current?.canvas) {
            editorRef.current.canvas.defaultCursor = 'crosshair';
            editorRef.current.canvas.renderAll();
            console.log('✅ Crosshair cursor confirmed');
          }
        }, 50);
      }
    }, 150);
    
  }
}, [activeTool,setActiveTool]);

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

      // Initialize canvas without setting zoom (autoZoom will handle it)
      const initializeCanvas = () => {
        if (canvas?.getContext()) {
          try {
            canvas.renderAll();
            setIsCanvasInitialized(true);
          } catch (error) {
            console.warn('Canvas initialization failed:', error);
          }
        }
      };

      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        initializeCanvas();

        // Auto-zoom canvas to fit container after initialization
        setTimeout(() => {
          if (editorRef.current?.autoZoom) {
            editorRef.current.autoZoom();
          }
        }, 100);
      });

    } catch (error) {
      console.error('Failed to initialize canvas:', error);
    }

    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [init]);

  // === Window resize handler for canvas centering ===
  useEffect(() => {
    if (!isCanvasInitialized || !editor?.canvas) return;

    const handleResize = () => {
      // Canvas is now centered via CSS, but we may need to trigger re-render
      if (editor?.canvas) {
        editor.canvas.renderAll();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCanvasInitialized, editor?.canvas]);

  const editorRef = useRef(editor);

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  // === Layout ===
  return (
    <div className="w-full h-full flex flex-col">
      <Navbar
        id={initialData.id}
        editor={editorRef.current}
        activeTool={activeTool}
        onChangeActiveTool={onChangeActiveTool}
      />
      <div className="w-full h-full flex">
        {/* Main Sidebar */}
        <Sidebar activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />

        {/* Tool Sidebars - Absolute Positioned */}
        <StrokeColorSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <StrokeWidthSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <OpacitySidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <TextSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <FontSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <ImageSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <FilterSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <AiSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <DrawSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <SettingsSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />

        {/* Main Workspace - Full Width */}
        <main className="flex-1 h-full bg-muted overflow-hidden flex flex-col relative">
          <Toolbar
            editor={editor}
            activeTool={activeTool}
            onChangeActiveTool={onChangeActiveTool}
          />
          <div
            className="flex-1 bg-muted relative flex items-center justify-center overflow-hidden p-0 m-0"
            ref={(node) => {
              containerRef.current = node;
              setContainer(node);
            }}
          >
            {/* Layers Panel */}
            <div className="absolute right-0 top-0 z-50 p-2">
              <LayersPanel />
            </div>
            <canvas
              ref={canvasRef}
              className="object-contain p-0 m-0"
            />
          </div>
          <Footer editor={editor} />
        </main>
      </div>
    </div>
  );
};