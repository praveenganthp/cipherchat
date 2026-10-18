"use client";

import * as React from "react";
import { UserPlus, MessageSquare, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface CreateDmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
  isDemo?: boolean;
}

export function CreateDmModal({
  isOpen,
  onClose,
  onConversationCreated,
  isDemo = false,
}: CreateDmModalProps) {
  const [recipient, setRecipient] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = recipient.trim().toLowerCase();
    if (!cleanUsername) return;

    setError(null);
    setIsLoading(true);

    try {
      if (isDemo) {
        onConversationCreated("demo-conv-bob-001");
        setRecipient("");
        onClose();
        return;
      }

      const res = await apiFetch<{ conversationId: string; isNew: boolean }>(
        "/api/conversations/direct",
        {
          method: "POST",
          body: JSON.stringify({ recipientUsernameOrId: cleanUsername }),
        }
      );

      setRecipient("");
      onConversationCreated(res.conversationId);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start direct conversation. Please check the username.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Start 1-to-1 Encrypted Chat"
      description="Enter the username of the person you want to message directly with end-to-end encryption."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-foreground">Recipient Username</label>
          <div className="relative mt-1">
            <Input
              placeholder="e.g. bob or alice"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              autoFocus
              className="pr-10"
            />
            <div className="absolute right-3 top-2.5 text-muted-foreground pointer-events-none">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Tip: You can chat with pre-seeded users like <span className="font-mono text-primary">bob</span> or <span className="font-mono text-primary">alice</span>.
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-border">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isLoading || !recipient.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Start Chat
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
