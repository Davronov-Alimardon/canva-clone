type MiniMaxImageGenerationPayload = {
  model: string;
  prompt: string;
  subject_reference?: string;
  aspect_ratio?: string;
  width?: number;
  height?: number;
  response_format?: "url" | "base64";
  seed?: number;
  n?: number;
  prompt_optimizer?: boolean;
};

type MiniMaxImageGenerationResponse = {
  data?: {
    image_urls?: string[];
  };
  metadata?: {
    success_count?: number;
    failed_count?: number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

const IMAGE_ENDPOINTS = {
  global_en: "https://api.minimax.io/v1/image_generation",
  cn_zh: "https://api.minimaxi.com/v1/image_generation",
} as const;

function getImageEndpoint() {
  return process.env.MINIMAX_REGION === "cn_zh"
    ? IMAGE_ENDPOINTS.cn_zh
    : IMAGE_ENDPOINTS.global_en;
}

function getApiKey() {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is required");
  }

  return apiKey;
}

export async function generateImage(prompt: string) {
  const response = await fetch(getImageEndpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "image-01",
      prompt,
      aspect_ratio: "3:2",
      response_format: "url",
      n: 1,
      prompt_optimizer: true,
    } satisfies MiniMaxImageGenerationPayload),
  });

  const payload = (await response.json()) as MiniMaxImageGenerationResponse;
  const imageUrl = payload.data?.image_urls?.[0];

  if (!response.ok || payload.base_resp?.status_code !== 0 || !imageUrl) {
    throw new Error(
      payload.base_resp?.status_msg ?? "MiniMax image generation failed",
    );
  }

  return imageUrl;
}
