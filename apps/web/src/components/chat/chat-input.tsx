"use client";

import * as React from "react";
import { Send, Paperclip, Eye, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChatInputProps {
  onSendMessage: (params: {
    content: string;
    viewLimit: number;
    isDisappearing: boolean;
    ttlSeconds: number;
    file?: File;
  }) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, onTyping, disabled = false }: ChatInputProps) {
  const [content, setContent] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [viewLimit, setViewLimit] = React.useState<number>(0); // 0 = unlimited, 1 = view once, 2 = view twice
  const [isDisappearing, setIsDisappearing] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    adjustHeight();

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if ((!trimmed && !selectedFile) || isSending || disabled) return;

    try {
      setIsSending(true);
      await onSendMessage({
        content: trimmed,
        viewLimit,
        isDisappearing,
        ttlSeconds: isDisappearing ? 86400 : 0, // 24 hours
        file: selectedFile || undefined,
      });

      setContent("");
      setSelectedFile(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      if (onTyping) {
        onTyping(false);
      }
    } finally {
      setIsSending(false);
    }
  };

  // IME-safe enter-to-submit pattern from Modern Web Guidance
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      // Block submission if user is actively composing with an Input Method Editor (IME)
      // or if Safari's event-ordering quirk dispatched keyCode 229
      const isComposing = (event as any).isComposing || (event.nativeEvent as any)?.isComposing;
      if (isComposing || event.keyCode === 229) {
        return;
      }

      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <div className="relative border-t border-border bg-card/60 backdrop-blur-md p-3">
      {/* File Attachment preview pill */}
      {selectedFile && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-border/80 bg-secondary/80 px-3 py-1.5 text-xs">
          <div className="flex items-center space-x-2 truncate">
            <Paperclip className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium truncate">{selectedFile.name}</span>
            <span className="text-muted-foreground">
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="text-muted-foreground hover:text-foreground ml-2 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Ephemeral & View Limit Controls */}
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {/* View limit toggle: Normal / 1 View / 2 Views */}
          <button
            type="button"
            onClick={() => setViewLimit((prev) => (prev === 0 ? 1 : prev === 1 ? 2 : 0))}
            className={`flex items-center space-x-1 rounded-md px-2 py-1 transition-colors border ${
              viewLimit === 1
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : viewLimit === 2
                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
            title="Set view consumption policy"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>
              {viewLimit === 0 ? "Unlimited views" : viewLimit === 1 ? "View once" : "View twice"}
            </span>
          </button>

          {/* Disappearing timer toggle */}
          <button
            type="button"
            onClick={() => setIsDisappearing((prev) => !prev)}
            className={`flex items-center space-x-1 rounded-md px-2 py-1 transition-colors border ${
              isDisappearing
                ? "bg-cipher-violet/20 text-cipher-violet border-cipher-violet/40"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
            title="Toggle disappearing message (24h TTL)"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{isDisappearing ? "24h TTL" : "Persistent"}</span>
          </button>
        </div>

        <div className="flex items-center space-x-1 text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px]">E2EE AES-256-GCM</span>
        </div>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isSending}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <div className="relative flex-1">
          <label htmlFor="chat-input-textarea" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input-textarea"
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? "Select a conversation to start chatting"
                : "Type an encrypted message... (Enter to send, Shift+Enter for newline)"
            }
            disabled={disabled || isSending}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-h-[140px]"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="icon"
          isLoading={isSending}
          disabled={disabled || (!content.trim() && !selectedFile)}
          aria-label="Send message"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
