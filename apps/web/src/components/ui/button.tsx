import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium shadow-sm border border-emerald-500/30 transition-all focus-visible:ring-1 focus-visible:ring-emerald-400",
      secondary:
        "bg-secondary/90 hover:bg-secondary text-foreground border border-border/80 transition-colors focus-visible:ring-1 focus-visible:ring-emerald-500/40",
      outline:
        "border border-border/80 bg-transparent hover:bg-secondary/60 text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-emerald-500/40",
      ghost:
        "hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-emerald-500/40",
      destructive:
        "bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-500/30 transition-colors focus-visible:ring-1 focus-visible:ring-rose-400",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-9 px-4 text-sm rounded-md",
      lg: "h-11 px-6 text-base rounded-md",
      icon: "h-9 w-9 p-0 flex items-center justify-center rounded-md",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className={cn("animate-spin h-4 w-4", size === "icon" ? "" : "-ml-1 mr-2")}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
