"use client";

import * as React from "react";
import Link from "next/link";
import { Shield, Lock, Laptop, Settings, LogOut, BookOpen, Sparkles, User } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SettingsModal } from "@/components/chat/settings-modal";
import { DeviceManagerModal } from "@/components/chat/device-manager-modal";

export function Navbar() {
  const { user, device, logout, demoMode, setDemoMode } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-2.5 sm:px-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2 group shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 group-hover:border-emerald-500/50 transition-colors">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm sm:text-base tracking-tight text-foreground">
                CipherChat
              </span>
              <Badge variant="default" className="text-[9px] sm:text-[10px] py-0 px-1.5 hidden xs:inline-flex">
                E2EE
              </Badge>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {user && (
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] text-muted-foreground border border-border/80 bg-secondary/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-[10px] text-emerald-400/90 font-medium">E2EE Ratchet</span>
              </div>
            )}

            <Link
              href="/docs/security"
              className="hidden sm:flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/60"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-400/80" />
              <span>Security Specs</span>
            </Link>

            <a
              href="https://github.com/praveenganthp/cipherchat"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/60"
            >
              <span>GitHub</span>
            </a>

            {/* Demo Mode Toggle */}
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={`flex items-center space-x-1 text-xs px-2 sm:px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                demoMode
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/35"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span className="hidden sm:inline">{demoMode ? "Demo Mode (ON)" : "Demo Mode"}</span>
              <span className="sm:hidden text-[11px]">{demoMode ? "Demo ON" : "Demo"}</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-1 sm:space-x-2 border-l border-border/60 pl-2 sm:pl-3 shrink-0">
                <button
                  onClick={() => setIsDevicesOpen(true)}
                  className="hidden sm:flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground bg-secondary/40 px-2 py-1 rounded-md border border-border/50"
                  title="View registered devices"
                >
                  <Laptop className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="truncate max-w-[100px]">{device?.deviceName || "Device"}</span>
                </button>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center space-x-1 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 px-2 sm:px-2.5 py-1 rounded-md border border-border"
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="max-w-[75px] sm:max-w-none truncate">{user.username}</span>
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Devices Modal */}
      <DeviceManagerModal isOpen={isDevicesOpen} onClose={() => setIsDevicesOpen(false)} />
    </>
  );
}
