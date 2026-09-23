"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ENTRY_TYPES, type EntryType } from "@/db/schema";
import { ENTRY_TYPE_META } from "@/lib/entry-types";
import type { ActionState } from "@/app/actions";
import type { EntryWithFields } from "@/lib/entries";

type FieldRow = { key: string; value: string; sensitive: boolean };

const initialState: ActionState = { ok: true };

export function EntryForm({
  action,
  entry,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  entry?: EntryWithFields;
}) {
  const [state, formAction] = useActionState(action, initialState);

  const [type, setType] = useState<EntryType>(entry?.type ?? "note");
  const [tags, setTags] = useState<string[]>(
    entry ? (JSON.parse(entry.tags) as string[]) : []
  );
  const [tagDraft, setTagDraft] = useState("");
  const [fieldRows, setFieldRows] = useState<FieldRow[]>(
    entry?.fields.map((f) => ({ key: f.key, value: f.value, sensitive: f.sensitive })) ?? []
  );

  function addTag() {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function addFieldRow() {
    setFieldRows([...fieldRows, { key: "", value: "", sensitive: false }]);
  }

  function updateFieldRow(index: number, patch: Partial<FieldRow>) {
    setFieldRows(fieldRows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeFieldRow(index: number) {
    setFieldRows(fieldRows.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input type="hidden" name="fields" value={JSON.stringify(fieldRows)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select name="type" value={type} onValueChange={(v) => setType(v as EntryType)}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTRY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ENTRY_TYPE_META[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            defaultValue={entry?.title}
            placeholder="e.g. SBI Savings Account"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Notes</Label>
        <Textarea
          id="body"
          name="body"
          defaultValue={entry?.body}
          placeholder="Markdown supported. Free-text notes about this entry."
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="rounded-full hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add tag, press Enter"
            className="h-8 w-40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Fields</Label>
          <Button type="button" variant="outline" size="sm" onClick={addFieldRow}>
            <Plus className="size-4" /> Add field
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Key/value details like IFSC, policy number, expiry. Mark sensitive
          fields — full values will move into the encrypted vault once phase
          2 lands; for now they&apos;re just excluded from the LLM later.
        </p>
        <div className="space-y-2">
          {fieldRows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Key (e.g. IFSC)"
                value={row.key}
                onChange={(e) => updateFieldRow(i, { key: e.target.value })}
                className="w-40"
              />
              <Input
                placeholder="Value"
                value={row.value}
                onChange={(e) => updateFieldRow(i, { value: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={row.sensitive ? "Sensitive" : "Not sensitive"}
                onClick={() => updateFieldRow(i, { sensitive: !row.sensitive })}
              >
                {row.sensitive ? (
                  <Lock className="size-4 text-amber-500" />
                ) : (
                  <LockOpen className="size-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFieldRow(i)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {fieldRows.length === 0 && (
            <p className="text-sm text-muted-foreground">No fields yet.</p>
          )}
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton isEdit={!!entry} />
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : isEdit ? "Save changes" : "Create entry"}
    </Button>
  );
}
