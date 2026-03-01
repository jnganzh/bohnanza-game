import { useState } from 'react';
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
  /** The top card of the player's hand (for smart plant behavior) */
  topHandCard?: BeanCardType;
}

export function BeanFieldComp({
  field,
  fieldIndex,
  isMyField,
  phase,
  isMyTurn,
  pendingCards,
  topHandCard,
}: Props) {
  const [confirmHarvest, setConfirmHarvest] = useState(false);
  const isEmpty = field.cards.length === 0;
  const variety = field.beanType ? BEAN_VARIETIES[field.beanType] : null;

  const isPlantPhase =
    isMyField &&
    isMyTurn &&
    phase === GamePhase.PlantFromHand;

  // A field can accept the top hand card if:
  // - it's empty (beanType is null), OR
  // - it already has the same bean type
  const canAcceptTopCard =
    isPlantPhase &&
    topHandCard != null &&
    (field.beanType === null || field.beanType === topHandCard.type);

  // canPlant: field is valid for planting the top card
  const canPlant = canAcceptTopCard;

  // Smart plant: if the field has the same type as the top hand card, clicking plants
  const canSmartPlant = canPlant && !isEmpty && topHandCard && topHandCard.type === field.beanType;

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
    if (!confirmHarvest) {
      setConfirmHarvest(true);
      // Auto-dismiss after 3 seconds
      setTimeout(() => setConfirmHarvest(false), 3000);
      return;
    }
    socket.emit('game:harvest-field', { fieldIndex });
    setConfirmHarvest(false);
  };

  const handleCancelHarvest = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmHarvest(false);
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
          <span className="field-total-count">{variety?.totalCards}</span>
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
          {isMyField && canSmartPlant && (
            <button className="plant-here-btn" onClick={handleClick}>
              🌱 Plant Here
            </button>
          )}
          {isMyField && (
            <div className="harvest-area">
              {confirmHarvest ? (
                <div className="harvest-confirm">
                  <button className="harvest-btn harvest-yes" onClick={handleHarvest}>
                    ✓ Confirm
                  </button>
                  <button className="harvest-btn harvest-no" onClick={handleCancelHarvest}>
                    ✗ Cancel
                  </button>
                </div>
              ) : (
                <button className="harvest-btn" onClick={handleHarvest}>
                  Harvest
                </button>
              )}
            </div>
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
