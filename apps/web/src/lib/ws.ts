import type { WsClientMessage, WsServerMessage } from "@cipherchat/shared";

type MessageHandler = (message: WsServerMessage) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private deviceId: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private listeners: Set<MessageHandler> = new Set();
  private subscribedConversations: Set<string> = new Set();
  private isConnecting = false;
  private reconnectAttempts = 0;

  public connect(token: string, deviceId: string) {
    this.token = token;
    this.deviceId = deviceId;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Perform authentication handshake
        this.send({
          type: "AUTH",
          token: this.token!,
          deviceId: this.deviceId!,
        });

        // Re-subscribe to any active conversations
        for (const convId of this.subscribedConversations) {
          this.send({
            type: "SUBSCRIBE_CONVERSATION",
            conversationId: convId,
          });
        }

        // Start heartbeat
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WsServerMessage = JSON.parse(event.data);
          for (const listener of this.listeners) {
            listener(data);
          }
        } catch {
          // Ignore invalid frames
        }
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public addListener(handler: MessageHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  public send(message: WsClientMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  public subscribeConversation(conversationId: string) {
    this.subscribedConversations.add(conversationId);
    this.send({
      type: "SUBSCRIBE_CONVERSATION",
      conversationId,
    });
  }

  public unsubscribeConversation(conversationId: string) {
    this.subscribedConversations.delete(conversationId);
    this.send({
      type: "UNSUBSCRIBE_CONVERSATION",
      conversationId,
    });
  }

  public sendTyping(conversationId: string, isTyping: boolean) {
    this.send({
      type: "TYPING",
      conversationId,
      isTyping,
    });
  }

  public markRead(conversationId: string, messageId: string) {
    this.send({
      type: "MARK_READ",
      conversationId,
      messageId,
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: "HEARTBEAT",
        timestamp: Date.now(),
      });
    }, 25000);
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.token && this.deviceId) {
        this.connect(this.token, this.deviceId);
      }
    }, delay);
  }
}

export const wsClient = new WebSocketClient();
