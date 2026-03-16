import { Platform } from 'react-native';

import { api } from './client';
import type {
  AssignDriverRequest,
  CreateOrderRequest,
  Order,
  OrderAddress,
  OrdersQuery,
  PaginatedResponse,
  RateOrderRequest,
  UpdateOrderStatusRequest,
} from '@/src/types';

/** Map flat backend fields back to nested pickupAddress / deliveryAddress. */
function mapOrder(raw: any): Order {
  const pickupAddress: OrderAddress = {
    street: raw.originStreet,
    streetNumber: raw.originStreetNumber,
    apartment: raw.originApartment ?? null,
    city: raw.originCity,
    province: raw.originProvince ?? '',
    postalCode: raw.originPostalCode ?? '',
    lat: raw.originLat,
    lng: raw.originLng,
    contactName: raw.originContact ?? null,
    contactPhone: raw.originPhone ?? null,
  };
  const deliveryAddress: OrderAddress = {
    street: raw.destStreet,
    streetNumber: raw.destStreetNumber,
    apartment: raw.destApartment ?? null,
    city: raw.destCity,
    province: raw.destProvince ?? '',
    postalCode: raw.destPostalCode ?? '',
    lat: raw.destLat,
    lng: raw.destLng,
    contactName: raw.destContact ?? null,
    contactPhone: raw.destPhone ?? null,
  };
  return {
    ...raw,
    pickupAddress,
    deliveryAddress,
    price: raw.finalPrice ?? raw.estimatedPrice ?? null,
  };
}

/**
 * Public tracking — no auth required.
 * Resolves an order by its PBA-YYYY-XXXXXX tracking code.
 */
export async function trackOrder(trackingCode: string): Promise<Order> {
  const raw = await api.get<any>(`/orders/track/${trackingCode}`);
  return mapOrder(raw);
}

/**
 * Create a new order (CLIENT only).
 */
export async function createOrder(payload: CreateOrderRequest): Promise<Order> {
  const { pickupAddress: o, deliveryAddress: d, ...rest } = payload;
  const body = {
    ...rest,
    originStreet: o.street,
    originStreetNumber: o.streetNumber,
    originApartment: o.apartment ?? null,
    originCity: o.city,
    originProvince: o.province,
    originPostalCode: o.postalCode,
    originLat: o.lat,
    originLng: o.lng,
    originContact: o.contactName ?? null,
    originPhone: o.contactPhone ?? null,
    destStreet: d.street,
    destStreetNumber: d.streetNumber,
    destApartment: d.apartment ?? null,
    destCity: d.city,
    destProvince: d.province,
    destPostalCode: d.postalCode,
    destLat: d.lat,
    destLng: d.lng,
    destContact: d.contactName ?? null,
    destPhone: d.contactPhone ?? null,
  };
  const raw = await api.post<any>('/orders', body);
  return mapOrder(raw);
}

/**
 * List orders.
 * - CLIENT: own orders
 * - DRIVER: assigned orders
 * - ADMIN: all orders
 */
export async function getOrders(
  query?: OrdersQuery,
): Promise<PaginatedResponse<Order>> {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.page !== undefined) params.set('page', String(query.page));
  if (query?.limit !== undefined) params.set('limit', String(query.limit));
  const qs = params.toString();
  const res = await api.get<PaginatedResponse<any>>(`/orders${qs ? `?${qs}` : ''}`);
  return { ...res, items: res.items.map(mapOrder) };
}

/**
 * Get full details of a single order by ID.
 */
export async function getOrder(id: string): Promise<Order> {
  const raw = await api.get<any>(`/orders/${id}`);
  return mapOrder(raw);
}

/**
 * Assign a driver to an order (ADMIN only).
 */
export async function assignDriver(
  orderId: string,
  payload: AssignDriverRequest,
): Promise<Order> {
  return api.patch<Order>(`/orders/${orderId}/assign`, payload);
}

/**
 * Driver accepts an assigned order.
 */
export async function acceptOrder(orderId: string): Promise<Order> {
  return api.post<Order>(`/orders/${orderId}/accept`);
}

/**
 * Driver updates the shipment status.
 */
export async function updateOrderStatus(
  orderId: string,
  payload: UpdateOrderStatusRequest,
): Promise<Order> {
  return api.patch<Order>(`/orders/${orderId}/status`, payload);
}

/**
 * Driver confirms delivery with signature + proof photo (multipart).
 * `signatureFile` and `proofPhotoFile` are React Native file objects:
 * { uri, name, type }
 */
async function uriToBlob(uri: string, type: string): Promise<Blob> {
  // data: URLs can be fetched directly; blob: URLs too
  const response = await fetch(uri);
  return response.blob();
}

export async function confirmDelivery(
  orderId: string,
  signatureFile: { uri: string; name: string; type: string },
  proofPhotoFile?: { uri: string; name: string; type: string },
): Promise<Order> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const sigBlob = await uriToBlob(signatureFile.uri, signatureFile.type);
    formData.append('signature', sigBlob, signatureFile.name);
    if (proofPhotoFile) {
      const photoBlob = await uriToBlob(proofPhotoFile.uri, proofPhotoFile.type);
      formData.append('proofPhoto', photoBlob, proofPhotoFile.name);
    }
  } else {
    // React Native FormData handles { uri, name, type } natively
    formData.append('signature', signatureFile as unknown as Blob);
    if (proofPhotoFile) {
      formData.append('proofPhoto', proofPhotoFile as unknown as Blob);
    }
  }

  return api.upload<Order>(`/orders/${orderId}/deliver`, formData);
}

/**
 * Client rates a completed order.
 */
export async function rateOrder(
  orderId: string,
  payload: RateOrderRequest,
): Promise<Order> {
  return api.post<Order>(`/orders/${orderId}/rate`, payload);
}

/**
 * Cancel a PENDING order (CLIENT only).
 */
export async function cancelOrder(orderId: string): Promise<void> {
  await api.delete<void>(`/orders/${orderId}`);
}
