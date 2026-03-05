import { create } from 'zustand';

interface RoomInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  hostName: string;
}

interface RoomPlayer {
  id: string;
  name: string;
  isBot?: boolean;
}

interface LobbyStore {
  playerName: string;
  roomId: string | null;
  rooms: RoomInfo[];
  roomPlayers: RoomPlayer[];
  maxPlayers: number;
  hostId: string | null;
  error: string | null;

  setPlayerName: (name: string) => void;
  setRoomId: (id: string | null) => void;
  setRooms: (rooms: RoomInfo[]) => void;
  setRoomPlayers: (players: RoomPlayer[], maxPlayers: number, hostId: string) => void;
  setHostId: (hostId: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  playerName: localStorage.getItem('bohnanza_player_name') || '',
  roomId: null,
  rooms: [],
  roomPlayers: [],
  maxPlayers: 5,
  hostId: null,
  error: null,

  setPlayerName: (name) => {
    localStorage.setItem('bohnanza_player_name', name);
    set({ playerName: name });
  },
  setRoomId: (id) => set({ roomId: id }),
  setRooms: (rooms) => set({ rooms }),
  setRoomPlayers: (players, maxPlayers, hostId) =>
    set({ roomPlayers: players, maxPlayers, hostId }),
  setHostId: (hostId) => set({ hostId }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      roomId: null,
      roomPlayers: [],
      maxPlayers: 5,
      hostId: null,
      error: null,
    }),
}));
