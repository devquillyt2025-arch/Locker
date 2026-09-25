import { AppLink as Link } from "@/components/shell/app-link";
import { formatDistanceToNow } from "date-fns";
import { Link2, Lock } from "lucide-react";
import { CARD_TYPE_META } from "@/lib/card-types";
import { cn } from "@/lib/utils";
import type { CardWithDetails } from "@/lib/cards";

export function TypeIcon({
  type,
  className,
}: {
  type: CardWithDetails["type"];
  className?: string;
}) {
  const meta = CARD_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        meta.tone,
        className
      )}
    >
      <Icon className="size-5" />
    </div>
  );
}

export function CardTile({ card, index = 0 }: { card: CardWithDetails; index?: number }) {
  const meta = CARD_TYPE_META[card.type];
  // Never preview secret values on a list tile.
  const preview = card.fields.filter((f) => !f.isSecret && f.value).slice(0, 2);
  const secretCount = card.fields.filter((f) => f.isSecret).length;

  return (
    <Link
      href={`/cards/${card.id}`}
      // Cap the stagger so a long list doesn't take seconds to appear.
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
      className="animate-rise group flex min-h-40 flex-col rounded-2xl border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <TypeIcon type={card.type} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight group-hover:text-primary">{card.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta.label}</p>
        </div>
      </div>

      {preview.length > 0 ? (
        <dl className="mt-3 space-y-1">
          {preview.map((f) => (
            <div key={f.id} className="flex items-baseline gap-2 text-xs">
              <dt className="shrink-0 text-muted-foreground">{f.key}</dt>
              <dd className="truncate font-mono">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        card.notes && (
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{card.notes}</p>
        )
      )}

      <div className="mt-auto flex items-center gap-3 pt-3 text-[11px] text-muted-foreground">
        {card.links.length > 0 && (
          <span className="flex items-center gap-1">
            <Link2 className="size-3" /> {card.links.length}
          </span>
        )}
        {secretCount > 0 && (
          <span className="flex items-center gap-1">
            <Lock className="size-3 text-amber-500" /> {secretCount}
          </span>
        )}
        {card.tags.slice(0, 2).map((t) => (
          <span key={t} className="rounded-full bg-muted px-1.5 py-px">
            {t}
          </span>
        ))}
        <span className="ml-auto" suppressHydrationWarning>
          {formatDistanceToNow(card.updatedAt, { addSuffix: true })}
        </span>
      </div>
    </Link>
  );
}
