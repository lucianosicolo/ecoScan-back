# EcoScan Backend

Backend de la prueba de concepto EcoScan, desarrollado con NestJS y TypeScript.

Se encarga de autenticación, usuarios, análisis de imágenes mediante Gemini, persistencia del historial y almacenamiento local de las imágenes utilizadas en cada escaneo.

## Funcionalidades

- registro e inicio de sesión con JWT
- aislamiento de datos por usuario autenticado
- edición y eliminación del propio usuario
- análisis de imágenes mediante Gemini
- normalización de categorías y estados
- historial de escaneos por usuario
- almacenamiento de imágenes en `uploads/scans`
- eliminación del archivo asociado al borrar un escaneo
- reintentos ante errores temporales del servicio de IA
- validación global de DTOs

## Categorías soportadas

EcoScan contempla cinco categorías objetivo:

- `plastico`: botellas plásticas
- `lata`: latas metálicas de bebidas o alimentos
- `vidrio`: botellas y frascos de vidrio
- `papel`: papel limpio
- `carton`: cartón limpio

Los elementos fuera del alcance o no identificables utilizan `desconocido`.

## Requisitos

- Node.js
- MySQL
- una API key válida de Gemini

## Configuración

Copiar `.env.example` como `.env` y completar los valores necesarios.

Variables utilizadas:

```text
DB_HOST
DB_PORT
DB_USERNAME
DB_PASSWORD
DB_NAME
JWT_SECRET
GEMINI_API_KEY
GEMINI_MODEL
```

## Instalación

```bash
npm install
```

## Ejecución

Modo desarrollo:

```bash
npm run start:dev
```

El backend escucha en:

```text
http://localhost:3000
```

## Health

```http
GET /
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "ecoscan-back",
  "version": "1.0.0"
}
```

## Endpoints principales

### Auth

```text
POST /auth/register
POST /auth/login
```

### Scan

Requiere JWT.

```text
POST /scan
```

El archivo debe enviarse en el campo multipart `image`.

### Historial

Requiere JWT.

```text
GET    /historial
GET    /historial/:id
DELETE /historial/:id
```

### Usuario

Requiere JWT y solo permite operar sobre el usuario autenticado.

```text
GET    /users/:id
PUT    /users/:id
DELETE /users/:id
```

## Pruebas

```bash
npm test
npm run test:e2e
```

## Build

```bash
npm run build
```

## Integración con Android

Durante la demostración, el frontend Android utiliza el backend local mediante:

```bash
adb reverse tcp:3000 tcp:3000
```

## Versión

EcoScan Backend 1.0.0
