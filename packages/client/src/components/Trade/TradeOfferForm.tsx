import { useState, useCallback } from 'react';
import type { ClientGameState, BeanType } from '@bohnanza/shared';
import { BEAN_VARIETIES, BeanType as BeanTypeEnum } from '@bohnanza/shared';
import { socket } from '../../socket/socketClient.js';
import { useTradeStore } from '../../stores/useTradeStore.js';
import './TradeOfferForm.css';

interface Props {
  gameState: ClientGameState;
  isMyTurn: boolean;
}

const ALL_BEAN_TYPES = Object.values(BeanTypeEnum);

export function TradeOfferForm({ gameState, isMyTurn }: Props) {
  const {
    selectedHandCards,
    selectedFaceUpCards,
    selectedRequestFaceUpCards,
    clearSelection,
  } = useTradeStore();

  const [isDonation, setIsDonation] = useState(false);
  const [wantedBeans, setWantedBeans] = useState<Record<string, number>>({});

  const hasSelection =
    selectedHandCards.length > 0 || selectedFaceUpCards.length > 0 || selectedRequestFaceUpCards.length > 0;

  const hasWantedBeans =
    Object.values(wantedBeans).some((count) => count > 0);

  const adjustWanted = useCallback((beanType: BeanType, delta: number) => {
    setWantedBeans((prev) => {
      const current = prev[beanType] || 0;
      const next = Math.max(0, Math.min(10, current + delta));
      if (next === 0) {
        const { [beanType]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [beanType]: next };
    });
  }, []);

  const handlePropose = () => {
    if (!hasSelection) return;

    const offeringFromHand = selectedHandCards
      .map((id) => gameState.myHand.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => c!.type);

    if (isDonation) {
      socket.emit('game:propose-donation', {
        cards: {
          fromHand: offeringFromHand,
          fromFaceUp: selectedFaceUpCards,
        },
      });
    } else {
      // Build wanted types array from the bean picker counts
      const wantedTypes: BeanType[] = [];
      for (const [type, count] of Object.entries(wantedBeans)) {
        for (let i = 0; i < count; i++) {
          wantedTypes.push(type as BeanType);
        }
      }

      socket.emit('game:propose-trade', {
        offering: {
          fromHand: offeringFromHand,
          fromFaceUp: selectedFaceUpCards,
        },
        requesting: { fromHand: wantedTypes, fromFaceUp: selectedRequestFaceUpCards },
      });
    }

    clearSelection();
    setWantedBeans({});
  };

  // Get display info for selected cards
  const selectedOfferingDisplay = [
    ...selectedHandCards
      .map((id) => gameState.myHand.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => {
        const v = BEAN_VARIETIES[c!.type];
        return `${v.emoji} ${v.displayName}`;
      }),
    ...selectedFaceUpCards.map((id) => {
      const faceUpCard = gameState.turn.drawnFaceUpCards.find((c) => c.id === id);
      if (faceUpCard) {
        const v = BEAN_VARIETIES[faceUpCard.type];
        return `🃏 ${v.emoji} ${v.displayName}`;
      }
      return '🃏 Face-up card';
    }),
  ];

  return (
    <div className="trade-form">
      {/* Trade type toggle */}
      <div className="trade-type-toggle">
        <button
          className={`toggle-btn ${!isDonation ? 'active' : ''}`}
          onClick={() => setIsDonation(false)}
        >
          Trade
        </button>
        <button
          className={`toggle-btn ${isDonation ? 'active' : ''}`}
          onClick={() => setIsDonation(true)}
        >
          Donate
        </button>
      </div>

      {/* Selected offering display */}
      <div className="form-section">
        <label>🎁 What I Give:</label>
        {selectedOfferingDisplay.length > 0 ? (
          <div className="selected-beans-display">
            {selectedOfferingDisplay.map((text, i) => (
              <span key={i} className="bean-tag offer">{text}</span>
            ))}
          </div>
        ) : (
          <small className="hint-text">
            Select cards from your hand{isMyTurn ? ' or face-up cards' : ''} above
          </small>
        )}
      </div>

      {/* Wanted beans picker (only for trades, not donations) */}
      {!isDonation && (
        <div className="form-section">
          <label>🔄 What I Want:</label>
          <div className="bean-picker">
            {ALL_BEAN_TYPES.map((beanType) => {
              const variety = BEAN_VARIETIES[beanType];
              const count = wantedBeans[beanType] || 0;
              return (
                <div
                  key={beanType}
                  className={`bean-pick-item ${count > 0 ? 'active' : ''}`}
                >
                  <div className="bean-pick-info">
                    <span className="bean-pick-emoji">{variety.emoji}</span>
                    <span className="bean-pick-name">{variety.displayName}</span>
                  </div>
                  <div className="bean-pick-controls">
                    <button
                      className="pick-btn minus"
                      onClick={() => adjustWanted(beanType, -1)}
                      disabled={count === 0}
                    >
                      -
                    </button>
                    <span className="pick-count">{count}</span>
                    <button
                      className="pick-btn plus"
                      onClick={() => adjustWanted(beanType, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {hasWantedBeans && (
            <div className="wanted-summary">
              {Object.entries(wantedBeans)
                .filter(([, count]) => count > 0)
                .map(([type, count]) => {
                  const v = BEAN_VARIETIES[type as BeanType];
                  return (
                    <span key={type} className="bean-tag want">
                      {v.emoji} {v.displayName} x{count}
                    </span>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Face-up card request picker for non-active players */}
      {!isDonation && !isMyTurn && gameState.turn.drawnFaceUpCards.length > 0 && (
        <div className="form-section">
          <label>🃏 Request Face-Up Cards:</label>
          <div className="face-up-request-picker">
            {gameState.turn.drawnFaceUpCards
              .filter((c) => !gameState.turn.keptFaceUpCardIds.includes(c.id))
              .map((card) => {
                const v = BEAN_VARIETIES[card.type];
                const isSelected = selectedRequestFaceUpCards.includes(card.id);
                return (
                  <button
                    key={card.id}
                    className={`face-up-request-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => useTradeStore.getState().toggleRequestFaceUpCard(card.id)}
                  >
                    {v.emoji} {v.displayName}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      <button
        className="propose-btn"
        onClick={handlePropose}
        disabled={!hasSelection}
      >
        {isDonation ? 'Donate' : 'Propose Trade'}
      </button>
    </div>
  );
}
