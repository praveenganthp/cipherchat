"use client";

import * as React from "react";
import { Key, ShieldCheck, Copy, Check, Lock, Terminal } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { EncryptedMessageRecord } from "@cipherchat/shared";

interface EnvelopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: EncryptedMessageRecord | null;
}

export function EnvelopeModal({ isOpen, onClose, message }: EnvelopeModalProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!message) return null;

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Cryptographic Envelope Inspection"
      description="Raw zero-knowledge envelope fields delivered across the network and stored by the database."
    >
      <div className="space-y-4">
        {/* Security Summary Banner */}
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 flex items-start space-x-2.5 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-emerald-300">
              Authenticated AES-256-GCM Payload
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The server relay and database only observe these cryptographic values. Without the
              private ECDH key on the recipient device, this payload is indistinguishable from random noise.
            </p>
          </div>
        </div>

        {/* Envelope Fields */}
        <div className="space-y-3 font-mono text-xs">
          {/* Ciphertext */}
          <div className="rounded-lg border border-border/80 bg-secondary/30 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-semibold">1. Ciphertext (AES-256-GCM)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(message.encryptedPayload, "cipher")}
                className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300"
              >
                {copiedKey === "cipher" ? (
                  <>
                    <Check className="h-3 w-3" /> <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="rounded bg-black/50 p-2 text-[10px] text-foreground/90 break-all max-h-24 overflow-y-auto">
              {message.encryptedPayload}
            </div>
          </div>

          {/* Initialization Vector (IV) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/80 bg-secondary/30 p-2.5 space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold block">
                2. Initialization Vector (IV, 96-bit)
              </span>
              <div className="rounded bg-black/50 p-1.5 text-[11px] text-foreground/90 break-all">
                {message.iv}
              </div>
            </div>

            {/* Auth Tag */}
            <div className="rounded-lg border border-border/80 bg-secondary/30 p-2.5 space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold block">
                3. GCM Authentication Tag (128-bit)
              </span>
              <div className="rounded bg-black/50 p-1.5 text-[11px] text-foreground/90 break-all">
                {message.authTag}
              </div>
            </div>
          </div>

          {/* Ephemeral Public Key */}
          <div className="rounded-lg border border-border/80 bg-secondary/30 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-semibold">
                4. Ephemeral Public Key (ECDH P-256 SPKI)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(message.ephemeralPublicKey, "ephem")}
                className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300"
              >
                {copiedKey === "ephem" ? (
                  <>
                    <Check className="h-3 w-3" /> <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="rounded bg-black/50 p-2 text-[10px] text-foreground/90 break-all">
              {message.ephemeralPublicKey}
            </div>
          </div>

          {/* Sender Signature */}
          <div className="rounded-lg border border-border/80 bg-secondary/30 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-semibold">
                5. Sender Identity Signature (ECDSA P-256)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(message.signature, "sig")}
                className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300"
              >
                {copiedKey === "sig" ? (
                  <>
                    <Check className="h-3 w-3" /> <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="rounded bg-black/50 p-2 text-[10px] text-foreground/90 break-all">
              {message.signature}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Close Inspector
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
