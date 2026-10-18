"use client";

import * as React from "react";
import {
  Shield,
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
  const [isTypingPeer, setIsTypingPeer] = React.useState<string | null>(null);

  // Modals
  const [isSafetyOpen, setIsSafetyOpen] = React.useState(false);
  const [safetyFingerprint, setSafetyFingerprint] = React.useState<SafetyFingerprint | null>(null);
  const [activeAttachmentMsg, setActiveAttachmentMsg] = React.useState<EncryptedMessageRecord | null>(null);
  const [isCreateDmOpen, setIsCreateDmOpen] = React.useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = React.useState(false);
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // 1. Fetch conversations
  const fetchConversations = React.useCallback(async () => {
    if (demoMode) {
      setConversations(DEMO_CONVERSATIONS);
      if (!selectedConvId && DEMO_CONVERSATIONS.length > 0) {
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          setSelectedConvId(DEMO_CONVERSATIONS[0].id);
        }
      }
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
    }
  }, [demoMode, selectedConvId]);

  React.useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const activeConversation = conversations.find((c) => c.id === selectedConvId);

  // 2. Fetch messages for active conversation
  const fetchMessages = React.useCallback(async (convId: string) => {
    if (demoMode) {
      if (convId === "demo-conv-bob-001") {
        setMessages(DEMO_MESSAGES_BOB);
        setPlaintextCache(DEMO_PLAINTEXT_MAP);
      } else {
        setMessages([]);
      }
      return;
    }

    setIsLoadingMessages(true);
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
      setIsLoadingMessages(false);
    }
  }, [demoMode]);

  React.useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
      if (!demoMode) {
        wsClient.subscribeConversation(selectedConvId);
      }
    }
  }, [selectedConvId, fetchMessages, demoMode]);

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
          }
          fetchConversations();
          break;
        }

        case "TYPING_STATUS": {
          if (event.conversationId === selectedConvId) {
            setIsTypingPeer(event.isTyping ? `${event.username} is typing...` : null);
          }
          break;
        }

        case "MESSAGE_VIEWED": {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === event.messageId
                ? { ...m, viewCount: event.viewCount, isExpired: event.isExpired }
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
  }, [demoMode, selectedConvId, fetchConversations]);

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

      setMessages((prev) => [...prev, dummyMsg]);
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

  // Filter conversations locally without leaking query to server
  const filteredConversations = conversations.filter((c) => {
    const name = c.title || c.otherMember?.displayName || c.otherMember?.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar: Conversation List */}
      <aside
        className={`border-r border-border bg-card/40 flex-col shrink-0 ${
          selectedConvId
            ? "hidden md:flex w-full md:w-80 lg:w-96"
            : "flex w-full md:w-80 lg:w-96"
        }`}
      >
        <div className="p-3 border-b border-border/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Encrypted Chats</h2>
            <div className="flex items-center space-x-1.5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateDmOpen(true)}
                className="text-xs h-7 px-2"
                title="Start 1-to-1 Direct Chat"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                New Chat
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateRoomOpen(true)}
                className="text-xs h-7 px-2"
                title="Create Private Group Room"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Room
              </Button>
            </div>
          </div>

          {/* Local Search Input */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations locally..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredConversations.length === 0 && (
            <div className="text-center py-10 px-4 text-xs text-muted-foreground">
              No conversations found. Create a private room or send a direct message.
            </div>
          )}

          {filteredConversations.map((c) => {
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
                  isSelected ? "bg-secondary/70 border-l-2 border-primary" : "hover:bg-secondary/30"
                }`}
              >
                {/* Avatar with Presence Indicator */}
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm text-foreground overflow-hidden border border-border">
                    {c.type === "GROUP" ? (
                      <Users className="h-5 w-5 text-primary" />
                    ) : c.otherMember?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.otherMember.avatarUrl} alt={title} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  {c.type === "DIRECT" && c.otherMember?.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
                    {c.lastMessage && (
                      <span className="text-[10px] text-muted-foreground">
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
                    {c.unreadCount > 0 && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Conversation Stream */}
      <section
        className={`flex-1 flex-col bg-navy-950/40 min-w-0 ${
          selectedConvId ? "flex w-full" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <header className="h-14 border-b border-border bg-card/50 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2 sm:space-x-3 truncate mr-2">
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

                <div className="flex items-center space-x-1.5 sm:space-x-2 truncate">
                  <h3 className="font-semibold text-sm text-foreground truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none">
                    {activeConversation.type === "GROUP"
                      ? activeConversation.title
                      : activeConversation.otherMember?.displayName || activeConversation.otherMember?.username}
                  </h3>
                  <Badge variant="default" className="text-[10px] py-0 px-1.5 shrink-0 hidden xs:inline-flex">
                    <Lock className="h-3 w-3 mr-1 text-emerald-400" />
                    E2EE
                  </Badge>
                </div>

                {activeConversation.disappearingMode !== "OFF" && (
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5 hidden md:inline-flex shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {activeConversation.disappearingMode === "VIEW_ONCE"
                      ? "1-View"
                      : activeConversation.disappearingMode === "VIEW_TWICE"
                      ? "2-View"
                      : "24h TTL"}
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                {activeConversation.type === "GROUP" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsInviteOpen(true)}
                    className="text-xs h-8 px-2 sm:px-3"
                  >
                    <Link2 className="h-3.5 w-3.5 sm:mr-1 text-primary" />
                    <span className="hidden sm:inline">Invite</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenSafety}
                    className="text-xs h-8 px-2 sm:px-3"
                  >
                    <Shield className="h-3.5 w-3.5 sm:mr-1 text-primary" />
                    <span className="hidden sm:inline">Verify Keys</span>
                  </Button>
                )}
              </div>
            </header>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingMessages && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  Decrypting message envelopes...
                </p>
              )}

              {messages.length === 0 && !isLoadingMessages && (
                <div className="text-center py-12 text-xs text-muted-foreground max-w-sm mx-auto space-y-2">
                  <div className="h-10 w-10 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center">
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

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`relative max-w-md rounded-2xl p-3 text-sm shadow-sm ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-secondary text-foreground rounded-bl-none border border-border/80"
                      }`}
                    >
                      {/* Attached File Preview */}
                      {m.attachment && (
                        <div
                          onClick={() => setActiveAttachmentMsg(m)}
                          className={`mb-2 rounded-xl p-2.5 flex items-center justify-between cursor-pointer border transition-colors ${
                            isMe
                              ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20"
                              : "bg-card border-border hover:bg-card/80"
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <Paperclip className="h-4 w-4 shrink-0" />
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
                      <div
                        className={`flex items-center justify-end space-x-1.5 mt-1 text-[10px] ${
                          isMe ? "text-primary-foreground/75" : "text-muted-foreground"
                        }`}
                      >
                        {m.isDisappearing && (
                          <span title="Disappearing message">
                            <Clock className="h-3 w-3 inline mr-0.5" />
                          </span>
                        )}
                        <span>{formatDate(m.createdAt)}</span>
                        {isMe && (
                          <span>
                            {m.viewCount > 0 ? (
                              <CheckCheck className="h-3.5 w-3.5 inline text-blue-300" />
                            ) : (
                              <Check className="h-3.5 w-3.5 inline" />
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
                <div className="text-xs text-muted-foreground italic flex items-center space-x-1 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
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
              <MessageSquare className="h-12 w-12 text-primary/40 mx-auto" />
              <h3 className="font-semibold text-foreground text-base">Select a Conversation</h3>
              <p className="text-xs">
                Choose a conversation from the sidebar or start a new private encrypted room.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
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
