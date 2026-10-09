"use client";

import { useActionState, useState } from "react";
import { AppLink as Link } from "@/components/shell/app-link";
import { useFormStatus } from "react-dom";
import { Plus, X, Lock, LockOpen, Link2, Loader2 } from "lucide-react";
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
  defaultType,
  cancelHref = "/cards",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  card?: CardWithDetails;
  defaultType?: CardType;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);

  const [type, setType] = useState<CardType>(card?.type ?? defaultType ?? "note");
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
    <form action={formAction}>
      <input type="hidden" name="aliases" value={JSON.stringify(aliases)} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input type="hidden" name="fields" value={JSON.stringify(fieldRows)} />
      <input type="hidden" name="links" value={JSON.stringify(linkRows)} />

      <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] xl:gap-8">
        {/* Left column: basics, then files & links. A container, so rows adapt to this column's width rather than the screen's. */}
        <div className="min-w-0 space-y-6 @container">
          <Section title="Basics">
            <div className="grid gap-4 @lg:grid-cols-[14rem_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" value={type} onValueChange={(v) => setType(v as CardType)}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_TYPES.map((t) => {
                      const Icon = CARD_TYPE_META[t].icon;
                      return (
                        <SelectItem key={t} value={t}>
                          <Icon className="size-4" />
                          {CARD_TYPE_META[t].label}
                        </SelectItem>
                      );
                    })}
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
                  autoFocus={!card}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aliases-input">Aliases</Label>
              <p className="text-xs text-muted-foreground">
                Other names that should also find this card (e.g. &quot;aadhar&quot;, &quot;UID&quot;).
              </p>
              <ChipInput
                id="aliases-input"
                items={aliases}
                draft={aliasDraft}
                setDraft={setAliasDraft}
                onAdd={addAlias}
                onRemove={removeAlias}
                placeholder="Add alias, press Enter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags-input">Tags</Label>
              <ChipInput
                id="tags-input"
                items={tags}
                draft={tagDraft}
                setDraft={setTagDraft}
                onAdd={addTag}
                onRemove={removeTag}
                placeholder="Add tag, press Enter"
              />
            </div>
          </Section>

          <Section title="Files & links">
            <p className="text-xs text-muted-foreground">
              Paste a Google Drive or DigiLocker link — file id and kind are detected automatically.
              Keep Drive sharing set to &quot;Restricted&quot;.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Label (e.g. Front)"
                aria-label="Link label"
                value={linkLabelDraft}
                onChange={(e) => setLinkLabelDraft(e.target.value)}
                className="w-full"
              />
              <Input
                placeholder="https://drive.google.com/..."
                aria-label="Link URL"
                value={linkUrlDraft}
                onChange={(e) => setLinkUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
                className="min-w-0 flex-1 basis-40"
              />
              <Button type="button" variant="outline" onClick={addLink}>
                <Plus /> Add
              </Button>
            </div>
            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {linkRows.map((link, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{link.label || "Untitled link"}</p>
                    <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {link.source}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Remove link"
                    onClick={() => removeLink(i)}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              {linkRows.length === 0 && (
                <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                  No links yet.
                </p>
              )}
            </div>
          </Section>
        </div>

        {/* Right column: details and notes */}
        <div className="min-w-0 space-y-6 @container">
          <Section
            title="Details"
            action={
              <Button type="button" variant="outline" size="sm" onClick={addFieldRow}>
                <Plus /> Add field
              </Button>
            }
          >
            <p className="text-xs text-muted-foreground">
              Key/value details like IFSC, policy number or expiry. Lock a field to hide its value
              on screen and keep it out of search.
            </p>
            <div className="space-y-2">
              {fieldRows.map((row, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Key (e.g. IFSC)"
                    aria-label="Field key"
                    value={row.key}
                    onChange={(e) => updateFieldRow(i, { key: e.target.value })}
                    className="w-full @md:w-44"
                  />
                  <Input
                    placeholder="Value"
                    aria-label="Field value"
                    value={row.value}
                    onChange={(e) => updateFieldRow(i, { value: e.target.value })}
                    className="min-w-0 flex-1 basis-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={row.isSecret ? "Secret" : "Not secret"}
                    onClick={() => updateFieldRow(i, { isSecret: !row.isSecret })}
                  >
                    {row.isSecret ? (
                      <Lock className="text-amber-500" />
                    ) : (
                      <LockOpen className="text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Remove field"
                    onClick={() => removeFieldRow(i)}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              {fieldRows.length === 0 && (
                <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                  No fields yet.
                </p>
              )}
            </div>
          </Section>

          <Section title="Notes">
            <Textarea
              id="notes"
              name="notes"
              defaultValue={card?.notes}
              placeholder="Free-text notes about this card."
              rows={8}
              aria-label="Notes"
            />
          </Section>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-3 border-t bg-background/85 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        {state.error && <p className="mr-auto text-sm text-destructive">{state.error}</p>}
        <Button type="button" variant="ghost" size="lg" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <SubmitButton isEdit={!!card} />
      </div>
    </form>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChipInput({
  id,
  items,
  draft,
  setDraft,
  onAdd,
  onRemove,
  placeholder,
}: {
  id: string;
  items: string[];
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="h-6 gap-1 pl-2.5">
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            title={`Remove ${item}`}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            onAdd();
          }
        }}
        onBlur={onAdd}
        placeholder={placeholder}
        className="h-8 w-44"
      />
    </div>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? "Saving..." : isEdit ? "Save changes" : "Create card"}
    </Button>
  );
}
