import { Suspense } from "react";
import ExploreClient from "./ExploreClient";

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreLoading />}>
      <ExploreClient />
    </Suspense>
  );
}

function ExploreLoading() {
  return (
    <div className="animate-pulse space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-8 w-32 rounded bg-pv-surface2" />
      <div className="h-12 w-full max-w-xl rounded bg-pv-surface2" />
      <div className="h-11 w-full max-w-2xl rounded bg-pv-surface2" />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="h-80 rounded border border-white/[0.06] bg-pv-surface2/50" />
        <div className="space-y-3">
          <div className="h-4 w-40 rounded bg-pv-surface2" />
          <div className="h-52 rounded bg-pv-surface2/80" />
          <div className="h-52 rounded bg-pv-surface2/80" />
        </div>
      </div>
    </div>
  );
}
