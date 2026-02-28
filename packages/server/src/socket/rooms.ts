import type { Room } from '@bohnanza/shared';
import { nanoid } from 'nanoid';

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(hostId: string, hostName: string, socketId: string, maxPlayers: number): Room {
    const room: Room = {
      id: nanoid(6),
      hostPlayerId: hostId,
      players: [{ id: hostId, name: hostName, socketId }],
      maxPlayers: Math.min(5, Math.max(2, maxPlayers)),
      status: 'waiting',
    };
    this.rooms.set(room.id, room);
    return room;
  }

  joinRoom(
    roomId: string,
    playerId: string,
    playerName: string,
    socketId: string
  ): Room | string {
    const room = this.rooms.get(roomId);
    if (!room) return 'Room not found';
    if (room.status !== 'waiting') return 'Game already in progress';
    if (room.players.length >= room.maxPlayers) return 'Room is full';
    if (room.players.some((p) => p.id === playerId)) return 'Already in room';

    room.players.push({ id: playerId, name: playerName, socketId });
    return room;
  }

  leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    // If host left, assign new host
    if (room.hostPlayerId === playerId) {
      room.hostPlayerId = room.players[0].id;
    }

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomList(): { id: string; playerCount: number; maxPlayers: number; hostName: string }[] {
    return Array.from(this.rooms.values())
      .filter((r) => r.status === 'waiting')
      .map((r) => ({
        id: r.id,
        playerCount: r.players.length,
        maxPlayers: r.maxPlayers,
        hostName: r.players.find((p) => p.id === r.hostPlayerId)?.name || 'Unknown',
      }));
  }

  setStatus(roomId: string, status: Room['status']): void {
    const room = this.rooms.get(roomId);
    if (room) room.status = status;
  }

  findRoomBySocket(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.socketId === socketId)) {
        return room;
      }
    }
    return undefined;
  }

  findPlayerBySocket(socketId: string): { room: Room; playerId: string } | undefined {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (player) {
        return { room, playerId: player.id };
      }
    }
    return undefined;
  }

  updateSocketId(roomId: string, playerId: string, newSocketId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) player.socketId = newSocketId;
    }
  }
}

export const roomManager = new RoomManager();
