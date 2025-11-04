import { defineCollection, z } from 'astro:content';

// 栽培ノウハウ記事のコレクション
const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()).optional(),
    difficulty: z.number().min(1).max(5).optional(),
    readingTime: z.string().optional(),
    featured: z.boolean().optional(),
  }),
});

// 品種ページのコレクション
const speciesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    scientificName: z.string(),
    commonName: z.string().optional(),
    origin: z.string(),
    difficulty: z.number().min(1).max(5),
    growthType: z.enum(['solitary', 'pup-forming']),
    care: z.object({
      light: z.string(),
      water: z.string(),
      temperature: z.string(),
      humidity: z.string(),
    }),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  'posts': postsCollection,
  'species': speciesCollection,
};
