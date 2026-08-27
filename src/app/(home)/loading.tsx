import { Skeleton } from "@/components/ui/skeleton";

/**
 * Reserves Home chrome and the first editorial bands while App Router streams a new edition.
 * @returns A reduced-motion-safe loading composition matching the final page geometry.
 * @example
 * <HomeLoading />
 */
export default function HomeLoading() {
  return (
    <div aria-label="Loading edition" aria-busy="true">
      <div className="border-ms-border/60 h-16 border-b" />
      <div className="border-ms-border/60 flex h-[69px] items-center justify-center border-b px-4">
        <Skeleton className="h-11 w-full max-w-md" />
      </div>

      <main className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <section aria-label="Loading featured story">
          <Skeleton className="aspect-[16/8] min-h-[300px] w-full" />
        </section>

        <section
          className="flex flex-col gap-3"
          aria-label="Loading GitHub Trending"
        >
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="aspect-[4/3] w-full" />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
