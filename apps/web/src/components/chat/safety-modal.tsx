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
          className={`flex items-start space-x-3 rounded-xl border p-3.5 transition-colors ${
            isVerified
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-secondary/40 border-border/80 text-muted-foreground"
          }`}
        >
          {isVerified ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <span className="font-semibold text-foreground">
              {isVerified ? "Key Fingerprint Cryptographically Verified" : "Unverified Identity Fingerprint"}
            </span>
            <p className="leading-relaxed text-[11px] text-muted-foreground">
              {isVerified
                ? "You have verified this contact's public keys. You will receive an immediate warning if their keys rotate or are re-keyed."
                : "Compare these 12 numeric blocks with your contact's device in person or over an out-of-band verified channel."}
            </p>
          </div>
        </div>

        {/* 12 Numeric Blocks */}
        {fingerprint ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/80 bg-[#090A0C] p-3.5 font-mono text-center text-xs font-bold tracking-wider text-foreground">
              {fingerprint.numericBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-secondary/50 py-2 border border-border/60 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
                >
                  {block}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
              <span className="font-mono truncate max-w-[280px]">
                SHA-256: {fingerprint.hex.slice(0, 24)}...
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied ? "Copied" : "Copy Safety Number"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Calculating cryptographic safety number...
          </div>
        )}

        <div className="rounded-xl bg-secondary/30 border border-border/70 p-3 text-xs text-muted-foreground flex items-start space-x-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            CipherChat computes these numbers deterministically using SHA-256 over both users&apos; NIST P-256 identity keys.
            Neither party nor the server can manipulate this digest without failing verification.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant={isVerified ? "outline" : "primary"}
            size="sm"
            onClick={handleToggleVerified}
          >
            {isVerified ? "Revoke Verification Status" : "Mark as Verified"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
