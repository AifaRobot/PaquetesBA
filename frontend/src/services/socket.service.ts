import { io, Socket } from 'socket.io-client';

import type { WsDriverLocation, WsFleetSnapshot } from '@/src/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type DriverLocationCallback = (data: WsDriverLocation) => void;
type FleetSnapshotCallback = (data: WsFleetSnapshot) => void;

// ─── Singleton ────────────────────────────────────────────────────────────────

let socket: Socket | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Connect to the /tracking namespace.
 * Safe to call multiple times — will re-use an existing connected socket.
 */
function connect(token: string): void {
  if (socket?.connected) return;

  // Disconnect any stale socket before creating a new one
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const wsUrl = process.env.EXPO_PUBLIC_WS_URL ?? 'http://localhost:8000';

  socket = io(`${wsUrl}/tracking`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2_000,
    timeout: 10_000,
  });

  socket.on('connect', () => {
    console.log('[socket] connected — id:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected —', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connection error —', err.message);
  });
}

/**
 * Disconnect and tear down the socket.
 * Should be called on logout.
 */
function disconnect(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join the room for a specific order so the client receives driver location
 * updates for that delivery.
 */
function joinOrderRoom(orderId: string): void {
  socket?.emit('join:order', { orderId });
}

/**
 * Join the fleet room to receive all online driver positions (ADMIN only).
 */
function joinFleetRoom(): void {
  socket?.emit('join:fleet');
}

/**
 * Emit the driver's current GPS position.
 * Should be called from the foreground location watcher.
 */
function emitDriverLocation(
  lat: number,
  lng: number,
  heading?: number,
  orderId?: string,
): void {
  const payload: {
    lat: number;
    lng: number;
    heading?: number;
    orderId?: string;
  } = { lat, lng };
  if (heading !== undefined) payload.heading = heading;
  if (orderId !== undefined) payload.orderId = orderId;
  socket?.emit('driver:location', payload);
}

/**
 * Subscribe to incoming driver location updates.
 * Replaces any previously registered listener.
 */
function onDriverLocation(callback: DriverLocationCallback): void {
  socket?.off('driver:location');
  socket?.on('driver:location', callback);
}

/**
 * Subscribe to fleet snapshot events (ADMIN fleet map).
 * Replaces any previously registered listener.
 */
function onFleetSnapshot(callback: FleetSnapshotCallback): void {
  socket?.off('fleet:snapshot');
  socket?.on('fleet:snapshot', callback);
}

/**
 * Remove the driver:location listener.
 */
function offDriverLocation(): void {
  socket?.off('driver:location');
}

/**
 * Remove the fleet:snapshot listener.
 */
function offFleetSnapshot(): void {
  socket?.off('fleet:snapshot');
}

/**
 * Returns true if there is an active, connected socket.
 */
function isConnected(): boolean {
  return socket?.connected ?? false;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const socketService = {
  connect,
  disconnect,
  joinOrderRoom,
  joinFleetRoom,
  emitDriverLocation,
  onDriverLocation,
  onFleetSnapshot,
  offDriverLocation,
  offFleetSnapshot,
  isConnected,
};
