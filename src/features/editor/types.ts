import { fabric } from "fabric";
import { ITextboxOptions } from "fabric/fabric-impl";
import * as material from "material-colors";

export const JSON_KEYS = [
  "name",
  "gradientAngle",
  "selectable",
  "hasControls",
  "linkData",
  "editable",
  "extensionType",
  "extension",

  // Essential Fabric.js properties for images
  "src",
  "filters",
  "crossOrigin",
  "cropX",
  "cropY",

  // Core positioning and styling
  "left",
  "top",
  "width",
  "height",
  "scaleX",
  "scaleY",
  "angle",
  "opacity",
  "visible",
  "fill",
  "stroke",
  "strokeWidth",
  "strokeDashArray",
  "strokeLineCap",
  "strokeDashOffset",
  "strokeLineJoin",
  "strokeUniform",
  "strokeMiterLimit",
  "flipX",
  "flipY",
  "shadow",
  "backgroundColor",
  "fillRule",
  "paintFirst",
  "globalCompositeOperation",
  "skewX",
  "skewY"
];

export const filters = [
  "none",
  "polaroid",
  "sepia",
  "kodachrome",
  "contrast",
  "brightness",
  "greyscale",
  "brownie",
  "vintage",
  "technicolor",
  "pixelate",
  "invert",
  "blur",
  "sharpen",
  "emboss",
  "removecolor",
  "blacknwhite",
  "vibrance",
  "blendcolor",
  "huerotate",
  "resize",
  "saturation",
  "gamma",
];

export const fonts = [
  "Arial",
  "Arial Black",
  "Verdana",
  "Helvetica",
  "Tahoma",
  "Trebuchet MS",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Courier New",
  "Brush Script MT",
  "Palatino",
  "Bookman",
  "Comic Sans MS",
  "Impact",
  "Lucida Sans Unicode",
  "Geneva",
  "Lucida Console",
];

export const selectionDependentTools = [
  "fill",
  "font",
  "filter",
  "opacity",
  "remove-bg",
  "stroke-color",
  "stroke-width",
];

export const colors = [
  material.red["500"],
  material.pink["500"],
  material.purple["500"],
  material.deepPurple["500"],
  material.indigo["500"],
  material.blue["500"],
  material.lightBlue["500"],
  material.cyan["500"],
  material.teal["500"],
  material.green["500"],
  material.lightGreen["500"],
  material.lime["500"],
  material.yellow["500"],
  material.amber["500"],
  material.orange["500"],
  material.deepOrange["500"],
  material.brown["500"],
  material.blueGrey["500"],
  "transparent",
];

// ========== Diff-Based Undo System ==========

export interface CanvasOperation {
  id: string;
  type: OperationType;
  timestamp: number;
  forward: OperationData;
  backward: OperationData;
  batchId?: string;
}

export type OperationType =
  | "ADD_LAYER"
  | "REMOVE_LAYER"
  | "MODIFY_LAYER"
  | "ADD_OBJECT"
  | "REMOVE_OBJECT"
  | "MODIFY_OBJECT"
  | "MOVE_OBJECT"
  | "ADD_MASK"
  | "REMOVE_MASK"
  | "SET_ACTIVE_LAYER"
  | "BATCH"
  | "TRANSACTION";

export interface OperationData {
  [key: string]: unknown;
}

export interface AddLayerData extends OperationData {
  layer: Layer;
}

export interface RemoveLayerData extends OperationData {
  layerId: string;
  layer?: Layer;
}

export interface ModifyLayerData extends OperationData {
  layerId: string;
  changes: Partial<Layer>;
  previousValues?: Partial<Layer>;
}

export interface AddObjectData extends OperationData {
  layerId: string;
  objectData: LayerObjectData;
  objectId: string;
}

export interface RemoveObjectData extends OperationData {
  layerId: string;
  objectId: string;
  objectData?: LayerObjectData;
}

export interface ModifyObjectData extends OperationData {
  layerId: string;
  objectId: string;
  changes: Partial<fabric.Object>;
  previousValues?: Partial<fabric.Object>;
}

export interface MoveObjectData extends OperationData {
  layerId: string;
  objectId: string;
  fromPosition: { left: number; top: number };
  toPosition: { left: number; top: number };
}

export interface SetActiveLayerData extends OperationData {
  previousLayerId: string | null;
  newLayerId: string;
  layerType: "global" | "sectional";
}

// ========== Transaction System ==========

export interface CanvasTransaction {
  id: string;
  name: string;
  timestamp: number;
  operations: CanvasOperation[];
}

export interface TransactionData extends OperationData {
  transaction: CanvasTransaction;
}

export interface CanvasBaseline {
  id: string;
  timestamp: number;
  layers: Layer[];
  activeGlobalLayerId: string | null;
  activeSectionalLayerId: string | null;
  canvasState: {
    zoom: number;
    panX: number;
    panY: number;
    width: number;
    height: number;
  };
  reason: "project_load" | "new_document" | "destructive_action" | "batch_start";
}

export interface OperationHistory {
  operations: CanvasOperation[];
  future: CanvasOperation[];
}

export type ActiveTool =
  | "select"
  | "shapes"
  | "text"
  | "images"
  | "draw"
  | "fill"
  | "stroke-color"
  | "stroke-width"
  | "font"
  | "opacity"
  | "filter"
  | "settings"
  | "ai"
  | "remove-bg"
  | "brush"
  | "eraser"
  | "pan";

export const FILL_COLOR = "rgba(0,0,0,1)";
export const STROKE_COLOR = "rgba(0,0,0,1)";
export const STROKE_WIDTH = 2;
export const STROKE_DASH_ARRAY: number[] = [];
export const FONT_FAMILY = "Arial";
export const FONT_SIZE = 32;
export const FONT_WEIGHT = 400;

export const TEXT_OPTIONS = {
  type: "textbox",
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  fontSize: FONT_SIZE,
  fontFamily: FONT_FAMILY,
};

export interface PathCreatedEvent extends fabric.IEvent {
  path: fabric.Path;
}

export interface EditorHookProps {
  defaultState?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  clearSelectionCallback?: () => void;
  saveCallback?: (values: {
    json: string;
    height: number;
    width: number;
  }) => void;
  activeTool?: ActiveTool;
  onChangeActiveTool?: (tool: ActiveTool) => void;
}

export type BuildEditorProps = {
  undo: () => void;
  redo: () => void;
  save: (skip?: boolean) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  copy: () => void;
  paste: () => void;
  canCopy: () => boolean;
  canPaste: () => boolean;
  canvas: fabric.Canvas;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  selectedObjects: fabric.Object[];
  strokeDashArray: number[];
  fontFamily: string;
  setStrokeDashArray: (value: number[]) => void;
  setFillColor: (value: string) => void;
  setStrokeColor: (value: string) => void;
  setStrokeWidth: (value: number) => void;
  setFontFamily: (value: string) => void;
};

export interface Editor {
  savePng: (exportMode?: "current-layer" | "flattened") => void;
  saveJpg: (exportMode?: "current-layer" | "flattened") => void;
  saveSvg: (exportMode?: "current-layer" | "flattened") => void;
  saveJson: () => Promise<void>;
  loadJson: (json: string) => void;

  onUndo: () => void;
  onRedo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getWorkspace: () => fabric.Object | undefined;
  zoomIn: () => void;
  zoomOut: () => void;

  enableDrawingMode: () => void;
  disableDrawingMode: () => void;
  enableMaskDrawingMode: () => void;
  changeStrokeColor: (value: string) => void;
  getActiveStrokeColor: () => string;
  changeStrokeWidth: (value: number) => void;
  getActiveStrokeWidth: () => number;
  getActiveStrokeDashArray: () => number[];
  changeStrokeDashArray: (dashArray: number[]) => void;

  changeDrawToolColor: (value: string) => void;
  changeDrawToolWidth: (value: number) => void;
  changeMaskToolWidth: (value: number) => void;
  getDrawToolColor: () => string;
  getDrawToolWidth: () => number;
  getMaskToolWidth: () => number;

  changeFillColor: (value: string) => void;
  addText: (value: string, options?: Partial<ITextboxOptions>) => void;
  getActiveOpacity: () => number;
  changeOpacity: (opacity: number) => void;
  changeBackground: (color: string) => void;
  changeSize: (size: { width: number; height: number }) => void;
  getActiveFontFamily: () => string;
  changeFontFamily: (fontFamily: string) => void;
  getActiveFillColor: () => string;
  changeImageFilter: (filter: string) => void;
  getActiveFontWeight: () => number;
  getActiveFontStyle: () => string;
  getActiveFontLinethrough: () => boolean;
  getActiveFontUnderline: () => boolean;
  getActiveTextAlign: () => string;
  getActiveFontSize: () => number;

  changeFontSize: (size: number) => void;
  changeTextAlign: (align: string) => void;
  changeFontWeight: (weight: number) => void;
  changeFontStyle: (style: string) => void;
  changeFontLinethrough: (linethrough: boolean) => void;
  changeFontUnderline: (underline: boolean) => void;

  bringForward: () => void;
  sendBackwards: () => void;

  onCopy: () => void;
  onPaste: () => void;
  delete: () => void;

  selectedObjects: fabric.Object[];
  canvas: fabric.Canvas;
}

interface HistoryEntry {
  past: Array<Layer["objects"]>;
  future: Array<Layer["objects"]>;
}

export interface FabricObjectWithLayer extends fabric.Object {
  layerId?: string;
}

export type LayerObjectData = ReturnType<fabric.Object["toObject"]> & {
  objectId?: string;
  layerId?: string;
};

export type LayerObjects = LayerObjectData[];

export type FabricWorkspace = fabric.Rect & {
  name: "clip";
};

export enum LayerType {
  Global = "GLOBAL",
  Sectional = "SECTIONAL",
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  parentId?: string;
  imageDataUrl: string | null;
  referenceImageUrls: string[];
  maskDataUrl: string | null;
  isVisible: boolean;
  prompt: string;
  objects: LayerObjects;
  canvasState?: string;
  children?: Layer[];
  isActive?: boolean;
  isChild?: boolean;
}

export interface LayersState {
  layers: Layer[];
  activeGlobalLayerId: string | null;
  activeSectionalLayerId: string | null;
  history: Record<string, HistoryEntry>;
  operationHistory: OperationHistory;
  canvas: fabric.Canvas | null;
  isUndoRedoInProgress: boolean;
  currentBatchId: string | null;

  addGlobalLayer: (name?: string) => void;
  getActiveGlobalLayer: () => Layer | null;
  setActiveGlobalLayer: (id: string) => void;

  addSectionalLayer: (parentGlobalId: string, name?: string) => Promise<string | null>;
  getActiveSectionalLayer: () => Layer | null;
  setActiveSectionalLayer: (id: string | null) => void;

  getLayerTree: () => Layer[];

  deleteLayer: (id: string) => void;
  selectLayer: (id: string) => void;
  reorderLayers: (reordered: Layer[]) => void;

  setCanvas: (canvas: fabric.Canvas) => void;
  setBrushMode: (enabled: boolean, activeSectionalLayerId?: string | null) => void;

  addLayer: () => void;
  toggleVisibility: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>, addToHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;

  // === Strongly typed additions ===
  createOperation: (
    type: OperationType,
    forward: OperationData,
    backward: OperationData,
    batchId?: string
  ) => CanvasOperation;

  applyOperation: (
    operation: CanvasOperation,
    direction: "forward" | "backward"
  ) => Promise<void>;

  restoreObjectToCanvas: (objectData: LayerObjectData, layerId: string) => Promise<void>;
  syncLayerObjectsFromCanvas: (layerId: string) => void;

  executeOperation: (operation: CanvasOperation) => Promise<void>;
  undoOperation: () => Promise<void>;
  redoOperation: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  startBatch: (batchId?: string) => string;
  endBatch: () => void;
  removeCanvasObjectsByLayerId: (layerId: string) => void;
  clearOperationHistory: () => void;

  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;

  selectedObjects: fabric.Object[];
  setSelectedObjects: (objects: fabric.Object[]) => void;
  addMultipleImageLayers: (files: File[]) => Promise<void>;
  tagObjectWithActiveLayer: (obj: fabric.Object) => void;
  resetCanvasState: () => void;

  createTransaction: (name: string, operations: CanvasOperation[]) => CanvasTransaction;
  executeTransaction: (transaction: CanvasTransaction) => Promise<void>;
  currentTransaction: CanvasTransaction | null;
  startTransaction: (name: string) => string;
  addOperationToTransaction: (operation: CanvasOperation) => void;
  commitTransaction: () => Promise<void>;
  rollbackTransaction: () => Promise<void>;
}

export interface SerializedFabricObject {
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
  angle: number;
  scaleX: number;
  scaleY: number;
  layerId?: string;
  name?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  src?: string;
  rx?: number;
  ry?: number;
  radius?: number;
}
