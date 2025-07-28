import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('BlondePlace Beauty Expert'),
    heroImage: z.string().optional(),
    category: z.enum([
      'hair-care', 'hair-coloring', 'hairstyles', 'blonde-trends', 'hair-treatments',
      'nail-care', 'manicure', 'pedicure', 'skincare', 'makeup', 'beauty-tips',
      'salon-news', 'hair-products', 'beauty-trends', 'seasonal-beauty'
    ]).default('beauty-tips'),
    schema: z.any().optional() // Accept any schema structure from factory.js
  }),
});

export const collections = { posts };
