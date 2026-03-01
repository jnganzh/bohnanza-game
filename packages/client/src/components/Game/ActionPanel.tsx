import { GamePhase, BEAN_VARIETIES } from '@bohnanza/shared';
import type { ClientGameState } from '@bohnanza/shared';
import { socket } from '../../socket/socketClient.js';
import './ActionPanel.css';

interface Props {
  gameState: ClientGameState;
  isMyTurn: boolean;
}

export function ActionPanel({ gameState, isMyTurn }: Props) {
  const { phase, beansPlantedThisTurn, mustPlantFirst } = gameState.turn;

  return (
    <div className="action-panel">
      {phase === GamePhase.PlantFromHand && isMyTurn && (
        <>
          {gameState.myHand.length > 0 && (() => {
            const card = gameState.myHand[0];
            const variety = BEAN_VARIETIES[card.type];
            return (
              <button
                className="action-btn plant"
                onClick={() => {
                  let fieldIdx = gameState.myFields.findIndex(
                    (f) => f.beanType === card.type
                  );
                  if (fieldIdx === -1) {
                    fieldIdx = gameState.myFields.findIndex(
                      (f) => f.beanType === null
                    );
                  }
                  if (fieldIdx !== -1) {
                    socket.emit('game:plant-bean', { fieldIndex: fieldIdx });
                  }
                }}
              >
                {variety.emoji} Plant {variety.displayName}
              </button>
            );
          })()}
          {!mustPlantFirst && (
            <button
              className="action-btn skip"
              onClick={() => socket.emit('game:skip-second-plant')}
            >
              Skip 2nd Plant
            </button>
          )}
          <span className="action-info">
            <span className="planted-counter">{beansPlantedThisTurn}/2</span>
            planted
          </span>
        </>
      )}

      {phase === GamePhase.DrawAndTrade && isMyTurn && (
        <button
          className="action-btn end-trade"
          onClick={() => socket.emit('game:end-trading')}
        >
          End Trading
        </button>
      )}

      {phase === GamePhase.PlantTradedBeans && gameState.myPendingPlanting.length > 0 && (
        <span className="action-info">
          Plant your {gameState.myPendingPlanting.length} pending bean(s) by clicking on a field
        </span>
      )}

      {!isMyTurn && phase !== GamePhase.PlantTradedBeans && (
        <span className="action-info waiting">Waiting for other player...</span>
      )}
    </div>
  );
}
