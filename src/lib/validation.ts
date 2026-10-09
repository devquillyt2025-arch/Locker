import { z } from "zod";
import { CARD_TYPES, LINK_SOURCES, LINK_KINDS } from "@/db/schema";

export const fieldInputSchema = z.object({
  key: z.string().trim().min(1, "Field name is required"),
  value: z.string().trim(),
  isSecret: z.boolean(),
});

// Links are normally full URLs (Drive, DigiLocker, ...). A path under
// /files/ is also accepted: that's a document on this machine, served from
// the local docs folder (see app/files/[...path]/route.ts).
const isLocalFilePath = (v: string) => v.startsWith("/files/") && !v.includes("..");

export const linkInputSchema = z.object({
  label: z.string().trim(),
  url: z
    .string()
    .trim()
    .refine((v) => isLocalFilePath(v) || z.string().url().safeParse(v).success, "Enter a valid URL"),
  source: z.enum(LINK_SOURCES),
  driveFileId: z.string().trim().nullable(),
  kind: z.enum(LINK_KINDS),
});

export const cardInputSchema = z.object({
  type: z.enum(CARD_TYPES),
  title: z.string().trim().min(1, "Title is required"),
  aliases: z.array(z.string().trim().min(1)),
  tags: z.array(z.string().trim().min(1)),
  notes: z.string(),
  fields: z.array(fieldInputSchema),
  links: z.array(linkInputSchema),
});

export type CardFormValues = z.infer<typeof cardInputSchema>;
export type LinkFormValues = z.infer<typeof linkInputSchema>;
