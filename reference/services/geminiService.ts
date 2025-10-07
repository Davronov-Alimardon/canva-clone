
import { GoogleGenAI, Modality } from '@google/genai';
import { AspectRatio } from '../types';
import { getBoundingBoxFromDataUrl, cropImage } from '../utils/imageUtils';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Start of Error Handling and Type Guards ---

// A specific type for Gemini API errors to provide better error messages.
export interface GeminiApiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

// A type guard to check if an unknown error is a Gemini API error.
export function isGeminiApiError(obj: any): obj is GeminiApiError {
  return (
    obj &&
    typeof obj === 'object' &&
    'error' in obj &&
    typeof obj.error === 'object' &&
    obj.error !== null &&
    'message' in obj.error &&
    typeof obj.error.message === 'string'
  );
}

// --- Start of Rate Limiting and Retry Logic ---

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const isRateLimitError = (error: unknown): boolean => {
    if (error instanceof Error) {
        return error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED');
    }
    try {
        const errorMessage = JSON.stringify(error);
        return errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');
    } catch {
        return false;
    }
};

// Specific function to check if the error is a non-retriable hard quota issue.
const isHardQuotaError = (error: unknown): boolean => {
    if (error instanceof Error) {
        return isRateLimitError(error) && error.message.toLowerCase().includes('quota');
    }
     try {
        const errorMessage = JSON.stringify(error);
        return isRateLimitError(error) && errorMessage.toLowerCase().includes('quota');
    } catch {
        return false;
    }
};

/**
 * A wrapper for Gemini API calls that implements exponential backoff for *transient* rate limit errors.
 */
async function geminiApiWithRetry<T>(
  apiCall: () => Promise<T>,
  maxAttempts: number = 4,
  initialDelay: number = 5000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      if (isHardQuotaError(error)) {
        console.error('API call failed due to a hard quota limit. Not retrying.', error);
        // Throw a new, user-friendly error that the UI can display directly.
        throw new Error("You have exceeded your API usage quota. Please check your plan and billing details. Further requests cannot be processed at this time.");
      }
      
      if (isRateLimitError(error) && attempt < maxAttempts) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`Rate limit exceeded. Attempt ${attempt} of ${maxAttempts} failed. Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        console.error(`API call failed on attempt ${attempt} of ${maxAttempts} with a non-retriable error or after all retries.`, error);
        throw error;
      }
    }
  }
  throw lastError; 
}


// --- End of Rate Limiting and Retry Logic ---


const parseDataUrl = (dataUrl: string): { mimeType: string; data: string } => {
    const match = dataUrl.match(/^data:(image\/.+);base64,(.+)$/);
    if (!match || match.length < 3) {
        throw new Error('Invalid or unsupported data URL format.');
    }
    return { mimeType: match[1], data: match[2] };
};

/**
 * Refines a user's prompt for better consistency and blending, using optional visual context from an image.
 */
export async function refinePrompt(sectionalPrompt: string, globalPrompt: string, visualContextImageUrl?: string): Promise<string> {
  const model = 'gemini-2.5-flash';
  const systemInstruction = `You are an AI assistant for an advanced image editor. Your task is to rewrite a user's prompt into a precise instruction for a semantic image editing AI. The AI will receive the full original image and this rewritten prompt. It will NOT see a mask.

- **Goal:** Your rewritten prompt must instruct the AI to change a specific object or area based on the user's request, while keeping everything else in the image identical.
- **Analyze Context:** If a "Visual Context Image" is provided, analyze it to identify the subject of the edit. Combine this with the "Global Context" text. For example, if the user says "make it red" and the context image shows a blue car, you should identify "blue car" as the subject.
- **Be Specific and Explicit:** The rewritten prompt MUST be a complete, self-contained instruction. Start with a phrase like "Using the provided image, change only the..."
- **Preservation Clause:** Always include a clause instructing the AI to keep the rest of the image unchanged. For example, "...Keep the rest of the scene, including the lighting, shadows, and background, exactly the same."
- **Combine Prompts:** Integrate the user's "Sectional Prompt" (the desired change) with the subject identified from the context.
- **Output ONLY the rewritten prompt.**

Example 1:
- User Sectional Prompt: "a vintage, brown leather chesterfield sofa"
- Visual Context Image: [An image of a modern living room with a bright blue fabric sofa.]
- Your Output: "Using the provided image of a living room, change only the blue fabric sofa to be a vintage, brown leather chesterfield sofa. Keep the rest of the room, including the pillows on the sofa and the lighting, unchanged."

Example 2:
- User Sectional Prompt: "add sunglasses"
- Visual Context Image: [A photorealistic portrait of a man's face.]
- Your Output: "Using the provided photorealistic portrait, add sunglasses to the man's face. Keep everything else about his face and the background unchanged."`;
  
  const textPrompt = `User Sectional Prompt: "${sectionalPrompt}"\nGlobal Context: "${globalPrompt || 'No global context provided.'}"`;
  
  const parts: any[] = [{ text: textPrompt }];

  if (visualContextImageUrl) {
      const { mimeType, data } = parseDataUrl(visualContextImageUrl);
      // Add image part at the beginning for multimodal understanding.
      parts.unshift({ inlineData: { mimeType, data } });
  }
  
  try {
    return await geminiApiWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.5,
        }
      });
      return response.text.trim();
    });
  } catch (error) {
    console.error("Error refining prompt (retries failed):", error);
    // Fallback to the original prompt if refinement fails.
    return sectionalPrompt;
  }
}

/**
 * Orchestrates the process of analyzing the visual context around a mask and refining the prompt.
 */
export async function refinePromptWithVisualContext(
    baseImageDataUrl: string,
    maskDataUrl: string,
    width: number,
    height: number,
    sectionalPrompt: string,
    globalPrompt: string,
): Promise<string> {
    try {
        const bbox = await getBoundingBoxFromDataUrl(maskDataUrl, width, height);
        if (!bbox) {
            console.warn("Could not find bounding box for mask, refining prompt without visual context.");
            return refinePrompt(sectionalPrompt, globalPrompt);
        }

        const padding = Math.min(width, height) * 0.1; // 10% padding
        const cropBox = {
            left: Math.max(0, bbox.left - padding),
            top: Math.max(0, bbox.top - padding),
            width: (bbox.right - bbox.left + 1) + (padding * 2),
            height: (bbox.bottom - bbox.top + 1) + (padding * 2),
        };

        if (cropBox.left + cropBox.width > width) cropBox.width = width - cropBox.left;
        if (cropBox.top + cropBox.height > height) cropBox.height = height - cropBox.top;

        if (cropBox.width <= 0 || cropBox.height <= 0) {
            console.warn("Invalid crop dimensions for visual context, refining without it.");
            return refinePrompt(sectionalPrompt, globalPrompt);
        }
        
        const contextualCrop = await cropImage(baseImageDataUrl, cropBox);

        // Call the new multimodal refinePrompt directly with the cropped image,
        // eliminating the need for a separate `describeImage` call.
        return refinePrompt(sectionalPrompt, globalPrompt, contextualCrop);

    } catch (error) {
        console.error("Failed to get visual context, falling back to text-only prompt refinement:", error);
        return refinePrompt(sectionalPrompt, globalPrompt);
    }
}


/**
 * Generates a new image from a text prompt (Text-to-Image).
 */
export async function generateImage(prompt: string, aspectRatio: AspectRatio): Promise<string> {
  const model = 'imagen-4.0-generate-001';
  return geminiApiWithRetry(async () => {
    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio === '4:5' ? '1:1' : aspectRatio,
        outputMimeType: 'image/png',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    }

    throw new Error("Image generation failed, no image returned from the AI.");
  });
}


/**
 * Generates a new image based on reference images and a prompt (Image-to-Image).
 */
export async function generateImageVariation(prompt: string, referenceImageUrls: string[]): Promise<string> {
  if (referenceImageUrls.length === 0) {
    throw new Error("Cannot generate variation without at least one reference image.");
  }
  const model = 'gemini-2.5-flash-image';

  return geminiApiWithRetry(async () => {
    const textPart = { text: `Generate a new image inspired by the provided reference image(s) and the following prompt: "${prompt}".` };
    
    const imageParts = referenceImageUrls.map(url => {
      const { mimeType, data } = parseDataUrl(url);
      return { inlineData: { mimeType, data } };
    });

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [...imageParts, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI did not return an image. It may have refused the request for image variation.");
  });
}

/**
 * Generates a new image section that matches the style of a reference context image.
 * Used for sectional layer inpainting.
 */
export async function generateInpaintedSection(prompt: string, contextImageUrl: string): Promise<string> {
  const model = 'gemini-2.5-flash-image';

  return geminiApiWithRetry(async () => {
    const detailedPrompt = `You are an AI assistant for a layer-based image editor. The user has provided a reference image that shows the context and artistic style of a small section of a larger composition. Your task is to generate a new image snippet based on the user's text prompt that will be placed into this context.

**CRITICAL INSTRUCTIONS:**
1.  **Style Matching:** The generated image MUST perfectly match the artistic style, color palette, lighting, shadows, and texture of the provided reference image.
2.  **Content:** The content of the generated image should be based on the user's prompt.
3.  **Seamless Integration:** The output should look as if it were cut from the same original scene as the reference image, ensuring it will blend seamlessly when placed back.
4.  **Output:** Return only the generated image snippet. Do not add any text or explanation.

User Prompt: "${prompt}"`;

    const textPart = { text: detailedPrompt };
    
    const { mimeType, data } = parseDataUrl(contextImageUrl);
    const imagePart = { inlineData: { mimeType, data } };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI did not return an image. It may have refused the request for inpainting a section.");
  });
}


/**
 * Edits an image based on a source image, a detailed text prompt, and an optional mask for inpainting.
 */
export async function editImage(
  sourceImageDataUrl: string,
  prompt: string,
  maskImageDataUrl?: string,
): Promise<string> {
  const model = 'gemini-2.5-flash-image';
  const systemInstruction = maskImageDataUrl 
    ? `You are an expert inpainting AI. You will receive a source image, a mask image (where white indicates the area to edit), and a text prompt.
**CRITICAL INSTRUCTIONS:**
1.  **Strict Masking:** You MUST ONLY generate new content within the white areas of the mask. Do not alter any pixels outside the masked region.
2.  **Preserve Unmasked Areas:** The parts of the image corresponding to the black areas of the mask must remain absolutely identical to the source image.
3.  **Seamless Blending:** The generated content must blend perfectly and seamlessly with the surrounding unedited area, matching its lighting, style, and texture.
4.  **Follow Prompt:** The content you generate inside the mask should be based on the user's text prompt.`
    : `You are an expert image editing AI. You will receive a source image and a text prompt. Your task is to edit the source image according to the prompt's instructions.
**CRITICAL INSTRUCTIONS:**
1.  **Targeted Edits:** The prompt will specify what to change (e.g., "change the blue sofa to brown leather"). You must ONLY change the specified object or area.
2.  **Preserve Everything Else:** It is absolutely crucial to keep the rest of the image, including lighting, shadows, and other objects, completely unchanged. The edit should be seamless and localized.
3.  **Style Adherence:** The edited portion must perfectly match the artistic style, color palette, lighting, and texture of the surrounding, unedited area. Do not introduce a new style. Do not default to photorealism unless the source image is photorealistic.
4.  **Natural Integration:** The result must blend perfectly. The transition between the edited and unedited parts of the image should be invisible.
Example prompt: "Using the provided image of a living room, change only the blue sofa to be a vintage, brown leather chesterfield sofa. Keep the rest of the room, including the pillows on the sofa and the lighting, unchanged."`;

  return geminiApiWithRetry(async () => {
    const sourceParsed = parseDataUrl(sourceImageDataUrl);
    const sourceImagePart = { inlineData: { mimeType: sourceParsed.mimeType, data: sourceParsed.data } };
    const textPart = { text: prompt };

    const parts = [sourceImagePart, textPart];

    if (maskImageDataUrl) {
        const maskParsed = parseDataUrl(maskImageDataUrl);
        const maskImagePart = { inlineData: { mimeType: maskParsed.mimeType, data: maskParsed.data } };
        // Insert mask between source image and prompt for standard inpainting order.
        parts.splice(1, 0, maskImagePart);
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    
    throw new Error("AI did not return an image for editing. It may have refused the request.");
  });
}

/**
 * Enhances a composite image, blending edges and harmonizing lighting and colors.
 */
export async function enhanceImage(sourceImageDataUrl: string): Promise<string> {
  const model = 'gemini-2.5-flash-image';
  const systemInstruction = `You are a photographic post-processing AI. Your task is to enhance and harmonize a composite image.
**CRITICAL INSTRUCTIONS:**
1.  **Harmonize:** Analyze the entire image and adjust lighting, shadows, colors, and textures to make it look like a single, cohesive photograph.
2.  **Blend Edges:** Pay special attention to any hard edges or rectangular artifacts that may result from layering different images. Seamlessly blend these areas into their surroundings.
3.  **Preserve Content:** Do NOT change the subject matter, objects, or overall composition of the image. This is a refinement and blending task, not a generative one.
4.  **High Quality:** The final output should be a high-quality, clean, and unified image.`;

  return geminiApiWithRetry(async () => {
    const sourceParsed = parseDataUrl(sourceImageDataUrl);
    const sourceImagePart = { inlineData: { mimeType: sourceParsed.mimeType, data: sourceParsed.data } };
    const textPart = { text: "Harmonize and blend this composite image." };
    const parts = [sourceImagePart, textPart];

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    
    throw new Error("AI did not return an image for enhancement. It may have refused the request.");
  });
}
