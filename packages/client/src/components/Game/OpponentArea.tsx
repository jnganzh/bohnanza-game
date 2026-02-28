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
        <span className="opponent-name">{player.name}</span>
        {isActive && <span className="active-badge">Active</span>}
        {!player.connected && <span className="dc-badge">DC</span>}
      </div>
      <div className="opponent-info">
        <span className="opponent-stat" title="Cards in hand">
          Hand: {player.handCount}
        </span>
        <span className="opponent-stat" title="Gold coins">
          Gold: {player.goldCoins}
        </span>
        {player.pendingPlantingCount > 0 && (
          <span className="opponent-stat pending">
            Pending: {player.pendingPlantingCount}
          </span>
        )}
      </div>
      <div className="opponent-fields">
        {player.fields.map((field, i) => (
          <div key={i} className="opponent-field-mini">
            {field.beanType ? (
              <>
                <div
                  className="field-dot"
                  style={{ backgroundColor: BEAN_VARIETIES[field.beanType].color }}
                />
                <span>{field.cards.length}</span>
              </>
            ) : (
              <span className="empty-field-mini">--</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
