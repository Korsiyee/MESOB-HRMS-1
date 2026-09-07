const SkeletonCard = ({ className = '' }) => (
  <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />
);

export const SkeletonRow = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
      </div>
    ))}
  </div>
);

export default SkeletonCard;
