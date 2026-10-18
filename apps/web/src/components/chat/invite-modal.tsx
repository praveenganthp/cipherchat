"use client";

import * as React from "react";
import { Copy, Link, CheckCircle2, ShieldAlert } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomTitle: string;
  isDemo?: boolean;
}

export function InviteModal({
  isOpen,
  onClose,
  roomId,
  roomTitle,
  isDemo = false,
}: InviteModalProps) {
  const [maxUses, setMaxUses] = React.useState("10");
  const [expiresInHours, setExpiresInHours] = React.useState("24");
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isDemo) {
        const dummyToken = `demo-invite-${Date.now().toString(36)}`;
        setInviteUrl(`${window.location.origin}/invite/${dummyToken}`);
        return;
      }

      const res = await apiFetch<any>(`/api/rooms/${roomId}/invite`, {
        method: "POST",
        body: JSON.stringify({
          maxUses: parseInt(maxUses, 10),
          expiresInHours: parseInt(expiresInHours, 10),
        }),
      });

      setInviteUrl(`${window.location.origin}/invite/${res.token}`);
    } catch (err: any) {
      setError(err.message || "Failed to generate invite token.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite to ${roomTitle}`}
      description="Create a cryptographically signed, usage-limited invitation link."
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        {!inviteUrl ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Usage Limit</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="bg-secondary/40 border-border/80 focus:border-emerald-500/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Expires In (Hours)</label>
                <Input
                  type="number"
                  min="1"
                  max="720"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                  className="bg-secondary/40 border-border/80 focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="rounded-xl bg-secondary/30 border border-border/70 p-3 text-xs text-muted-foreground flex items-start space-x-2.5">
              <ShieldAlert className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                When a new member joins using this link, the room&apos;s group cryptographic keys will automatically
                rotate to maintain forward secrecy.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                Generate Invite Link
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2">
              <label className="text-xs font-semibold text-foreground">Shareable Invitation Link</label>
              <div className="flex items-center space-x-2">
                <Input value={inviteUrl} readOnly className="font-mono text-xs bg-background/80 border-border/80" />
                <Button size="icon" variant="primary" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Valid for {maxUses} joins or {expiresInHours} hours. Once expired, unused links cannot be redeemed.
            </p>

            <div className="flex justify-end pt-3 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
