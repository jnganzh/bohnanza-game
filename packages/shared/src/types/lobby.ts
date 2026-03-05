export interface Room {
  id: string;
  hostPlayerId: string;
  players: { id: string; name: string; socketId: string; isBot?: boolean }[];
  maxPlayers: number;
  status: 'waiting' | 'in-progress' | 'finished';
}
