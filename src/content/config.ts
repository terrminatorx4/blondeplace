import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string().optional(),
    // СЬЯ СХ: принимает string  date, всегда возвращает Date
    pubDate: z.union([
      z.string().transform((str) => new Date(str)),
      z.date()
    ]),
    author: z.string().optional(),
    heroImage: z.string().optional(),
    category: z.string().optional(),
    schema: z.any().optional(), // азрешаем JSON-LD схему
  }),
});

export const collections = {
  posts: posts,
};