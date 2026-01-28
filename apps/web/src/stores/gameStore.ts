import { create } from 'zustand';
import type { RoomState, Player, RoomPhase, WaitingState, ChatMessage } from '@lototet/shared';
import { getSocket, connectSocket, disconnectSocket, type TypedSocket } from '@/lib/socket';

interface CurrentTurn {
    turnId: number;
    number: number;
}

interface GameStore {
    // Connection state
    socket: TypedSocket | null;
    connected: boolean;

    // Room state
    roomState: RoomState | null;
    myPlayerId: string | null;

    // Game state
    currentTurn: CurrentTurn | null;
    pendingPlayerIds: string[];

    // Actions
    connect: () => void;
    disconnect: () => void;
    setRoomState: (state: RoomState) => void;
    setMyPlayerId: (playerId: string) => void;
    setCurrentTurn: (turn: CurrentTurn) => void;
    setPendingPlayers: (ids: string[]) => void;
    reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    // Initial state
    socket: null,
    connected: false,
    roomState: null,
    myPlayerId: null,
    currentTurn: null,
    pendingPlayerIds: [],

    // Actions
    connect: () => {
        const socket = connectSocket();

        socket.on('connect', () => {
            set({ connected: true });
        });

        socket.on('disconnect', () => {
            set({ connected: false });
        });

        socket.on('room:state', (state) => {
            set({ roomState: state });

            // Auto-detect my player ID from socket ID
            const myPlayer = state.players.find((p) => p.socketId === socket.id);
            if (myPlayer) {
                set({ myPlayerId: myPlayer.id });
            }
        });

        socket.on('turn:new', (payload) => {
            set({
                currentTurn: {
                    turnId: payload.turnId,
                    number: payload.number,
                },
            });
        });

        socket.on('turn:progress', (payload) => {
            set({ pendingPlayerIds: payload.pendingPlayerIds });
        });

        // Chat message listener - dedupe by message id
        socket.on('chat:message', (message) => {
            set((state) => {
                if (!state.roomState) return state;
                // Check if message already exists (avoid duplicates)
                if (state.roomState.messages.some((m) => m.id === message.id)) {
                    return state;
                }
                return {
                    roomState: {
                        ...state.roomState,
                        messages: [...state.roomState.messages, message],
                    },
                };
            });
        });

        socket.on('error', (error) => {
            console.error('[Socket Error]', error);
        });

        set({ socket });
    },

    disconnect: () => {
        disconnectSocket();
        set({
            socket: null,
            connected: false,
            roomState: null,
            myPlayerId: null,
            currentTurn: null,
            pendingPlayerIds: [],
        });
    },

    setRoomState: (state) => set({ roomState: state }),
    setMyPlayerId: (playerId) => set({ myPlayerId: playerId }),
    setCurrentTurn: (turn) => set({ currentTurn: turn }),
    setPendingPlayers: (ids) => set({ pendingPlayerIds: ids }),

    reset: () =>
        set({
            roomState: null,
            myPlayerId: null,
            currentTurn: null,
            pendingPlayerIds: [],
        }),
}));

// Selectors
export const useSocket = () => useGameStore((state) => state.socket);
export const useConnected = () => useGameStore((state) => state.connected);
export const useRoomState = () => useGameStore((state) => state.roomState);
export const useMyPlayerId = () => useGameStore((state) => state.myPlayerId);
export const useCurrentTurn = () => useGameStore((state) => state.currentTurn);

// Computed selectors
export const usePhase = (): RoomPhase | null =>
    useGameStore((state) => state.roomState?.phase ?? null);

export const useIsHost = (): boolean =>
    useGameStore((state) => {
        const { roomState, myPlayerId } = state;
        return roomState?.hostId === myPlayerId;
    });

export const useMyPlayer = (): Player | null =>
    useGameStore((state) => {
        const { roomState, myPlayerId } = state;
        return roomState?.players.find((p) => p.id === myPlayerId) ?? null;
    });

export const usePlayers = (): Player[] =>
    useGameStore((state) => state.roomState?.players ?? []);

export const useWaitingBoard = (): WaitingState[] =>
    useGameStore((state) => state.roomState?.game?.waitingBoard ?? []);

export const useDrawnNumbers = (): number[] =>
    useGameStore((state) => state.roomState?.game?.drawnNumbers ?? []);

export const useChatMessages = (): ChatMessage[] =>
    useGameStore((state) => state.roomState?.messages ?? []);

