import { fabric } from "fabric";
import {
  createFilter,
  downloadFile,
  isTextType,
  transformText,
} from "@/features/editor/utils";
import { findWorkspace, centerObject } from "./use-editor-utils";
import { BuildEditorProps, Editor, JSON_KEYS, FONT_SIZE, SerializedFabricObject, LayerAwareFabricObject } from "@/features/editor/types";
import { BASE_CANVAS_ID, useLayersStore  } from "./use-layer-store";


export function buildEditor({
  save,
  undo,
  redo,
  canRedo,
  canUndo,
  copy,
  paste,
  canvas,
  fillColor,
  fontFamily,
  setFontFamily,
  setFillColor,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  selectedObjects,
  strokeDashArray,
  setStrokeDashArray,
}: BuildEditorProps): Editor {
  const generateSaveOptions = () => {
    const workspace = findWorkspace(canvas);

    const width = workspace?.get("width") ?? canvas.getWidth() ?? 0;
    const height = workspace?.get("height") ?? canvas.getHeight() ?? 0;
    const left = workspace?.get("left") ?? 0;
    const top = workspace?.get("top") ?? 0;

    return {
      name: "Image",
      format: "png",
      quality: 1,
      width,
      height,
      left,
      top,
    };
  };

  const saveImage = (format: "png" | "jpg" | "svg") => {
    const options = generateSaveOptions();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);
    downloadFile(dataUrl, format);
  };

  const saveJson = async () => {
  const { layers, activeGlobalLayerId } = useLayersStore.getState();
  
  // Get current canvas state
  const canvasData = canvas.toJSON(JSON_KEYS);
  
  // Create enhanced save data with layer information
  const saveData = {
    timestamp: new Date().toISOString(),
    layers: layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      parentId: layer.parentId,
      imageDataUrl: layer.imageDataUrl,
      referenceImageUrls: layer.referenceImageUrls,
      maskDataUrl: layer.maskDataUrl,
      isVisible: layer.isVisible,
      isActive: layer.isActive,
      prompt: layer.prompt,
      objects: layer.objects, // Include the layer's stored objects
      children: layer.children
    })),
    activeGlobalLayerId,
    canvasData: canvasData, // Keep original canvas data for compatibility
  };

  await transformText(canvasData.objects);
  
  const fileString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(saveData, null, "\t"),
  )}`;
  downloadFile(fileString, "json");
};

  const loadJson = (json: string) => {
  try {

    if (!canvas || !canvas.getContext()) {
      console.warn('Canvas not ready for loading');
      return;
    }

    const parsed = JSON.parse(json);
    
    // Check if it has layers (layer-aware format)
    if (parsed.layers) {
      // Load layer-aware project
      const { layers, activeGlobalLayerId, canvasData } = parsed;
      
      // clear the current state
      useLayersStore.getState().setCanvas(canvas);
      
      // Load the canvas data first
      canvas.loadFromJSON(canvasData, () => {
        // Restore the layer structure
        useLayersStore.setState({
          layers: layers,
          activeGlobalLayerId: activeGlobalLayerId,
        });
        
        // Re-tag all objects with their layer IDs using proper typing
        const allObjects = canvas.getObjects();
        allObjects.forEach(obj => {
          if (obj.name !== "clip") {
            // Find which layer this object belongs to by matching object properties
            const objectData = canvasData.objects?.find((o: SerializedFabricObject) => {
              // Match objects by multiple properties since Fabric doesn't guarantee stable IDs
              return o.left === obj.left && 
                     o.top === obj.top && 
                     o.type === obj.type;
            });
            
            if (objectData && objectData.layerId) {
              // Use the store method to properly tag the object
              useLayersStore.getState().tagObjectWithActiveLayer(obj);
            }
          }
        });
        
        // Activate the saved active layer
        useLayersStore.getState().setActiveGlobalLayer(activeGlobalLayerId);
        
        canvas.renderAll();
      });
    } else {
      // Legacy format - load as before
      canvas.loadFromJSON(parsed, () => {
        canvas.renderAll();
      });
    }
  } catch (err) {
    console.error("Failed to load JSON:", err);
  }
};

  const addToCanvas = (object: fabric.Object) => {
    centerObject(canvas, object);
    canvas.add(object);
    canvas.setActiveObject(object);
  };

  return {
    // === File Actions ===
    savePng: () => saveImage("png"),
    saveJpg: () => saveImage("jpg"),
    saveSvg: () => saveImage("svg"),
    saveJson,
    loadJson,

    // === State ===
    canUndo,
    canRedo,
    getWorkspace: () => {
      const workspace = findWorkspace(canvas);
      return workspace ?? undefined; 
    },

     // === Undo/Redo Methods ===
    onUndo: (): void => {
      undo();
    },

    onRedo: (): void => {
      redo();
    },

  // === Zoom Controls ===
    zoomIn: (): void => {
      const zoom = canvas.getZoom();
      const newZoom = Math.min(5, zoom * 1.2); // Limit max zoom to 5x
      canvas.zoomToPoint(new fabric.Point(0, 0), newZoom);
      canvas.requestRenderAll();
    },

    zoomOut: (): void => {
      const zoom = canvas.getZoom();
      const newZoom = Math.max(0.2, zoom / 1.2); // Limit min zoom to 0.2x
      canvas.zoomToPoint(new fabric.Point(0, 0), newZoom);
      canvas.requestRenderAll();
    },

    // === Drawing Mode ===
enableDrawingMode: () => {
  canvas.isDrawingMode = true;
  canvas.freeDrawingBrush.width = strokeWidth;
  canvas.freeDrawingBrush.color = strokeColor;
  
  // Add event listener to tag drawn objects
  canvas.on('path:created', (e: fabric.IEvent) => {
    const path = e.target;
    if (path) {
      useLayersStore.getState().tagObjectWithActiveLayer(path);
    }
  });
},

disableDrawingMode: () => {
  canvas.isDrawingMode = false;
  // Remove the event listener to prevent memory leaks
  canvas.off('path:created');
},

    // === Editing Actions ===
    changeFillColor: (value: string) => {
      setFillColor(value);
      for (const obj of canvas.getActiveObjects()) {
        obj.set({ fill: value });
      }
      canvas.renderAll();
      save();
    },

    addText: (value: string, options?: Partial<fabric.ITextboxOptions>) => {
  const text = new fabric.Textbox(value, {
    fill: fillColor,
    ...options,
  });
  
  // Use the store method to tag the object
  useLayersStore.getState().tagObjectWithActiveLayer(text);
  
  addToCanvas(text);
  save();
},

     // === Font Controls ===
    getActiveFontFamily: (): string => {
      const active = canvas.getActiveObject();
      // Check if it's a text object and get its fontFamily
      if (active && 'fontFamily' in active) {
        const font = (active as fabric.Textbox).fontFamily;
        return typeof font === 'string' ? font : fontFamily;
      }
      return fontFamily;
    },

    changeFontFamily: (fontFamily: string): void => {
      setFontFamily(fontFamily);
      // Update selected text objects on canvas
      canvas.getActiveObjects().forEach((obj) => {
        if ('fontFamily' in obj) {
          obj.set({ fontFamily });
        }
      });
      canvas.renderAll();
      save();
    },

    getActiveFontWeight: (): number => {
  const active = canvas.getActiveObject();
  if (active && 'fontWeight' in active) {
    const weight = (active as fabric.Textbox).fontWeight;
    return typeof weight === 'number' ? weight : 400; 
  }
  return 400;
},

 getActiveFontStyle: (): string => {
      const active = canvas.getActiveObject();
      if (active && 'fontStyle' in active) {
        const style = (active as fabric.Textbox).fontStyle;
        return typeof style === 'string' ? style : 'normal';
      }
      return 'normal';
    },

    getActiveFontLinethrough: (): boolean => {
      const active = canvas.getActiveObject();
      if (active && 'linethrough' in active) {
        return (active as fabric.Textbox).linethrough || false;
      }
      return false;
    },

    getActiveFontUnderline: (): boolean => {
      const active = canvas.getActiveObject();
      if (active && 'underline' in active) {
        return (active as fabric.Textbox).underline || false;
      }
      return false;
    },

    getActiveTextAlign: (): string => {
      const active = canvas.getActiveObject();
      if (active && 'textAlign' in active) {
        const align = (active as fabric.Textbox).textAlign;
        return typeof align === 'string' ? align : 'left';
      }
      return 'left';
    },

    getActiveFontSize: (): number => {
      const active = canvas.getActiveObject();
      if (active && 'fontSize' in active) {
        const size = (active as fabric.Textbox).fontSize;
        return typeof size === 'number' ? size : FONT_SIZE;
      }
      return FONT_SIZE;
    },

    changeFontSize: (size: number): void => {
      canvas.getActiveObjects().forEach((obj) => {
        if ('fontSize' in obj) {
          obj.set({ fontSize: size });
        }
      });
      canvas.renderAll();
      save();
    },

    changeTextAlign: (align: string): void => {
      canvas.getActiveObjects().forEach((obj) => {
        if ('textAlign' in obj) {
          obj.set({ textAlign: align });
        }
      });
      canvas.renderAll();
      save();
    },

    changeFontWeight: (weight: number): void => {
      canvas.getActiveObjects().forEach((obj) => {
        if ('fontWeight' in obj) {
          obj.set({ fontWeight: weight });
        }
      });
      canvas.renderAll();
      save();
    },

    changeFontStyle: (style: string): void => {
      canvas.getActiveObjects().forEach((obj) => {
        if ('fontStyle' in obj) {
          obj.set({ fontStyle: style });
        }
      });
      canvas.renderAll();
      save();
    },

    changeFontLinethrough: (linethrough: boolean): void => {
      canvas.getActiveObjects().forEach((obj) => {
        if ('linethrough' in obj) {
          obj.set({ linethrough });
        }
      });
      canvas.renderAll();
      save();
    },

    changeFontUnderline: (underline: boolean): void => {
      canvas.getActiveObjects().forEach((obj) => {
        if ('underline' in obj) {
          obj.set({ underline });
        }
      });
      canvas.renderAll();
      save();
    },

    // === Layer Ordering Methods ===
    bringForward: (): void => {
      useLayersStore.getState().bringForward();
    },

    sendBackwards: (): void => {
      useLayersStore.getState().sendBackward();
    },

    // === Clipboard Methods ===
    onCopy: (): void => {
      copy();
    },

    onPaste: (): void => {
      paste();
    },

    // === Delete Method ===
    // In use-editor-build.ts, update the delete method to match:
// In use-editor-build.ts
delete: (): void => {
  const activeObjects = canvas.getActiveObjects();
  activeObjects.forEach((obj) => {
    canvas.remove(obj);
  });

  useLayersStore.getState().resetCanvasState();
  canvas.discardActiveObject();

  canvas.isDrawingMode = false;
  canvas.selection = true;
  canvas.defaultCursor = 'default';

  canvas.renderAll();
  
  // ✅ Same logic as above
  const activeGlobalLayer = useLayersStore.getState().getActiveGlobalLayer();
  if (activeGlobalLayer) {
    const currentObjects = canvas.getObjects().filter(obj => 
      obj.name !== "clip" && 
      (obj as LayerAwareFabricObject).layerId === activeGlobalLayer.id
    );
    
    if (currentObjects.length === 0 && activeGlobalLayer.id !== BASE_CANVAS_ID) {
      useLayersStore.getState().deleteLayer(activeGlobalLayer.id);
    } else {
      const serializedObjects = currentObjects.map(obj => obj.toObject());
      useLayersStore.getState().updateLayer(activeGlobalLayer.id, { 
        objects: serializedObjects 
      });
    }
  }
  
  save();
},

    // === Stroke / Brush Controls ===
    changeStrokeColor: (value: string) => {
      setStrokeColor(value);
      if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = value;
      }
      for (const obj of canvas.getActiveObjects()) {
        obj.set({ stroke: value });
      }
      canvas.renderAll();
      save();
    },

    getActiveStrokeColor: () => {
      const active = canvas.getActiveObject();
      const color = active?.get("stroke");
      return typeof color === "string" ? color : strokeColor;
    },

    changeStrokeWidth: (value: number) => {
      setStrokeWidth(value);
      if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = value;
      }
      for (const obj of canvas.getActiveObjects()) {
        obj.set({ strokeWidth: value });
      }
      canvas.renderAll();
      save();
    },

    getActiveStrokeWidth: () => {
      const active = canvas.getActiveObject();
      const width = active?.get("strokeWidth");
      return typeof width === "number" ? width : strokeWidth;
    },

    // === Stroke Dash Array Methods ===
    getActiveStrokeDashArray: (): number[] => {
      const active = canvas.getActiveObject();
      const dashArray = active?.get("strokeDashArray");
      return Array.isArray(dashArray) ? dashArray : strokeDashArray;
    },

    changeStrokeDashArray: (dashArray: number[]): void => {
      setStrokeDashArray(dashArray);
      for (const obj of canvas.getActiveObjects()) {
        obj.set({ strokeDashArray: dashArray });
      }
      canvas.renderAll();
      save();
    },

     // === Opacity Controls ===
    getActiveOpacity: (): number => {
      const active = canvas.getActiveObject();
      const opacity = active?.get("opacity");
      return typeof opacity === "number" ? opacity : 1;
    },

    changeOpacity: (opacity: number): void => {
      for (const obj of canvas.getActiveObjects()) {
        obj.set({ opacity });
      }
      canvas.renderAll();
      save();
    },

    // === Background Controls ===
    changeBackground: (color: string): void => {
      const workspace = findWorkspace(canvas);
      if (workspace) {
        workspace.set({ fill: color });
        canvas.renderAll();
        save();
      }
    },

    // === Size Controls ===
    changeSize: (size: { width: number; height: number }): void => {
      const workspace = findWorkspace(canvas);
      if (workspace) {
        workspace.set({
          width: size.width,
          height: size.height,
        });
        canvas.renderAll();
        save();
      }
    },

     // === Fill Color Getter ===
    getActiveFillColor: (): string => {
      const active = canvas.getActiveObject();
      const fill = active?.get("fill");
      return typeof fill === "string" ? fill : fillColor;
    },

    // === Image Filter Controls ===
changeImageFilter: (filter: string): void => {
  const activeObjects = canvas.getActiveObjects();
  
  activeObjects.forEach((obj) => {
    // Only apply filters to image objects
    if (obj.type === 'image') {
      const fabricImage = obj as fabric.Image;
      
      // Remove existing filters
      fabricImage.filters = [];
      
      // Apply new filter based on the filter name
      switch (filter) {
        case 'grayscale':
        case 'greyscale':
          fabricImage.filters.push(new fabric.Image.filters.Grayscale());
          break;
        case 'sepia':
          fabricImage.filters.push(new fabric.Image.filters.Sepia());
          break;
        case 'invert':
          fabricImage.filters.push(new fabric.Image.filters.Invert());
          break;
        case 'brightness':
          fabricImage.filters.push(new fabric.Image.filters.Brightness({ brightness: 0.1 }));
          break;
        case 'contrast':
          fabricImage.filters.push(new fabric.Image.filters.Contrast({ contrast: 0.1 }));
          break;
        case 'saturation':
          fabricImage.filters.push(new fabric.Image.filters.Saturation({ saturation: 0.1 }));
          break;
        case 'pixelate':
          fabricImage.filters.push(new fabric.Image.filters.Pixelate({ blocksize: 8 }));
          break;
        case 'blur':
          fabricImage.filters.push(new fabric.Image.filters.Blur({ blur: 0.1 }));
          break;
        case 'sharpen':
          fabricImage.filters.push(new fabric.Image.filters.Convolute({
            matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0]
          }));
          break;
        case 'emboss':
          fabricImage.filters.push(new fabric.Image.filters.Convolute({
            matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1]
          }));
          break;
        case 'blacknwhite':
          // Use grayscale for black and white
          fabricImage.filters.push(new fabric.Image.filters.Grayscale());
          break;
        case 'huerotate':
          fabricImage.filters.push(new fabric.Image.filters.HueRotation({ rotation: 0.1 }));
          break;
        case 'blendcolor':
          fabricImage.filters.push(new fabric.Image.filters.BlendColor({
            color: '#FF0000',
            mode: 'multiply'
          }));
          break;
        case 'vibrance':
          // Vibrance might not be available, use saturation instead
          fabricImage.filters.push(new fabric.Image.filters.Saturation({ saturation: 0.2 }));
          break;
        case 'none':
        default:
          // No filter applied
          break;
      }
      
      // Apply the filters
      fabricImage.applyFilters();
    }
  });
  
  canvas.renderAll();
  save();
},

    // === Selection / Clipboard ===
    selectedObjects,
    canvas,
  };
}
