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
      className={`bean-field ${isEmpty ? 'empty' : ''} ${canPlant ? 'plantable' : ''}`}
      style={
        variety ? ({ '--field-color': variety.color } as React.CSSProperties) : undefined
      }
      onClick={handleClick}
    >
      <div className="field-header">
        <span className="field-label">Field {fieldIndex + 1}</span>
        {!isEmpty && (
          <span className="field-count">{field.cards.length} cards</span>
        )}
      </div>

      {isEmpty ? (
        <div className="field-empty">
          {canPlant ? 'Click to plant' : 'Empty'}
        </div>
      ) : (
        <div className="field-content">
          <div
            className="field-bean-icon"
            style={{ backgroundColor: variety?.color }}
          >
            {variety?.displayName.charAt(0)}
          </div>
          <div className="field-bean-name">{variety?.displayName}</div>
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
        </div>
      )}

      {isMyField && !isEmpty && (
        <button className="harvest-btn" onClick={handleHarvest}>
          Harvest
        </button>
      )}

      {canPlantPending && isEmpty && pendingCards && (
        <div className="plant-pending-options">
          {pendingCards.map((card) => (
            <button
              key={card.id}
              className="plant-pending-btn"
              onClick={() => handlePlantPending(card.id)}
            >
              Plant {card.type}
            </button>
          ))}
        </div>
      )}

      {canPlantPending && !isEmpty && pendingCards && (
        <div className="plant-pending-options">
          {pendingCards
            .filter((c) => c.type === field.beanType)
            .map((card) => (
              <button
                key={card.id}
                className="plant-pending-btn"
                onClick={() => handlePlantPending(card.id)}
              >
                Plant here
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
