import type { BeanCard as BeanCardType } from '@bohnanza/shared';
import { BEAN_VARIETIES } from '@bohnanza/shared';
import './BeanCard.css';

interface Props {
  card: BeanCardType;
  selected?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  small?: boolean;
}

export function BeanCard({ card, selected, highlighted, onClick, small }: Props) {
  const variety = BEAN_VARIETIES[card.type];

  return (
    <div
      className={`bean-card ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''} ${small ? 'small' : ''} ${onClick ? 'clickable' : ''}`}
      style={{ '--bean-color': variety.color } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="bean-card-name">{variety.displayName}</div>
      <div className="bean-card-icon" style={{ backgroundColor: variety.color }}>
        {variety.displayName.charAt(0)}
      </div>
      <div className="bean-card-meter">
        {variety.beanometer.map((tier, i) => (
          <span key={i} className="tier">
            {tier.cardCount}:{tier.goldCoins}g
          </span>
        ))}
      </div>
    </div>
  );
}

export function BeanCardBack({ small }: { small?: boolean }) {
  return (
    <div className={`bean-card bean-card-back ${small ? 'small' : ''}`}>
      <div className="coin-icon">$</div>
    </div>
  );
}
