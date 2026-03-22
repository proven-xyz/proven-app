"use client";

import { useEffect, useState } from "react";

export type DemoRole = "creator" | "challenger" | "resolver";

const DEMO_ROLE_KEY = "proven.demoRole";
const DEFAULT_DEMO_ROLE: DemoRole = "creator";

function isDemoRole(value: string | null): value is DemoRole {
  return value === "creator" || value === "challenger" || value === "resolver";
}

export function useDemoRole() {
  const [demoRole, setDemoRoleState] = useState<DemoRole>(DEFAULT_DEMO_ROLE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(DEMO_ROLE_KEY);
    if (isDemoRole(stored)) {
      setDemoRoleState(stored);
    }
  }, []);

  function setDemoRole(nextRole: DemoRole) {
    setDemoRoleState(nextRole);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEMO_ROLE_KEY, nextRole);
    }
  }

  return { demoRole, setDemoRole };
}
