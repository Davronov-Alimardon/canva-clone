import { fabric } from "fabric";
import {
  Layer,
  CompositeOptions,
  MaskGenerationOptions,
  LayerComposite,
  SerializedCanvasObject,
  SerializedCanvasObjectExtended,
  ImageProcessingError,
  ImageDimensions,
  FabricPathArray,
  PathSegment,
  FabricObjectWithIds,
} from "../types";

function createCompositingError(
  code: ImageProcessingError["code"],
  message: string
): ImageProcessingError {
  const error = new Error(message) as ImageProcessingError;
  error.code = code;
  return error;
}

// Type guard functions
function isPathSegment(segment: unknown): segment is PathSegment {
  return Array.isArray(segment) &&
         segment.length > 0 &&
         typeof segment[0] === 'string' &&
         ['M', 'L', 'C', 'Q', 'Z', 'z'].includes(segment[0]);
}

function isFabricPathArray(pathData: unknown): pathData is FabricPathArray {
  return Array.isArray(pathData) &&
         pathData.every(segment => isPathSegment(segment));
}

function hasProperty<T extends string>(obj: object, prop: T): obj is object & Record<T, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function isSerializedCanvasObjectExtended(obj: unknown): obj is SerializedCanvasObjectExtended {
  if (typeof obj !== 'object' || obj === null) return false;

  if (!hasProperty(obj, 'type') || !hasProperty(obj, 'left') || !hasProperty(obj, 'top')) {
    return false;
  }

  return typeof obj.type === 'string' &&
         typeof obj.left === 'number' &&
         typeof obj.top === 'number';
}

function hasImageElement(obj: SerializedCanvasObjectExtended): obj is SerializedCanvasObjectExtended & { _element: { src: string } } {
  return obj._element !== undefined &&
         typeof obj._element === 'object' &&
         obj._element !== null &&
         'src' in obj._element &&
         typeof obj._element.src === 'string';
}

function addIdToFabricObject(fabricObject: fabric.Object, layerId?: unknown, objectId?: unknown): void {
  if (layerId && typeof layerId === 'string') {
    Object.defineProperty(fabricObject, 'layerId', {
      value: layerId,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  if (objectId && typeof objectId === 'string') {
    Object.defineProperty(fabricObject, 'objectId', {
      value: objectId,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
}

function validateAndConvertObjects(objects: unknown[]): SerializedCanvasObjectExtended[] {
  const validObjects: SerializedCanvasObjectExtended[] = [];

  for (const obj of objects) {
    if (isSerializedCanvasObjectExtended(obj)) {
      validObjects.push(obj);
    } else {
      console.warn('Invalid object found in layer objects array:', obj);
    }
  }

  return validObjects;
}

// Converts fabric.js path array format to SVG path string
function pathArrayToString(pathArray: FabricPathArray): string {
  if (!Array.isArray(pathArray)) {
    return "";
  }

  let pathString = "";

  for (const segment of pathArray) {
    if (Array.isArray(segment) && segment.length > 0) {
      const command = segment[0];
      const coords = Array.from(segment).slice(1);

      if (command === "M" || command === "L") {
        // Move to or Line to: M x y or L x y
        pathString += `${command} ${coords.join(" ")} `;
      } else if (command === "C") {
        // Cubic bezier: C x1 y1 x2 y2 x y
        pathString += `${command} ${coords.join(" ")} `;
      } else if (command === "Q") {
        // Quadratic bezier: Q x1 y1 x y
        pathString += `${command} ${coords.join(" ")} `;
      } else if (command === "Z" || command === "z") {
        // Close path
        pathString += "Z ";
      } else {
        // Other commands
        pathString += `${command} ${coords.join(" ")} `;
      }
    }
  }

  return pathString.trim();
}

async function createFabricObjectsDirectly(
  objects: SerializedCanvasObjectExtended[]
): Promise<fabric.Object[]> {
  const fabricObjects: fabric.Object[] = [];

  for (const obj of objects) {
    try {
      let fabricObject: fabric.Object | null = null;

      if (obj.type === "image") {
        // Extract src from the object
        let imageSrc = obj.src;

        // If no src but has _element, try to extract
        if (!imageSrc && obj._element) {
          if (typeof obj._element === "object" && "src" in obj._element) {
            imageSrc = obj._element.src;
          }
        }

        // Create placeholder if still no src
        if (!imageSrc) {
          const canvas = document.createElement("canvas");
          canvas.width = obj.width || 100;
          canvas.height = obj.height || 100;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#f0f0f0";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#888";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Image", canvas.width / 2, canvas.height / 2);
            imageSrc = canvas.toDataURL("image/png");
          }
        }

        if (typeof imageSrc === "string") {
          try {
            fabricObject = await new Promise<fabric.Image>(
              (resolve, reject) => {
                fabric.Image.fromURL(
                  imageSrc,
                  (img: fabric.Image) => {
                    if (img) {
                      img.set({
                        left: obj.left || 0,
                        top: obj.top || 0,
                        scaleX: obj.scaleX || 1,
                        scaleY: obj.scaleY || 1,
                        angle: obj.angle || 0,
                        opacity: obj.opacity !== undefined ? obj.opacity : 1,
                        visible: obj.visible !== undefined ? obj.visible : true,
                      });
                      resolve(img);
                    } else {
                      reject(new Error("Failed to create image from URL"));
                    }
                  },
                  { crossOrigin: "anonymous" }
                );
              }
            );
          } catch (imageError) {
            console.error(
              `[Direct Creation] Failed to create fabric.Image:`,
              imageError
            );

            // Create a placeholder rectangle as fallback
            fabricObject = new fabric.Rect({
              left: obj.left || 0,
              top: obj.top || 0,
              width: obj.width || 100,
              height: obj.height || 100,
              fill: "#f0f0f0",
              stroke: "#ccc",
              strokeWidth: 2,
              scaleX: obj.scaleX || 1,
              scaleY: obj.scaleY || 1,
              angle: obj.angle || 0,
              opacity: obj.opacity !== undefined ? obj.opacity : 1,
              visible: obj.visible !== undefined ? obj.visible : true,
            });
          }
        }
      } else if (obj.type === "textbox" || obj.type === "text") {
        const text = obj.text || "Text";
        const fontSize = obj.fontSize || 20;
        const fontFamily = obj.fontFamily || "Arial";

        fabricObject = new fabric.Textbox(text, {
          left: obj.left || 0,
          top: obj.top || 0,
          width: obj.width || 100,
          fontSize: fontSize,
          fontFamily: fontFamily,
          fill: obj.fill || "#000000",
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          angle: obj.angle || 0,
          opacity: obj.opacity !== undefined ? obj.opacity : 1,
          visible: obj.visible !== undefined ? obj.visible : true,
        });
      } else if (obj.type === "rect") {
        fabricObject = new fabric.Rect({
          left: obj.left || 0,
          top: obj.top || 0,
          width: obj.width || 100,
          height: obj.height || 100,
          fill: obj.fill || "#000000",
          stroke: obj.stroke || undefined,
          strokeWidth: obj.strokeWidth || 0,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          angle: obj.angle || 0,
          opacity: obj.opacity !== undefined ? obj.opacity : 1,
          visible: obj.visible !== undefined ? obj.visible : true,
        });
      } else if (obj.type === "path") {
        if (obj.path) {
          let pathString: string;

          if (Array.isArray(obj.path)) {
            // Convert path array to SVG path string
            if (isFabricPathArray(obj.path)) {
              pathString = pathArrayToString(obj.path);
            } else {
              console.warn('Invalid path array format, skipping path creation');
              pathString = "";
            }
          } else if (typeof obj.path === "string") {
            pathString = obj.path;
          } else {
            pathString = "";
          }

          if (pathString) {
            try {
              const stroke = obj.stroke || "#000000";
              const strokeLineCap = obj.strokeLineCap || "round";
              const strokeLineJoin = obj.strokeLineJoin || "round";

              fabricObject = new fabric.Path(pathString, {
                left: obj.left || 0,
                top: obj.top || 0,
                fill: obj.fill || undefined,
                stroke: stroke,
                strokeWidth: obj.strokeWidth || 1,
                strokeLineCap: strokeLineCap,
                strokeLineJoin: strokeLineJoin,
                scaleX: obj.scaleX || 1,
                scaleY: obj.scaleY || 1,
                angle: obj.angle || 0,
                opacity: obj.opacity !== undefined ? obj.opacity : 1,
                visible: obj.visible !== undefined ? obj.visible : true,
              });
            } catch (pathError) {
              console.error(
                `[Direct Creation] Failed to create fabric.Path:`,
                pathError
              );
            }
          }
        }
      }

      if (fabricObject) {
        addIdToFabricObject(fabricObject, obj.layerId, obj.objectId);
        fabricObjects.push(fabricObject);
      }
    } catch (error) {
      console.error(
        `[Direct Creation] Failed to create ${obj.type} object:`,
        error
      );
    }
  }

  return fabricObjects;
}

// Creates a composite image from a background URL and an array of layers by rendering their fabric.js objects.
export function getCompositeImage(
  layers: Layer[],
  width: number,
  height: number,
  backgroundUrl: string | null,
  options: CompositeOptions = {}
): Promise<string | null> {
  return new Promise<string | null>(async (resolve, reject) => {
    if (!layers || !Array.isArray(layers)) {
      reject(
        createCompositingError(
          "INVALID_DIMENSIONS",
          "Layers must be a valid array."
        )
      );
      return;
    }

    if (width <= 0 || height <= 0) {
      reject(
        createCompositingError(
          "INVALID_DIMENSIONS",
          "Width and height must be positive numbers."
        )
      );
      return;
    }

    const {
      backgroundColor = "transparent",
      multiplier = 1,
      format = "png",
    } = options;

    const visibleLayersWithObjects = layers.filter(
      (l) =>
        l &&
        l.isVisible &&
        l.objects &&
        Array.isArray(l.objects) &&
        l.objects.length > 0
    );

    if (!backgroundUrl && visibleLayersWithObjects.length === 0) {
      resolve(null);
      return;
    }

    let tempCanvas: fabric.StaticCanvas | null = null;

    try {
      tempCanvas = new fabric.StaticCanvas(null, {
        width,
        height,
        backgroundColor,
        renderOnAddRemove: false,
      });

      if (backgroundUrl) {
        const img = await new Promise<fabric.Image>((resolve) => {
          fabric.Image.fromURL(backgroundUrl, (img) => resolve(img), {
            crossOrigin: "anonymous",
          });
        });
        tempCanvas.backgroundImage = img;
      }

      for (const layer of visibleLayersWithObjects) {
        if (!layer.objects || !Array.isArray(layer.objects)) {
          console.warn(
            `[Compositing] Layer ${layer.id} has invalid objects structure`
          );
          continue;
        }

        // Validate and filter out mask paths from the composite image.
        const validObjects = validateAndConvertObjects(layer.objects);
        const objectsToRender = validObjects.filter(
          (o) => o.type?.toLowerCase() !== "path"
        );

        if (objectsToRender.length > 0) {
          try {
            // Create fabric objects directly instead of using enliven
            const fabricObjects =
              await createFabricObjectsDirectly(objectsToRender);

            if (!fabricObjects || fabricObjects.length === 0) {
              console.warn(
                `[Compositing] No fabric objects created for layer ${layer.id}`
              );
              continue;
            }

            fabricObjects.forEach((obj) => {
              if (obj && tempCanvas) {
                tempCanvas.add(obj);
              }
            });
          } catch (creationError) {
            console.error(
              `[Compositing] Failed to create fabric objects for layer ${layer.id}:`,
              creationError
            );
            continue;
          }
        }
      }

      tempCanvas.renderAll();
      const dataUrl = tempCanvas.toDataURL({ format, multiplier });
      resolve(dataUrl);
    } catch (error) {
      console.error(
        "Failed to create composite image from fabric objects:",
        error
      );
      reject(
        createCompositingError(
          "CANVAS_CONTEXT_ERROR",
          "Failed to render composite image."
        )
      );
    } finally {
      if (tempCanvas) {
        tempCanvas.dispose();
      }
    }
  });
}

// Generates a mask Data URL from fabric objects.
export async function generateMaskFromObjects(
  objects: SerializedCanvasObjectExtended[],
  width: number,
  height: number,
  options: MaskGenerationOptions = {}
): Promise<string> {
  // Input validation
  if (!objects || !Array.isArray(objects)) {
    throw createCompositingError(
      "INVALID_DIMENSIONS",
      "Objects must be a valid array."
    );
  }

  if (width <= 0 || height <= 0) {
    throw createCompositingError(
      "INVALID_DIMENSIONS",
      "Width and height must be positive numbers."
    );
  }

  const { scale = 1.0, edgeClearWidth = 2 } = options;

  let tempCanvas: fabric.Canvas | null = null;

  try {
    tempCanvas = new fabric.Canvas(null, {
      width,
      height,
      backgroundColor: "transparent",
      renderOnAddRemove: false,
    });

    if (objects.length === 0) {
      const dataUrl = tempCanvas.toDataURL({ format: "png", multiplier: 1 });
      return dataUrl;
    }

    let fabricObjects: fabric.Object[] | null = null;

    try {
      // Create fabric objects directly instead of using enliven
      fabricObjects = await createFabricObjectsDirectly(objects);
    } catch (creationError) {
      console.error(
        `[Mask Generation] Failed to create fabric objects:`,
        creationError
      );
      throw createCompositingError(
        "CANVAS_CONTEXT_ERROR",
        "Failed to create fabric objects for mask generation."
      );
    }

    if (
      !fabricObjects ||
      !Array.isArray(fabricObjects) ||
      fabricObjects.length === 0
    ) {
      console.warn(
        `[Mask Generation] No fabric objects created, creating empty mask`
      );
      const dataUrl = tempCanvas.toDataURL({ format: "png", multiplier: 1 });
      return dataUrl;
    }

    if (scale !== 1.0 && fabricObjects.length > 0) {
      const group = new fabric.Group(fabricObjects);

      const center = group.getCenterPoint();
      group.scale(scale);
      group.setPositionByOrigin(center, "center", "center");

      const groupMatrix = group.calcTransformMatrix();
      const transformedObjects: fabric.Object[] = [];

      group.forEachObject((obj) => {
        const objMatrix = obj.calcTransformMatrix();
        const newMatrix = fabric.util.multiplyTransformMatrices(
          groupMatrix,
          objMatrix
        );
        const newOptions = fabric.util.qrDecompose(newMatrix);

        obj.set(newOptions);
        transformedObjects.push(obj);
      });

      fabricObjects = transformedObjects;
    }

    // Add regular objects first
    fabricObjects.forEach((obj) => {
      if (obj && obj.stroke !== "#000000" && tempCanvas) {
        tempCanvas.add(obj);
      }
    });

    // Add eraser objects with destination-out composite operation
    fabricObjects.forEach((obj) => {
      if (obj && obj.stroke === "#000000" && tempCanvas) {
        obj.globalCompositeOperation = "destination-out";
        tempCanvas.add(obj);
      }
    });

    tempCanvas.renderAll();
    const initialDataUrl = tempCanvas.toDataURL({
      format: "png",
      multiplier: 1,
    });

    return await postProcessMask(initialDataUrl, width, height, edgeClearWidth);
  } catch (error) {
    console.error("Failed to generate mask from objects:", error);
    throw createCompositingError(
      "CANVAS_CONTEXT_ERROR",
      "Failed to generate mask from objects."
    );
  } finally {
    if (tempCanvas) {
      tempCanvas.dispose();
    }
  }
}

// Post-processes a mask to clear edges and prevent AI generation artifacts
function postProcessMask(
  maskDataUrl: string,
  width: number,
  height: number,
  edgeClearWidth: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const finalMaskCanvas = document.createElement("canvas");
    finalMaskCanvas.width = width;
    finalMaskCanvas.height = height;
    const ctx = finalMaskCanvas.getContext("2d");

    if (!ctx) {
      reject(
        createCompositingError(
          "CANVAS_CONTEXT_ERROR",
          "Could not get 2D context for mask post-processing."
        )
      );
      return;
    }

    const img = new Image();
    img.onload = (): void => {
      // Draw the generated mask onto the new canvas
      ctx.drawImage(img, 0, 0);

      // Clear a border around the edges to create a safe margin
      ctx.clearRect(0, 0, width, edgeClearWidth); // Top
      ctx.clearRect(0, height - edgeClearWidth, width, edgeClearWidth); // Bottom
      ctx.clearRect(0, 0, edgeClearWidth, height); // Left
      ctx.clearRect(width - edgeClearWidth, 0, edgeClearWidth, height); // Right

      // Resolve with the data URL of the processed mask
      resolve(finalMaskCanvas.toDataURL("image/png"));
    };

    img.onerror = (): void => {
      reject(
        createCompositingError(
          "IMAGE_LOAD_ERROR",
          "Failed to load temporary mask for processing."
        )
      );
    };

    img.src = maskDataUrl;
  });
}

export async function createLayerComposite(
  composite: LayerComposite,
  options: CompositeOptions = {}
): Promise<string | null> {
  const { layers, width, height, backgroundUrl } = composite;

  if (!layers || layers.length === 0) {
    return null;
  }

  return getCompositeImage(
    layers,
    width,
    height,
    backgroundUrl || null,
    options
  );
}

export function validateLayersForCompositing(layers: Layer[]): boolean {
  if (!layers || layers.length === 0) {
    return false;
  }

  return layers.some(
    (layer) => layer.isVisible && layer.objects && layer.objects.length > 0
  );
}
