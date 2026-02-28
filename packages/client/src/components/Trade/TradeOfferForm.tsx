import { useState } from 'react';
import type { ClientGameState, BeanType } from '@bohnanza/shared';
import { socket } from '../../socket/socketClient.js';
import { useTradeStore } from '../../stores/useTradeStore.js';
import './TradeOfferForm.css';

interface Props {
  gameState: ClientGameState;
  isMyTurn: boolean;
}

export function TradeOfferForm({ gameState, isMyTurn }: Props) {
  const {
    selectedHandCards,
    selectedFaceUpCards,
    clearSelection,
  } = useTradeStore();

  const [targetPlayer, setTargetPlayer] = useState<string>('');
  const [wantedBeans, setWantedBeans] = useState<string>('');
  const [isDonation, setIsDonation] = useState(false);

  const hasSelection =
    selectedHandCards.length > 0 || selectedFaceUpCards.length > 0;

  const handlePropose = () => {
    if (!hasSelection) return;

    const offeringFromHand = selectedHandCards
      .map((id) => gameState.myHand.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => c!.type);

    if (isDonation) {
      if (!targetPlayer) return;
      socket.emit('game:propose-donation', {
        toPlayerId: targetPlayer,
        cards: {
          fromHand: offeringFromHand,
          fromFaceUp: selectedFaceUpCards,
        },
      });
    } else {
      const wantedTypes = wantedBeans
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as BeanType[];

      socket.emit('game:propose-trade', {
        toPlayerId: targetPlayer || null,
        offering: {
          fromHand: offeringFromHand,
          fromFaceUp: selectedFaceUpCards,
        },
        requesting: { fromHand: wantedTypes },
      });
    }

    clearSelection();
    setWantedBeans('');
    setTargetPlayer('');
  };

  return (
    <div className="trade-form">
      <div className="form-section">
        <label>
          <input
            type="checkbox"
            checked={isDonation}
            onChange={(e) => setIsDonation(e.target.checked)}
          />
          Donation (no return)
        </label>
      </div>

      <div className="form-section">
        <label>To:</label>
        <select
          value={targetPlayer}
          onChange={(e) => setTargetPlayer(e.target.value)}
        >
          <option value="">{isDonation ? 'Select player' : 'Open offer'}</option>
          {gameState.opponents.map((opp) => (
            <option key={opp.id} value={opp.id}>
              {opp.name}
            </option>
          ))}
        </select>
      </div>

      {!isDonation && (
        <div className="form-section">
          <label>Want (comma-separated bean types):</label>
          <input
            type="text"
            placeholder="e.g. red, blue"
            value={wantedBeans}
            onChange={(e) => setWantedBeans(e.target.value)}
          />
        </div>
      )}

      <div className="form-section">
        <small>
          {selectedHandCards.length > 0 &&
            `${selectedHandCards.length} hand card(s) selected. `}
          {selectedFaceUpCards.length > 0 &&
            `${selectedFaceUpCards.length} face-up card(s) selected. `}
          {!hasSelection && 'Select cards from your hand or face-up cards above.'}
        </small>
      </div>

      <button
        className="propose-btn"
        onClick={handlePropose}
        disabled={!hasSelection || (isDonation && !targetPlayer)}
      >
        {isDonation ? 'Donate' : 'Propose Trade'}
      </button>
    </div>
  );
}
