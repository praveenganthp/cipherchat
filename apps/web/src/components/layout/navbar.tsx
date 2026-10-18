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
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 group-hover:scale-105 transition-transform">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-tight text-foreground">
                CipherChat
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                E2EE
              </Badge>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center space-x-3">
            <Link
              href="/docs/security"
              className="hidden sm:flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/60"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Security Architecture</span>
            </Link>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/60"
            >
              <span>GitHub</span>
            </a>

            {/* Demo Mode Toggle */}
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                demoMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>{demoMode ? "Demo Mode (ON)" : "Demo Mode"}</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2 border-l border-border/60 pl-3">
                <button
                  onClick={() => setIsDevicesOpen(true)}
                  className="hidden sm:flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground bg-secondary/40 px-2 py-1 rounded-md border border-border/50"
                  title="View registered devices"
                >
                  <Laptop className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate max-w-[100px]">{device?.deviceName || "Device"}</span>
                </button>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center space-x-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 px-2.5 py-1 rounded-md border border-border"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>{user.username}</span>
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive h-8 w-8"
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
