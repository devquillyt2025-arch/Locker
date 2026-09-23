import { z } from "zod";
import { ENTRY_TYPES } from "@/db/schema";

export const fieldInputSchema = z.object({
  key: z.string().trim().min(1, "Field name is required"),
  value: z.string().trim(),
  sensitive: z.boolean(),
});

export const entryInputSchema = z.object({
  type: z.enum(ENTRY_TYPES),
  title: z.string().trim().min(1, "Title is required"),
  body: z.string(),
  tags: z.array(z.string().trim().min(1)),
  fields: z.array(fieldInputSchema),
});

export type EntryFormValues = z.infer<typeof entryInputSchema>;
