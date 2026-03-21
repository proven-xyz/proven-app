interface PoolBadgeProps {
  amount: number;
  large?: boolean;
}

export default function PoolBadge({ amount, large = false }: PoolBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl bg-pv-gold/[0.06] border border-pv-gold/[0.12] font-mono font-bold text-pv-gold ${
        large ? "px-6 py-3 text-lg" : "px-4 py-2 text-sm"
      }`}
    >
      <span className="text-pv-gold/60">$</span>
      {amount}
      <span className="text-pv-gold/40 text-[0.7em] font-body font-semibold uppercase tracking-wider">
        en juego
      </span>
    </div>
  );
}
