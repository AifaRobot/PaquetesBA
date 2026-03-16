# PaquetesBA

Plataforma móvil de envío y seguimiento de paquetes en tiempo real. Conecta clientes que necesitan enviar paquetes con repartidores disponibles en su zona, con seguimiento GPS en vivo y confirmación digital de entrega.

<p align="center">
  <img src="readme/images/presentation-1.png" width="30%" />
  <img src="readme/images/presentation-2.png" width="22%" />
  <img src="readme/images/presentation-3.png" width="30%" />
</p>

---

## Descripción general

PaquetesBA tiene tres roles diferenciados:

1. **Clientes** — solicitan envíos con origen, destino y tipo de paquete, hacen seguimiento en tiempo real y reciben notificaciones push en cada cambio de estado.
2. **Repartidores** — ven los pedidos disponibles en su zona, los aceptan, actualizan el estado durante la entrega y confirman con firma digital y foto.
3. **Administradores** — gestionan usuarios, monitorean toda la flota en un mapa en vivo, asignan pedidos manualmente y consultan reportes y estadísticas.

---

## Flujo de la aplicación

### 1. Creación y asignación de un pedido

```
CLIENTE                         BACKEND                        REPARTIDOR
  |                                |                                |
  |── POST /orders ───────────────>|                                |
  |   (origen, destino, paquete)   |── calcula precio por zona      |
  |                                |── crea orden PENDING           |
  |<── { trackingCode, precio } ───|── notifica repartidores        |
  |                                |   de la zona                   |
  |                                |                                |
  |                                |<── POST /orders/:id/accept ────|
  |                                |── orden pasa a CONFIRMED       |
  |<── push notification ──────────|── notifica al cliente          |
```

### 2. Ciclo de vida del pedido

```
PENDING ──► CONFIRMED ──► PICKED_UP ──► IN_TRANSIT ──► OUT_FOR_DELIVERY ──► DELIVERED
                                                                          └──► FAILED
              │ (en cualquier punto)
              └──────────────────────────────────────────────────────────────► CANCELLED
```

Cada transición queda registrada en `OrderStatusHistory` con timestamp. El cliente recibe una notificación push en cada cambio.

### 3. Tracking GPS en tiempo real

```
REPARTIDOR (app)                BACKEND                       CLIENTE (app)
     |                             |                               |
     |── WS: driver:location ─────>|                               |
     |   { orderId, lat, lng }     |── throttle 5s por driver      |
     |                             |── guarda en DriverProfile      |
     |                             |── fanout a room order:<id> ──>|
     |                             |                               |── actualiza mapa
```

El repartidor emite su posición cada 5 segundos vía WebSocket. En segundo plano (app cerrada) usa `expo-task-manager` + `PATCH /drivers/me/location`.

### 4. Confirmación de entrega

```
REPARTIDOR                      BACKEND                        CLOUDINARY
     |                             |                               |
     |── POST /orders/:id/deliver ─|                               |
     |   multipart:                |── valida firma obligatoria     |
     |   • signature (required)    |── sube archivos ─────────────>|
     |   • photo (optional)        |                               |── URLs permanentes
     |                             |<──────────────────────────────|
     |                             |── orden → DELIVERED           |
     |                             |── guarda URLs en Order        |
     |<── { order: DELIVERED } ────|── notifica al cliente         |
```

### 5. Navegación por rol

Al iniciar la app, `_layout.tsx` hidrata la sesión desde `SecureStore` y redirige según el rol del JWT:

```
App inicia
    │
    ├── sin sesión ──────────────────────────► (auth)/login
    │
    ├── role: CLIENT ────────────────────────► (client)/home      [BottomTabs]
    │
    ├── role: DRIVER ────────────────────────► (driver)/orders    [BottomTabs]
    │
    └── role: ADMIN ─────────────────────────► (admin)/dashboard  [Drawer]
```

---

## Tecnologías utilizadas

### Backend

| Tecnología | Versión | Por qué se usa |
|---|---|---|
| **NestJS** | 11 | Framework Node.js modular con inyección de dependencias. Ideal para APIs REST estructuradas con múltiples roles y servicios. |
| **Fastify** | — | Adaptador HTTP de NestJS. Más rápido que Express, con soporte nativo para multipart/form-data (fotos, firmas). |
| **Prisma** | 7 | ORM con tipado fuerte generado desde el schema. Simplifica migraciones y queries sobre el modelo de pedidos. |
| **PostgreSQL** | 16 | Base de datos relacional. Maneja el modelo central: usuarios, pedidos, historial de estados, pagos, notificaciones. |
| **Socket.IO** | 4 | WebSocket para tracking GPS en tiempo real. Clientes se suscriben a rooms por `orderId`; repartidores emiten su posición cada 5 segundos. |
| **JWT + bcrypt** | — | Autenticación sin estado con roles (`CLIENT`, `DRIVER`, `ADMIN`) embebidos en el token. |
| **Cloudinary** | — | Almacenamiento de fotos de entrega, firmas digitales y avatares de usuario. |

### Mobile

| Tecnología | Versión | Por qué se usa |
|---|---|---|
| **Expo** | SDK 52 | Framework React Native con acceso declarativo a GPS, cámara, notificaciones push y SecureStore sin configuración nativa manual. |
| **React Native** | 0.76 | Base de la app nativa para iOS y Android. |
| **Expo Router** | 4 | Navegación file-based por rol: BottomTabs (cliente/repartidor) y Drawer (admin). Carpeta `app/` refleja la estructura de rutas. |
| **Zustand** | 5 | Estado global liviano para sesión de auth y datos de tracking GPS. |
| **TanStack Query** | 5 | Fetching, caching y sincronización de datos del servidor. Maneja loading, error y refetch automático. |
| **react-native-maps** | — | Mapa nativo con Google Maps SDK. Muestra la posición del repartidor en tiempo real y el trayecto de entrega. |
| **socket.io-client** | 4 | Conecta al gateway de tracking del backend para recibir actualizaciones GPS en vivo. |
| **expo-location** | — | GPS en primer y segundo plano para repartidores activos. |
| **expo-notifications** | — | Push notifications via Firebase FCM (Android) y APNs (iOS). |
| **expo-secure-store** | — | Almacenamiento seguro del token JWT en el dispositivo. |
| **react-native-signature-canvas** | — | Captura de firma digital para confirmar entregas. |

### Infraestructura

| Tecnología | Por qué se usa |
|---|---|
| **Docker Compose** | Orquesta PostgreSQL y el backend con perfiles `dev` y `prod`. El Metro bundler de Expo también puede correr en Docker para centralizar el entorno. |
| **EAS Build** | Para los builds finales de la app (`.apk` / `.ipa`), se usa Expo Application Services que compila en la nube sin necesitar macOS local. |

---

## Arquitectura general

```
[ App móvil (Expo) ]
        |
        |── REST/HTTPS ──→ [ NestJS Backend :8000 ]
        |                          |
        |── WebSocket ──→ [ TrackingGateway /tracking ]
                                   |
                    ┌──────────────┼──────────────┐
                    |              |               |
              PostgreSQL      Cloudinary     Firebase FCM
             (via Prisma)   (fotos/firmas)  (push notifs)
```

Todas las respuestas del backend se envuelven en `{ data: ... }`. Los errores retornan `{ error: { message, status, path, timestamp } }`.

---

## Cómo correr el proyecto

### Con Docker (recomendado)

**1. Obtener la IP local de tu máquina:**
```bash
# Windows
ipconfig | findstr "IPv4"

# Mac / Linux
ifconfig | grep "inet "
```

**2. Configurar la IP en el archivo `.env` raíz:**

Docker Compose lee automáticamente el archivo `.env` de la raíz del proyecto. Editá ese archivo con tu IP:
```bash
# .env  (raíz del proyecto)
HOST_IP=192.168.X.X   # reemplazar con tu IP local
```

> Si cambiás de red (Wi-Fi, cable, etc.) solo actualizás este valor.

**3. Configurar las variables de entorno del mobile:**
```bash
# frontend/.env
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000/api
EXPO_PUBLIC_WS_URL=http://TU_IP_LOCAL:8000
```

**4. Levantar los servicios:**
```bash
docker compose --profile dev up --build
```

Esto levanta PostgreSQL, el backend NestJS y el Metro bundler de Expo. El Metro bundler muestra un QR en los logs.

**4. Conectar el dispositivo:**
- Instalar **Expo Go** en el celular (iOS/Android)
- El celular debe estar en la **misma red Wi-Fi** que la máquina
- Escanear el QR que aparece en los logs del contenedor `dev-frontend`

---

### Sin Docker

**Backend:**
```bash
cd backend
cp .env.example .env   # completar con tus valores
npx prisma migrate dev --name init
npm run start:dev
```

**Mobile:**
```bash
cd frontend
cp .env.example .env   # completar con tu IP
npx expo start         # Expo Go en celular
npx expo start --web   # probar en navegador (web)
```

---

## Variables de entorno

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://admin:admin123@127.0.0.1:5432/paquetesba
JWT_SECRET=un_secreto_largo_y_seguro
JWT_EXPIRES_IN=7d
PORT=8000
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Mobile (`frontend/.env`)

```env
# Usar la IP local de la máquina que corre el backend (no localhost)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api
EXPO_PUBLIC_WS_URL=http://192.168.1.100:8000
EXPO_PUBLIC_GOOGLE_MAPS_KEY=...
```

> **Por qué no `localhost`:** el dispositivo móvil físico no puede resolver `localhost` del contenedor Docker. Debe usarse la IP de la máquina en la red local.

---

## Modelo de datos principal

```
User (role: CLIENT | DRIVER | ADMIN)
 ├── DriverProfile          (1:1) — vehículo, GPS actual, estado online
 ├── Address[]              (1:N) — direcciones guardadas del cliente
 ├── Order[] (clientId)     (1:N) — pedidos solicitados
 ├── Order[] (driverId)     (1:N) — pedidos asignados al repartidor
 └── Notification[]         (1:N)

Order
 ├── OrderStatusHistory[]   (1:N) — auditoría de cada cambio de estado
 ├── Payment                (1:1)
 └── Zone                   (N:1) — zona de cobertura

Zone
 └── Rate[]                 (1:N) — tarifas por tamaño + tipo de paquete
```

**Estados de un pedido:** `PENDING → CONFIRMED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED`
(o `FAILED` / `CANCELLED` en cualquier punto)

**Código de seguimiento:** formato `PBA-{año}-{6 caracteres hex}` (ej: `PBA-2026-A3F9C1`). Accesible públicamente sin autenticación en `GET /api/orders/track/:trackingCode`.

---

## Pantallas de la aplicación

### Clientes

| Home | Rastrear | Historial | Perfil |
|:----:|:--------:|:---------:|:------:|
| ![Home](readme/images/client-image-1.png) | ![Rastrear](readme/images/client-image-2.png) | ![Historial](readme/images/client-image-3.png) | ![Perfil](readme/images/client-image-4.png) |
| Pedidos activos y acceso rápido a nuevo envío | Búsqueda por código de seguimiento | Lista filtrable de todos los pedidos | Datos personales y configuración de cuenta |

### Repartidores

| Pedidos Disponibles | Entrega Activa | Historial | Perfil |
|:-------------------:|:--------------:|:---------:|:------:|
| ![Disponibles](readme/images/driver-image-1.png) | ![Entrega activa](readme/images/driver-image-2.png) | ![Historial](readme/images/driver-image-3.png) | ![Perfil](readme/images/driver-image-4.png) |
| Toggle online/offline y lista de pedidos en zona | Detalle del pedido activo con confirmación de entrega | Estadísticas y pedidos anteriores | Datos personales, vehículo y métricas |

### Administradores

| Dashboard | Pedidos | Repartidores | Usuarios |
|:---------:|:-------:|:------------:|:--------:|
| ![Dashboard](readme/images/admin-image-1.png) | ![Pedidos](readme/images/admin-image-2.png) | ![Repartidores](readme/images/admin-image-3.png) | ![Usuarios](readme/images/admin-image-4.png) |
| KPIs del día y pedidos recientes | Lista completa con filtros por estado | Gestión de repartidores online/offline | Gestión de clientes registrados |

| Zonas | Tarifas | Reportes |
|:-----:|:-------:|:--------:|
| ![Zonas](readme/images/admin-image-5.png) | ![Tarifas](readme/images/admin-image-6.png) | ![Reportes](readme/images/admin-image-7.png) |
| CRUD de zonas de cobertura | Precios por zona, tamaño y tipo | KPIs generales y rendimiento por repartidor |

---

## API — Endpoints principales

```
POST   /api/auth/register/client          Registro de cliente
POST   /api/auth/register/driver          Registro de repartidor (+ datos de vehículo)
POST   /api/auth/login                    Login (email o teléfono + contraseña)
GET    /api/auth/me                       Perfil del usuario autenticado

GET    /api/orders/track/:trackingCode    Tracking público (sin auth)
POST   /api/orders                        Crear pedido [CLIENT]
GET    /api/orders                        Listar pedidos (filtrado por rol automáticamente)
PATCH  /api/orders/:id/status             Actualizar estado [DRIVER/ADMIN]
POST   /api/orders/:id/accept             Aceptar pedido [DRIVER]
POST   /api/orders/:id/deliver            Confirmar entrega — multipart: firma (req) + foto (opt) [DRIVER]
PATCH  /api/orders/:id/assign             Asignar repartidor manualmente [ADMIN]

PATCH  /api/drivers/me/location           Actualizar posición GPS [DRIVER]
POST   /api/drivers/me/online             Ponerse online [DRIVER]
POST   /api/drivers/me/offline            Ponerse offline [DRIVER]

GET    /api/tracking/:orderId             Última posición conocida del repartidor [AUTH]
GET    /api/tracking/drivers/fleet        Posición de toda la flota [ADMIN]

GET    /api/reports/summary               KPIs generales [ADMIN]
GET    /api/zones                         Zonas activas [PUBLIC]
GET    /api/rates/estimate                Estimar precio de envío [PUBLIC]
```

---

## WebSocket — Eventos de tracking

Namespace: `/tracking`. Autenticación por `socket.handshake.auth.token`.

| Evento (cliente → servidor) | Descripción |
|---|---|
| `join:order` `{ orderId }` | Suscribirse a updates de un pedido |
| `join:fleet` | Suscribirse a toda la flota (solo ADMIN) |
| `driver:location` `{ orderId, lat, lng, heading }` | Repartidor emite su posición |

| Evento (servidor → cliente) | Descripción |
|---|---|
| `order:location` `{ lat, lng, heading, updatedAt }` | Nueva posición del repartidor |
| `order:status` `{ status, updatedAt }` | Cambio de estado del pedido |
| `fleet:update` `{ driverId, lat, lng }` | Posición actualizada en la vista de flota |
| `fleet:snapshot` `[...]` | Snapshot inicial de toda la flota al suscribirse |

---

## Comandos útiles

```bash
# Migraciones
cd backend && npx prisma migrate dev --name <nombre>
cd backend && npx prisma studio

# Compilación backend
cd backend && npm run build

# Probar mobile en web (sin dispositivo físico)
cd frontend && npx expo start --web

# Build móvil con EAS (nube)
cd frontend && eas build --platform android --profile preview
cd frontend && eas build --platform ios --profile preview

# Tests backend
cd backend && npm run test
cd backend && npm run test:e2e
```
