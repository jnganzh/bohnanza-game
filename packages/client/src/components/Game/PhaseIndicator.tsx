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

const PHASE_INFO: Record<string, { name: string; icon: string; hint: string }> = {
  [GamePhase.PlantFromHand]: { name: 'Plant Beans', icon: '🌱', hint: 'Plant 1-2 beans from your hand' },
  [GamePhase.DrawAndTrade]: { name: 'Draw & Trade', icon: '🤝', hint: 'Trade cards with other players' },
  [GamePhase.PlantTradedBeans]: { name: 'Plant Traded Beans', icon: '📦', hint: 'Plant all received beans' },
  [GamePhase.DrawNewCards]: { name: 'Draw New Cards', icon: '🃏', hint: 'Drawing cards from deck...' },
  [GamePhase.GameOver]: { name: 'Game Over', icon: '🏆', hint: '' },
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

  const info = PHASE_INFO[phase] || { name: phase, icon: '🫘', hint: '' };

  return (
    <div className={`phase-indicator ${isMyTurn ? 'my-turn' : ''}`}>
      {isMyTurn && (
        <div className="your-turn-banner">
          <span className="your-turn-icon">⭐</span>
          <span className="your-turn-text">YOUR TURN</span>
          <span className="your-turn-icon">⭐</span>
        </div>
      )}
      <div className="phase-details">
        <div className="phase-left">
          <span className="phase-badge">{info.icon} {info.name}</span>
        </div>
        <div className="phase-right">
          {isMyTurn ? (
            <span className="phase-hint">{info.hint}</span>
          ) : (
            <span className="phase-turn-info">
              Waiting for <strong>{activePlayerName}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
