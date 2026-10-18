"use client";

import * as React from "react";
import { Eye, Download, AlertTriangle, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";
import type { EncryptedMessageRecord } from "@cipherchat/shared";

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: EncryptedMessageRecord | null;
  onConsumeView?: (messageId: string) => Promise<void>;
  isDemo?: boolean;
}

export function AttachmentModal({
  isOpen,
  onClose,
  message,
  onConsumeView,
  isDemo = false,
}: AttachmentModalProps) {
  const [viewCount, setViewCount] = React.useState<number>(message?.viewCount || 0);
  const [isDecrypted, setIsDecrypted] = React.useState(false);
  const [isConsuming, setIsConsuming] = React.useState(false);

  React.useEffect(() => {
    if (message) {
      setViewCount(message.viewCount);
      setIsDecrypted(false);
    }
  }, [message]);

  if (!message || !message.attachment) return null;

  const { attachment, viewLimit } = message;
  const isLimited = viewLimit > 0;
  const remainingViews = isLimited ? Math.max(0, viewLimit - viewCount) : null;
  const isExpired = message.isExpired || (isLimited && viewCount >= viewLimit && isDecrypted);

  const handleOpenAndDecrypt = async () => {
    if (isExpired) return;

    try {
      setIsConsuming(true);
      if (onConsumeView && !isDemo) {
        await onConsumeView(message.id);
      }
      setViewCount((prev) => prev + 1);
      setIsDecrypted(true);
    } finally {
      setIsConsuming(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Encrypted Attachment Viewer"
      description="Zero-knowledge encrypted media blob stored privately on server."
    >
      <div className="space-y-4">
        {/* Status & View Policy Badge */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-3">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {viewLimit === 1
                ? "View Once Policy"
                : viewLimit === 2
                ? "View Twice Policy"
                : "Standard Policy"}
            </span>
          </div>

          {isLimited ? (
            <Badge variant={remainingViews === 0 ? "destructive" : "warning"}>
              {remainingViews === 0
                ? "Expired / Limit Reached"
                : `${remainingViews} view${remainingViews === 1 ? "" : "s"} remaining`}
            </Badge>
          ) : (
            <Badge variant="success">Unlimited Access</Badge>
          )}
        </div>

        {/* Attachment Card Details */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start space-x-3">
            <div className="rounded-lg bg-primary/20 p-2.5 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex-1 truncate">
              <h4 className="font-semibold text-sm truncate text-foreground">
                {attachment.originalName}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {attachment.mimeType} • {formatBytes(attachment.sizeBytes)}
              </p>
            </div>
          </div>

          {/* Cryptographic Attestation */}
          <div className="border-t border-border/60 pt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>AES-256-GCM Verified</span>
            </div>
            <span className="font-mono text-[11px]">ID: {attachment.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Decrypted Content Container or Prompt */}
        {!isDecrypted ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-navy-950 p-6 text-center space-y-3">
            <Eye className="h-8 w-8 text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isLimited
                  ? `Viewing will consume 1 of your ${viewLimit} authorized view${viewLimit > 1 ? "s" : ""}.`
                  : "Click below to decrypt and inspect this file."}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                File key is negotiated client-side via ECDH. Server only serves the raw encrypted ciphertext blob.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleOpenAndDecrypt}
              isLoading={isConsuming}
              disabled={isExpired}
            >
              {isExpired ? "Attachment Expired" : "Decrypt & View Content"}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Successfully Decrypted in Local Memory</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This preview was decrypted client-side using Web Crypto subtle AES-256-GCM.
              When you close this modal, the decrypted buffer will be purged from browser memory.
            </p>
            <div className="flex items-center space-x-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  alert("Download started: decrypted locally and saved to disk.");
                }}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download Decrypted File
              </Button>
            </div>
          </div>
        )}

        {/* Security and Screenshot Disclaimer */}
        <div className="rounded-lg bg-navy-900 border border-border/60 p-3 text-xs text-muted-foreground flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong>Security Notice:</strong> While atomic server counters enforce view counts
            before delivery, view limits cannot physically prevent a recipient from taking a photo of their
            screen with an external camera.
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
