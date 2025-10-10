import { fabric } from "fabric";
import {
  createFilter,
  downloadFile,
  isTextType,
  transformText,
} from "@/features/editor/utils";
import { findWorkspace, centerObject } from "./use-editor-utils";
import { BuildEditorProps, Editor, JSON_KEYS, FONT_SIZE, SerializedFabricObject, FabricObjectWithLayer, LayerType } from "@/features/editor/types";
import { BASE_CANVAS_ID, useLayersStore  } from "./use-layer-store";


// Object classification for sectional layers
const INPAINTING_OBJECT_TYPES = ['path']; // Mask strokes that define masking purpose
const OTHER_OBJECT_TYPES = ['image', 'textbox', 'rect', 'circle']; // Supporting content

// Helper functions for object classification
const isInpaintingObject = (obj: fabric.Object): boolean =>
  INPAINTING_OBJECT_TYPES.includes(obj.type || '');

const isOtherObject = (obj: fabric.Object): boolean =>
  !isInpaintingObject(obj);

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
  // Independent tool states to prevent cross-contamination
  const drawToolState = {
    color: "rgba(0,0,0,1)", // black default
    width: 5
  };

  const maskToolState = {
    color: "#ff0000", // always red
    width: 20
  };

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

  const saveImage = (format: "png" | "jpg" | "svg", exportMode: "current-layer" | "flattened" = "flattened") => {
    const options = generateSaveOptions();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

    // Store original visibility states
    const originalVisibility = new Map<fabric.Object, boolean>();

    // Get current layer context
    const { activeGlobalLayerId, activeSectionalLayerId } = useLayersStore.getState();
    const currentLayerId = activeSectionalLayerId || activeGlobalLayerId;

    canvas.getObjects().forEach(obj => {
      if (obj.name === "clip") return; // Skip workspace

      // Store original visibility
      originalVisibility.set(obj, obj.visible || true);

      if (exportMode === "current-layer") {
        // Show only objects from current layer
        const isFromCurrentLayer = 'layerId' in obj && obj.layerId === currentLayerId;
        obj.set('visible', isFromCurrentLayer);
      } else if (exportMode === "flattened") {
        // Hide mask paths (sectional layer objects), show everything else
        const isMaskPath = obj.type === 'path' && 'layerId' in obj;
        obj.set('visible', !isMaskPath);
      }
    });

    // Force re-render with new visibility
    canvas.renderAll();

    // Generate export
    const dataUrl = canvas.toDataURL(options);

    // Restore original visibility
    originalVisibility.forEach((originalVisible, obj) => {
      obj.set('visible', originalVisible);
    });

    // Re-render with restored visibility
    canvas.renderAll();

    downloadFile(dataUrl, format);
  };

  const saveJson = async () => {
  const { layers, activeGlobalLayerId, clearOperationHistory } = useLayersStore.getState();

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

  // Clear operation history after manual save (create snapshot)
  clearOperationHistory();
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

        // Clear operation history to create initial snapshot after project load
        useLayersStore.getState().clearOperationHistory();

        canvas.renderAll();
      });
    } else {
      // Legacy format - load as before
      canvas.loadFromJSON(parsed, () => {
        // Clear operation history to create initial snapshot after legacy project load
        useLayersStore.getState().clearOperationHistory();
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

  // === Drawing Mode Implementations ===

  // Regular drawing mode for DrawSidebar (freehand art)
  const enableDrawingMode = () => {
    console.log('🔧 Enabling REGULAR drawing mode (for draw tool)');

    // Clean up any previous drawing state first
    disableDrawingMode();

    // Use Fabric.js built-in drawing system for freehand art
    canvas.isDrawingMode = true;

    // Set up Fabric.js free drawing brush with draw tool's independent state
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = drawToolState.width;
      canvas.freeDrawingBrush.color = drawToolState.color;
      canvas.freeDrawingBrush.strokeLineCap = 'round';
      canvas.freeDrawingBrush.strokeLineJoin = 'round';
    }

    canvas.defaultCursor = 'crosshair';
    canvas.selection = false;

    console.log('✅ Regular drawing mode ready with black color');
  };

  // Mask drawing mode for AI Sidebar (mask creation)
  const enableMaskDrawingMode = () => {

    // Clean up any previous drawing state first
    disableDrawingMode();

    const storeState = useLayersStore.getState();
    const activeLayer = storeState.activeSectionalLayerId
      ? storeState.getActiveSectionalLayer()
      : storeState.getActiveGlobalLayer();


    // USE Fabric's built-in drawing system for masks
    canvas.isDrawingMode = true;

    // Set up Fabric free drawing brush with mask tool's independent state
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = maskToolState.width;
      canvas.freeDrawingBrush.color = maskToolState.color; // Always red
      canvas.freeDrawingBrush.strokeLineCap = 'round';
      canvas.freeDrawingBrush.strokeLineJoin = 'round';
    }
    
    // Set canvas properties for mask drawing
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';

    // Make all objects non-selectable during mask drawing
    canvas.getObjects().forEach(obj => {
      if (obj.name !== "clip") {
        obj.selectable = false;
        obj.evented = false;
      }
    });

    // Store layer ID locally to avoid dependency on global state that gets cleared
    let capturedSectionalLayerId: string | null = null;

    // Add path:created event listener to capture completed brush strokes
    canvas.on('path:created', async (e) => {

      if (!e || typeof e !== 'object' || !('path' in e)) {
        return;
      }
      const path = e.path as fabric.Path;
      if (!path) {
        return;
      }

      // Get or create sectional layer for this brush session using transactions
      let targetSectionalLayerId = storeState.activeSectionalLayerId;

      if (!targetSectionalLayerId) {

        // Start a transaction for mask creation
        storeState.startTransaction('Create Mask Layer');

        // No active sectional layer, auto-create new one for this brush session
        const activeGlobalLayer = storeState.getActiveGlobalLayer();
        if (!activeGlobalLayer) {
          storeState.rollbackTransaction();
          return;
        }

        targetSectionalLayerId = await storeState.addSectionalLayer(
          activeGlobalLayer.id,
          `Mask ${Date.now()}`
        );

        if (targetSectionalLayerId) {
          storeState.setActiveSectionalLayer(targetSectionalLayerId);

          // The ADD_OBJECT operation will be added to this transaction by canvas events
          // We'll commit the transaction after the object is added
        } else {
          storeState.rollbackTransaction();
          return;
        }
      }

      // Tag the path object with the sectional layer ID
      if (targetSectionalLayerId && path && typeof path === 'object' && 'set' in path && typeof path.set === 'function') {
        (path as any).layerId = targetSectionalLayerId;

        // Store the layer ID locally so mouse:up can use it even if global state is cleared
        capturedSectionalLayerId = targetSectionalLayerId;

        console.log(`🖌️ MASK: Path tagged successfully`, {
          objectId: (path as any).objectId,
          layerId: (path as any).layerId
        });
      }
    });

    // Add mouse up detection to auto-exit drawing mode
    canvas.on('mouse:up', () => {
      // Use captured layer ID instead of global state (which gets cleared by Fabric.js)
      const currentSectionalLayerId = capturedSectionalLayerId;
      if (currentSectionalLayerId) {
        // Find all path objects belonging to this layer
        const layerObjects = canvas.getObjects().filter(obj => {
          if ('layerId' in obj) {
            return obj.layerId === currentSectionalLayerId && obj.type === 'path';
          }
          return false;
        });

        if (layerObjects.length > 0) {
          // Select the mask objects for editing with blue handles
          if (layerObjects.length === 1) {
            canvas.setActiveObject(layerObjects[0]);
          } else {
            // Multiple paths - create selection group
            const selection = new fabric.ActiveSelection(layerObjects, { canvas });
            canvas.setActiveObject(selection);
          }
        }

        // Make layer active in panel
        storeState.selectLayer(currentSectionalLayerId);
      }

      // Auto-exit drawing mode but keep selection enabled
      disableDrawingMode();
    });

    console.log('✅ Mask drawing mode ready (using Fabric brush)');
  };

  // Disable both drawing modes
  const disableDrawingMode = () => {

    // Don't clear active sectional layer - let it remain selected
    // Layer will be cleared when starting new brush session

    // IMMEDIATE canvas state reset for UI responsiveness
    canvas.isDrawingMode = false;
    canvas.selection = true; // Enable selection to allow mask object manipulation
    canvas.defaultCursor = 'default';

    // Force immediate cursor reset
    const canvasElement = canvas.getElement();
    if (canvasElement) {
      canvasElement.style.cursor = 'default';
    }

    // Reset Fabric brush if needed
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = 1; // Restore normal width
    }

    // Reset all objects to be selectable/evented
    canvas.getObjects().forEach(obj => {
      if (obj.name !== "clip") {
        obj.selectable = true;
        obj.evented = true;
      }
    });

    // Remove ALL possible custom event listeners (comprehensive cleanup)
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    canvas.off('path:created');
    canvas.off('mouse:dblclick');
    canvas.off('mouse:wheel');
    canvas.off('mouse:over');
    canvas.off('mouse:out');
    
    // Clean up temporary paths
    const tempPaths = canvas.getObjects().filter(obj => 
      obj.name === 'tempDrawingPath' || obj.name === 'tempMaskPath'
    );
    tempPaths.forEach(path => canvas.remove(path));
    
    canvas.renderAll();
  };

  return {
    // === File Actions ===
    savePng: (exportMode?: "current-layer" | "flattened") => saveImage("png", exportMode),
    saveJpg: (exportMode?: "current-layer" | "flattened") => saveImage("jpg", exportMode),
    saveSvg: (exportMode?: "current-layer" | "flattened") => saveImage("svg", exportMode),
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

    autoZoom: (): void => {
      const workspace = findWorkspace(canvas);
      if (!workspace) return;

      const container = canvas.getElement().parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const workspaceWidth = workspace.width || 0;
      const workspaceHeight = workspace.height || 0;

      if (workspaceWidth === 0 || workspaceHeight === 0) return;

      // Calculate scale to fit both dimensions with padding
      const scaleX = (containerWidth - 100) / workspaceWidth;
      const scaleY = (containerHeight - 100) / workspaceHeight;
      const scale = Math.min(scaleX, scaleY, 0.4); 

      // Calculate center point of container for proper anchoring
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      const centerPoint = new fabric.Point(centerX, centerY);

      // Use zoomToPoint for proper centering instead of setZoom
      canvas.zoomToPoint(centerPoint, scale);
      canvas.renderAll();
    },

    // === Drawing Modes ===
    enableDrawingMode,
    enableMaskDrawingMode,
    disableDrawingMode,

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

      // Check and handle layer cleanup after deletion
      const { layers, getActiveGlobalLayer } = useLayersStore.getState();

      // Check all sectional layers to see if they've been emptied
      const sectionalLayers = layers.filter(layer => layer.type === LayerType.Sectional);

      sectionalLayers.forEach(sectionalLayer => {
        // Classify objects by purpose: inpainting vs other
        const allLayerObjects = canvas.getObjects().filter(obj =>
          obj.name !== "clip" &&
          (obj as FabricObjectWithLayer).layerId === sectionalLayer.id
        );

        const inpaintingObjects = allLayerObjects.filter(obj => isInpaintingObject(obj));

        // Delete layer when no inpainting objects remain (regardless of other objects)
        if (inpaintingObjects.length === 0) {
          useLayersStore.getState().deleteLayer(sectionalLayer.id);
        }
      });

      // Check active global layer
      const activeGlobalLayer = getActiveGlobalLayer();
      if (activeGlobalLayer) {
        const currentObjects = canvas.getObjects().filter(obj =>
          obj.name !== "clip" &&
          (obj as FabricObjectWithLayer).layerId === activeGlobalLayer.id
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

    // === Tool-Specific Controls ===
    changeDrawToolColor: (value: string) => {
      drawToolState.color = value;
      // If currently in draw mode, update the brush immediately
      if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = value;
      }
      canvas.renderAll();
      save();
    },

    changeDrawToolWidth: (value: number) => {
      drawToolState.width = value;
      // If currently in draw mode, update the brush immediately
      if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = value;
      }
      canvas.renderAll();
      save();
    },

    changeMaskToolWidth: (value: number) => {
      maskToolState.width = value;
      // If currently in mask mode, update the brush immediately
      if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = value;
      }
      canvas.renderAll();
      save();
    },

    getDrawToolColor: () => drawToolState.color,
    getDrawToolWidth: () => drawToolState.width,
    getMaskToolWidth: () => maskToolState.width,

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