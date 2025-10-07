import { fabric } from "fabric";

/** Rect workspace object type */
export interface FabricWorkspace extends fabric.Rect {
  name: "clip";
}

/** Find workspace (rect named "clip") safely */
export function findWorkspace(canvas: fabric.Canvas): FabricWorkspace | null {
  for (const obj of canvas.getObjects()) {
    if (obj.type === "rect" && obj.name === "clip") {
      return obj as FabricWorkspace;
    }
  }
  return null;
}

/** Center an object on workspace */
export function centerObject(canvas: fabric.Canvas, object: fabric.Object): void {
  const workspace = findWorkspace(canvas);
  if (!workspace) return;
  const center = workspace.getCenterPoint();
  // @ts-ignore internal but stable
  canvas._centerObject(object, center);
}
