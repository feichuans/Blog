import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: "./src/content", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      // Transform string to Date object
      dateCreated: z.coerce.date(),
      dateModified: z.coerce.date(),
      tags: z.array(z.string()).optional(),
      banner: z.union([image(), z.url()]).optional(),
      isPub: z.boolean().default(true),
    }),
});

export const collections = { blog };
