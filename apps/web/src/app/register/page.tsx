"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, User, Key, Eye, EyeOff, ArrowRight, Laptop, Check, AlertCircle } from "lucide-react";
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
  const [showPassword, setShowPassword] = React.useState(false);
  const [deviceName, setDeviceName] = React.useState("Personal Web Client");
  const [isLoading, setIsLoading] = React.useState(false);
  const [cryptoProgress, setCryptoProgress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const passwordMeetsLength = password.length >= 10;
  const passwordHasNumberOrSymbol = /[\d\W]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password) return;

    if (!passwordMeetsLength) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      setCryptoProgress("Generating NIST P-256 identity & signed prekey in Web Crypto...");
      const keys = await cryptoManager.getOrInitializeKeys();

      setCryptoProgress("Attesting public key credentials to zero-knowledge vault...");
      const res = await apiFetch<any>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          password,
          device: {
            deviceName: deviceName.trim() || "Personal Web Client",
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
      setError(err.message || "Registration failed. Please verify inputs or choose another username.");
    } finally {
      setIsLoading(false);
      setCryptoProgress(null);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background overflow-y-auto h-full">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-7 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mb-3 shadow-sm">
            <Key className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Create Encrypted Identity</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Your cryptographic keys are generated locally on this device. The server never observes plaintext or your private keys.
          </p>
        </div>

        {error && (
          <div className="flex items-start space-x-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {cryptoProgress && (
          <div className="flex items-center space-x-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400">
            <Key className="h-4 w-4 animate-pulse shrink-0" />
            <span className="font-mono text-[11px]">{cryptoProgress}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="alice_dev"
                required
                className="bg-secondary/40 border-border/80 focus:border-emerald-500/60 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alice Vance"
                className="bg-secondary/40 border-border/80 focus:border-emerald-500/60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@cipherchat.internal"
              required
              className="bg-secondary/40 border-border/80 focus:border-emerald-500/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Master Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 10 characters"
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

            {/* Password strength indicators */}
            <div className="flex items-center space-x-3 pt-1 text-[11px] text-muted-foreground">
              <span className={`flex items-center space-x-1 ${passwordMeetsLength ? "text-emerald-400" : ""}`}>
                <Check className={`h-3 w-3 ${passwordMeetsLength ? "text-emerald-400" : "text-muted-foreground/40"}`} />
                <span>10+ chars</span>
              </span>
              <span className={`flex items-center space-x-1 ${passwordHasNumberOrSymbol ? "text-emerald-400" : ""}`}>
                <Check className={`h-3 w-3 ${passwordHasNumberOrSymbol ? "text-emerald-400" : "text-muted-foreground/40"}`} />
                <span>Number / symbol</span>
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Device Identifier</span>
              <span className="text-[10px] text-muted-foreground font-normal">For device verification</span>
            </label>
            <div className="relative">
              <Input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Personal Web Client"
                className="pl-8 bg-secondary/40 border-border/80 focus:border-emerald-500/60"
              />
              <Laptop className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full h-10 mt-2" isLoading={isLoading}>
            <span>Generate Keys & Register Identity</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>

        {/* Footer Link & Privacy Note */}
        <div className="space-y-3 pt-2 text-center border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            Already have an encrypted identity?{" "}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4">
              Sign in with existing credentials
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
