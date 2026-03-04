import { create } from 'zustand';

interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

interface ChatStore {
  messages: ChatMessage[];
  unreadCount: number;
  isOpen: boolean;
  addMessage: (msg: ChatMessage) => void;
  setOpen: (open: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  unreadCount: 0,
  isOpen: false,
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg],
      unreadCount: s.isOpen ? 0 : s.unreadCount + 1,
    })),
  setOpen: (open) => set({ isOpen: open, unreadCount: open ? 0 : get().unreadCount }),
  reset: () => set({ messages: [], unreadCount: 0, isOpen: false }),
}));
