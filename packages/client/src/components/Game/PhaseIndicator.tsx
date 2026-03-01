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

const PHASE_INFO: Record<string, { name: string; icon: string }> = {
  [GamePhase.PlantFromHand]: { name: 'Plant Beans', icon: '🌱' },
  [GamePhase.DrawAndTrade]: { name: 'Draw & Trade', icon: '🤝' },
  [GamePhase.PlantTradedBeans]: { name: 'Plant Traded Beans', icon: '📦' },
  [GamePhase.DrawNewCards]: { name: 'Draw New Cards', icon: '🃏' },
  [GamePhase.GameOver]: { name: 'Game Over', icon: '🏆' },
};

export function PhaseIndicator({
  phase,
  activePlayerId,
  isMyTurn,
  opponents,
}: Props) {
  const activePlayerName = isMyTurn
    ? 'You'
    : opponents.find((o) => o.id === activePlayerId)?.name || '?';

  const info = PHASE_INFO[phase] || { name: phase, icon: '🫘' };

  return (
    <div className={`phase-indicator ${isMyTurn ? 'my-turn' : ''}`}>
      <div className="phase-left">
        <span className="phase-badge">{info.icon} {info.name}</span>
      </div>
      <div className="phase-right">
        <span className="phase-turn">
          {info.icon} <strong>{info.name}</strong> · {isMyTurn ? 'Your turn' : `${activePlayerName}'s turn`}
        </span>
      </div>
    </div>
  );
}
