import { create } from 'zustand';
import type { TradeOffer } from '@bohnanza/shared';

interface TradeStore {
  offers: TradeOffer[];
  selectedHandCards: string[];
  selectedFaceUpCards: string[];

  addOffer: (offer: TradeOffer) => void;
  updateOfferStatus: (tradeId: string, status: TradeOffer['status']) => void;
  clearOffers: () => void;
  toggleHandCard: (cardId: string) => void;
  toggleFaceUpCard: (cardId: string) => void;
  clearSelection: () => void;
}

export const useTradeStore = create<TradeStore>((set) => ({
  offers: [],
  selectedHandCards: [],
  selectedFaceUpCards: [],

  addOffer: (offer) =>
    set((s) => ({ offers: [...s.offers, offer] })),

  updateOfferStatus: (tradeId, status) =>
    set((s) => ({
      offers: s.offers.map((o) =>
        o.id === tradeId ? { ...o, status } : o
      ),
    })),

  clearOffers: () => set({ offers: [] }),

  toggleHandCard: (cardId) =>
    set((s) => ({
      selectedHandCards: s.selectedHandCards.includes(cardId)
        ? s.selectedHandCards.filter((id) => id !== cardId)
        : [...s.selectedHandCards, cardId],
    })),

  toggleFaceUpCard: (cardId) =>
    set((s) => ({
      selectedFaceUpCards: s.selectedFaceUpCards.includes(cardId)
        ? s.selectedFaceUpCards.filter((id) => id !== cardId)
        : [...s.selectedFaceUpCards, cardId],
    })),

  clearSelection: () => set({ selectedHandCards: [], selectedFaceUpCards: [] }),
}));
