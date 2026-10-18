import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
    secondary: "bg-secondary/70 text-secondary-foreground border border-border/80",
    outline: "text-muted-foreground border border-border/70 bg-transparent",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
    warning: "bg-amber-500/10 text-amber-300 border border-amber-500/25",
    destructive: "bg-rose-500/10 text-rose-300 border border-rose-500/25",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
