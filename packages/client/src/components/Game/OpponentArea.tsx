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
      <div className="opponent-header">
        <div className="opponent-name-row">
          <span className="opponent-name">{player.name}</span>
          {isActive && <span className="active-badge">🎯 Turn</span>}
          {!player.connected && <span className="dc-badge">DC</span>}
        </div>
        <div className="opponent-stats">
          <span className="opp-stat" title="Cards in hand">
            🃏 {player.handCount}
          </span>
          <span className="opp-stat gold" title="Gold coins">
            🪙 {player.goldCoins}
          </span>
          {player.pendingPlantingCount > 0 && (
            <span className="opp-stat pending" title="Pending planting">
              📦 {player.pendingPlantingCount}
            </span>
          )}
        </div>
      </div>
      <div className="opponent-fields">
        {player.fields.map((field, i) => (
          <div
            key={i}
            className={`opponent-field-card ${field.beanType ? '' : 'empty-field'}`}
            style={
              field.beanType
                ? ({ '--opp-field-color': BEAN_VARIETIES[field.beanType].color } as React.CSSProperties)
                : undefined
            }
          >
            {field.beanType ? (
              <>
                <span className="opp-field-emoji">
                  {BEAN_VARIETIES[field.beanType].emoji}
                </span>
                <span className="opp-field-count">{field.cards.length}</span>
                <span className="opp-field-name">
                  {BEAN_VARIETIES[field.beanType].displayName}
                </span>
              </>
            ) : (
              <span className="opp-field-empty">🌱</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
