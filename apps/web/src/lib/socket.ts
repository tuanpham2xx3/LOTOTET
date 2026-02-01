import { io, Socket } from 'socket.io-client';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData,
} from '@lototet/shared';

/**
 * Type-safe Socket.IO client
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://ltapi.iceteadev.site';

let socket: TypedSocket | null = null;

/**
 * Get or create socket connection
 */
export function getSocket(): TypedSocket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: false,
        }) as TypedSocket;
    }
    return socket;
}

/**
 * Connect to socket server
 */
export function connectSocket(): TypedSocket {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    return s;
}

/**
 * Disconnect from socket server
 */
export function disconnectSocket(): void {
    if (socket?.connected) {
        socket.disconnect();
    }
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
    return socket?.connected ?? false;
}
