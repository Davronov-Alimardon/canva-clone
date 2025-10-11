import Replicate from "replicate";

// Validate API token
const apiToken = process.env.REPLICATE_API_TOKEN;

if (!apiToken) {
  console.error("❌ REPLICATE_API_TOKEN is not set in environment variables");
  throw new Error("REPLICATE_API_TOKEN is required but not found in environment variables");
}

console.log("✅ REPLICATE_API_TOKEN found:", apiToken.substring(0, 8) + "...");

export const replicate = new Replicate({
  auth: apiToken,
});
