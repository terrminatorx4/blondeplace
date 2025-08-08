import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.union([z.string(), z.array(z.string())]).optional(),
    pubDate: z.coerce.date(),
    author: z.string().default('BlondePlace Beauty Expert'),
    heroImage: z.string().optional(),
    category: z.string().default('beauty-tips'),
    schema: z.any().optional()
  }),
});

export const collections = { posts };
