// Stability AI API client configuration

// Validate API key
const apiKey = process.env.STABILITY_API_KEY;

if (!apiKey) {
  console.error("❌ STABILITY_API_KEY is not set in environment variables");
  throw new Error("STABILITY_API_KEY is required but not found in environment variables");
}

console.log("✅ STABILITY_API_KEY found:", apiKey.substring(0, 8) + "...");

export const stabilityApiKey = apiKey;
export const stabilityApiBaseUrl = "https://api.stability.ai/v2beta/stable-image";