"use client";

import * as React from "react";
import { User, Shield, Eye, Bell, Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { apiFetch } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, setUser, demoMode } = useAuthStore();

  const [displayName, setDisplayName] = React.useState(user?.displayName || "");
  const [bio, setBio] = React.useState(user?.bio || "");
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatarUrl || "");
  const [readReceipts, setReadReceipts] = React.useState(user?.readReceiptsEnabled ?? true);
  const [typingIndicators, setTypingIndicators] = React.useState(user?.typingIndicatorEnabled ?? true);
  const [presence, setPresence] = React.useState<"EVERYONE" | "CONTACTS_ONLY" | "NOBODY">(
    user?.presenceVisibility || "EVERYONE"
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl || "");
      setReadReceipts(user.readReceiptsEnabled);
      setTypingIndicators(user.typingIndicatorEnabled);
      setPresence(user.presenceVisibility);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      if (demoMode) {
        if (user) {
          setUser({
            ...user,
            displayName,
            bio,
            avatarUrl,
            readReceiptsEnabled: readReceipts,
            typingIndicatorEnabled: typingIndicators,
            presenceVisibility: presence,
          });
        }
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
        return;
      }

      const res = await apiFetch<any>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName,
          bio: bio || undefined,
          avatarUrl: avatarUrl || undefined,
          readReceiptsEnabled: readReceipts,
          typingIndicatorEnabled: typingIndicators,
          presenceVisibility: presence,
        }),
      });

      setUser(res.user);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Profile & Privacy Settings"
      description="Manage your identity, real-time presence, and privacy preferences."
    >
      <form onSubmit={handleSave} className="space-y-4">
        {savedSuccess && (
          <div className="flex items-center space-x-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-400">
            <Check className="h-4 w-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-foreground">Display Name</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground">Bio</label>
          <Input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Security Researcher, Cryptography Enthusiast..."
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground">Avatar URL</label>
          <Input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1"
          />
        </div>

        {/* Granular Privacy Toggles */}
        <div className="border-t border-border/60 pt-3 space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
            <Shield className="h-4 w-4 text-primary" />
            <span>Privacy & Metadata Controls</span>
          </h4>

          {/* Read Receipts */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Read Receipts</p>
              <p className="text-[11px] text-muted-foreground">
                Allow senders to see when you have read their messages.
              </p>
            </div>
            <input
              type="checkbox"
              checked={readReceipts}
              onChange={(e) => setReadReceipts(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </div>

          {/* Typing Indicators */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Typing Indicators</p>
              <p className="text-[11px] text-muted-foreground">
                Broadcast when you are actively typing a message.
              </p>
            </div>
            <input
              type="checkbox"
              checked={typingIndicators}
              onChange={(e) => setTypingIndicators(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </div>

          {/* Online Presence Visibility */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Online Presence Visibility</label>
            <select
              value={presence}
              onChange={(e: any) => setPresence(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="EVERYONE">Visible to Everyone</option>
              <option value="CONTACTS_ONLY">Visible to Contacts Only</option>
              <option value="NOBODY">Nobody (Invisible Mode)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/60">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
