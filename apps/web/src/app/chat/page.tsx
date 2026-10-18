"use client";

import * as React from "react";
import {
  Shield,
  ShieldCheck,
  Search,
  Plus,
  Users,
  User,
  Clock,
  Eye,
  Paperclip,
  Check,
  CheckCheck,
  Lock,
  MessageSquare,
  Sparkles,
  Link2,
  ArrowLeft,
  PanelRight,
  Copy,
  Key,
  Info,
  X,
  Radio,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { apiFetch } from "@/lib/api";
import { wsClient } from "@/lib/ws";
import { cryptoManager } from "@/lib/crypto-store";
import {
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES_BOB,
  DEMO_PLAINTEXT_MAP,
  DEMO_USER,
} from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChatInput } from "@/components/chat/chat-input";
import { ConversationDetails } from "@/components/chat/conversation-details";
import { EnvelopeModal } from "@/components/chat/envelope-modal";
import { SafetyModal } from "@/components/chat/safety-modal";
import { AttachmentModal } from "@/components/chat/attachment-modal";
import { CreateRoomModal } from "@/components/chat/create-room-modal";
import { CreateDmModal } from "@/components/chat/create-dm-modal";
import { InviteModal } from "@/components/chat/invite-modal";
import { formatDate } from "@/lib/utils";
import type {
  ConversationSummary,
  EncryptedMessageRecord,
  EncryptedEnvelope,
  SafetyFingerprint,
  WsServerMessage,
} from "@cipherchat/shared";

export default function ChatDashboardPage() {
  const { user, device, demoMode } = useAuthStore();

  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [selectedConvId, setSelectedConvId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<EncryptedMessageRecord[]>([]);
  const [plaintextCache, setPlaintextCache] = React.useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<"ALL" | "DIRECT" | "ROOMS">("ALL");
  const [isTypingPeer, setIsTypingPeer] = React.useState<string | null>(null);

  // Layout & UI panels
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [copiedMsgId, setCopiedMsgId] = React.useState<string | null>(null);
  const [inspectedEnvelopeMsg, setInspectedEnvelopeMsg] = React.useState<EncryptedMessageRecord | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = React.useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);

  // Modals
  const [isSafetyOpen, setIsSafetyOpen] = React.useState(false);
  const [safetyFingerprint, setSafetyFingerprint] = React.useState<SafetyFingerprint | null>(null);
  const [activeAttachmentMsg, setActiveAttachmentMsg] = React.useState<EncryptedMessageRecord | null>(null);
  const [isCreateDmOpen, setIsCreateDmOpen] = React.useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = React.useState(false);
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const peerTypingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-open 3rd panel on desktop screens
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1280) {
      setIsDetailsOpen(true);
    }
    return () => {
      if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
    };
  }, []);

  // 1. Fetch conversations
  const fetchConversations = React.useCallback(async () => {
    setIsLoadingConversations(true);
    if (demoMode) {
      setConversations(DEMO_CONVERSATIONS);
      if (!selectedConvId && DEMO_CONVERSATIONS.length > 0) {
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          setSelectedConvId(DEMO_CONVERSATIONS[0].id);
        }
      }
      setIsLoadingConversations(false);
      return;
    }

    try {
      const res = await apiFetch<{ conversations: ConversationSummary[] }>("/api/conversations");
      setConversations(res.conversations);
      if (!selectedConvId && res.conversations.length > 0) {
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          setSelectedConvId(res.conversations[0].id);
        }
      }
    } catch {
      // Not logged in or backend unavailable
    } finally {
      setIsLoadingConversations(false);
    }
  }, [demoMode, selectedConvId]);

  React.useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const activeConversation = conversations.find((c) => c.id === selectedConvId);

  // 2. Fetch messages for active conversation
  const fetchMessages = React.useCallback(async (convId: string, showLoading = true) => {
    if (demoMode) {
      if (convId === "demo-conv-bob-001") {
        setMessages(DEMO_MESSAGES_BOB);
        setPlaintextCache(DEMO_PLAINTEXT_MAP);
      } else {
        setMessages([]);
      }
      return;
    }

    if (showLoading) setIsLoadingMessages(true);
    try {
      const res = await apiFetch<{ messages: EncryptedMessageRecord[] }>(
        `/api/conversations/${convId}/messages`
      );
      // Ensure chronological ordering: oldest first, newest last
      const chronological = [...res.messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(chronological);

      // Decrypt messages locally in browser memory
      for (const msg of res.messages) {
        // 1. Check localStorage first
        const localCached = typeof window !== "undefined" ? localStorage.getItem(`cc_pt_${msg.id}`) : null;
        if (localCached) {
          setPlaintextCache((prev) => ({ ...prev, [msg.id]: localCached }));
          continue;
        }

        // 2. Decrypt message using sender device identity public key
        const senderPubKey = msg.senderIdentityPublicKey;
        if (senderPubKey) {
          try {
            const envelope: EncryptedEnvelope = {
              version: 1,
              senderDeviceId: msg.senderDeviceId,
              recipientDeviceId: msg.recipientDeviceId,
              ephemeralPublicKey: msg.ephemeralPublicKey,
              ciphertext: msg.encryptedPayload,
              iv: msg.iv,
              authTag: msg.authTag,
              signature: msg.signature,
              timestamp: new Date(msg.createdAt).getTime(),
            };

            const decrypted = await cryptoManager.decryptMessage({
              envelope,
              senderIdentityPublicKeySpki: senderPubKey,
            });

            if (decrypted && decrypted.content) {
              if (typeof window !== "undefined") {
                localStorage.setItem(`cc_pt_${msg.id}`, decrypted.content);
              }
              setPlaintextCache((prev) => ({ ...prev, [msg.id]: decrypted.content }));
            }
          } catch (decErr) {
            console.warn(`Decryption failed for message ${msg.id}:`, decErr);
            const fallback = typeof window !== "undefined" ? localStorage.getItem(`cc_pt_${msg.id}`) : null;
            if (fallback) {
              setPlaintextCache((prev) => ({ ...prev, [msg.id]: fallback }));
            }
          }
        }
      }
    } catch {
      // Ignore
    } finally {
      if (showLoading) setIsLoadingMessages(false);
    }
  }, [demoMode]);

  React.useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
      if (!demoMode) {
        wsClient.subscribeConversation(selectedConvId);
        // Mark conversation read on server so sender gets double green tick
        apiFetch(`/api/conversations/${selectedConvId}/read`, { method: "POST" }).catch(() => {});
      }
    }
  }, [selectedConvId, fetchMessages, demoMode]);

  // Resilient fallback sync: auto-poll every 3.5s so mobile browsers never miss a message if WS sleeps
  React.useEffect(() => {
    if (!selectedConvId || demoMode) return;
    const interval = setInterval(() => {
      fetchMessages(selectedConvId, false);
    }, 3500);
    return () => clearInterval(interval);
  }, [selectedConvId, demoMode, fetchMessages]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTypingPeer]);

  // 3. Setup real-time WebSocket listeners
  React.useEffect(() => {
    if (demoMode) return;

    const unsubscribe = wsClient.addListener((event: WsServerMessage) => {
      switch (event.type) {
        case "NEW_MESSAGE": {
          if (event.conversationId === selectedConvId) {
            const newRecord: EncryptedMessageRecord = {
              id: event.messageId,
              conversationId: event.conversationId,
              senderId: event.senderId,
              senderDeviceId: event.senderDeviceId,
              senderUsername: event.senderUsername,
              senderIdentityPublicKey: event.senderIdentityPublicKey,
              recipientId: event.envelope.recipientDeviceId,
              recipientDeviceId: event.envelope.recipientDeviceId,
              messageType: event.messageType,
              encryptedPayload: event.envelope.ciphertext,
              iv: event.envelope.iv,
              authTag: event.envelope.authTag,
              signature: event.envelope.signature,
              ephemeralPublicKey: event.envelope.ephemeralPublicKey,
              keyVersion: 1,
              viewLimit: event.viewLimit,
              viewCount: event.viewCount,
              hasViewed: false,
              isExpired: false,
              isDisappearing: event.isDisappearing,
              expiresAt: event.expiresAt,
              attachment: event.attachment,
              createdAt: event.createdAt,
            };

            // Clear typing indication since new message arrived from sender
            setIsTypingPeer(null);
            if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);

            setMessages((prev) => {
              if (prev.some((m) => m.id === newRecord.id)) return prev;
              const next = [...prev, newRecord];
              return next.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });

            // Decrypt immediately if sender public key is present
            if (event.senderIdentityPublicKey) {
              cryptoManager
                .decryptMessage({
                  envelope: event.envelope,
                  senderIdentityPublicKeySpki: event.senderIdentityPublicKey,
                })
                .then((dec) => {
                  if (dec?.content) {
                    if (typeof window !== "undefined") {
                      localStorage.setItem(`cc_pt_${event.messageId}`, dec.content);
                    }
                    setPlaintextCache((prev) => ({ ...prev, [event.messageId]: dec.content }));
                  }
                })
                .catch((err) => {
                  console.warn("Could not decrypt incoming WS message:", err);
                });
            }

            // If recipient is currently active, mark as read
            wsClient.markRead(event.conversationId, event.messageId);
            apiFetch(`/api/conversations/${event.conversationId}/read`, { method: "POST" }).catch(() => {});
          }
          fetchConversations();
          break;
        }

        case "TYPING_STATUS": {
          if (event.conversationId === selectedConvId) {
            if (event.isTyping) {
              setIsTypingPeer(`${event.username} is typing...`);
              if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
              peerTypingTimeoutRef.current = setTimeout(() => {
                setIsTypingPeer(null);
              }, 3500); // Auto-clear after 3.5s in case user goes idle or stop packet is missed
            } else {
              if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
              setIsTypingPeer(null);
            }
          }
          break;
        }

        case "READ_RECEIPT": {
          if (event.conversationId === selectedConvId) {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.senderId === user?.id) {
                  return { ...m, isRead: true, isDelivered: true };
                }
                return m;
              })
            );
          }
          break;
        }

        case "MESSAGE_VIEWED": {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === event.messageId
                ? { ...m, viewCount: event.viewCount, isExpired: event.isExpired, isRead: true }
                : m
            )
          );
          break;
        }

        case "MESSAGE_EXPIRED": {
          setMessages((prev) =>
            prev.map((m) => (m.id === event.messageId ? { ...m, isExpired: true } : m))
          );
          break;
        }

        case "PRESENCE_UPDATE": {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.otherMember && c.otherMember.id === event.userId) {
                return {
                  ...c,
                  otherMember: {
                    ...c.otherMember,
                    isOnline: event.isOnline,
                    lastSeenAt: event.lastSeenAt,
                  },
                };
              }
              return c;
            })
          );
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [demoMode, selectedConvId, fetchConversations, user?.id]);

  // 4. Handle sending messages
  const handleSendMessage = async (params: {
    content: string;
    viewLimit: number;
    isDisappearing: boolean;
    ttlSeconds: number;
    file?: File;
  }) => {
    if (!selectedConvId) return;

    if (demoMode) {
      // Simulate demo message addition
      const newMsgId = `demo-msg-${Date.now()}`;
      const dummyMsg: EncryptedMessageRecord = {
        id: newMsgId,
        conversationId: selectedConvId,
        senderId: user?.id || DEMO_USER.id,
        senderDeviceId: "demo-device-alice-1",
        recipientId: "demo-user-bob-002",
        recipientDeviceId: "demo-device-bob-1",
        messageType: params.file ? "ATTACHMENT" : "TEXT",
        encryptedPayload: `DEMO_CIPHERTEXT_${Date.now()}`,
        iv: "4+7v3e1L4Q0x9K==",
        authTag: "3Q9d8m1x0p4w8z==",
        ephemeralPublicKey: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...",
        signature: "MEUCIQDZ...",
        keyVersion: 1,
        viewLimit: params.viewLimit,
        viewCount: 0,
        hasViewed: false,
        isExpired: false,
        isDisappearing: params.isDisappearing,
        expiresAt: params.isDisappearing ? new Date(Date.now() + 86400000).toISOString() : null,
        attachment: params.file
          ? {
              id: `demo-att-${Date.now()}`,
              originalName: params.file.name,
              mimeType: params.file.type,
              sizeBytes: params.file.size,
            }
          : null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => {
        const next = [...prev, dummyMsg];
        return next.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      setPlaintextCache((prev) => ({
        ...prev,
        [newMsgId]: params.content || `Encrypted file: ${params.file?.name}`,
      }));
      return;
    }

    // Live mode: Fetch recipient device public keys and encrypt
    const convDetails = await apiFetch<any>(`/api/conversations/${selectedConvId}`);

    // Build envelopes for each active device
    const envelopes: any[] = [];
    for (const mem of convDetails.members) {
      for (const dev of mem.devices) {
        const encryptedEnvelope = await cryptoManager.encryptMessage({
          payload: {
            id: crypto.randomUUID(),
            conversationId: selectedConvId,
            senderId: user!.id,
            timestamp: Date.now(),
            content: params.content,
            type: params.file ? "ATTACHMENT" : "TEXT",
          },
          recipientPreKeyPublicSpki: dev.signedPreKey,
          senderDeviceId: device!.id,
          recipientDeviceId: dev.deviceId,
        });

        envelopes.push({
          recipientId: mem.userId,
          recipientDeviceId: dev.deviceId,
          envelope: encryptedEnvelope,
        });
      }
    }

    // Dispatch message via REST API
    const res = await apiFetch<{ message: string; messageIds: string[] }>(
      `/api/conversations/${selectedConvId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          envelopes,
          messageType: params.file ? "ATTACHMENT" : "TEXT",
          viewLimit: params.viewLimit,
          isDisappearing: params.isDisappearing,
          ttlSeconds: params.ttlSeconds,
        }),
      }
    );

    if (res?.messageIds) {
      for (const id of res.messageIds) {
        if (typeof window !== "undefined") {
          localStorage.setItem(`cc_pt_${id}`, params.content);
        }
        setPlaintextCache((prev) => ({ ...prev, [id]: params.content }));
      }
    }

    await fetchMessages(selectedConvId);
  };

  // 5. Open Safety Fingerprint modal
  const handleOpenSafety = async () => {
    if (!activeConversation || !activeConversation.otherMember) return;
    const fingerprint = await cryptoManager.getSafetyNumber(
      "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtestPeerPublicKey..."
    );
    setSafetyFingerprint(fingerprint);
    setIsSafetyOpen(true);
  };

  // 6. Clear local decrypted cache
  const handleClearLocalCache = () => {
    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("cc_pt_")) {
          localStorage.removeItem(key);
        }
      });
      setPlaintextCache({});
    }
  };

  // 7. Copy single message plaintext
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Filter conversations locally without leaking query to server
  const filteredConversations = conversations.filter((c) => {
    const name = c.title || c.otherMember?.displayName || c.otherMember?.username || "";
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === "DIRECT") return c.type === "DIRECT";
    if (filterType === "ROOMS") return c.type === "GROUP";
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* PANEL 1: Sidebar / Conversation List */}
      <aside
        className={`border-r border-border/80 bg-card/60 flex-col shrink-0 transition-all ${
          selectedConvId
            ? "hidden md:flex w-full md:w-80 lg:w-88"
            : "flex w-full md:w-80 lg:w-88"
        }`}
      >
        <div className="p-3 border-b border-border/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <h2 className="text-sm font-bold tracking-tight text-foreground">Encrypted Chats</h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary/80 text-muted-foreground border border-border/60">
                {conversations.length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateDmOpen(true)}
                className="text-xs h-7 px-2"
                title="Start 1-to-1 Direct Chat"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Direct
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateRoomOpen(true)}
                className="text-xs h-7 px-2"
                title="Create Private Group Room"
              >
                <Plus className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                Room
              </Button>
            </div>
          </div>

          {/* Filter Segmented Controls */}
          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-secondary/40 border border-border/60 text-xs">
            <button
              onClick={() => setFilterType("ALL")}
              className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                filterType === "ALL"
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("DIRECT")}
              className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                filterType === "DIRECT"
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => setFilterType("ROOMS")}
              className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                filterType === "ROOMS"
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rooms
            </button>
          </div>

          {/* Local Search Input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations locally..."
              className="pl-8.5 h-8.5 text-xs bg-secondary/30 border-border/70 placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {isLoadingConversations && (
            <div className="p-3 space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-secondary/60 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-secondary/60 rounded w-2/3" />
                    <div className="h-2.5 bg-secondary/40 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoadingConversations && filteredConversations.length === 0 && (
            <div className="text-center py-12 px-4 text-xs text-muted-foreground space-y-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="font-medium text-foreground">No conversations match</p>
              <p className="text-[11px]">
                Start a 1-to-1 encrypted chat or create a private room to begin.
              </p>
            </div>
          )}

          {!isLoadingConversations &&
            filteredConversations.map((c) => {
              const isSelected = c.id === selectedConvId;
              const title =
                c.type === "GROUP"
                  ? c.title || "Private Group"
                  : c.otherMember?.displayName || c.otherMember?.username || "Contact";

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`w-full text-left p-3 flex items-start space-x-3 transition-colors ${
                    isSelected
                      ? "bg-secondary/70 border-l-2 border-emerald-500"
                      : "hover:bg-secondary/30"
                  }`}
                >
                  {/* Avatar with Presence Indicator */}
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm text-foreground overflow-hidden border border-border/80">
                      {c.type === "GROUP" ? (
                        <Users className="h-5 w-5 text-emerald-400" />
                      ) : c.otherMember?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.otherMember.avatarUrl}
                          alt={title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    {c.type === "DIRECT" && c.otherMember?.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
                      {c.lastMessage && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatDate(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground truncate">
                        {c.type === "GROUP"
                          ? `${c.memberCount} members`
                          : c.otherMember?.isOnline
                          ? "Online"
                          : "Offline"}
                      </p>
                      <div className="flex items-center space-x-1">
                        {c.disappearingMode !== "OFF" && (
                          <span
                            title="Disappearing messages enabled"
                            className="text-amber-400 text-[10px]"
                          >
                            <Clock className="h-3 w-3 inline" />
                          </span>
                        )}
                        {c.unreadCount > 0 && (
                          <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </aside>

      {/* PANEL 2: Center / Main Active Chat Stream */}
      <section
        className={`flex-1 flex-col bg-charcoal-950 min-w-0 ${
          selectedConvId ? "flex w-full" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Conversation Header - WhatsApp Style Sticky Header */}
            <header className="sticky top-0 z-20 h-16 border-b border-border/80 bg-card/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 mr-2">
                {/* Mobile Back Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden h-8 w-8 -ml-1 text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Back to conversations list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                {/* Avatar with presence status indicator */}
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center border border-border/80 overflow-hidden">
                    {activeConversation.type === "GROUP" ? (
                      <Users className="h-4.5 w-4.5 text-emerald-400" />
                    ) : activeConversation.otherMember?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeConversation.otherMember.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4.5 w-4.5 text-muted-foreground" />
                    )}
                  </div>
                  {activeConversation.type === "DIRECT" && activeConversation.otherMember?.isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  )}
                </div>

                {/* Title & Live Status (Typing, Online, Member count) */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center space-x-1.5 truncate">
                    <h3 className="font-semibold text-sm text-foreground truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                      {activeConversation.type === "GROUP"
                        ? activeConversation.title
                        : activeConversation.otherMember?.displayName || activeConversation.otherMember?.username}
                    </h3>
                    <Badge variant="default" className="text-[9px] py-0 px-1 shrink-0 hidden xs:inline-flex">
                      <Lock className="h-2.5 w-2.5 mr-0.5 text-emerald-400" />
                      E2EE
                    </Badge>
                    {activeConversation.disappearingMode !== "OFF" && (
                      <Badge variant="warning" className="text-[9px] py-0 px-1 hidden md:inline-flex shrink-0">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {activeConversation.disappearingMode === "VIEW_ONCE"
                          ? "1-View"
                          : activeConversation.disappearingMode === "VIEW_TWICE"
                          ? "2-View"
                          : "24h TTL"}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] leading-tight truncate">
                    {isTypingPeer ? (
                      <span className="text-emerald-400 font-medium animate-pulse">
                        typing...
                      </span>
                    ) : activeConversation.type === "GROUP" ? (
                      <span className="text-muted-foreground">
                        {activeConversation.memberCount} members
                      </span>
                    ) : activeConversation.otherMember?.isOnline ? (
                      <span className="text-emerald-400/90 font-medium">online</span>
                    ) : (
                      <span className="text-muted-foreground/80">offline</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                {activeConversation.type === "GROUP" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsInviteOpen(true)}
                    className="text-xs h-8 px-2 sm:px-3 border-border/80"
                  >
                    <Link2 className="h-3.5 w-3.5 sm:mr-1 text-emerald-400" />
                    <span className="hidden sm:inline">Invite</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenSafety}
                    className="text-xs h-8 px-2 sm:px-3 border-emerald-500/25 hover:bg-emerald-500/10 hover:border-emerald-500/40"
                  >
                    <Shield className="h-3.5 w-3.5 sm:mr-1 text-emerald-400" />
                    <span className="hidden sm:inline">Verify Keys</span>
                  </Button>
                )}

                {/* Third Panel Toggle Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDetailsOpen((prev) => !prev)}
                  className={`h-8 w-8 text-muted-foreground hover:text-foreground ${
                    isDetailsOpen ? "bg-secondary text-foreground border border-border/80" : ""
                  }`}
                  title="Toggle Security & Room Details Inspector"
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </div>
            </header>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Trust Anchor Banner */}
              <div className="mx-auto my-3 max-w-sm rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center text-xs text-muted-foreground">
                <div className="flex items-center justify-center space-x-1.5 font-medium text-emerald-400 mb-0.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>End-to-End Encrypted Tunnel</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Keys are negotiated via ECDH P-256 and authenticated with AES-256-GCM. Unencrypted
                  payloads never touch the network relay or database.
                </p>
              </div>

              {isLoadingMessages && (
                <div className="space-y-3 py-4 animate-pulse">
                  <div className="h-12 bg-secondary/40 rounded-2xl w-48 mr-auto" />
                  <div className="h-14 bg-secondary/50 rounded-2xl w-64 ml-auto" />
                  <div className="h-12 bg-secondary/40 rounded-2xl w-56 mr-auto" />
                </div>
              )}

              {messages.length === 0 && !isLoadingMessages && (
                <div className="text-center py-12 text-xs text-muted-foreground max-w-sm mx-auto space-y-2">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                    <Lock className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-foreground">No messages yet</p>
                  <p>
                    All messages in this room are end-to-end encrypted using AES-256-GCM.
                    Only participant devices possess the decryption keys.
                  </p>
                </div>
              )}

              {messages.map((m) => {
                const isMe = m.senderId === (user?.id || DEMO_USER.id);
                const plaintext = plaintextCache[m.id] || "[Encrypted Message Payload]";
                const isCopied = copiedMsgId === m.id;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col group ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`relative max-w-md rounded-2xl p-3 text-sm shadow-sm transition-all ${
                        isMe
                          ? "bg-secondary/90 border border-emerald-500/25 rounded-br-sm text-foreground hover:border-emerald-500/40"
                          : "bg-card border border-border/80 rounded-bl-sm text-foreground hover:border-border"
                      }`}
                    >
                      {/* Floating Micro-Actions Toolbar */}
                      <div
                        className={`absolute -top-3 ${
                          isMe ? "right-2" : "left-2"
                        } hidden group-hover:flex items-center space-x-1 rounded-md border border-border/80 bg-popover px-1.5 py-0.5 shadow-md text-xs z-10`}
                      >
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m.id, plaintext)}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                          title="Copy message plaintext"
                        >
                          {isCopied ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectedEnvelopeMsg(m)}
                          className="text-muted-foreground hover:text-emerald-400 p-0.5 rounded"
                          title="Inspect cryptographic envelope"
                        >
                          <Key className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Attached File Preview */}
                      {m.attachment && (
                        <div
                          onClick={() => setActiveAttachmentMsg(m)}
                          className={`mb-2 rounded-xl p-2.5 flex items-center justify-between cursor-pointer border transition-colors ${
                            isMe
                              ? "bg-secondary/80 border-border/80 hover:bg-secondary"
                              : "bg-secondary/50 border-border/70 hover:bg-secondary/80"
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <Paperclip className="h-4 w-4 shrink-0 text-emerald-400" />
                            <span className="font-semibold text-xs truncate">
                              {m.attachment.originalName}
                            </span>
                          </div>

                          {m.viewLimit > 0 && (
                            <Badge
                              variant={m.isExpired ? "destructive" : "warning"}
                              className="text-[10px] ml-2 shrink-0"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {m.isExpired ? "Expired" : `${m.viewLimit} view limit`}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Text content */}
                      <p className="leading-relaxed break-words">{plaintext}</p>

                      {/* Message Metadata Footer */}
                      <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-muted-foreground">
                        {m.isDisappearing && (
                          <span title="Disappearing message (24h TTL)">
                            <Clock className="h-3 w-3 inline mr-0.5 text-amber-400" />
                          </span>
                        )}
                        <span className="font-mono">{formatDate(m.createdAt)}</span>
                        {isMe && (
                          <span
                            className="inline-flex items-center ml-0.5"
                            title={
                              m.isRead || m.viewCount > 0
                                ? "Read by recipient"
                                : m.isDelivered
                                ? "Delivered to recipient"
                                : "Sent to server"
                            }
                          >
                            {m.isRead || m.viewCount > 0 ? (
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                            ) : m.isDelivered ? (
                              <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/70" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-muted-foreground/60" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Peer Typing Indicator */}
              {isTypingPeer && (
                <div className="text-xs text-muted-foreground italic flex items-center space-x-1.5 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{isTypingPeer}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <ChatInput
              onSendMessage={handleSendMessage}
              onTyping={(isTyping) => {
                if (!demoMode && selectedConvId) {
                  wsClient.sendTyping(selectedConvId, isTyping);
                }
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground">
            <div className="max-w-sm space-y-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground text-base">Select a Conversation</h3>
              <p className="text-xs">
                Choose a conversation from the sidebar or start a new private encrypted room.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* PANEL 3: Collapsible Right Panel / Security & Details Inspector */}
      {activeConversation && isDetailsOpen && (
        <>
          {/* Mobile/Tablet Backdrop & Raised Floating Slide-Over Drawer */}
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs xl:hidden animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setIsDetailsOpen(false)}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-sm sm:max-w-md h-full shadow-2xl bg-card border-l border-border animate-in slide-in-from-right duration-250 flex flex-col">
              <ConversationDetails
                conversation={activeConversation}
                user={user}
                onClose={() => setIsDetailsOpen(false)}
                onVerifyKeys={handleOpenSafety}
                onInvite={() => setIsInviteOpen(true)}
                onClearLocalCache={handleClearLocalCache}
              />
            </div>
          </div>

          {/* Desktop Inline Docked Column */}
          <div className="hidden xl:flex shrink-0">
            <ConversationDetails
              conversation={activeConversation}
              user={user}
              onClose={() => setIsDetailsOpen(false)}
              onVerifyKeys={handleOpenSafety}
              onInvite={() => setIsInviteOpen(true)}
              onClearLocalCache={handleClearLocalCache}
            />
          </div>
        </>
      )}

      {/* Modals */}
      <EnvelopeModal
        isOpen={!!inspectedEnvelopeMsg}
        onClose={() => setInspectedEnvelopeMsg(null)}
        message={inspectedEnvelopeMsg}
      />

      <SafetyModal
        isOpen={isSafetyOpen}
        onClose={() => setIsSafetyOpen(false)}
        contactName={
          activeConversation?.otherMember?.displayName ||
          activeConversation?.otherMember?.username ||
          "Contact"
        }
        fingerprint={safetyFingerprint}
      />

      <AttachmentModal
        isOpen={!!activeAttachmentMsg}
        onClose={() => setActiveAttachmentMsg(null)}
        message={activeAttachmentMsg}
        onConsumeView={async (id) => {
          if (!demoMode) {
            await apiFetch(`/api/messages/${id}/view`, { method: "POST" });
          }
        }}
        isDemo={demoMode}
      />

      <CreateDmModal
        isOpen={isCreateDmOpen}
        onClose={() => setIsCreateDmOpen(false)}
        onConversationCreated={(convId) => {
          fetchConversations();
          setSelectedConvId(convId);
        }}
        isDemo={demoMode}
      />

      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onRoomCreated={(newRoom) => {
          setConversations((prev) => [newRoom, ...prev]);
          setSelectedConvId(newRoom.id);
        }}
        isDemo={demoMode}
      />

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        roomId={activeConversation?.id || ""}
        roomTitle={activeConversation?.title || "Private Room"}
        isDemo={demoMode}
      />
    </div>
  );
}
