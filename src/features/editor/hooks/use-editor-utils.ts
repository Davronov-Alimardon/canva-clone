import { fabric } from "fabric";

export interface FabricWorkspace extends fabric.Rect {
  name: "clip";
}

export function findWorkspace(canvas: fabric.Canvas): FabricWorkspace | null {
  for (const obj of canvas.getObjects()) {
    if (obj.type === "rect" && obj.name === "clip") {
      return obj as FabricWorkspace;
    }
  }
  return null;
}

// Center an object on workspace
export function centerObject(
  canvas: fabric.Canvas,
  object: fabric.Object
): void {
  const workspace = findWorkspace(canvas);
  if (!workspace) return;
  const center = workspace.getCenterPoint();
  // @ts-ignore
  canvas._centerObject(object, center);
}

// Create and setup workspace for canvas
export function createWorkspace(
  canvas: fabric.Canvas,
  width: number,
  height: number
): FabricWorkspace {
  const workspace = new fabric.Rect({
    width,
    height,
    name: "clip",
    fill: "white",
    selectable: false,
    hasControls: false,
    shadow: new fabric.Shadow({
      color: "rgba(0,0,0,0.8)",
      blur: 5,
    }),
  }) as FabricWorkspace;

  // Set canvas dimensions
  canvas.setWidth(width);
  canvas.setHeight(height);

  // Add workspace to canvas
  canvas.add(workspace);
  canvas.centerObject(workspace);
  canvas.clipPath = workspace;

  // Ensure workspace is at the bottom
  canvas.sendToBack(workspace);

  return workspace;
}
