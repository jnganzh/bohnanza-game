import type { BeanCard, BeanType } from './beans.js';

export interface BeanField {
  beanType: BeanType | null;
  cards: BeanCard[];
}

export interface PlayerState {
  id: string;
  name: string;
  hand: BeanCard[];
  fields: BeanField[];
  goldCoins: number;
  goldCoinCards: BeanCard[];
  hasThirdField: boolean;
  pendingPlanting: BeanCard[];
  connected: boolean;
}

export interface PublicPlayerState {
  id: string;
  name: string;
  handCount: number;
  fields: BeanField[];
  goldCoins: number;
  hasThirdField: boolean;
  pendingPlantingCount: number;
  connected: boolean;
}
