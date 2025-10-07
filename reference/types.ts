export enum LayerType {
  Global = 'GLOBAL',
  Sectional = 'SECTIONAL',
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  imageDataUrl: string | null;
  referenceImageUrls: string[]; // Holds reference images for this specific layer
  maskDataUrl: string | null;
  isVisible: boolean;
  prompt: string;
  objects: any[]; // fabric objects
}

export enum Tool {
  Brush = 'BRUSH',
  Eraser = 'ERASER',
  Pan = 'PAN',
}

export type AspectRatio = '1:1' | '9:16' | '4:5';
