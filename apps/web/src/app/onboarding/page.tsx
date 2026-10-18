"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Key, Lock, CheckCircle2, Copy, ArrowRight, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cryptoManager } from "@/lib/crypto-store";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"keys" | "fingerprint" | "ready">("keys");
  const [fingerprint, setFingerprint] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const keys = await cryptoManager.getOrInitializeKeys();
      setFingerprint(keys.fingerprint);
      setStep("fingerprint");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (fingerprint) {
      navigator.clipboard.writeText(fingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-7 sm:p-8 shadow-2xl space-y-6">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center space-x-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                step === "keys"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              1
            </span>
            <span className="text-xs font-medium text-foreground">Keys</span>
            <span className="text-muted-foreground/40">/</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                step === "fingerprint"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              2
            </span>
            <span className="text-xs font-medium text-foreground">Safety Number</span>
            <span className="text-muted-foreground/40">/</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                step === "ready"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              3
            </span>
            <span className="text-xs font-medium text-foreground">Active</span>
          </div>

          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
            Device Ceremony
          </Badge>
        </div>

        {/* Step 1: Key Generation */}
        {step === "keys" && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm">
              <Key className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Initialize Cryptographic Keys
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Generate zero-knowledge NIST P-256 identity keypairs and signed prekeys directly in your browser.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 text-left space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Web Crypto API Hardware Primitives</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Private keys are flagged non-extractable and persisted inside client storage. Private keys never touch
                the network or our servers under any condition.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full h-11"
              isLoading={isGenerating}
              onClick={handleGenerate}
            >
              <span>Generate Hardware-Backed Keys</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Fingerprint Verification */}
        {step === "fingerprint" && fingerprint && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mb-2">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Your Public Safety Fingerprint
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Contacts can compare this fingerprint to guarantee no Man-In-The-Middle attacker is intercepting your channel.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  SHA-256 Digest
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy Digest"}</span>
                </button>
              </div>

              <div className="font-mono text-sm font-semibold tracking-wider text-foreground bg-background/80 p-3.5 rounded-lg border border-border/80 text-center break-all selection:bg-emerald-500/30">
                {fingerprint}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This fingerprint is derived deterministically from your public identity key. Changing devices or rotating keys will update this value.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full h-11"
              onClick={() => setStep("ready")}
            >
              <span>Confirm & Continue</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === "ready" && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Cryptographic Identity Ready
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                All session ratchets and public prekeys are primed. You are ready to exchange zero-knowledge messages.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-300 text-left space-y-1">
              <div className="font-semibold text-emerald-400">Security Guarantee:</div>
              <p className="text-muted-foreground text-[11px]">
                ECDH P-256 key exchanges happen peer-to-peer over encrypted envelopes. Ciphertext is signed with ECDSA before transmission.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full h-11"
              onClick={() => router.push("/chat")}
            >
              <span>Enter Messaging Workspace</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
