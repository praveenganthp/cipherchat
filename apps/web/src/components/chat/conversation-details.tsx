"use client";

import * as React from "react";
import {
  ShieldCheck,
  Lock,
  Key,
  Clock,
  Eye,
  Users,
  User,
  X,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ConversationSummary, UserProfile } from "@cipherchat/shared";

interface ConversationDetailsProps {
  conversation: ConversationSummary;
  user: UserProfile | null;
  onClose: () => void;
  onVerifyKeys: () => void;
  onInvite: () => void;
  onClearLocalCache?: () => void;
  className?: string;
}

export function ConversationDetails({
  conversation,
  user,
  onClose,
  onVerifyKeys,
  onInvite,
  onClearLocalCache,
  className,
}: ConversationDetailsProps) {
  const [copiedId, setCopiedId] = React.useState(false);
  const [clearedNotice, setClearedNotice] = React.useState(false);

  const title =
    conversation.type === "GROUP"
      ? conversation.title || "Private Group Room"
      : conversation.otherMember?.displayName || conversation.otherMember?.username || "Contact";

  const handleCopyId = () => {
    navigator.clipboard.writeText(conversation.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleClearCache = () => {
    if (onClearLocalCache) {
      onClearLocalCache();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 2500);
    }
  };

  return (
    <aside
      className={`w-full xl:w-88 2xl:w-96 border-l border-border/80 bg-card/95 xl:bg-card/60 flex flex-col shrink-0 overflow-y-auto h-full ${
        className || ""
      }`}
    >
      {/* Header */}
      <div className="h-14 border-b border-border/60 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Security & Details
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Profile Card */}
        <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 text-center space-y-3">
          <div className="relative mx-auto h-16 w-16">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center font-bold text-lg text-foreground overflow-hidden border border-border">
              {conversation.type === "GROUP" ? (
                <Users className="h-7 w-7 text-emerald-400" />
              ) : conversation.otherMember?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={conversation.otherMember.avatarUrl}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            {conversation.type === "DIRECT" && conversation.otherMember?.isOnline && (
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card" />
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {conversation.type === "GROUP"
                ? `${conversation.memberCount} active members`
                : conversation.otherMember?.isOnline
                ? "Online now • Cryptographic key attested"
                : "Offline • Last seen recently"}
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Badge variant="default" className="text-[10px] py-0.5 px-2">
              <Lock className="h-3 w-3 mr-1 text-emerald-400" />
              E2EE Active
            </Badge>
            {conversation.disappearingMode !== "OFF" && (
              <Badge variant="warning" className="text-[10px] py-0.5 px-2">
                <Clock className="h-3 w-3 mr-1" />
                {conversation.disappearingMode === "VIEW_ONCE"
                  ? "View-Once"
                  : conversation.disappearingMode === "VIEW_TWICE"
                  ? "2-View"
                  : "24h TTL"}
              </Badge>
            )}
          </div>
        </div>

        {/* Cryptographic Attestation Section */}
        <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Key className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-foreground">Cryptographic Specs</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              P-256
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground space-y-2 border-t border-border/60 pt-2.5">
            <div className="flex justify-between">
              <span>Cipher Algorithm:</span>
              <span className="font-mono text-foreground">AES-256-GCM</span>
            </div>
            <div className="flex justify-between">
              <span>Key Exchange:</span>
              <span className="font-mono text-foreground">ECDH (NIST P-256)</span>
            </div>
            <div className="flex justify-between">
              <span>Message Signing:</span>
              <span className="font-mono text-foreground">ECDSA SHA-256</span>
            </div>
            <div className="flex justify-between">
              <span>Forward Secrecy:</span>
              <span className="font-medium text-emerald-400">Ratchet Ephemeral</span>
            </div>
          </div>

          {conversation.type === "DIRECT" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onVerifyKeys}
              className="w-full text-xs h-8 mt-1 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50"
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              Verify Safety Fingerprint
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onInvite}
              className="w-full text-xs h-8 mt-1 border-border/80"
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              Share Room Invite Link
            </Button>
          )}
        </div>

        {/* Ephemeral & Zero-Knowledge Policy */}
        <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 space-y-2.5">
          <div className="flex items-center space-x-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Zero-Knowledge Storage</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The database and relay server never hold your private keys or unencrypted message bodies.
            Envelopes are delivered as authenticated binary payloads and decrypted only in client
            memory.
          </p>
        </div>

        {/* Local Storage & Cache Controls */}
        <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 space-y-2.5">
          <div className="flex items-center space-x-1.5">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Local Session Cache</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Plaintext messages are decrypted in your browser. For maximum physical device security,
            you can flush the local in-memory decryption cache.
          </p>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearCache}
            className="w-full text-xs h-8 border-border"
          >
            {clearedNotice ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                <span>Cache Cleared</span>
              </>
            ) : (
              <span>Clear Decrypted Memory</span>
            )}
          </Button>

          <button
            type="button"
            onClick={handleCopyId}
            className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground font-mono pt-1"
          >
            {copiedId ? "Conversation ID Copied!" : `ID: ${conversation.id.slice(0, 16)}...`}
          </button>
        </div>
      </div>
    </aside>
  );
}
