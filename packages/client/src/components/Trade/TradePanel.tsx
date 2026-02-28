import { GamePhase } from '@bohnanza/shared';
import type { ClientGameState } from '@bohnanza/shared';
import { useTradeStore } from '../../stores/useTradeStore.js';
import { TradeOfferCard } from './TradeOfferCard.js';
import { TradeOfferForm } from './TradeOfferForm.js';
import './TradePanel.css';

interface Props {
  gameState: ClientGameState;
  isMyTurn: boolean;
}

export function TradePanel({ gameState, isMyTurn }: Props) {
  const { offers } = useTradeStore();
  const isTradePhase = gameState.turn.phase === GamePhase.DrawAndTrade;

  return (
    <div className="trade-panel">
      <h3 className="trade-header">Trade & Donate</h3>

      <div className="trade-feed">
        {offers.length === 0 && (
          <div className="trade-empty">
            {isTradePhase
              ? 'No trade offers yet. Propose one below!'
              : 'Trading happens during Phase 2.'}
          </div>
        )}
        {offers.map((offer) => (
          <TradeOfferCard
            key={offer.id}
            offer={offer}
            myId={gameState.myId}
            players={[
              { id: gameState.myId, name: 'You' },
              ...gameState.opponents.map((o) => ({ id: o.id, name: o.name })),
            ]}
          />
        ))}
      </div>

      {isTradePhase && (
        <TradeOfferForm
          gameState={gameState}
          isMyTurn={isMyTurn}
        />
      )}
    </div>
  );
}
