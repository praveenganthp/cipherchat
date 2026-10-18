"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, Key, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cryptoManager } from "@/lib/crypto-store";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, setDemoMode } = useAuthStore();

  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [deviceName, setDeviceName] = React.useState("Web Browser Client");
  const [isLoading, setIsLoading] = React.useState(false);
  const [cryptoProgress, setCryptoProgress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password) return;

    setError(null);
    setIsLoading(true);

    try {
      setCryptoProgress("Generating hardware-backed ECDSA & ECDH P-256 keypairs...");
      const keys = await cryptoManager.getOrInitializeKeys();

      setCryptoProgress("Registering cryptographic device keys with backend...");
      const res = await apiFetch<any>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          password,
          device: {
            deviceName: deviceName.trim() || "Web Browser Client",
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
      setError(err.message || "Registration failed. Please check inputs.");
    } finally {
      setIsLoading(false);
      setCryptoProgress(null);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Create Encrypted Identity</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Keys are created locally in your browser. Passwords never decrypt your conversations.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {cryptoProgress && (
          <div className="mb-4 flex items-center space-x-2 rounded-lg bg-primary/10 border border-primary/30 p-2.5 text-xs text-primary">
            <Key className="h-4 w-4 animate-pulse shrink-0" />
            <span>{cryptoProgress}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-foreground">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="unique_username"
              required
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others see you"
              required
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Password (Min 10 characters)</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Device Name</label>
            <Input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. My Laptop"
              className="mt-1"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
            Generate Keys & Register
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
