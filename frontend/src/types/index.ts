// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  CLIENT = 'CLIENT',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum ShipmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// OrderStatus is an alias kept for compatibility
export type OrderStatus = ShipmentStatus;

export enum PackageSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  EXTRA_LARGE = 'EXTRA_LARGE',
}

export enum PackageType {
  STANDARD = 'STANDARD',
  FRAGILE = 'FRAGILE',
  REFRIGERATED = 'REFRIGERATED',
  DOCUMENT = 'DOCUMENT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum NotifType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_ASSIGNED = 'ORDER_ASSIGNED',
  ORDER_PICKED_UP = 'ORDER_PICKED_UP',
  ORDER_IN_TRANSIT = 'ORDER_IN_TRANSIT',
  ORDER_OUT_FOR_DELIVERY = 'ORDER_OUT_FOR_DELIVERY',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_FAILED = 'ORDER_FAILED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  DRIVER_ONLINE = 'DRIVER_ONLINE',
  DRIVER_OFFLINE = 'DRIVER_OFFLINE',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  GENERAL = 'GENERAL',
}

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  fcmToken: string | null;
  createdAt: string;
  updatedAt: string;
  driverProfile?: DriverProfile;
  addresses?: Address[];
}

export interface DriverProfile {
  id: string;
  userId: string;
  vehicleType: string;
  licensePlate: string;
  licenseNumber: string;
  isOnline: boolean;
  currentLat: number | null;
  currentLng: number | null;
  zoneId: string | null;
  zone?: Zone;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  streetNumber: string;
  apartment: string | null;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface Rate {
  id: string;
  zoneId: string;
  zone?: Zone;
  packageSize: PackageSize;
  packageType: PackageType;
  basePrice: number;
  pricePerKm: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderAddress {
  street: string;
  streetNumber: string;
  apartment?: string | null;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  contactName?: string | null;
  contactPhone?: string | null;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: ShipmentStatus;
  notes: string | null;
  changedAt: string;
}

export interface Order {
  id: string;
  trackingCode: string;
  clientId: string;
  client?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  driverId: string | null;
  driver?: Pick<User, 'id' | 'firstName' | 'lastName' | 'phone'> & {
    driverProfile?: Pick<DriverProfile, 'vehicleType' | 'licensePlate'>;
  };
  pickupAddress: OrderAddress;
  deliveryAddress: OrderAddress;
  packageSize: PackageSize;
  packageType: PackageType;
  status: ShipmentStatus;
  notes: string | null;
  estimatedValue: number | null;
  price: number | null;
  distanceKm: number | null;
  proofPhotoUrl: string | null;
  signatureUrl: string | null;
  rating: number | null;
  ratingComment: string | null;
  ratedAt: string | null;
  deliveredAt: string | null;
  statusHistory?: OrderStatusHistory[];
  payment?: Payment;
  zoneId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  method: string | null;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  phone: string;
  role: UserRole;
  firstName: string;
}

export interface AuthSession {
  access_token: string;
  user: User;
}

// ─── API request types ────────────────────────────────────────────────────────

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterClientRequest {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterDriverRequest {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  vehicleType: string;
  licensePlate: string;
  licenseNumber: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface CreateAddressRequest {
  label: string;
  street: string;
  streetNumber: string;
  apartment?: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
}

export interface CreateOrderRequest {
  pickupAddress: OrderAddress;
  deliveryAddress: OrderAddress;
  packageSize: PackageSize;
  packageType: PackageType;
  notes?: string;
  estimatedValue?: number;
}

export interface UpdateOrderStatusRequest {
  status: 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
  notes?: string;
}

export interface AssignDriverRequest {
  driverId: string;
}

export interface RateOrderRequest {
  rating: number;
  comment?: string;
}

export interface UpdateDriverProfileRequest {
  vehicleType?: string;
  licensePlate?: string;
  licenseNumber?: string;
  zoneId?: string;
}

export interface UpdateLocationRequest {
  lat: number;
  lng: number;
}

export interface CreateZoneRequest {
  name: string;
  description?: string;
}

export interface UpdateZoneRequest {
  name?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateRateRequest {
  zoneId: string;
  packageSize: PackageSize;
  packageType: PackageType;
  basePrice: number;
  pricePerKm: number;
  isActive?: boolean;
}

export interface UpdateRateRequest extends Partial<CreateRateRequest> {}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RateEstimateResponse {
  zoneId: string;
  packageSize: PackageSize;
  packageType: PackageType;
  distanceKm: number;
  basePrice: number;
  pricePerKm: number;
  totalPrice: number;
}

export interface DriverStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageRating: number | null;
  totalEarnings: number;
  ordersThisMonth: number;
}

// Reports
export interface ReportSummary {
  totalOrders: number;
  ordersToday: number;
  activeDrivers: number;
  totalDrivers: number;
  totalClients: number;
  revenue: number;
  revenueToday: number;
}

export interface OrdersByStatusReport {
  status: ShipmentStatus;
  count: number;
}

export interface DeliveriesReport {
  date: string;
  delivered: number;
  failed: number;
  total: number;
}

export interface DriversReport {
  driverId: string;
  driverName: string;
  deliveries: number;
  successRate: number;
  averageRating: number | null;
}

// ─── Pagination query ─────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface OrdersQuery extends PaginationQuery {
  status?: ShipmentStatus;
}

export interface DriversQuery extends PaginationQuery {
  zoneId?: string;
  isOnline?: boolean;
}

// ─── WebSocket types ──────────────────────────────────────────────────────────

export interface WsDriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  orderId?: string;
}

export interface WsFleetDriver {
  driverId: string;
  lat: number;
  lng: number;
  isOnline: boolean;
}

export interface WsFleetSnapshot {
  drivers: WsFleetDriver[];
}
