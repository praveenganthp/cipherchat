"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, ArrowRight, User, Eye, EyeOff, KeyRound, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cryptoManager } from "@/lib/crypto-store";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, setDemoMode } = useAuthStore();

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeFilled, setActiveFilled] = React.useState<"alice" | "bob" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) return;

    setError(null);
    setIsLoading(true);

    try {
      // Initialize or get local cryptographic keys for this device
      const keys = await cryptoManager.getOrInitializeKeys();

      const res = await apiFetch<any>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          device: {
            deviceName: "Web Client Device",
            deviceType: "WEB",
            identityPublicKey: keys.identityKeys.publicKey,
            signedPreKey: keys.preKeys.publicKey,
            preKeySignature: keys.preKeySignature,
          },
        }),
      });

      setAuth(res.user, res.device, res.accessToken);
      setDemoMode(false);
      router.push("/chat");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickLogin = (userType: "alice" | "bob") => {
    setIdentifier(userType);
    setPassword("Password123!@#");
    setActiveFilled(userType);
    setError(null);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-7 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mb-3 shadow-sm">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign In to CipherChat</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Client-side cryptographic identity attestation & zero-knowledge authentication.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Username or Email</label>
            <Input
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setActiveFilled(null);
              }}
              placeholder="alice or alice@cipherchat.internal"
              required
              autoFocus
              className="bg-secondary/40 border-border/80 focus:border-emerald-500/60"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Master Password</label>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="pr-10 bg-secondary/40 border-border/80 focus:border-emerald-500/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full h-10 mt-2" isLoading={isLoading}>
            <span>Authenticate Device & Decrypt</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>

        {/* Quick Demo Test Credential Chips */}
        <div className="border-t border-border/60 pt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Seeded Test Accounts
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Pair Testing</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillQuickLogin("alice")}
              className={`rounded-xl border p-2.5 text-left transition-all flex items-center justify-between ${
                activeFilled === "alice"
                  ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                  : "border-border/80 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <div className="truncate pr-1">
                <span className="block text-xs font-semibold text-foreground">Alice Vance</span>
                <span className="block text-[10px] text-muted-foreground">@alice</span>
              </div>
              {activeFilled === "alice" && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => fillQuickLogin("bob")}
              className={`rounded-xl border p-2.5 text-left transition-all flex items-center justify-between ${
                activeFilled === "bob"
                  ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                  : "border-border/80 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <div className="truncate pr-1">
                <span className="block text-xs font-semibold text-foreground">Bob Stone</span>
                <span className="block text-[10px] text-muted-foreground">@bob</span>
              </div>
              {activeFilled === "bob" && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Footer Link & Privacy Note */}
        <div className="space-y-3 pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            Don&apos;t have an encrypted identity?{" "}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4">
              Generate keys & register
            </Link>
          </p>

          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-muted-foreground/80">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Zero-Knowledge: Server never observes plaintext or private keys.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
