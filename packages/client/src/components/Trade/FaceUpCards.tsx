import type { BeanCard as BeanCardType } from '@bohnanza/shared';
import { BEAN_VARIETIES } from '@bohnanza/shared';
import { BeanCard } from '../Cards/BeanCard.js';
import { socket } from '../../socket/socketClient.js';
import { useTradeStore } from '../../stores/useTradeStore.js';
import './FaceUpCards.css';

interface Props {
  cards: BeanCardType[];
  isMyTurn: boolean;
  keptCardIds: string[];
}

export function FaceUpCards({ cards, isMyTurn, keptCardIds }: Props) {
  const { selectedFaceUpCards, toggleFaceUpCard } = useTradeStore();

  return (
    <div className="face-up-cards">
      <div className="face-up-label">🃏 Face-Up Cards (visible to all)</div>
      <div className="face-up-list">
        {cards.map((card) => {
          const isKept = keptCardIds.includes(card.id);
          const variety = BEAN_VARIETIES[card.type];
          const isSelected = !isKept && selectedFaceUpCards.includes(card.id);
          return (
            <div key={card.id} className={`face-up-item ${isKept ? 'kept' : ''} ${isSelected ? 'selected' : ''}`}>
              <div className="face-up-card-label">
                {variety.emoji} {variety.displayName}
              </div>
              <BeanCard
                card={card}
                selected={isSelected}
                onClick={() => !isKept && toggleFaceUpCard(card.id)}
              />
              {isKept ? (
                <span className="kept-badge">Claimed ✓</span>
              ) : (
                isMyTurn && (
                  <button
                    className="keep-btn"
                    onClick={() =>
                      socket.emit('game:keep-face-up-card', { cardId: card.id })
                    }
                  >
                    Keep {variety.emoji}
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
