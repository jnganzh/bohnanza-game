import type { GameState } from '@bohnanza/shared';
import { GamePhase } from '@bohnanza/shared';
import type { GameSession } from '../game/GameSession.js';
import { BotStrategy } from './BotStrategy.js';
import type { BotDecision } from './BotStrategy.js';

const BOT_NAMES = ['Bot Alice', 'Bot Bob', 'Bot Carol', 'Bot Dave', 'Bot Eve'];
let botNameIndex = 0;

export function getNextBotName(): string {
  const name = BOT_NAMES[botNameIndex % BOT_NAMES.length];
  botNameIndex++;
  return name;
}

export function resetBotNameIndex(): void {
  botNameIndex = 0;
}

export class BotPlayer {
  readonly id: string;
  readonly name: string;
  readonly isBot = true;
  private session: GameSession | null = null;
  private acting = false;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  attachSession(session: GameSession): void {
    this.session = session;
  }

  detach(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.session = null;
  }

  /**
   * Called by GameSession after each state change.
   * Checks if the bot needs to act and schedules actions.
   */
  onStateChanged(state: GameState): void {
    if (!this.session || this.acting) return;
    if (state.turn.phase === (GamePhase.GameOver as string)) return;

    const isActive = state.turn.activePlayerId === this.id;
    const hasPending = state.players.find(p => p.id === this.id)?.pendingPlanting.length ?? 0;

    // Bot acts when it's the active player, or when it has pending beans to plant
    const shouldAct =
      (isActive && state.turn.phase !== GamePhase.GameOver) ||
      (state.turn.phase === GamePhase.PlantTradedBeans && hasPending > 0);

    if (!shouldAct) return;

    const decisions = BotStrategy.decide(state, this.id);
    if (decisions.length === 0) return;

    this.executeDecisions(decisions);
  }

  private executeDecisions(decisions: BotDecision[]): void {
    if (!this.session || decisions.length === 0) return;

    this.acting = true;
    this.executeNext(decisions, 0);
  }

  private executeNext(decisions: BotDecision[], index: number): void {
    if (index >= decisions.length || !this.session) {
      this.acting = false;
      return;
    }

    const delay = 800 + Math.random() * 1200; // 0.8-2s delay
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      if (!this.session) {
        this.acting = false;
        return;
      }

      const decision = decisions[index];
      try {
        this.executeDecision(decision);
      } catch (e) {
        console.error(`[BotPlayer ${this.name}] Error executing decision:`, decision, e);
      }

      // After executing, the session will call onStateChanged again
      // which handles the next phase. Only continue sequential decisions
      // within the same phase (like harvest then plant).
      // For cross-phase transitions, onStateChanged will re-trigger.
      const nextIdx = index + 1;
      if (nextIdx < decisions.length) {
        // Small additional delay for sequential actions in same phase
        this.executeNext(decisions, nextIdx);
      } else {
        this.acting = false;
      }
    }, delay);
  }

  private executeDecision(decision: BotDecision): void {
    if (!this.session) return;

    switch (decision.action) {
      case 'plant':
        this.session.handlePlantBean(this.id, decision.fieldIndex);
        break;
      case 'skip-second-plant':
        this.session.handleSkipSecondPlant(this.id);
        break;
      case 'harvest':
        this.session.handleHarvestField(this.id, decision.fieldIndex);
        break;
      case 'keep-face-up-card':
        this.session.handleKeepFaceUpCard(this.id, decision.cardId);
        break;
      case 'end-trading':
        this.session.handleEndTrading(this.id);
        break;
      case 'plant-pending':
        this.session.handlePlantPendingBean(this.id, decision.cardId, decision.fieldIndex);
        break;
      case 'buy-third-field':
        this.session.handleBuyThirdField(this.id);
        break;
      case 'donate-face-up':
        // Donate cards the bot doesn't want
        for (const cardId of decision.cardIds) {
          this.session.handleProposeDonation(this.id, {
            cards: { fromHand: [], fromFaceUp: [cardId] },
          });
        }
        break;
    }
  }
}
