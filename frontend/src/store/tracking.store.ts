import { create } from 'zustand';

import type { WsDriverLocation, WsFleetDriver } from '@/src/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriverLocationState {
  lat: number;
  lng: number;
  heading?: number;
}

// ─── State shape ──────────────────────────────────────────────────────────────

interface TrackingState {
  /**
   * The most recent location received for the driver that is delivering the
   * order currently being tracked (CLIENT perspective).
   */
  driverLocation: DriverLocationState | null;

  /**
   * Map of driverId → last known location, used in the admin fleet map.
   */
  fleetLocations: Map<string, DriverLocationState>;

  // ─ Actions ─────────────────────────────────────────────────────────────────

  /** Update or set the active-delivery driver location. */
  setDriverLocation: (location: WsDriverLocation) => void;

  /** Upsert one driver's position in the fleet map. */
  setFleetLocation: (driver: WsFleetDriver | WsDriverLocation) => void;

  /** Seed the fleet map from a full snapshot (admin only). */
  setFleetSnapshot: (drivers: WsFleetDriver[]) => void;

  /** Clear all tracking state (e.g. on logout). */
  clearTracking: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTrackingStore = create<TrackingState>((set) => ({
  driverLocation: null,
  fleetLocations: new Map(),

  setDriverLocation: (location: WsDriverLocation) => {
    set({
      driverLocation: {
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
      },
    });
  },

  setFleetLocation: (driver: WsFleetDriver | WsDriverLocation) => {
    set((state) => {
      const driverId =
        'driverId' in driver ? driver.driverId : (driver as WsDriverLocation).driverId;
      const next = new Map(state.fleetLocations);
      next.set(driverId, {
        lat: driver.lat,
        lng: driver.lng,
        heading: 'heading' in driver ? driver.heading : undefined,
      });
      return { fleetLocations: next };
    });
  },

  setFleetSnapshot: (drivers: WsFleetDriver[]) => {
    if (!Array.isArray(drivers)) return;
    const next = new Map<string, DriverLocationState>();
    for (const d of drivers) {
      next.set(d.driverId, { lat: d.lat, lng: d.lng });
    }
    set({ fleetLocations: next });
  },

  clearTracking: () => {
    set({ driverLocation: null, fleetLocations: new Map() });
  },
}));
