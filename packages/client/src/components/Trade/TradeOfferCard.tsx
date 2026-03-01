import { useState, useEffect } from 'react';
import type { TradeOffer, BeanType, BeanCard as BeanCardType } from '@bohnanza/shared';
import { TradeOfferStatus, TradeOfferType, BEAN_VARIETIES } from '@bohnanza/shared';
import { BeanCard } from '../Cards/BeanCard.js';
import { socket } from '../../socket/socketClient.js';
import './TradeOfferCard.css';

interface Props {
  offer: TradeOffer;
  myId: string;
  players: { id: string; name: string }[];
  myHand: BeanCardType[];
  faceUpCards?: BeanCardType[];
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

const TRADE_TIMEOUT_MS = 30000; // 30 seconds

export function TradeOfferCard({ offer, myId, players, myHand, faceUpCards = [] }: Props) {
  const fromName =
    players.find((p) => p.id === offer.fromPlayerId)?.name || '?';
  const toName = offer.toPlayerId
    ? players.find((p) => p.id === offer.toPlayerId)?.name || '?'
    : 'anyone';

  // Trade timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (offer.status !== TradeOfferStatus.Pending) return;
    const update = () => {
      const elapsed = Date.now() - offer.timestamp;
      const remaining = Math.max(0, TRADE_TIMEOUT_MS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0 && offer.fromPlayerId === myId) {
        // Auto-withdraw if I'm the proposer
        socket.emit('game:withdraw-trade', { tradeId: offer.id });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [offer.status, offer.timestamp, offer.fromPlayerId, offer.id, myId]);

  // Determine color class: mine=green, incoming=blue, completed=grey
  const isFromMe = offer.fromPlayerId === myId;
  const colorClass = offer.status !== TradeOfferStatus.Pending
    ? 'offer-completed'
    : isFromMe
    ? 'offer-mine'
    : 'offer-incoming';

  const isPending = offer.status === TradeOfferStatus.Pending;
  const isTargetedAtMe =
    offer.toPlayerId === null || offer.toPlayerId === myId;
  const isNotFromMe = offer.fromPlayerId !== myId;
  const iAlreadyRejected = (offer.rejectedByPlayerIds ?? []).includes(myId);

  // Check if I can fulfill the trade's requested beans
  const iCanFulfill =
    offer.type === TradeOfferType.Donation ||
    offer.requesting.fromHand.length === 0 ||
    canFulfillRequest(myHand, offer.requesting.fromHand);

  const canAccept =
    isPending && isNotFromMe && isTargetedAtMe && iCanFulfill && !iAlreadyRejected;
  const canReject =
    isPending && isNotFromMe && isTargetedAtMe && !iAlreadyRejected;
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
    <div className={`trade-offer-card ${offer.status} ${colorClass}`}>
      <div className="offer-header">
        <span className="offer-from">{fromName}</span>
        <span className="offer-arrow">
          {offer.type === TradeOfferType.Donation
            ? (offer.toPlayerId ? 'donates to' : '🎉 donates — grab it!')
            : 'trades with'}
        </span>
        {(offer.type !== TradeOfferType.Donation || offer.toPlayerId) && (
          <span className="offer-to">{toName}</span>
        )}
        {isPending && timeLeft !== null && (
          <span className={`offer-timer ${timeLeft < 10000 ? 'urgent' : ''}`}>
            {Math.ceil(timeLeft / 1000)}s
          </span>
        )}
      </div>

      <div className="offer-details">
        <div className="offer-side give-side">
          <span className="side-label">🎁 Gives:</span>
          {offer.offering.fromHand.map((t, i) => (
            <BeanTag key={`h${i}`} beanType={t} />
          ))}
          {offer.offering.fromFaceUp.map((cardId, i) => {
            const card = faceUpCards.find((c) => c.id === cardId);
            return card ? (
              <div key={`fu${i}`} className="face-up-card-wrapper">
                <BeanCard card={card} small />
                <span className="face-up-badge">FACE UP</span>
              </div>
            ) : (
              <span key={`fu${i}`} className="offer-card-tag face-up">
                face-up 🃏
              </span>
            );
          })}
        </div>
        {offer.type === TradeOfferType.Trade &&
          offer.requesting.fromHand.length > 0 && (
            <div className="offer-side want-side">
              <span className="side-label">🔄 Wants:</span>
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
