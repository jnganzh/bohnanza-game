import type { BeanCard as BeanCardType } from '@bohnanza/shared';
import { GamePhase } from '@bohnanza/shared';
import { BeanCard } from '../Cards/BeanCard.js';
import { useTradeStore } from '../../stores/useTradeStore.js';
import './PlayerHand.css';

interface Props {
  hand: BeanCardType[];
  phase: GamePhase;
  isMyTurn: boolean;
}

export function PlayerHand({ hand, phase, isMyTurn }: Props) {
  const { selectedHandCards, toggleHandCard } = useTradeStore();
  const isTradePhase = phase === GamePhase.DrawAndTrade;

  return (
    <div className="player-hand">
      <div className="hand-label">
        Your Hand ({hand.length} cards)
        {hand.length > 0 && (
          <span className="hand-hint"> - First card must be planted first</span>
        )}
      </div>
      <div className="hand-cards">
        {hand.map((card, i) => (
          <BeanCard
            key={card.id}
            card={card}
            highlighted={i === 0 && isMyTurn && phase === GamePhase.PlantFromHand}
            selected={selectedHandCards.includes(card.id)}
            onClick={
              isTradePhase
                ? () => toggleHandCard(card.id)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
