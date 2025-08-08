import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string().optional(),
    pubDate: z.string().transform((str) => new Date(str)), // С: преобразуем строку в дату
    author: z.string().optional(),
    heroImage: z.string().optional(),
    category: z.string().optional(),
    schema: z.any().optional(), // азрешаем JSON-LD схему
  }),
});

export const collections = {
  posts: posts,
};