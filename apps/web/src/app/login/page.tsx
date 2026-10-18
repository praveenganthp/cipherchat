"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cryptoManager } from "@/lib/crypto-store";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, setDemoMode } = useAuthStore();

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
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
            deviceName: "Web Browser Client",
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
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickLogin = (user: "alice" | "bob") => {
    setIdentifier(user);
    setPassword("Password123!@#");
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Sign In to CipherChat</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Zero-knowledge authentication and device key attestation
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground">Username or Email</label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="alice or alice@cipherchat.internal"
              required
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Password</label>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="mt-1"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        {/* Quick Demo Logins for Pair Testing */}
        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="text-[11px] text-muted-foreground text-center mb-2.5 font-medium">
            Quick Fill Seeded Test Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fillQuickLogin("alice")}
              className="text-xs"
            >
              <User className="h-3 w-3 mr-1" />
              Alice Vance
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fillQuickLogin("bob")}
              className="text-xs"
            >
              <User className="h-3 w-3 mr-1" />
              Bob Stone
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline font-semibold">
            Create an identity
          </Link>
        </p>
      </div>
    </div>
  );
}
