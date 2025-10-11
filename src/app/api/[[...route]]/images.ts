import { Hono } from "hono";
import { verifyAuth } from "@hono/auth-js";

import { unsplash } from "@/lib/unsplash";

const DEFAULT_COUNT = 50;
const DEFAULT_COLLECTION_IDS = ["317099"];

const app = new Hono().get("/", verifyAuth(), async (c) => {
  if (!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) {
    return c.json({ error: "Unsplash API key not configured" }, 500);
  }

  const images = await unsplash.photos.getRandom({
    collectionIds: DEFAULT_COLLECTION_IDS,
    count: DEFAULT_COUNT,
  });

  if (images.errors) {
    console.error("Unsplash API error:", images.errors);
    return c.json(
      {
        error: "Failed to fetch images from Unsplash",
        details: images.errors,
      },
      400
    );
  }

  let response = images.response;

  if (!Array.isArray(response)) {
    response = [response];
  }

  return c.json({ data: response });
});

export default app;
