import { create } from "zustand";
import * as chatApi from "../api/chat";

interface ChatMessage {
  id: string;
  league_id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  content: string;
  message_type: string;
  metadata_: Record<string, any> | null;
  created_at: string;
  reactions: Record<string, number>;
}

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  typingUsers: string[];
  error: string | null;

  fetchMessages: (leagueId: string, before?: string) => Promise<void>;
  sendMessage: (leagueId: string, content: string) => Promise<void>;
  reactToMessage: (leagueId: string, messageId: string, emoji: string) => Promise<void>;
  createPoll: (leagueId: string, question: string, options: string[]) => Promise<void>;
  votePoll: (leagueId: string, messageId: string, optionIndex: number) => Promise<void>;

  // WS-driven
  appendMessage: (msg: ChatMessage) => void;
  updateReactions: (messageId: string, reactions: Record<string, number>) => void;
  setTypingUser: (username: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  hasMore: true,
  typingUsers: [],
  error: null,

  fetchMessages: async (leagueId, before) => {
    set({ loading: true, error: null });
    try {
      const { data } = await chatApi.getMessages(leagueId, before, 50);
      if (before) {
        // Paginating older messages
        set((s) => ({
          messages: [...s.messages, ...data],
          hasMore: data.length === 50,
          loading: false,
        }));
      } else {
        // Initial load
        set({ messages: data, hasMore: data.length === 50, loading: false });
      }
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to load messages", loading: false });
    }
  },

  sendMessage: async (leagueId, content) => {
    try {
      // Message will arrive via WebSocket, no need to append here
      await chatApi.sendMessage(leagueId, content);
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to send message" });
    }
  },

  reactToMessage: async (leagueId, messageId, emoji) => {
    try {
      await chatApi.reactToMessage(leagueId, messageId, emoji);
    } catch {
      // Reaction update comes via WS
    }
  },

  createPoll: async (leagueId, question, options) => {
    set({ error: null });
    try {
      await chatApi.createPoll(leagueId, question, options);
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to create poll" });
    }
  },

  votePoll: async (leagueId, messageId, optionIndex) => {
    try {
      await chatApi.votePoll(leagueId, messageId, optionIndex);
    } catch {
      // silent
    }
  },

  appendMessage: (msg) => {
    set((s) => {
      // Avoid duplicates
      if (s.messages.some((m) => m.id === msg.id)) return s;
      return { messages: [msg, ...s.messages] };
    });
  },

  updateReactions: (messageId, reactions) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    }));
  },

  setTypingUser: (username) => {
    set((s) => {
      if (s.typingUsers.includes(username)) return s;
      return { typingUsers: [...s.typingUsers, username] };
    });
    // Auto-clear after 3 seconds
    setTimeout(() => {
      set((s) => ({
        typingUsers: s.typingUsers.filter((u) => u !== username),
      }));
    }, 3000);
  },

  reset: () => set({ messages: [], loading: false, hasMore: true, typingUsers: [], error: null }),
}));
