import type { BeanType } from './beans.js';

export enum TradeOfferStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Withdrawn = 'withdrawn',
  Expired = 'expired',
}

export enum TradeOfferType {
  Trade = 'trade',
  Donation = 'donation',
}

export interface TradeOfferSide {
  fromHand: BeanType[];
  fromFaceUp: string[];
}

export interface TradeOffer {
  id: string;
  type: TradeOfferType;
  fromPlayerId: string;
  toPlayerId: string | null;
  offering: TradeOfferSide;
  requesting: TradeOfferSide;
  status: TradeOfferStatus;
  /** Player IDs that have individually rejected this open offer */
  rejectedByPlayerIds: string[];
  timestamp: number;
}
