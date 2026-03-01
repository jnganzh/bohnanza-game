import type { TradeOffer, BeanType, BeanCard as BeanCardType } from '@bohnanza/shared';
import { TradeOfferStatus, TradeOfferType, BEAN_VARIETIES } from '@bohnanza/shared';
import { socket } from '../../socket/socketClient.js';
import './TradeOfferCard.css';

interface Props {
  offer: TradeOffer;
  myId: string;
  players: { id: string; name: string }[];
  myHand: BeanCardType[];
}

function BeanTag({ beanType, className }: { beanType: BeanType; className?: string }) {
  const variety = BEAN_VARIETIES[beanType];
  if (!variety) {
    return <span className={`offer-card-tag ${className || ''}`}>{beanType}</span>;
  }
  return (
    <span className={`offer-card-tag ${className || ''}`}>
      {variety.emoji} {variety.displayName}
    </span>
  );
}

function canFulfillRequest(hand: BeanCardType[], requestedTypes: BeanType[]): boolean {
  // Check if the hand contains enough of each requested type
  const handCopy = hand.map((c) => c.type);
  for (const beanType of requestedTypes) {
    const idx = handCopy.indexOf(beanType);
    if (idx === -1) return false;
    handCopy.splice(idx, 1);
  }
  return true;
}

export function TradeOfferCard({ offer, myId, players, myHand }: Props) {
  const fromName =
    players.find((p) => p.id === offer.fromPlayerId)?.name || '?';
  const toName = offer.toPlayerId
    ? players.find((p) => p.id === offer.toPlayerId)?.name || '?'
    : 'anyone';

  const isPending = offer.status === TradeOfferStatus.Pending;
  const isTargetedAtMe =
    offer.toPlayerId === null || offer.toPlayerId === myId;
  const isNotFromMe = offer.fromPlayerId !== myId;

  // Check if I can fulfill the trade's requested beans
  const iCanFulfill =
    offer.type === TradeOfferType.Donation ||
    offer.requesting.fromHand.length === 0 ||
    canFulfillRequest(myHand, offer.requesting.fromHand);

  const canAccept =
    isPending && isNotFromMe && isTargetedAtMe && iCanFulfill;
  const canReject =
    isPending && isNotFromMe && isTargetedAtMe;
  const canWithdraw = isPending && offer.fromPlayerId === myId;

  const statusLabel: Record<string, string> = {
    pending: '',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
  };

  // Show a warning if trade requests beans I don't have
  const showMissingWarning =
    isPending &&
    isNotFromMe &&
    isTargetedAtMe &&
    !iCanFulfill &&
    offer.type === TradeOfferType.Trade;

  return (
    <div className={`trade-offer-card ${offer.status}`}>
      <div className="offer-header">
        <span className="offer-from">{fromName}</span>
        <span className="offer-arrow">
          {offer.type === TradeOfferType.Donation ? 'donates to' : 'trades with'}
        </span>
        <span className="offer-to">{toName}</span>
      </div>

      <div className="offer-details">
        <div className="offer-side">
          <span className="side-label">Offers:</span>
          {offer.offering.fromHand.map((t, i) => (
            <BeanTag key={`h${i}`} beanType={t} />
          ))}
          {offer.offering.fromFaceUp.length > 0 && (
            <span className="offer-card-tag face-up">
              +{offer.offering.fromFaceUp.length} face-up
            </span>
          )}
        </div>
        {offer.type === TradeOfferType.Trade &&
          offer.requesting.fromHand.length > 0 && (
            <div className="offer-side">
              <span className="side-label">Wants:</span>
              {offer.requesting.fromHand.map((t, i) => (
                <BeanTag key={`r${i}`} beanType={t} className="want" />
              ))}
            </div>
          )}
      </div>

      {showMissingWarning && (
        <div className="offer-warning">
          You don't have the requested beans
        </div>
      )}

      {isPending && (canAccept || canReject || canWithdraw) && (
        <div className="offer-actions">
          {canAccept && (
            <button
              className="offer-btn accept"
              onClick={() =>
                socket.emit('game:accept-trade', { tradeId: offer.id })
              }
            >
              Accept
            </button>
          )}
          {canReject && (
            <button
              className="offer-btn reject"
              onClick={() =>
                socket.emit('game:reject-trade', { tradeId: offer.id })
              }
            >
              Reject
            </button>
          )}
          {canWithdraw && (
            <button
              className="offer-btn withdraw"
              onClick={() =>
                socket.emit('game:withdraw-trade', { tradeId: offer.id })
              }
            >
              Withdraw
            </button>
          )}
        </div>
      )}

      {offer.status !== TradeOfferStatus.Pending && (
        <div className={`offer-status ${offer.status}`}>
          {statusLabel[offer.status]}
        </div>
      )}
    </div>
  );
}
