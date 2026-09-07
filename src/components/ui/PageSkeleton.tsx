import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  /** Number of "row" placeholders to render below the header. */
  rows?: number;
  /** Optional grid of stat cards above the rows. */
  stats?: number;
  /** Extra className for the outer container. */
  className?: string;
  /** Layout variant. */
  variant?: "list" | "form";
}

/**
 * Themed, layout-shaped skeleton used while a page's data is loading.
 * Replaces blank screens / lone spinners so users see structure immediately.
 */
export function PageSkeleton({
  rows = 4,
  stats = 0,
  className,
  variant = "list",
}: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={cn("min-h-screen bg-background p-4 sm:p-6", className)}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>

        {/* Stats grid */}
        {stats > 0 && (
          <div
            className={cn(
              "grid gap-2 sm:gap-3",
              stats <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
            )}
          >
            {Array.from({ length: stats }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Body */}
        {variant === "form" ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-12 w-32 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
