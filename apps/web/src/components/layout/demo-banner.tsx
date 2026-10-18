"use client";

import * as React from "react";
import { Sparkles, ArrowRight, ShieldCheck, Database } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  const { demoMode, setDemoMode } = useAuthStore();

  if (!demoMode) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-amber-500/30 px-4 py-2 text-xs flex items-center justify-between z-40 relative">
      <div className="flex items-center space-x-2">
        <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="font-semibold text-amber-300">DEMO MODE ACTIVE:</span>
        <span className="text-muted-foreground hidden sm:inline">
          Showing realistic offline fixtures. All cryptographic UI operations are simulated.
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => setDemoMode(false)}
          className="text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
        >
          Switch to Live Backend
        </button>
      </div>
    </div>
  );
}
