"use client";

import { useTranslations } from "next-intl";

import { type DemoRole, useDemoRole } from "@/hooks/useDemoRole";

const ROLES: DemoRole[] = ["creator", "challenger", "resolver"];

type DemoRoleSwitcherProps = {
  className?: string;
};

export default function DemoRoleSwitcher({
  className = "",
}: DemoRoleSwitcherProps) {
  const t = useTranslations("header");
  const { demoRole, setDemoRole } = useDemoRole();

  return (
    <div className={className}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted mb-2">
        {t("demoRole")}
      </div>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setDemoRole(role)}
            className={`chip transition-colors ${
              demoRole === role
                ? "border-pv-emerald/[0.35] bg-pv-emerald/[0.1] text-pv-emerald"
                : "text-pv-muted hover:text-pv-text hover:border-white/[0.22]"
            }`}
          >
            {t(`roles.${role}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
