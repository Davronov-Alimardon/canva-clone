import { Hono } from "hono";
import { verifyAuth } from "@hono/auth-js";

import { unsplash } from "@/lib/unsplash";

const DEFAULT_COUNT = 50;
const DEFAULT_COLLECTION_IDS = ["317099"];

const app = new Hono()
  .get("/", verifyAuth(), async (c) => {
    const images = await unsplash.photos.getRandom({
      collectionIds: DEFAULT_COLLECTION_IDS,
      count: DEFAULT_COUNT,
    });

    if (images.errors) {
      return c.json({ error: "Something went wrong" }, 400);
    }

    let response = images.response;

    if (!Array.isArray(response)) {
      response = [response];
    }

    return c.json({ data: response });
  });

export default app;
