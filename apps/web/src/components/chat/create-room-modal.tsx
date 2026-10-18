"use client";

import * as React from "react";
import { Users, Clock, Eye } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (newRoom: any) => void;
  isDemo?: boolean;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  onRoomCreated,
  isDemo = false,
}: CreateRoomModalProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [memberUsernames, setMemberUsernames] = React.useState("");
  const [disappearingMode, setDisappearingMode] = React.useState<"OFF" | "TIMER" | "VIEW_ONCE" | "VIEW_TWICE">("OFF");
  const [ttlHours, setTtlHours] = React.useState("24");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const parsedMembers = memberUsernames
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (isDemo) {
        const dummyRoom = {
          id: `demo-room-${Date.now()}`,
          type: "GROUP",
          title: title.trim(),
          description: description.trim() || undefined,
          disappearingMode,
          disappearingTtlSeconds: disappearingMode === "TIMER" ? parseInt(ttlHours, 10) * 3600 : 0,
          defaultViewLimit: disappearingMode === "VIEW_ONCE" ? 1 : disappearingMode === "VIEW_TWICE" ? 2 : 0,
          memberCount: parsedMembers.length + 1,
          unreadCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        onRoomCreated(dummyRoom);
        onClose();
        return;
      }

      const res = await apiFetch<any>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          memberUsernames: parsedMembers,
          disappearingMode,
          disappearingTtlSeconds: disappearingMode === "TIMER" ? parseInt(ttlHours, 10) * 3600 : 0,
          defaultViewLimit: disappearingMode === "VIEW_ONCE" ? 1 : disappearingMode === "VIEW_TWICE" ? 2 : 0,
        }),
      });

      onRoomCreated(res);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create room.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Private Encrypted Room"
      description="Rooms feature group-ratcheted multi-recipient encryption and revocable key rotation."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-foreground">Room Title</label>
          <Input
            placeholder="e.g. Cryptography Working Group"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
          <Input
            placeholder="Brief purpose of this private channel"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              Initial Members <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <span className="text-[10px] text-muted-foreground">Invite friends anytime via link</span>
          </div>
          <Input
            placeholder="Leave blank to start solo, or enter e.g. bob, alice"
            value={memberUsernames}
            onChange={(e) => setMemberUsernames(e.target.value)}
            className="mt-1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            You will be the room owner. You can create this room with just yourself now and invite friends whenever you want using invite links.
          </p>
        </div>

        {/* Ephemeral Policy */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Room Disappearing Policy</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setDisappearingMode("OFF")}
              className={`rounded-xl border p-2.5 text-xs text-left transition-colors ${
                disappearingMode === "OFF"
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 font-semibold"
                  : "border-border/80 bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Standard Retention
            </button>
            <button
              type="button"
              onClick={() => setDisappearingMode("TIMER")}
              className={`rounded-xl border p-2.5 text-xs text-left transition-colors ${
                disappearingMode === "TIMER"
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 font-semibold"
                  : "border-border/80 bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5 inline mr-1 text-emerald-400" />
              Time-to-Live (TTL)
            </button>
          </div>
        </div>

        {disappearingMode === "TIMER" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">TTL Expiration (Hours)</label>
            <Input
              type="number"
              min="1"
              max="720"
              value={ttlHours}
              onChange={(e) => setTtlHours(e.target.value)}
              className="mt-1 bg-secondary/40 border-border/80 focus:border-emerald-500/60"
            />
          </div>
        )}

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border/60">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            Create Encrypted Room
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
