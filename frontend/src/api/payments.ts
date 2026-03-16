import { api } from './client';
import type { Payment } from '@/src/types';

/**
 * Get the payment record associated with an order.
 */
export async function getPayment(orderId: string): Promise<Payment> {
  return api.get<Payment>(`/payments/${orderId}`);
}

/**
 * Confirm that a cash payment has been collected for an order.
 * Called by the driver or admin after receiving cash on delivery.
 */
export async function confirmCashPayment(orderId: string): Promise<Payment> {
  return api.post<Payment>(`/payments/${orderId}/cash`);
}
