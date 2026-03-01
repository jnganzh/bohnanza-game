import type { BeanField, BeanCard as BeanCardType, GamePhase as GamePhaseType } from '@bohnanza/shared';
import { GamePhase, BEAN_VARIETIES } from '@bohnanza/shared';
import { socket } from '../../socket/socketClient.js';
import './BeanField.css';

interface Props {
  field: BeanField;
  fieldIndex: number;
  isMyField: boolean;
  phase: GamePhaseType;
  isMyTurn: boolean;
  pendingCards?: BeanCardType[];
}

export function BeanFieldComp({
  field,
  fieldIndex,
  isMyField,
  phase,
  isMyTurn,
  pendingCards,
}: Props) {
  const isEmpty = field.cards.length === 0;
  const variety = field.beanType ? BEAN_VARIETIES[field.beanType] : null;

  const canPlant =
    isMyField &&
    isMyTurn &&
    phase === GamePhase.PlantFromHand;

  const canPlantPending =
    isMyField &&
    phase === GamePhase.PlantTradedBeans &&
    pendingCards &&
    pendingCards.length > 0;

  const handleClick = () => {
    if (canPlant) {
      socket.emit('game:plant-bean', { fieldIndex });
    }
  };

  const handleHarvest = (e: React.MouseEvent) => {
    e.stopPropagation();
    socket.emit('game:harvest-field', { fieldIndex });
  };

  const handlePlantPending = (cardId: string) => {
    socket.emit('game:plant-pending-bean', { cardId, fieldIndex });
  };

  return (
    <div
      className={`bean-field ${isEmpty ? 'empty' : 'planted'} ${canPlant ? 'plantable' : ''}`}
      onClick={handleClick}
    >
      <div className="field-label-tag">F{fieldIndex + 1}</div>

      {isEmpty ? (
        <div className="field-soil">
          <div className="soil-sprout">🌱</div>
          <div className="soil-text">
            {canPlant ? 'Click to plant' : 'Empty'}
          </div>
        </div>
      ) : (
        <div className="field-planted" style={{ '--bean-color': variety?.color } as React.CSSProperties}>
          <div className="planted-emoji">{variety?.emoji}</div>
          <div className="planted-name">{variety?.displayName}</div>
          <div className="planted-count">{field.cards.length} cards</div>
          <div className="field-beanometer">
            {variety?.beanometer.map((tier, i) => (
              <span
                key={i}
                className={`meter-tier ${field.cards.length >= tier.cardCount ? 'reached' : ''}`}
              >
                {tier.cardCount}:{tier.goldCoins}g
              </span>
            ))}
          </div>
          {isMyField && (
            <button className="harvest-btn" onClick={handleHarvest}>
              Harvest
            </button>
          )}
        </div>
      )}

      {canPlantPending && isEmpty && pendingCards && (
        <div className="plant-pending-options">
          {pendingCards.map((card) => {
            const v = BEAN_VARIETIES[card.type];
            return (
              <button
                key={card.id}
                className="plant-pending-btn"
                onClick={() => handlePlantPending(card.id)}
              >
                {v.emoji} {v.displayName}
              </button>
            );
          })}
        </div>
      )}

      {canPlantPending && !isEmpty && pendingCards && (
        <div className="plant-pending-options">
          {pendingCards
            .filter((c) => c.type === field.beanType)
            .map((card) => {
              const v = BEAN_VARIETIES[card.type];
              return (
                <button
                  key={card.id}
                  className="plant-pending-btn"
                  onClick={() => handlePlantPending(card.id)}
                >
                  {v.emoji} Plant here
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
