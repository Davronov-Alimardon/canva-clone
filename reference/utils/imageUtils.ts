import { Layer } from '../types';
import * as fabric from 'fabric';

/**
 * Converts an image file to a Base64 encoded data URL.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as a data URL.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes an image from a data URL to the specified dimensions with high quality.
 */
export function resizeImage(dataUrl: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context for resizing"));
        return;
      }
      // Use the highest quality scaling algorithm
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (error) => reject(error);
    img.src = dataUrl;
  });
}

/**
 * Creates a composite image from a background URL and an array of layers by rendering their fabric.js objects.
 * This correctly preserves the position, scale, and rotation of all elements on top of a base image.
 */
export function getCompositeImage(
    layers: Layer[],
    width: number,
    height: number,
    backgroundUrl: string | null
): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
        const visibleLayersWithObjects = layers.filter(
            l => l.isVisible && l.objects && l.objects.length > 0
        );

        if (!backgroundUrl && visibleLayersWithObjects.length === 0) {
            return resolve(null);
        }

        const tempCanvas = new fabric.StaticCanvas(null, {
            width: width,
            height: height,
            backgroundColor: 'transparent',
            renderOnAddRemove: false,
        });

        try {
            if (backgroundUrl) {
                const img = await fabric.Image.fromURL(backgroundUrl, { crossOrigin: 'anonymous' });
                tempCanvas.backgroundImage = img;
            }
            
            for (const layer of visibleLayersWithObjects) {
                // Filter out mask paths from the composite image.
                const objectsToRender = layer.objects.filter(o => o.type?.toLowerCase() !== 'path');

                if (objectsToRender.length > 0) {
                    const enlivenedObjects: fabric.Object[] = await fabric.util.enlivenObjects(objectsToRender);
                    enlivenedObjects.forEach(obj => {
                        tempCanvas.add(obj);
                    });
                }
            }

            tempCanvas.renderAll();
            const dataUrl = tempCanvas.toDataURL({ format: 'png', multiplier: 1 });
            tempCanvas.dispose();
            resolve(dataUrl);

        } catch (error) {
            console.error("Failed to create composite image from fabric objects:", error);
            tempCanvas.dispose();
            reject(new Error('Failed to render composite image.'));
        }
    });
}


/**
 * Generates a mask Data URL from fabric objects. It now includes a post-processing
 * step to clear the canvas edges, preventing the AI from generating content with
 * hard edges which can cause visual artifacts when panning.
 */
export async function generateMaskFromObjects(
  objects: any[],
  width: number,
  height: number,
  options: { scale?: number } = {}
): Promise<string> {
  const { scale = 1.0 } = options;
  const tempCanvas = new fabric.Canvas(null, {
    width: width,
    height: height,
    backgroundColor: 'transparent',
    renderOnAddRemove: false,
  });

  if (!objects || objects.length === 0) {
    const dataUrl = tempCanvas.toDataURL({ format: 'png', multiplier: 1 });
    tempCanvas.dispose();
    return dataUrl;
  }

  let enlivened: fabric.Object[] = await fabric.util.enlivenObjects(objects);

  if (scale !== 1.0 && enlivened.length > 0) {
    const group = new fabric.Group(enlivened);
    
    const center = group.getCenterPoint();
    group.scale(scale);
    group.setPositionByOrigin(center, 'center', 'center');
    
    const groupMatrix = group.calcTransformMatrix();
    const transformedObjects: fabric.Object[] = [];

    group.forEachObject(obj => {
        const objMatrix = obj.calcTransformMatrix();
        const newMatrix = fabric.util.multiplyTransformMatrices(groupMatrix, objMatrix);
        const newOptions = fabric.util.qrDecompose(newMatrix);
        
        obj.set(newOptions);
        transformedObjects.push(obj);
    });

    enlivened = transformedObjects;
  }

  enlivened.forEach(obj => {
    if (obj.stroke !== '#000000') {
      tempCanvas.add(obj);
    }
  });

  enlivened.forEach(obj => {
    if (obj.stroke === '#000000') {
      obj.globalCompositeOperation = 'destination-out';
      tempCanvas.add(obj);
    }
  });

  tempCanvas.renderAll();
  const initialDataUrl = tempCanvas.toDataURL({ format: 'png', multiplier: 1 });
  tempCanvas.dispose();

  // Post-process the mask to ensure it doesn't touch the canvas edges.
  // This prevents the AI from generating content with hard edges that look
  // bad when the canvas is panned.
  return new Promise((resolve, reject) => {
    const finalMaskCanvas = document.createElement('canvas');
    finalMaskCanvas.width = width;
    finalMaskCanvas.height = height;
    const ctx = finalMaskCanvas.getContext('2d');
    if (!ctx) {
      return reject(new Error("Could not get 2D context for mask post-processing."));
    }

    const img = new Image();
    img.onload = () => {
      // 1. Draw the generated mask onto the new canvas.
      ctx.drawImage(img, 0, 0);

      // 2. Clear a border around the edges to create a safe margin.
      const edgeClearWidth = 2; // 2px border
      ctx.clearRect(0, 0, width, edgeClearWidth); // Top
      ctx.clearRect(0, height - edgeClearWidth, width, edgeClearWidth); // Bottom
      ctx.clearRect(0, 0, edgeClearWidth, height); // Left
      ctx.clearRect(width - edgeClearWidth, 0, edgeClearWidth, height); // Right

      // 3. Resolve with the data URL of the processed mask.
      resolve(finalMaskCanvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      reject(new Error("Failed to load temporary mask for processing."));
    };
    img.src = initialDataUrl;
  });
}

/**
 * Finds the bounding box of the non-transparent content of an image on a canvas.
 */
export function getBoundingBox(ctx: CanvasRenderingContext2D, width: number, height: number): { top: number, left: number, right: number, bottom: number } | null {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let left = width, right = 0, top = height, bottom = 0;
    let foundContent = false;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Check alpha channel
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 0) {
                foundContent = true;
                left = Math.min(left, x);
                right = Math.max(right, x);
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
            }
        }
    }

    return foundContent ? { top, left, right, bottom } : null;
}

/**
 * Gets the bounding box of content within an image data URL.
 */
export function getBoundingBoxFromDataUrl(dataUrl: string, width: number, height: number): Promise<{ top: number, left: number, right: number, bottom: number } | null> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get 2D context for bounding box calculation.'));
            ctx.drawImage(img, 0, 0, width, height);
            resolve(getBoundingBox(ctx, width, height));
        };
        img.onerror = (err) => reject(new Error(`Failed to load image for bounding box calculation: ${err}`));
        img.src = dataUrl;
    });
}

/**
 * Crops an image from a data URL to the specified bounding box.
 */
export function cropImage(dataUrl: string, box: { left: number, top: number, width: number, height: number }): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = box.width;
            canvas.height = box.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get 2D context for cropping.'));
            ctx.drawImage(img, box.left, box.top, box.width, box.height, 0, 0, box.width, box.height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => reject(new Error(`Failed to load image for cropping: ${err}`));
        img.src = dataUrl;
    });
}
