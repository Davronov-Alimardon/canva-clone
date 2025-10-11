import {
  BoundingBox,
  CropBox,
  ImageProcessingError,
  ImageDimensions,
} from "../types";

/**
 * Creates a typed image processing error
 */
function createImageError(
  code: ImageProcessingError["code"],
  message: string
): ImageProcessingError {
  const error = new Error(message) as ImageProcessingError;
  error.code = code;
  return error;
}

/**
 * Converts an image file to a Base64 encoded data URL.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(
          createImageError(
            "FILE_READ_ERROR",
            "Failed to read file as a data URL."
          )
        );
      }
    };
    reader.onerror = (): void => {
      reject(
        createImageError("FILE_READ_ERROR", "FileReader encountered an error.")
      );
    };
    reader.readAsDataURL(file);
  });
}

export function resizeImage(
  dataUrl: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (width <= 0 || height <= 0) {
      reject(
        createImageError(
          "INVALID_DIMENSIONS",
          "Width and height must be positive numbers."
        )
      );
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = (): void => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(
          createImageError(
            "CANVAS_CONTEXT_ERROR",
            "Could not get canvas context for resizing"
          )
        );
        return;
      }

      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = (): void => {
      reject(
        createImageError(
          "IMAGE_LOAD_ERROR",
          "Failed to load image for resizing."
        )
      );
    };

    img.src = dataUrl;
  });
}

export function getBoundingBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): BoundingBox | null {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;
  let foundContent = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Check alpha channel (every 4th value starting from index 3)
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

export function getBoundingBoxFromDataUrl(
  dataUrl: string,
  dimensions: ImageDimensions
): Promise<BoundingBox | null> {
  return new Promise<BoundingBox | null>((resolve, reject) => {
    if (dimensions.width <= 0 || dimensions.height <= 0) {
      reject(
        createImageError(
          "INVALID_DIMENSIONS",
          "Width and height must be positive numbers."
        )
      );
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = (): void => {
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(
          createImageError(
            "CANVAS_CONTEXT_ERROR",
            "Could not get 2D context for bounding box calculation."
          )
        );
        return;
      }

      ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
      resolve(getBoundingBox(ctx, dimensions.width, dimensions.height));
    };

    img.onerror = (): void => {
      reject(
        createImageError(
          "IMAGE_LOAD_ERROR",
          "Failed to load image for bounding box calculation."
        )
      );
    };

    img.src = dataUrl;
  });
}

export function cropImage(dataUrl: string, cropBox: CropBox): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (cropBox.width <= 0 || cropBox.height <= 0) {
      reject(
        createImageError(
          "INVALID_DIMENSIONS",
          "Crop box width and height must be positive numbers."
        )
      );
      return;
    }

    if (cropBox.left < 0 || cropBox.top < 0) {
      reject(
        createImageError(
          "INVALID_DIMENSIONS",
          "Crop box left and top must be non-negative."
        )
      );
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = (): void => {
      const canvas = document.createElement("canvas");
      canvas.width = cropBox.width;
      canvas.height = cropBox.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(
          createImageError(
            "CANVAS_CONTEXT_ERROR",
            "Could not get 2D context for cropping."
          )
        );
        return;
      }

      ctx.drawImage(
        img,
        cropBox.left,
        cropBox.top,
        cropBox.width,
        cropBox.height,
        0,
        0,
        cropBox.width,
        cropBox.height
      );
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = (): void => {
      reject(
        createImageError(
          "IMAGE_LOAD_ERROR",
          "Failed to load image for cropping."
        )
      );
    };

    img.src = dataUrl;
  });
}

export function validateImageDataUrl(
  dataUrl: string
): Promise<ImageDimensions> {
  return new Promise<ImageDimensions>((resolve, reject) => {
    if (!dataUrl.startsWith("data:image/")) {
      reject(
        createImageError("INVALID_DIMENSIONS", "Invalid data URL format.")
      );
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = (): void => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = (): void => {
      reject(
        createImageError("IMAGE_LOAD_ERROR", "Invalid or corrupted image data.")
      );
    };

    img.src = dataUrl;
  });
}
