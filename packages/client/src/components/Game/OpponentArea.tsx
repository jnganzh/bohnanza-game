import type { PublicPlayerState } from '@bohnanza/shared';
import { BEAN_VARIETIES } from '@bohnanza/shared';
import './OpponentArea.css';

interface Props {
  player: PublicPlayerState;
  isActive: boolean;
}

export function OpponentArea({ player, isActive }: Props) {
  return (
    <div className={`opponent-area ${isActive ? 'active' : ''} ${!player.connected ? 'disconnected' : ''}`}>
      <div className="opp-left">
        <div className="opp-name-row">
          <span className="opp-name">{player.name}</span>
          {!player.connected && <span className="dc-badge">DC</span>}
        </div>
        <div className="opp-stats">
          <span className="opp-stat">🃏 {player.handCount}</span>
          <span className="opp-stat gold">🪙 {player.goldCoins}</span>
          {player.pendingPlantingCount > 0 && (
            <span className="opp-stat pending">📦 {player.pendingPlantingCount}</span>
          )}
        </div>
      </div>
      <div className="opp-fields">
        {player.fields.map((field, i) => (
          <div
            key={i}
            className={`opp-field ${field.beanType ? 'has-bean' : 'empty-opp-field'}`}
          >
            <span className="opp-field-tag">F{i + 1}</span>
            {field.beanType ? (
              <div className="opp-field-content">
                <span className="opp-field-emoji">
                  {BEAN_VARIETIES[field.beanType].emoji}
                </span>
                <span className="opp-field-count">{field.cards.length}</span>
              </div>
            ) : (
              <div className="opp-field-content">
                <span className="opp-field-empty-icon">🌱</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
