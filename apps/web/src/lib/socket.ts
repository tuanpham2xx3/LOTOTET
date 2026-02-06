import { io, Socket } from 'socket.io-client';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from '@lototet/shared';

/**
 * Type-safe Socket.IO client
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Default API URL (fallback when load balancer is unavailable)
const DEFAULT_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api1.iceteadev.site';

// Admin URL for load balancer queries
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://adminapi.iceteadev.site';

// Current socket instance and its URL
let socket: TypedSocket | null = null;
let currentSocketUrl: string = DEFAULT_SOCKET_URL;

/**
 * Get or create socket connection to a specific URL
 */
export function getSocket(url?: string): TypedSocket {
    const targetUrl = url || currentSocketUrl;

    // If URL changed, disconnect old socket
    if (socket && currentSocketUrl !== targetUrl) {
        socket.disconnect();
        socket = null;
    }

    if (!socket) {
        currentSocketUrl = targetUrl;
        socket = io(targetUrl, {
            transports: ['websocket'],
            autoConnect: false,
        }) as TypedSocket;
    }
    return socket;
}

/**
 * Connect to socket server
 */
export function connectSocket(url?: string): TypedSocket {
    const s = getSocket(url);
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

/**
 * Reset socket (force new connection on next connect)
 */
export function resetSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// ==========================================
// Load Balancer Functions
// ==========================================

/**
 * Get best server URL for creating a new room
 * Calls Admin load balancer API
 */
export async function getServerForNewRoom(): Promise<string> {
    try {
        const response = await fetch(`${ADMIN_URL}/loadbalancer/server`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.serverUrl) {
                console.log(`[LoadBalancer] Best server for new room: ${data.serverUrl}`);
                return data.serverUrl;
            }
        }
    } catch (error) {
        console.warn('[LoadBalancer] Failed to get best server, using default:', error);
    }
    return DEFAULT_SOCKET_URL;
}

/**
 * Get server URL for joining an existing room
 * Calls Admin load balancer API
 */
export async function getServerForRoom(roomId: string): Promise<string> {
    try {
        const response = await fetch(`${ADMIN_URL}/loadbalancer/room/${roomId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.serverUrl) {
                console.log(`[LoadBalancer] Room ${roomId} is on server: ${data.serverUrl}`);
                return data.serverUrl;
            }
        }
    } catch (error) {
        console.warn(`[LoadBalancer] Failed to get server for room ${roomId}, using default:`, error);
    }
    return DEFAULT_SOCKET_URL;
}

/**
 * Connect to the best server for creating a new room
 */
export async function connectToServerForNewRoom(): Promise<TypedSocket> {
    const serverUrl = await getServerForNewRoom();
    return connectSocket(serverUrl);
}

/**
 * Connect to the server hosting a specific room
 */
export async function connectToServerForRoom(roomId: string): Promise<TypedSocket> {
    const serverUrl = await getServerForRoom(roomId);
    return connectSocket(serverUrl);
}
