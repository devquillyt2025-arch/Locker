import { cn } from "@/lib/utils";

export const PAGE_CONTAINER_CLASS =
  "mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-8 lg:px-10 lg:py-8";

// Every page uses the full width of the main pane; only readable-text
// blocks (like the home hero) cap their own width.
export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(PAGE_CONTAINER_CLASS, "animate-rise", className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
