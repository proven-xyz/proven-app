import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-pv-surface mt-16">
      <div className="max-w-[640px] mx-auto px-5 py-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-display font-bold text-sm tracking-tight text-pv-muted">
              PROVEN<span className="text-pv-emerald">.</span>
            </span>
            <p className="text-[11px] text-pv-muted/60 mt-1">
              La verdad se demuestra.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/explore"
              className="text-xs text-pv-muted hover:text-pv-text transition-colors"
            >
              Explorar
            </Link>
            <Link
              href="/vs/create"
              className="text-xs text-pv-muted hover:text-pv-text transition-colors"
            >
              Crear VS
            </Link>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-pv-surface2">
          <p className="text-[10px] text-pv-muted/40 text-center">
            Powered by GenLayer AI Consensus
          </p>
        </div>
      </div>
    </footer>
  );
}
