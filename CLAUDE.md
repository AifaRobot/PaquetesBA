# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PaquetesBA — a mobile package delivery platform for clients, drivers, and admins. The stack is:
- **Backend**: NestJS 11 + Fastify + Prisma 7 + PostgreSQL
- **Mobile**: React Native (Expo SDK 52) + Expo Router (file-based) + Zustand + TanStack Query
- **Real-time**: Socket.IO WebSocket gateway for live GPS tracking
- **Storage**: Cloudinary for delivery proof photos and signatures
- **Infrastructure**: Docker Compose with `dev` and `prod` profiles

## Commands

### Docker (recommended)
```bash
# Obtener IP local primero (Windows: ipconfig | findstr "IPv4")
HOST_IP=192.168.1.100 docker compose --profile dev up --build
HOST_IP=192.168.1.100 docker compose --profile prod up --build
```

### Backend (`cd backend`)
```bash
npm run start:dev    # watch mode
npm run start:prod   # production (node dist/main)
npm run build        # compile TypeScript
npm run lint         # ESLint --fix
npm run test         # jest unit tests
npm run test:e2e     # jest e2e tests
```

### Mobile (`cd frontend`)
```bash
npx expo start           # Metro bundler + QR para Expo Go
npx expo start --web     # probar en navegador (web)
npx expo start --android # lanzar en emulador Android
npx expo start --ios     # lanzar en simulador iOS
npx expo run:android     # build nativo Android
npx expo run:ios         # build nativo iOS
```

### Prisma (`cd backend`)
```bash
npx prisma migrate dev       # crear y aplicar nueva migración
npx prisma migrate deploy    # aplicar migraciones pendientes (producción)
npx prisma generate          # regenerar cliente tras cambios en schema
npx prisma studio            # abrir UI de base de datos
```

## Architecture

### Backend Module Structure

Modules: `auth`, `users`, `drivers`, `orders`, `zones`, `rates`, `tracking`, `notifications`, `payments`, `reports`. Each has `controller`, `service`, `module`, and `dto/` files.

**Global middleware** registered in `main.ts`:
- `ResponseWrapperInterceptor` — wraps every response body as `{ data: <payload> }`
- `OptionalJwtInterceptor` — validates JWT on any request that includes `Authorization: Bearer <token>` (throws 401 on invalid/expired tokens)
- `ClassSerializerInterceptor` — enforces `@Expose()` on response DTOs (`excludeExtraneousValues: true`)
- `GlobalHttpExceptionFilter` — normalizes error responses as `{ error: { message, status, path, timestamp } }`
- `ValidationPipe` — strips unknown fields (`whitelist: true`), rejects them (`forbidNonWhitelisted`), auto-transforms to DTO types

**Auth pattern**: `JwtAuthGuard` (`src/auth/jwt-auth.guard.ts`) applied per-controller. JWT payload is `{ sub: userId, email, phone, role, firstName }`. `role` is `CLIENT | DRIVER | ADMIN`. Child modules must NOT import `JwtModule` — `AuthModule` registers it globally (`@Global()`).

**Role-based access**: `RolesGuard` (`src/common/guards/roles.guard.ts`) reads `@Roles('ADMIN')` decorator and checks `req.user.role`. Used alongside `JwtAuthGuard`: `@UseGuards(JwtAuthGuard, RolesGuard)`.

**REQUEST-scoped services**: `OrdersService` uses `@Injectable({ scope: Scope.REQUEST })` and injects `@Inject(REQUEST) req: FastifyRequest` to access `req.user.sub` as the authenticated user ID.

**WebSocket gateway**: `TrackingGateway` (`src/tracking/tracking.gateway.ts`) uses Socket.IO at namespace `/tracking`. JWT auth is verified on `handleConnection` via `socket.handshake.auth.token`. Rooms: `order:<orderId>` for clients tracking a shipment, `fleet:admin` for admin fleet view.

### Key Backend Files

| File | Purpose |
|------|---------|
| `src/prisma.service.ts` | Prisma client; fallback DB URL points to `127.0.0.1:5432/paquetesba` |
| `src/common/pagination.ts` | `prismaPaginate(model, options, query)` helper + `PaginationQueryDto` |
| `src/common/cloudinary.ts` | `uploadImageBuffer()` for images, `uploadRawBuffer()` for PDFs/documents |
| `src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` param decorator → `req.user` |
| `src/common/decorators/roles.decorator.ts` | `@Roles('ADMIN')` metadata decorator |
| `src/common/guards/roles.guard.ts` | Checks `req.user.role` against `@Roles()` metadata |
| `src/tracking/tracking.gateway.ts` | WebSocket gateway — driver location fanout to order rooms |
| `src/tracking/tracking.service.ts` | Location throttle (5s per driver), DB location updates |
| `src/orders/orders.service.ts` | Full order lifecycle — REQUEST-scoped, generates tracking codes `PBA-YYYY-XXXXXX` |
| `src/orders/orders.controller.ts` | `POST :id/deliver` reads multipart via `req.parts()` (not `@Body()`), uploads to Cloudinary, proof photo is optional |

### Database Schema

- `User` — unified model with `role: CLIENT | DRIVER | ADMIN`, `status: ACTIVE | SUSPENDED`
- `User` ↔ `DriverProfile` (one-to-one) — vehicle, license, GPS coords, online status
- `User` ↔ `Address` (one-to-many) — saved addresses for clients
- `Zone` ↔ `DriverProfile` (one-to-many) — driver assigned to coverage zone
- `Zone` ↔ `Rate` (one-to-many) — pricing rules per zone + package size + package type
- `User (client)` ↔ `Order` (one-to-many, `clientId`)
- `User (driver)` ↔ `Order` (one-to-many, `driverId`)
- `Order` ↔ `OrderStatusHistory` (one-to-many) — audit trail of every status change
- `Order` ↔ `Payment` (one-to-one)
- `User` ↔ `Notification` (one-to-many)

Prisma client is generated into `src/generated/prisma/` (not `node_modules`). After any schema change, run `npx prisma generate`.

**Shipment status flow**: `PENDING → CONFIRMED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED` (or `FAILED` / `CANCELLED` at any point)

**Tracking code format**: `PBA-{year}-{6 hex chars}` (e.g. `PBA-2026-A3F9C1`). Public endpoint `GET /orders/track/:trackingCode` requires no auth.

### Mobile Architecture (`frontend/`)

**HTTP client**: `src/api/client.ts` — Axios instance with interceptors:
- Auto-attaches `Authorization: Bearer <token>` from `expo-secure-store` key `session`
- On 401, deletes session from SecureStore (auth store listener handles navigation reset)
- All backend responses return `{ data: ... }` — access as `res.data.data`

**Auth state**: `src/store/auth.store.ts` — Zustand store. Session stored in `expo-secure-store` as `{ access_token, user }`. Call `useAuthStore()` to access `session`, `login`, `registerClient`, `registerDriver`, `logout`, `hydrate`.

**Navigation**: **Expo Router** (file-based routing). The `app/` directory mirrors the navigation structure:
- `app/(auth)/` — Login, RegisterClient, RegisterDriver
- `app/(client)/` — Home, Track, Order detail, History, Profile (BottomTabs)
- `app/(driver)/` — Available orders, ActiveDelivery, DeliveryConfirm, History, Profile (BottomTabs)
- `app/(admin)/` — Dashboard, FleetMap, Orders, OrderDetail, OrderCreate, Drivers, Users, Zones, Rates, Reports (Drawer)

Role-based routing is handled in `app/_layout.tsx` which checks `session.user.role` after `hydrate()` and redirects accordingly.

**Real-time tracking**: `src/services/socket.service.ts` — Socket.IO client singleton. Connects to `EXPO_PUBLIC_WS_URL/tracking` with JWT in `auth.token`. Store updates via `src/store/tracking.store.ts` (Zustand).

**Background GPS** (driver): `expo-task-manager` + `expo-location` with `startLocationUpdatesAsync()`. Background task calls `PATCH /drivers/me/location`. Foreground uses WebSocket emit `driver:location`. **Not supported on web** — guard with `Platform.OS !== 'web'` before calling any `expo-location` API.

**Key frontend utility files**:

| File | Purpose |
|------|---------|
| `src/api/client.ts` | Axios HTTP client with JWT interceptor |
| `src/api/orders.ts` | Order API calls; `confirmDelivery` sends multipart FormData |
| `src/store/auth.store.ts` | Zustand auth session store |
| `src/store/tracking.store.ts` | Zustand GPS tracking state |
| `src/services/socket.service.ts` | Socket.IO singleton for real-time tracking |
| `src/lib/alerts.ts` | Cross-platform alert helpers: `confirmAlert`, `infoAlert`, `errorAlert`, `successAlert` |
| `src/lib/toast.ts` | Toast singleton — `toast.success/error/info()` callable without hooks |
| `src/data/argentina.ts` | Static province/city data for address forms |

**Cross-platform alerts**: Never use `Alert.alert` directly. Use the helpers from `src/lib/alerts.ts`:
- `errorAlert(title, message?)` — `toast.error` on web, `Alert.alert` on native
- `successAlert(title, message?, onOk?)` — `toast.success` on web, `Alert.alert` on native
- `infoAlert(title, message?)` — `toast.info` on web, `Alert.alert` on native
- `confirmAlert(title, message, onConfirm, confirmLabel?)` — `window.confirm` on web, `Alert.alert` on native

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://admin:admin123@127.0.0.1:5432/paquetesba
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
PORT=8000
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Mobile (`frontend/.env`)
```
# Reemplazar con IP local de la máquina que corre Docker
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api
EXPO_PUBLIC_WS_URL=http://192.168.1.100:8000
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-key
```
