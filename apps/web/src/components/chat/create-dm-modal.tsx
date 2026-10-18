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

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Recipient Username</label>
          <div className="relative">
            <Input
              placeholder="e.g. bob or alice"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.toLowerCase().trim())}
              required
              autoFocus
              className="pr-10 bg-secondary/40 border-border/80 focus:border-emerald-500/60 font-mono text-xs"
            />
            <div className="absolute right-3 top-2.5 text-muted-foreground pointer-events-none">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          
          {/* Quick seeded contact chips */}
          <div className="flex items-center space-x-2 pt-1 text-[11px] text-muted-foreground">
            <span>Quick add:</span>
            <button
              type="button"
              onClick={() => setRecipient("bob")}
              className="rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 text-xs font-mono text-emerald-400 hover:border-emerald-500/40 hover:bg-secondary transition-colors"
            >
              @bob
            </button>
            <button
              type="button"
              onClick={() => setRecipient("alice")}
              className="rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 text-xs font-mono text-emerald-400 hover:border-emerald-500/40 hover:bg-secondary transition-colors"
            >
              @alice
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-border/60">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isLoading || !recipient.trim()} isLoading={isLoading}>
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            <span>Start Encrypted Chat</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
