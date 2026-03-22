export function isDemoRelayEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

export function getDemoModeLabel() {
  return process.env.NEXT_PUBLIC_DEMO_MODE_LABEL || "Bradbury demo mode";
}
