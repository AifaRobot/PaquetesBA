import { api } from './client';
import type {
  DeliveriesReport,
  DriversReport,
  OrdersByStatusReport,
  ReportSummary,
} from '@/src/types';

/**
 * High-level platform summary (ADMIN only).
 * Includes total orders, active drivers, revenue, etc.
 */
export async function getSummary(): Promise<ReportSummary> {
  return api.get<ReportSummary>('/reports/summary');
}

/**
 * Order counts broken down by shipment status (ADMIN only).
 */
export async function getOrdersByStatus(): Promise<OrdersByStatusReport[]> {
  return api.get<OrdersByStatusReport[]>('/reports/orders-by-status');
}

/**
 * Daily delivery metrics for a date range (ADMIN only).
 * @param from ISO date string e.g. "2026-01-01"
 * @param to   ISO date string e.g. "2026-03-11"
 */
export async function getDeliveries(
  from: string,
  to: string,
): Promise<DeliveriesReport[]> {
  const params = new URLSearchParams({ from, to });
  return api.get<DeliveriesReport[]>(`/reports/deliveries?${params.toString()}`);
}

/**
 * Per-driver performance stats (ADMIN only).
 */
export async function getDriverStats(): Promise<DriversReport[]> {
  return api.get<DriversReport[]>('/reports/drivers');
}
