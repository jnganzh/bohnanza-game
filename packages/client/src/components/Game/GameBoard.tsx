import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/useGameStore.js';
import { useLobbyStore } from '../../stores/useLobbyStore.js';
import { GamePhase, BEAN_VARIETIES } from '@bohnanza/shared';
import { PlayerHand } from './PlayerHand.js';
import { BeanFieldComp } from './BeanField.js';
import { OpponentArea } from './OpponentArea.js';
import { PhaseIndicator } from './PhaseIndicator.js';
import { ActionPanel } from './ActionPanel.js';
import { TradePanel } from '../Trade/TradePanel.js';
import { FaceUpCards } from '../Trade/FaceUpCards.js';
import { GameOverScreen } from './GameOverScreen.js';
import { socket } from '../../socket/socketClient.js';
import './GameBoard.css';

export function GameBoard() {
  const { gameState, isMyTurn, gameOver, finalScores, winnerId, actionError } =
    useGameStore();
  const hostId = useLobbyStore((s) => s.hostId);

  const prevIsMyTurn = useRef(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const isHost = gameState?.myId === hostId;

  // Update page title and notify when turn changes
  useEffect(() => {
    if (isMyTurn) {
      document.title = '🌱 YOUR TURN - Bohnanza';
    } else {
      document.title = 'Bohnanza';
    }

    // If turn just became mine (was not mine before), flash the title
    if (isMyTurn && !prevIsMyTurn.current) {
      let count = 0;
      const interval = setInterval(() => {
        document.title = count % 2 === 0 ? '⭐ YOUR TURN! ⭐' : '🌱 YOUR TURN - Bohnanza';
        count++;
        if (count >= 6) {
          clearInterval(interval);
          document.title = '🌱 YOUR TURN - Bohnanza';
        }
      }, 500);

      return () => clearInterval(interval);
    }

    prevIsMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  if (!gameState) return null;

  if (gameOver && finalScores) {
    return <GameOverScreen scores={finalScores} winnerId={winnerId!} myId={gameState.myId} />;
  }

  const isTradePhase = gameState.turn.phase === GamePhase.DrawAndTrade;
  const isPlantPending = gameState.turn.phase === GamePhase.PlantTradedBeans;

  return (
    <div className="game-board">
      <PhaseIndicator
        phase={gameState.turn.phase}
        activePlayerId={gameState.turn.activePlayerId}
        isMyTurn={isMyTurn}
        deckCount={gameState.deckCount}
        deckExhaustionCount={gameState.deckExhaustionCount}
        opponents={gameState.opponents}
        myId={gameState.myId}
      />

      {isHost && (
        <div className="end-game-area">
          {!showEndConfirm ? (
            <button
              className="btn-end-game"
              onClick={() => setShowEndConfirm(true)}
            >
              End Game
            </button>
          ) : (
            <div className="end-game-confirm">
              <span>End the game for everyone?</span>
              <button
                className="btn-end-game-yes"
                onClick={() => {
                  socket.emit('game:end-game');
                  setShowEndConfirm(false);
                }}
              >
                Yes, End Game
              </button>
              <button
                className="btn-end-game-no"
                onClick={() => setShowEndConfirm(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {actionError && <div className="action-error">{actionError}</div>}

      <div className="game-main">
        <div className="game-left">
          {/* Opponents */}
          <div className="opponents-section">
            <div className="section-label">OPPONENTS</div>
            <div className="opponents-area">
              {gameState.opponents.map((opp) => (
                <OpponentArea
                  key={opp.id}
                  player={opp}
                  isActive={opp.id === gameState.turn.activePlayerId}
                />
              ))}
            </div>
          </div>

          {/* Deck + Face-up cards */}
          <div className="center-area">
            {isTradePhase && gameState.turn.drawnFaceUpCards.length > 0 && (
              <FaceUpCards
                cards={gameState.turn.drawnFaceUpCards}
                isMyTurn={isMyTurn}
                keptCardIds={gameState.turn.keptFaceUpCardIds}
              />
            )}
            <div className="deck-info">
              <div className="deck-pile">
                <div className="deck-stack">
                  <div className="deck-card-back deck-offset-2"></div>
                  <div className="deck-card-back deck-offset-1"></div>
                  <div className="deck-card-back deck-main">
                    <span className="deck-num">{gameState.deckCount}</span>
                  </div>
                </div>
                <span className="deck-label">
                  Draw Pile
                  {gameState.deckExhaustionCount > 0 && (
                    <span className="reshuffle-badge">
                      {gameState.deckExhaustionCount}/3
                    </span>
                  )}
                </span>
              </div>
              <div className="discard-pile">
                <div className="discard-card">
                  <span className="discard-num">{gameState.discardPileCount}</span>
                </div>
                <span className="deck-label">Discard</span>
              </div>
            </div>
          </div>

          {/* My fields */}
          <div className="my-area">
            <div className="my-fields-section">
              <div className="section-label">YOUR FIELDS</div>
              <div className="my-fields">
                {gameState.myFields.map((field, i) => (
                  <BeanFieldComp
                    key={i}
                    field={field}
                    fieldIndex={i}
                    isMyField={true}
                    phase={gameState.turn.phase}
                    isMyTurn={isMyTurn}
                    pendingCards={gameState.myPendingPlanting}
                  />
                ))}
                {!gameState.myHasThirdField && (
                  <div className="buy-field-slot">
                    <button
                      className="buy-field-btn"
                      disabled={gameState.myGoldCoins < 3}
                      onClick={() => socket.emit('game:buy-third-field')}
                      title={gameState.myGoldCoins < 3 ? `Need 3 gold (have ${gameState.myGoldCoins})` : 'Buy 3rd field for 3 gold'}
                    >
                      <span className="buy-icon">+</span>
                      <span className="buy-text">Buy Field</span>
                      <span className="buy-cost">3 gold</span>
                    </button>
                  </div>
                )}
                <div className="gold-counter">
                  <span className="gold-amount">{gameState.myGoldCoins}</span>
                  <span className="gold-label">GOLD</span>
                </div>
              </div>
            </div>

            {isPlantPending && gameState.myPendingPlanting.length > 0 && (
              <div className="pending-area">
                <h4>Must plant these beans:</h4>
                <div className="pending-cards">
                  {gameState.myPendingPlanting.map((card) => {
                    const v = BEAN_VARIETIES[card.type];
                    return (
                      <div key={card.id} className="pending-card-info">
                        {v.emoji} {v.displayName}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <PlayerHand
              hand={gameState.myHand}
              phase={gameState.turn.phase}
              isMyTurn={isMyTurn}
            />

            <ActionPanel
              gameState={gameState}
              isMyTurn={isMyTurn}
            />
          </div>
        </div>

        <div className="game-right">
          <TradePanel
            gameState={gameState}
            isMyTurn={isMyTurn}
          />
        </div>
      </div>
    </div>
  );
}
