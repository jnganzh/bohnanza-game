import type { Server } from 'socket.io';
import {
  GameEngine,
  TradeManager,
  GamePhase,
  isGameError,
  BeanType as BeanTypeEnum,
} from '@bohnanza/shared';
import type {
  GameState,
  GameResult,
  ClientGameState,
  BeanType,
  TradeOffer,
} from '@bohnanza/shared';
import { TradeOfferStatus, TradeOfferType } from '@bohnanza/shared';

const VALID_BEAN_TYPES = new Set<string>(Object.values(BeanTypeEnum));
import { filterForPlayer } from './stateSync.js';
import { gameSessionStore } from './GameSessionStore.js';
import { nanoid } from 'nanoid';
import type { BotPlayer } from '../bot/BotPlayer.js';

export class GameSession {
  private state: GameState;
  private io: Server;
  private roomId: string;
  private playerSockets: Map<string, string>; // playerId -> socketId
  private botPlayers: Map<string, BotPlayer> = new Map();

  constructor(
    io: Server,
    roomId: string,
    players: { id: string; name: string; socketId: string }[]
  ) {
    this.io = io;
    this.roomId = roomId;
    this.playerSockets = new Map(
      players.filter((p) => p.socketId !== '').map((p) => [p.id, p.socketId])
    );
    this.state = GameEngine.createGame(
      players.map((p) => ({ id: p.id, name: p.name })),
      roomId
    );
  }

  registerBot(bot: BotPlayer): void {
    this.botPlayers.set(bot.id, bot);
    bot.attachSession(this);
  }

  unregisterBot(botId: string): void {
    const bot = this.botPlayers.get(botId);
    if (bot) {
      bot.detach();
      this.botPlayers.delete(botId);
    }
  }

  getState(): GameState {
    return this.state;
  }

  getClientState(playerId: string): ClientGameState {
    return filterForPlayer(this.state, playerId);
  }

  updateSocketId(playerId: string, socketId: string): void {
    this.playerSockets.set(playerId, socketId);
    this.state = {
      ...this.state,
      players: this.state.players.map((p) =>
        p.id === playerId ? { ...p, connected: true } : p
      ),
    };
  }

  markDisconnected(playerId: string): void {
    this.state = {
      ...this.state,
      players: this.state.players.map((p) =>
        p.id === playerId ? { ...p, connected: false } : p
      ),
    };
  }

  handlePlantBean(playerId: string, fieldIndex: number): void {
    this.applyAction(
      GameEngine.plantFromHand(this.state, playerId, fieldIndex),
      playerId
    );
  }

  handleSkipSecondPlant(playerId: string): void {
    this.applyAction(
      GameEngine.skipSecondPlant(this.state, playerId),
      playerId
    );
  }

  handleHarvestField(playerId: string, fieldIndex: number): void {
    this.applyAction(
      GameEngine.harvestField(this.state, playerId, fieldIndex),
      playerId
    );
  }

  handleKeepFaceUpCard(playerId: string, cardId: string): void {
    this.applyAction(
      GameEngine.keepFaceUpCard(this.state, playerId, cardId),
      playerId
    );
  }

  handleProposeTrade(
    playerId: string,
    data: {
      offering: { fromHand: BeanType[]; fromFaceUp: string[] };
      requesting: { fromHand: BeanType[] };
    }
  ): void {
    // Validate that all bean types are valid enum values
    const allBeanTypes = [
      ...data.offering.fromHand,
      ...data.requesting.fromHand,
    ];
    for (const bt of allBeanTypes) {
      if (!VALID_BEAN_TYPES.has(bt)) {
        this.emitError(playerId, 'INVALID_BEAN_TYPE', `Invalid bean type: ${bt}`);
        return;
      }
    }

    const offer: TradeOffer = {
      id: nanoid(8),
      type: TradeOfferType.Trade,
      fromPlayerId: playerId,
      toPlayerId: null,
      offering: data.offering,
      requesting: { fromHand: data.requesting.fromHand, fromFaceUp: [] },
      status: TradeOfferStatus.Pending,
      rejectedByPlayerIds: [],
      timestamp: Date.now(),
    };

    const result = TradeManager.proposeTrade(this.state, offer);
    if (!isGameError(result)) {
      gameSessionStore.touch(this.roomId);
      this.state = result;
      this.io.to(this.roomId).emit('trade:new-offer', { offer });
      this.broadcastState();
    } else {
      this.emitError(playerId, result.code, result.message);
    }
  }

  handleProposeDonation(
    playerId: string,
    data: {
      cards: { fromHand: BeanType[]; fromFaceUp: string[] };
    }
  ): void {
    const offer: TradeOffer = {
      id: nanoid(8),
      type: TradeOfferType.Donation,
      fromPlayerId: playerId,
      toPlayerId: null,
      offering: data.cards,
      requesting: { fromHand: [], fromFaceUp: [] },
      status: TradeOfferStatus.Pending,
      rejectedByPlayerIds: [],
      timestamp: Date.now(),
    };

    const result = TradeManager.proposeTrade(this.state, offer);
    if (!isGameError(result)) {
      this.state = result;
      this.io.to(this.roomId).emit('trade:new-offer', { offer });
      this.broadcastState();
    } else {
      this.emitError(playerId, result.code, result.message);
    }
  }

  handleAcceptTrade(playerId: string, tradeId: string): void {
    const result = TradeManager.acceptTrade(this.state, tradeId, playerId);
    if (!isGameError(result)) {
      this.state = result;
      this.io
        .to(this.roomId)
        .emit('trade:offer-accepted', { tradeId, acceptedBy: playerId });
      this.broadcastState();
    } else {
      this.emitError(playerId, result.code, result.message);
    }
  }

  handleRejectTrade(playerId: string, tradeId: string): void {
    const result = TradeManager.rejectTrade(this.state, tradeId, playerId);
    if (!isGameError(result)) {
      this.state = result;
      this.io
        .to(this.roomId)
        .emit('trade:offer-rejected', { tradeId, rejectedBy: playerId });
      this.broadcastState();
    } else {
      this.emitError(playerId, result.code, result.message);
    }
  }

  handleWithdrawTrade(playerId: string, tradeId: string): void {
    const result = TradeManager.withdrawTrade(this.state, tradeId);
    if (!isGameError(result)) {
      this.state = result;
      this.io.to(this.roomId).emit('trade:offer-withdrawn', { tradeId });
      this.broadcastState();
    } else {
      this.emitError(playerId, result.code, result.message);
    }
  }

  handleEndTrading(playerId: string): void {
    this.applyAction(GameEngine.endTrading(this.state, playerId), playerId);
  }

  handlePlantPendingBean(
    playerId: string,
    cardId: string,
    fieldIndex: number
  ): void {
    this.applyAction(
      GameEngine.plantPendingBean(this.state, playerId, cardId, fieldIndex),
      playerId
    );
  }

  handleBuyThirdField(playerId: string): void {
    this.applyAction(GameEngine.buyThirdField(this.state, playerId), playerId);
  }

  handleForceEndGame(): void {
    this.state = GameEngine.endGame(this.state);
    const scores = GameEngine.getFinalScores(this.state);
    const winner = GameEngine.getWinner(this.state);
    this.io.to(this.roomId).emit('game:over', {
      finalScores: scores,
      winnerId: winner!.playerId,
    });
  }

  private applyAction(result: GameResult, playerId: string): void {
    if (isGameError(result)) {
      this.emitError(playerId, result.code, result.message);
      return;
    }

    gameSessionStore.touch(this.roomId);
    const previousPhase = this.state.turn.phase;
    this.state = result;

    this.broadcastState();

    if (this.state.turn.phase !== previousPhase) {
      this.io.to(this.roomId).emit('game:phase-changed', {
        phase: this.state.turn.phase,
        activePlayerId: this.state.turn.activePlayerId,
      });
    }

    if (GameEngine.checkGameEnd(this.state)) {
      const scores = GameEngine.getFinalScores(this.state);
      const winner = GameEngine.getWinner(this.state);
      this.io.to(this.roomId).emit('game:over', {
        finalScores: scores,
        winnerId: winner!.playerId,
      });
    }
  }

  broadcastState(): void {
    for (const [playerId, socketId] of this.playerSockets) {
      const clientState = filterForPlayer(this.state, playerId);
      this.io.to(socketId).emit('game:state-update', { state: clientState });
    }
    // Notify bots of state change
    this.notifyBots();
  }

  private notifyBots(): void {
    for (const bot of this.botPlayers.values()) {
      // Use setImmediate to avoid re-entrancy issues
      setImmediate(() => bot.onStateChanged(this.state));
    }
  }

  private emitError(playerId: string, code: string, message: string): void {
    const socketId = this.playerSockets.get(playerId);
    if (socketId) {
      this.io
        .to(socketId)
        .emit('game:action-error', { code, message });
    }
  }
}
