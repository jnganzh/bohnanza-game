import type { TradeOffer } from '@bohnanza/shared';
import { TradeOfferStatus, TradeOfferType } from '@bohnanza/shared';
import { socket } from '../../socket/socketClient.js';
import './TradeOfferCard.css';

interface Props {
  offer: TradeOffer;
  myId: string;
  players: { id: string; name: string }[];
}

export function TradeOfferCard({ offer, myId, players }: Props) {
  const fromName =
    players.find((p) => p.id === offer.fromPlayerId)?.name || '?';
  const toName = offer.toPlayerId
    ? players.find((p) => p.id === offer.toPlayerId)?.name || '?'
    : 'anyone';

  const isPending = offer.status === TradeOfferStatus.Pending;
  const canAccept =
    isPending &&
    offer.fromPlayerId !== myId &&
    (offer.toPlayerId === null || offer.toPlayerId === myId);
  const canReject =
    isPending &&
    offer.fromPlayerId !== myId &&
    (offer.toPlayerId === null || offer.toPlayerId === myId);
  const canWithdraw = isPending && offer.fromPlayerId === myId;

  const statusLabel: Record<string, string> = {
    pending: '',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
  };

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
            <span key={`h${i}`} className="offer-card-tag">
              {t}
            </span>
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
                <span key={`r${i}`} className="offer-card-tag want">
                  {t}
                </span>
              ))}
            </div>
          )}
      </div>

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
