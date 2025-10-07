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
  | "templates";

export const FILL_COLOR = "rgba(0,0,0,1)";
export const STROKE_COLOR = "rgba(0,0,0,1)";
export const STROKE_WIDTH = 2;
export const STROKE_DASH_ARRAY = [];
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
}

export type BuildEditorProps = {
  undo: () => void;
  redo: () => void;
  save: (skip?: boolean) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  copy: () => void;
  paste: () => void;
  canCopy: () => boolean, 
  canPaste: () => boolean,
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
  // === File Actions ===
  savePng: () => void;
  saveJpg: () => void;
  saveSvg: () => void;
  saveJson: () => Promise<void>;
  loadJson: (json: string) => void;

  // === State ===
  onUndo: () => void;
  onRedo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getWorkspace: () => fabric.Object | undefined;
  zoomIn: () => void;
  zoomOut: () => void;

  // === Drawing Mode ===
  enableDrawingMode: () => void;
  disableDrawingMode: () => void;
  changeStrokeColor: (value: string) => void;
  getActiveStrokeColor: () => string;
  changeStrokeWidth: (value: number) => void;
  getActiveStrokeWidth: () => number;
  getActiveStrokeDashArray(): number[];
  changeStrokeDashArray(dashArray: number[]): void;
  

  // === Editing ===
  changeFillColor: (value: string) => void;
  addText: (value: string, options?: Partial<ITextboxOptions>) => void;
  getActiveOpacity(): number;
  changeOpacity(opacity: number): void;
  changeBackground(color: string): void;
  changeSize(size: { width: number; height: number }): void;
  getActiveFontFamily(): string;
  changeFontFamily(fontFamily: string): void;
  getActiveFillColor(): string;
  changeImageFilter(filter: string): void;
  getActiveFontWeight(): number;
  getActiveFontStyle(): string;
  getActiveFontLinethrough(): boolean;
  getActiveFontUnderline(): boolean;
  getActiveTextAlign(): string;
  getActiveFontSize(): number;

  changeFontSize(size: number): void;
  changeTextAlign(align: string): void;
  changeFontWeight(weight: number): void;
  changeFontStyle(style: string): void;
  changeFontLinethrough(linethrough: boolean): void;
  changeFontUnderline(underline: boolean): void;

  bringForward(): void;
  sendBackwards(): void;

  onCopy(): void;
  onPaste(): void;
  
  delete(): void;
  

  // === Core Context ===
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

export type LayerAwareFabricObject = fabric.Object & {
  layerId?: string;
};

// for the layer's object data (serializable)
export type LayerObjectData = ReturnType<fabric.Object['toObject']>;

export type LayerObjects = LayerObjectData[];

export type FabricWorkspace = fabric.Rect & {
  name: "clip";
};


export enum LayerType {
  Global = 'GLOBAL',
  Sectional = 'SECTIONAL',
}


export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  parentId?: string; 
  imageDataUrl: string | null;
  referenceImageUrls: string[]; // Holds reference images for this specific layer
  maskDataUrl: string | null;
  isVisible: boolean;
  prompt: string;
  objects: LayerObjects; // fabric objects
  canvasState?: string;
  children?: Layer[];
  isActive?: boolean;
}

export interface LayersState {
  layers: Layer[];
  activeGlobalLayerId: string;
  history: Record<string, HistoryEntry>;
  canvas: fabric.Canvas | null;

  // Hierarchical methods
  addGlobalLayer: (name?: string) => void;
  addSectionalLayer: (parentGlobalId: string, name?: string) => void;
  getLayerTree: () => Layer[]; // Returns hierarchical structure
  getActiveGlobalLayer: () => Layer | null;
  setActiveGlobalLayer: (id: string) => void;

  // Updated existing methods
  deleteLayer: (id: string) => void; // With cascade logic
  selectLayer: (id: string) => void; // Respect hierarchy
  reorderLayers: (reordered: Layer[]) => void; // Tree-aware

  setCanvas: (canvas: fabric.Canvas) => void;
  addLayer: () => void;
  toggleVisibility: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>, addToHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;

  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  selectedObjects: fabric.Object[];
  setSelectedObjects: (objects: fabric.Object[]) => void;
  addMultipleImageLayers: (files: File[]) => Promise<void>;
  tagObjectWithActiveLayer: (obj: fabric.Object) => void;
}

// Add to your types.ts
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
  // Text specific 
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  // Image specific 
  src?: string;
  // Rect specific 
  rx?: number;
  ry?: number;
  // Circle specific 
  radius?: number;
}


