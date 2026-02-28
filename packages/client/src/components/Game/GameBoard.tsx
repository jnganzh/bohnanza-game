import { useGameStore } from '../../stores/useGameStore.js';
import { GamePhase } from '@bohnanza/shared';
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

      {actionError && <div className="action-error">{actionError}</div>}

      <div className="game-main">
        <div className="game-left">
          <div className="opponents-area">
            {gameState.opponents.map((opp) => (
              <OpponentArea
                key={opp.id}
                player={opp}
                isActive={opp.id === gameState.turn.activePlayerId}
              />
            ))}
          </div>

          <div className="center-area">
            <div className="deck-info">
              <div className="deck-pile">
                <div className="deck-card">
                  <span>{gameState.deckCount}</span>
                </div>
                <span className="deck-label">
                  Deck (reshuffled {gameState.deckExhaustionCount}/3)
                </span>
              </div>
              <div className="discard-pile">
                <div className="discard-card">
                  <span>{gameState.discardPileCount}</span>
                </div>
                <span className="deck-label">Discard</span>
              </div>
            </div>

            {isTradePhase && gameState.turn.drawnFaceUpCards.length > 0 && (
              <FaceUpCards
                cards={gameState.turn.drawnFaceUpCards}
                isMyTurn={isMyTurn}
              />
            )}
          </div>

          <div className="my-area">
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
                  <BuyThirdFieldButton gold={gameState.myGoldCoins} />
                </div>
              )}
              <div className="gold-counter">
                <span className="gold-icon">$</span>
                <span className="gold-amount">{gameState.myGoldCoins}</span>
              </div>
            </div>

            {isPlantPending && gameState.myPendingPlanting.length > 0 && (
              <div className="pending-area">
                <h4>Must plant these beans:</h4>
                <div className="pending-cards">
                  {gameState.myPendingPlanting.map((card) => (
                    <div key={card.id} className="pending-card-info">
                      {card.type}
                    </div>
                  ))}
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

function BuyThirdFieldButton({ gold }: { gold: number }) {
  return (
    <button
      className="buy-field-btn"
      disabled={gold < 3}
      onClick={() => socket.emit('game:buy-third-field')}
      title={gold < 3 ? `Need 3 gold (have ${gold})` : 'Buy 3rd field for 3 gold'}
    >
      Buy 3rd Field
      <br />
      <small>(3 gold)</small>
    </button>
  );
}
