"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

type ButtonVariant =
  | "primary"
  | "cyan"
  | "fuch"
  | "emerald"
  | "ghost"
  | "danger";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  cyan:    "btn-cyan",
  fuch:    "btn-fuch",
  emerald: "btn-emerald",
  ghost:   "btn-ghost",
  danger:  "btn-danger",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = true,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const sizeClass  = size === "sm" ? "!py-2.5 !px-4 !text-sm" : "";
  const widthClass = fullWidth ? "" : "!w-auto";

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${variantClasses[variant]} ${sizeClass} ${widthClass} flex items-center justify-center gap-2.5 focus-ring ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
