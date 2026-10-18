"use client";

import * as React from "react";
import { ShieldCheck, CheckCircle2, Copy, AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SafetyFingerprint } from "@cipherchat/shared";

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  fingerprint: SafetyFingerprint | null;
  onMarkVerified?: (verified: boolean) => void;
}

export function SafetyModal({
  isOpen,
  onClose,
  contactName,
  fingerprint,
  onMarkVerified,
}: SafetyModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(fingerprint?.verified || false);

  React.useEffect(() => {
    setIsVerified(fingerprint?.verified || false);
  }, [fingerprint]);

  const handleCopy = () => {
    if (fingerprint) {
      navigator.clipboard.writeText(fingerprint.fingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleVerified = () => {
    const next = !isVerified;
    setIsVerified(next);
    if (onMarkVerified) {
      onMarkVerified(next);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Verify Safety Number with ${contactName}`}
      description="Compare this cryptographic fingerprint with your contact over a trusted channel or in person."
    >
      <div className="space-y-4">
        {/* Verification Status Banner */}
        <div
          className={`flex items-center space-x-3 rounded-lg border p-3 ${
            isVerified
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-secondary border-border text-muted-foreground"
          }`}
        >
          {isVerified ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          )}
          <div className="text-xs">
            <span className="font-semibold text-foreground">
              {isVerified ? "Key Fingerprint Verified" : "Unverified Identity"}
            </span>
            <p className="mt-0.5">
              {isVerified
                ? "You have marked this contact's cryptographic key as verified. You will be alerted if their keys change."
                : "Verify these numbers match the numbers on your contact's screen to prevent Man-In-The-Middle attacks."}
            </p>
          </div>
        </div>

        {/* 12 Numeric Blocks */}
        {fingerprint ? (
          <div>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-navy-950 p-4 font-mono text-center text-sm font-semibold tracking-wider text-primary-foreground">
              {fingerprint.numericBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="rounded-md bg-secondary/40 py-2 border border-border/40 hover:bg-secondary/70 transition-colors"
                >
                  {block}
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate max-w-[280px]">
                SHA-256: {fingerprint.hex.slice(0, 24)}...
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center space-x-1 text-primary hover:underline"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied ? "Copied!" : "Copy Number"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Calculating cryptographic safety number...
          </div>
        )}

        <div className="rounded-lg bg-navy-900 border border-border/60 p-3 text-xs text-muted-foreground flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            CipherChat generates these numbers deterministically using ECDH P-256 and SHA-256.
            Neither party can tamper with this digest without breaking the math.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant={isVerified ? "outline" : "primary"}
            size="sm"
            onClick={handleToggleVerified}
          >
            {isVerified ? "Unmark as Verified" : "Mark as Verified"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
