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

- `plastico`: botellas de bebida PET
- `lata`: latas de bebida de aluminio
- `vidrio`: botellas y frascos de vidrio
- `papel`: papel (apto si está limpio y seco)
- `carton`: cajas y envases de cartón (aptos si están limpios y secos)

Los elementos fuera del alcance o que no puedan clasificarse con suficiente claridad utilizan `desconocido`. Una lata de conserva o una botella de un plástico distinto de PET no corresponde a las categorías objetivo. El papel y el cartón contaminados siguen siendo reconocidos dentro de su categoría, con estado `no_apto` cuando corresponda.

**Limitación visual:** una fotografía no siempre permite confirmar que un envase sea de PET o aluminio. El prompt solicita una identificación orientativa basada en evidencias visuales y devuelve `desconocido` cuando no hay indicios suficientes. Esta restricción por prompt no reemplaza una evaluación con imágenes etiquetadas.

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

## Acceso desde el celular (Chrome y APK)

Las dos modalidades siguen disponibles con el backend ejecutándose en la computadora:

- **Chrome del celular:** levantar el frontend con `ionic serve --external` o `ng serve --host 0.0.0.0`; entrar a `http://IP_DE_LA_PC:4200` desde el celular; en el login, **Configurar servidor** con `http://IP_DE_LA_PC:3000`. En desarrollo se aceptan por CORS las IP privadas de la red local en los puertos 4200 y 8100.
- **APK instalado:** en **Configurar servidor** ingresar `http://IP_DE_LA_PC:3000`; también sirve `adb reverse tcp:3000 tcp:3000` usando USB si se deja el valor predeterminado.

El backend ya escucha en `0.0.0.0:3000`; la computadora y el celular deben estar en la misma red, con el firewall permitiendo el puerto 3000. En producción, las IP locales no se autorizan automáticamente por CORS: se agrega el origen exacto con `CORS_ALLOWED_ORIGINS=http://IP_DE_LA_PC:4200`. El acceso local HTTP es solo para desarrollo.

**Google Maps:** el mapa integrado usa una clave diferente de la conexión al backend. Si esa clave únicamente autoriza `http://localhost:4200/*`, puede fallar desde Chrome por IP o desde el APK. En ese caso la lista de puntos verdes sigue disponible, y en Android la aplicación ofrece abrir el punto en Google Maps mediante un enlace sin API key.
