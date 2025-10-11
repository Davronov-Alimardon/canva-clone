import { useEffect } from "react";
import { fabric } from "fabric";

interface UseCanvasPanZoomProps {
  canvas: fabric.Canvas | null;
  activeTool?: string;
}

export const useCanvasPanZoom = ({
  canvas,
  activeTool,
}: UseCanvasPanZoomProps): void => {
  useEffect(() => {
    if (!canvas) return;

    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    const handleMouseDown = (event: fabric.IEvent<Event>) => {
      if (activeTool === "draw") return;

      const e = event.e;
      if (!(e instanceof MouseEvent)) return;

      if (!event.target && (e.button === 1 || e.ctrlKey)) {
        isDragging = true;
        canvas.selection = false;
        lastPosX = e.clientX;
        lastPosY = e.clientY;
        canvas.defaultCursor = "grabbing";
      }
    };

    const handleMouseMove = (event: fabric.IEvent<Event>) => {
      if (activeTool === "draw") return;

      if (!isDragging) return;
      const e = event.e;
      if (!(e instanceof MouseEvent)) return;

      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      vpt[4] += e.clientX - lastPosX;
      vpt[5] += e.clientY - lastPosY;
      canvas.requestRenderAll();

      lastPosX = e.clientX;
      lastPosY = e.clientY;
    };

    const handleMouseUp = () => {
      if (activeTool === "draw") return;

      isDragging = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
    };

    const handleMouseWheel = (event: fabric.IEvent<Event>) => {
      if (activeTool === "draw") return;
      const e = event.e;
      if (!(e instanceof WheelEvent)) return;

      const delta = e.deltaY;
      let zoom = canvas.getZoom();

      zoom *= 0.999 ** delta;
      zoom = Math.min(5, Math.max(0.2, zoom));

      const point = new fabric.Point(e.offsetX, e.offsetY);
      canvas.zoomToPoint(point, zoom);

      e.preventDefault();
      e.stopPropagation();
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("mouse:wheel", handleMouseWheel);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("mouse:wheel", handleMouseWheel);
    };
  }, [canvas, activeTool]);
};
