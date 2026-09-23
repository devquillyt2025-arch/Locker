"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X, Lock, LockOpen, Link2 } from "lucide-react";
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
import { CARD_TYPES, type CardType } from "@/db/schema";
import { CARD_TYPE_META } from "@/lib/card-types";
import { parseLinkUrl } from "@/lib/drive-url";
import type { ActionState } from "@/app/actions";
import type { CardWithDetails, LinkInput } from "@/lib/cards";

type FieldRow = { key: string; value: string; isSecret: boolean };

const initialState: ActionState = { ok: true };

export function CardForm({
  action,
  card,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  card?: CardWithDetails;
}) {
  const [state, formAction] = useActionState(action, initialState);

  const [type, setType] = useState<CardType>(card?.type ?? "note");
  const [aliases, setAliases] = useState<string[]>(card?.aliases ?? []);
  const [aliasDraft, setAliasDraft] = useState("");
  const [tags, setTags] = useState<string[]>(card?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [fieldRows, setFieldRows] = useState<FieldRow[]>(
    card?.fields.map((f) => ({ key: f.key, value: f.value, isSecret: f.isSecret })) ?? []
  );
  const [linkRows, setLinkRows] = useState<LinkInput[]>(
    card?.links.map((l) => ({
      label: l.label,
      url: l.url,
      source: l.source,
      driveFileId: l.driveFileId,
      kind: l.kind,
    })) ?? []
  );
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const [linkLabelDraft, setLinkLabelDraft] = useState("");

  function addAlias() {
    const a = aliasDraft.trim();
    if (a && !aliases.includes(a)) setAliases([...aliases, a]);
    setAliasDraft("");
  }

  function removeAlias(a: string) {
    setAliases(aliases.filter((x) => x !== a));
  }

  function addTag() {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function addFieldRow() {
    setFieldRows([...fieldRows, { key: "", value: "", isSecret: false }]);
  }

  function updateFieldRow(index: number, patch: Partial<FieldRow>) {
    setFieldRows(fieldRows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeFieldRow(index: number) {
    setFieldRows(fieldRows.filter((_, i) => i !== index));
  }

  function addLink() {
    const url = linkUrlDraft.trim();
    if (!url) return;
    const parsed = parseLinkUrl(url);
    setLinkRows([
      ...linkRows,
      {
        label: linkLabelDraft.trim(),
        url,
        source: parsed.source,
        driveFileId: parsed.driveFileId,
        kind: parsed.kind,
      },
    ]);
    setLinkUrlDraft("");
    setLinkLabelDraft("");
  }

  function removeLink(index: number) {
    setLinkRows(linkRows.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="aliases" value={JSON.stringify(aliases)} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input type="hidden" name="fields" value={JSON.stringify(fieldRows)} />
      <input type="hidden" name="links" value={JSON.stringify(linkRows)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select name="type" value={type} onValueChange={(v) => setType(v as CardType)}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {CARD_TYPE_META[t].label}
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
            defaultValue={card?.title}
            placeholder="e.g. Aadhaar Card"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aliases-input">Aliases</Label>
        <p className="text-sm text-muted-foreground">
          Alternate names or spellings that should also find this card (e.g.
          &quot;aadhar&quot;, &quot;UID&quot;).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {aliases.map((a) => (
            <Badge key={a} variant="secondary" className="gap-1">
              {a}
              <button
                type="button"
                onClick={() => removeAlias(a)}
                className="rounded-full hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            id="aliases-input"
            value={aliasDraft}
            onChange={(e) => setAliasDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addAlias();
              }
            }}
            placeholder="Add alias, press Enter"
            className="h-8 w-40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={card?.notes}
          placeholder="Markdown supported. Free-text notes about this card."
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
          Key/value details like IFSC, policy number, expiry. Mark secret
          fields — full values will be encrypted in your browser once phase
          2 lands; for now they&apos;re just excluded from search.
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
                title={row.isSecret ? "Secret" : "Not secret"}
                onClick={() => updateFieldRow(i, { isSecret: !row.isSecret })}
              >
                {row.isSecret ? (
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

      <div className="space-y-2">
        <Label>Links</Label>
        <p className="text-sm text-muted-foreground">
          Paste a Google Drive or DigiLocker link — the file id and kind are
          detected automatically. Keep Drive sharing set to
          &quot;Restricted&quot;.
        </p>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Label (e.g. Front)"
            value={linkLabelDraft}
            onChange={(e) => setLinkLabelDraft(e.target.value)}
            className="w-40"
          />
          <Input
            placeholder="https://drive.google.com/..."
            value={linkUrlDraft}
            onChange={(e) => setLinkUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={addLink}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {linkRows.map((link, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{link.label || "Untitled link"}</p>
                <p className="truncate text-xs text-muted-foreground">{link.url}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs capitalize">
                {link.source}
              </Badge>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(i)}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {linkRows.length === 0 && (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          )}
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton isEdit={!!card} />
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : isEdit ? "Save changes" : "Create card"}
    </Button>
  );
}
