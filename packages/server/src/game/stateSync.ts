import type { GameState, ClientGameState } from '@bohnanza/shared';
import type { PublicPlayerState } from '@bohnanza/shared';

export function filterForPlayer(
  state: GameState,
  playerId: string
): ClientGameState {
  const me = state.players.find((p) => p.id === playerId)!;
  const opponents: PublicPlayerState[] = state.players
    .filter((p) => p.id !== playerId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      handCount: p.hand.length,
      fields: p.fields,
      goldCoins: p.goldCoins,
      hasThirdField: p.hasThirdField,
      pendingPlantingCount: p.pendingPlanting.length,
      connected: p.connected,
    }));

  return {
    roomId: state.roomId,
    myId: playerId,
    myHand: me.hand,
    myFields: me.fields,
    myGoldCoins: me.goldCoins,
    myPendingPlanting: me.pendingPlanting,
    myHasThirdField: me.hasThirdField,
    opponents,
    turn: state.turn,
    deckCount: state.deck.length,
    discardPileCount: state.discardPile.length,
    discardPileTopCard:
      state.discardPile.length > 0
        ? state.discardPile[state.discardPile.length - 1]
        : null,
    deckExhaustionCount: state.deckExhaustionCount,
    gameLog: state.gameLog.slice(-20),
  };
}
