interface SkeletonProps {
  className?: string;
  lines?: number;
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-4 rounded-lg bg-pv-surface2 animate-shimmer ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

export default function Skeleton({ className = "", lines = 1 }: SkeletonProps) {
  if (lines === 1) {
    return <SkeletonLine className={className} />;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          className={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

export function VSCardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex justify-between">
        <SkeletonLine className="w-20 h-5" />
        <SkeletonLine className="w-12 h-5" />
      </div>
      <SkeletonLine className="w-full h-6" />
      <SkeletonLine className="w-3/4 h-6" />
      <div className="flex gap-3">
        <SkeletonLine className="flex-1 h-16" />
        <SkeletonLine className="flex-1 h-16" />
      </div>
    </div>
  );
}
