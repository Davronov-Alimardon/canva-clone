import React, { useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import { Layer, LayerType, Tool } from '../types';

interface CanvasProps {
  layers: Layer[];
  activeLayer: Layer;
  tool: Tool;
  brushSize: number;
  onLayerUpdate: (id: string, updates: Partial<Layer>, options?: { addToHistory?: boolean }) => void;
  width: number;
  height: number;
  onCanvasReady: (canvas: fabric.Canvas) => void;
  onSelectionChange: (selectedObject: fabric.Object | null) => void;
}

const CanvasComponent: React.FC<CanvasProps> = ({
  layers,
  activeLayer,
  tool,
  brushSize,
  onLayerUpdate,
  width,
  height,
  onCanvasReady,
  onSelectionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  const onLayerUpdateRef = useRef(onLayerUpdate);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const activeLayerRef = useRef(activeLayer);
  const toolRef = useRef(tool);
  const isPanningRef = useRef(false);
  const lastClientXRef = useRef(0);
  const lastClientYRef = useRef(0);
  
  useEffect(() => {
    onLayerUpdateRef.current = onLayerUpdate;
    onSelectionChangeRef.current = onSelectionChange;
    activeLayerRef.current = activeLayer;
    toolRef.current = tool;
  });

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const mainCanvas = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#4a5568',
      selection: true,
      preserveObjectStacking: true,
    });
    fabricCanvasRef.current = mainCanvas;
    onCanvasReady(mainCanvas);

    const handlePathCreated = (opt: { path: fabric.Path }) => {
      const { path } = opt;
      const currentActiveLayer = activeLayerRef.current;
      const isEraser = toolRef.current === Tool.Eraser;
      // For state, save as opaque black/white for mask generation
      const color = isEraser ? '#000000' : '#FFFFFF';

      // FIX: Add layerId to the path object before serializing it.
      // This ensures the object is correctly associated with its layer in the state.
      // @ts-ignore
      path.layerId = currentActiveLayer.id;

      path.set({ evented: false, selectable: false, fill: color, stroke: color });

      // FIX: Include 'layerId' in the toObject call to persist the custom property.
      const pathDataForState = path.toObject(['layerId'] as any);
      const newObjects = [...(currentActiveLayer.objects || []), pathDataForState];
      
      onLayerUpdateRef.current(currentActiveLayer.id, { objects: newObjects }, { addToHistory: true });
    };

    const onObjectModified = (opt: any) => {
        const layerId = opt.target?.layerId;
        if (!opt.target || !layerId) return;

        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const newObjectsForLayer = canvas.getObjects()
            .filter(obj => obj.layerId === layerId)
            .map(obj => obj.toObject(['layerId'] as any));

        onLayerUpdateRef.current(layerId, { objects: newObjectsForLayer }, { addToHistory: true });
    };


    const onSelection = (e: any) => {
        const activeObject = e.selected && e.selected.length > 0 ? e.selected[0] : null;
        onSelectionChangeRef.current(activeObject as fabric.Object | null);
    };

    const onSelectionCleared = () => {
        onSelectionChangeRef.current(null);
    };

    const onMouseDown = (opt: any) => {
      if (toolRef.current !== Tool.Pan || !opt.e || opt.target) return;
      isPanningRef.current = true;
      const e = opt.e;
      const { clientX, clientY } = e instanceof TouchEvent ? e.touches[0] : e;
      lastClientXRef.current = clientX;
      lastClientYRef.current = clientY;
      mainCanvas.defaultCursor = 'grabbing';
      mainCanvas.renderAll();
    };

    const onMouseMove = (opt: any) => {
      if (!isPanningRef.current || !opt.e) return;
      const e = opt.e;
      const vpt = mainCanvas.viewportTransform;
      if (vpt) {
        const { clientX, clientY } = e instanceof TouchEvent ? e.touches[0] : e;
        vpt[4] += clientX - lastClientXRef.current;
        vpt[5] += clientY - lastClientYRef.current;
        mainCanvas.requestRenderAll();
        lastClientXRef.current = clientX;
        lastClientYRef.current = clientY;
      }
    };

    const onMouseUp = () => {
      isPanningRef.current = false;
      mainCanvas.defaultCursor = toolRef.current === Tool.Pan ? 'grab' : 'default';
      mainCanvas.renderAll();
    };
    
    mainCanvas.on('path:created', handlePathCreated);
    mainCanvas.on('object:modified', onObjectModified);
    mainCanvas.on('selection:created', onSelection);
    mainCanvas.on('selection:updated', onSelection);
    mainCanvas.on('selection:cleared', onSelectionCleared);
    mainCanvas.on('mouse:down', onMouseDown);
    mainCanvas.on('mouse:move', onMouseMove);
    mainCanvas.on('mouse:up', onMouseUp);

    return () => {
      mainCanvas.off('path:created');
      mainCanvas.off('object:modified');
      mainCanvas.off('selection:created');
      mainCanvas.off('selection:updated');
      mainCanvas.off('selection:cleared');
      mainCanvas.off('mouse:down');
      mainCanvas.off('mouse:move');
      mainCanvas.off('mouse:up');
      mainCanvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [width, height, onCanvasReady]);


  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const isDrawable = (activeLayer.type === LayerType.Sectional || activeLayer.type === LayerType.Global) && (tool === Tool.Brush || tool === Tool.Eraser);

    canvas.isDrawingMode = isDrawable;
    canvas.selection = !isDrawable;

    if (isDrawable) {
      const brush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush = brush;
      canvas.freeDrawingBrush.width = brushSize;
      
      // Set visual color based on tool. State color is handled in path:created
      if (tool === Tool.Eraser) {
        canvas.freeDrawingBrush.color = 'rgba(0,0,0,0.7)';
      } else {
        canvas.freeDrawingBrush.color = 'rgba(255,255,255,0.7)';
      }
      canvas.defaultCursor = 'crosshair';
    } else {
      canvas.defaultCursor = tool === Tool.Pan ? 'grab' : 'default';
    }
    
    canvas.getObjects().forEach(obj => {
        const isOnActiveLayer = obj.layerId === activeLayer.id;
        obj.selectable = !isDrawable && isOnActiveLayer && obj.type !== 'path';
        obj.evented = !isDrawable && isOnActiveLayer && obj.type !== 'path';
    });

    canvas.renderAll();
  }, [tool, brushSize, activeLayer]);

  // Render layers and objects
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const renderContent = async () => {
      // Clear canvas and reset background properties first.
      canvas.clear();
      canvas.backgroundColor = '#4a5568';
      canvas.backgroundImage = undefined;

      const globalLayer = layers.find(l => l.type === LayerType.Global);
      
      // Asynchronously load and set the background image if available.
      if (globalLayer?.isVisible && globalLayer.imageDataUrl) {
        try {
          const img = await fabric.Image.fromURL(globalLayer.imageDataUrl, { crossOrigin: 'anonymous' });
          canvas.backgroundImage = img;
        } catch (error) {
            console.error("Failed to load background image:", error);
            canvas.backgroundImage = undefined;
        }
      }
      
      // Process and add all other objects from visible layers.
      const visibleLayers = layers.filter(l => l.isVisible);

      for (const layer of visibleLayers) {
          const objectsToEnlivenForLayer = (layer.objects || []).map(o => ({...o, layerId: layer.id}));
          
          if (objectsToEnlivenForLayer.length > 0) {
              const enlivenedObjects: fabric.Object[] = await fabric.util.enlivenObjects(objectsToEnlivenForLayer);
              enlivenedObjects.forEach(obj => {
                const isOnActiveLayer = obj.layerId === activeLayer.id;
                
                if (obj.type === 'path') {
                    // Stored objects have opaque black/white strokes. We use this to decide rendering style.
                    if (obj.stroke === '#000000') { // Eraser path
                      const displayColor = 'rgba(0,0,0,0.7)';
                      obj.set({ 
                        stroke: displayColor,
                        fill: displayColor,
                        selectable: false, 
                        evented: false 
                      });
                    } else { // Brush path
                      const displayColor = 'rgba(255,255,255,0.7)';
                      obj.set({ 
                        stroke: displayColor, 
                        fill: displayColor, 
                        selectable: false, 
                        evented: false,
                      });
                    }
                } else {
                    const isDrawable = (activeLayer.type === LayerType.Sectional || activeLayer.type === LayerType.Global) && (tool === Tool.Brush || tool === Tool.Eraser);
                    obj.set({ selectable: !isDrawable && isOnActiveLayer, evented: !isDrawable && isOnActiveLayer });
                }
                canvas.add(obj);
              });
          }
      }
      
      // Finally, render everything once all assets are loaded and added.
      canvas.renderAll();
    };

    renderContent().catch(console.error);

  }, [layers, activeLayer.id, tool]);

  return (
    <div>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default CanvasComponent;