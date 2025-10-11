import { Hono } from "hono";
import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono();

// Zod Schema for validation
export const generateImageSchema = z.object({
  prompt: z.string().min(1),
  negative_prompt: z.string().optional(),
  aspect_ratio: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  seed: z.union([z.string(), z.number()]).optional(),
  model: z.string().default("sd15"),
  mode: z.string().optional(),
  image: z.string().optional(),
  strength: z.number().optional(),
  output_format: z.enum(["png", "jpg", "jpeg", "webp"]).default("png"),
  mask: z.string().optional(),
});

// Helper function to create a mock image
function createMockImage(
  prompt: string,
  width: number = 512,
  height: number = 512,
  isInpaint: boolean = false
): string {
  // Always use the simple server-side approach since this is an API route
  return generateSimpleMockImage(prompt, width, height, isInpaint);
}

// Server-side mock image generator
function generateSimpleMockImage(
  prompt: string,
  width: number,
  height: number,
  isInpaint: boolean
): string {
  // Create a simple SVG that we'll convert to base64
  const bgColor = isInpaint ? "#e6f3ff" : "#f0f9ff";
  const borderColor = isInpaint ? "#3b82f6" : "#6b7280";
  const textColor = "#1f2937";
  const prefix = isInpaint ? "INPAINT: " : "GENERATED: ";
  const text = prefix + prompt.substring(0, 40);

  // Create SVG markup
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${isInpaint ? "#b3d9ff" : "#dbeafe"};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" stroke="${borderColor}" stroke-width="2"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${textColor}">
        ${text}
      </text>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
        ${new Date().toLocaleTimeString()}
      </text>
      <text x="50%" y="85%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">
        Mock Image ${width}x${height}
      </text>
    </svg>
  `;

  // Convert SVG to base64
  const base64Svg = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64Svg}`;
}

// Simulate async delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /api/ai/generate-image
app.post(
  "/generate-image",
  verifyAuth(),
  zValidator("json", generateImageSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");
      console.log("[MOCK] [AI API] Generate image request:", {
        prompt: body.prompt,
        hasImage: !!body.image,
        width: body.width,
        height: body.height,
        model: body.model,
      });

      // Simulate processing time
      await delay(1500);

      const width = body.width || 512;
      const height = body.height || 512;

      console.log("[MOCK] [AI API] Creating mock image...");

      // Create mock image
      const mockImageUrl = createMockImage(body.prompt, width, height, false);

      console.log("[MOCK] [AI API] Mock generation successful");

      return c.json({
        success: true,
        image_url: mockImageUrl,
        finish_reason: "SUCCESS",
        seed: 12345,
      });
    } catch (error) {
      console.error("[MOCK] [AI API] Generation error:", error);

      return c.json(
        {
          success: false,
          error: `Mock image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        500
      );
    }
  }
);

// POST /api/ai/inpaint
app.post(
  "/inpaint",
  verifyAuth(),
  zValidator("json", generateImageSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");
      console.log("[MOCK] [AI API] Inpaint request:", {
        prompt: body.prompt,
        hasImage: !!body.image,
        hasMask: !!body.mask,
      });

      // Simulate processing time
      await delay(2000);

      // For inpainting, try to get dimensions from the source image if provided
      let width = 512;
      let height = 512;

      if (body.image) {
        // Try to extract dimensions from the image data URL (this is a mock, so we'll use defaults)
        console.log("[MOCK] [AI API] Using source image for inpainting");
      }

      console.log("[MOCK] [AI API] Creating mock inpaint result...");

      // Create mock inpainted image
      const mockImageUrl = createMockImage(body.prompt, width, height, true);

      console.log("[MOCK] [AI API] Mock inpaint successful");

      return c.json({
        success: true,
        image_url: mockImageUrl,
        finish_reason: "SUCCESS",
        seed: 54321,
      });
    } catch (error) {
      console.error("[MOCK] [AI API] Inpaint error:", error);
      return c.json(
        {
          success: false,
          error: `Mock inpainting failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        500
      );
    }
  }
);

// POST /api/ai/remove-bg (keeping this for completeness)
app.post(
  "/remove-bg",
  verifyAuth(),
  zValidator(
    "json",
    z.object({
      image: z.string(),
    })
  ),
  async (c) => {
    try {
      console.log("[MOCK] [AI API] Remove background request");

      // Simulate processing time
      await delay(1000);

      // Create a mock image with transparent background indication
      const mockImageUrl = createMockImage(
        "Background Removed",
        512,
        512,
        false
      );

      console.log("[MOCK] [AI API] Mock background removal successful");

      return c.json({
        success: true,
        image_url: mockImageUrl,
      });
    } catch (error) {
      console.error("[MOCK] [AI API] Background removal error:", error);
      return c.json(
        {
          success: false,
          error: `Mock background removal failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        500
      );
    }
  }
);

export default app;
