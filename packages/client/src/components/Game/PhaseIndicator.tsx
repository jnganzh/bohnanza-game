import { GamePhase } from '@bohnanza/shared';
import type { PublicPlayerState } from '@bohnanza/shared';
import './PhaseIndicator.css';

interface Props {
  phase: GamePhase;
  activePlayerId: string;
  isMyTurn: boolean;
  deckCount: number;
  deckExhaustionCount: number;
  opponents: PublicPlayerState[];
  myId: string;
}

const PHASE_NAMES: Record<string, string> = {
  [GamePhase.PlantFromHand]: 'Phase 1: Plant Beans',
  [GamePhase.DrawAndTrade]: 'Phase 2: Draw & Trade',
  [GamePhase.PlantTradedBeans]: 'Phase 3: Plant Traded Beans',
  [GamePhase.DrawNewCards]: 'Phase 4: Draw New Cards',
  [GamePhase.GameOver]: 'Game Over',
};

export function PhaseIndicator({
  phase,
  activePlayerId,
  isMyTurn,
  deckCount,
  deckExhaustionCount,
  opponents,
  myId,
}: Props) {
  const activePlayerName = isMyTurn
    ? 'You'
    : opponents.find((o) => o.id === activePlayerId)?.name || '?';

  return (
    <div className={`phase-indicator ${isMyTurn ? 'my-turn' : ''}`}>
      <div className="phase-info">
        <span className="phase-name">{PHASE_NAMES[phase] || phase}</span>
        <span className="phase-player">
          {isMyTurn ? "Your turn" : `${activePlayerName}'s turn`}
        </span>
      </div>
      <div className="deck-status">
        Deck: {deckCount} | Reshuffled: {deckExhaustionCount}/3
      </div>
    </div>
  );
}
