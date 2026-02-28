export enum BeanType {
  Blue = 'blue',
  Chili = 'chili',
  Stink = 'stink',
  Green = 'green',
  Soy = 'soy',
  BlackEyed = 'black-eyed',
  Red = 'red',
  Garden = 'garden',
}

export interface BeanCard {
  id: string;
  type: BeanType;
}

export interface BeanometerTier {
  cardCount: number;
  goldCoins: number;
}

export interface BeanVariety {
  type: BeanType;
  totalCards: number;
  displayName: string;
  color: string;
  beanometer: BeanometerTier[];
}
