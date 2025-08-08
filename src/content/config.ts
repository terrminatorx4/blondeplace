import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date().optional(),
    heroImage: z.string().optional(),
  }),
});

export const collections = {
  posts: posts,
};