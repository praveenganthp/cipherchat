"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Key, Lock, CheckCircle2, Copy, ArrowRight } from "lucide-react";
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
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="text-center mb-6">
          <Badge variant="default" className="mb-2">
            Device Key Ceremony
          </Badge>
          <h2 className="text-2xl font-bold text-foreground">Initialize Cryptographic Identity</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Setting up your secure enclave keys and contact verification safety number.
          </p>
        </div>

        {step === "keys" && (
          <div className="space-y-6 text-center">
            <div className="rounded-xl border border-border/80 bg-navy-950 p-6 space-y-3">
              <Key className="h-10 w-10 text-primary mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                Generate Zero-Knowledge Keypair
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                We will use the Web Crypto API to generate your NIST P-256 identity key and signed
                prekey. These keys stay in your browser and never leave your machine.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isGenerating}
              onClick={handleGenerate}
            >
              Generate Device Keys
            </Button>
          </div>
        )}

        {step === "fingerprint" && fingerprint && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-navy-950 p-4 space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Your Public Key Safety Fingerprint
              </span>
              <div className="font-mono text-sm font-bold tracking-wider text-primary-foreground bg-secondary/50 p-3 rounded-lg border border-border/60 text-center">
                {fingerprint}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-xs text-primary hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copied ? "Copied Fingerprint" : "Copy Fingerprint"}</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Contacts can verify this number when chatting with you to ensure there is no
              Man-In-The-Middle attacker between your devices.
            </p>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setStep("ready")}
            >
              Continue to Messaging
            </Button>
          </div>
        )}

        {step === "ready" && (
          <div className="space-y-6 text-center">
            <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-4 w-16 h-16 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">Cryptographic Setup Complete</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Your keys are stored securely in browser memory and local storage. You are now ready
                to send and receive end-to-end encrypted messages.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => router.push("/chat")}
            >
              <span>Go to Chat Dashboard</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
