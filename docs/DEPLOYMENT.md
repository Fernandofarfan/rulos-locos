# Guía de Deployment & Arquitectura en la Nube - Rulos Locos

**Entorno de Producción**: Vercel (Front + Back) + Supabase (Database)

## 🏗️ Arquitectura de Producción v3.0

Rulos Locos v3.0.0 dejó atrás el entorno monolítico con SQLite local y mutó a una arquitectura Cloud-Native:
- **Frontend**: SPA construida en React 19 + Vite. Se sirve de forma estática y ultrarrápida a través de la **CDN global de Vercel**.
- **Backend API**: Construido en Node.js + Express. Se despliega como una **Serverless Function** (`api/index.js`) gestionada por Vercel.
- **Base de Datos**: Instancia de **PostgreSQL** alojada en **Supabase**, utilizando su pooler de conexiones nativas (`pgbouncer=true`) para manejar concurrentemente las miles de invocaciones a la API.

---

## 1. Despliegue en Vercel

### Configuración Pre-Deploy
En el dashboard de Vercel (`Project -> Settings -> Environment Variables`), deben cargarse estrictamente las siguientes variables:

```env
# URL del Transaction Pooler de Supabase (Port 6543)
DATABASE_URL="postgresql://user:password@aws-host.pooler.supabase.com:6543/postgres?pgbouncer=true"

# JSON Web Token
JWT_SECRET="un_secreto_imposible_de_adivinar"

# Generar con openssl rand -hex 32; conservar y respaldar la clave
ENCRYPTION_KEY="<64 caracteres hexadecimales>"
CRON_SECRET="<secreto aleatorio>"

# Google Auth (debe coincidir VITE_ y GOOGLE_)
VITE_GOOGLE_CLIENT_ID="tu_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_ID="tu_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu_google_client_secret"

# URLs
CLIENT_URL="https://rulos-locos.vercel.app"

# Opcional: Redis TLS de Upstash para caché y rate limiting distribuido
REDIS_URL="rediss://default:<password>@<upstash-host>:6379"

# Opcional: token de api.estadisticasbcra.com, utilizado como respaldo del BCRA oficial
BCRA_TOKEN="<token-opcional>"
```

### Migraciones, secretos y cron

Con un respaldo y `DATABASE_URL` apuntando a la base de destino, aplicar las migraciones con `npx prisma migrate deploy`. No usar `prisma db push` como sustituto. Antes de migrar secretos existentes, configurar y respaldar `ENCRYPTION_KEY`: cambiarla luego impide descifrarlos. Ejecutar `npm run secrets:migrate -- --dry-run` para revisar los conteos y `npm run secrets:migrate` para cifrarlos; el comando es idempotente.

En GitHub, configurar los dos secrets del repositorio `CRON_SECRET` (mismo valor configurado en Vercel) y `APP_URL` (URL pública de la aplicación, sin `/api`). El workflow `.github/workflows/cron-tick.yml` invoca `/api/cron/tick` cada cinco minutos y también permite ejecución manual; GitHub puede retrasar los horarios. No se añade un cron frecuente a Vercel Hobby.

Para limitar solicitudes de forma compartida entre instancias serverless, crear un Redis en Upstash y configurar su URL TLS `REDIS_URL` en Vercel. Sin Redis, los límites se almacenan por proceso y no son globales. Si Redis está configurado pero falla, el limitador rechaza solicitudes en vez de aplicar límites locales inconsistentes. `BCRA_TOKEN` es opcional y solo se usa para el respaldo de EstadísticasBCRA; la API oficial BCRA v4 no requiere token.

Los comandos `npm run smoke:health`, `smoke:apis`, `smoke:bcra`, `smoke:endpoints` y `smoke:redirect` realizan consultas reales a APIs externas; requieren acceso a red y pueden depender de disponibilidad externa.

### El Archivo de Configuración (`vercel.json`)
El enrutamiento entre el frontend y la API se orquesta en `vercel.json`:
- Todo el tráfico hacia `/api/*` se re-enruta internamente a la Serverless Function de Node.
- Todo recurso estático (`/assets`, `/favicon`) o llamadas a rutas UI se sirve vía CDN o se re-enruta a `index.html` (comportamiento de SPA clásica).

---

## 2. Inicializar Localmente (Development)

Rulos Locos permite desarrollar a nivel local empleando comandos que simulan o se comunican directamente con el entorno real de base de datos.

### Pasos Iniciales
1. Clonar el repo e instalar dependencias (front y back al mismo tiempo):
   ```bash
   npm install --include=dev
   ```
2. Crear un archivo `.env` local en la raíz (igual al de Vercel).
3. Sincronizar Prisma ORM:
   ```bash
   npx prisma generate
   ```
   *(Nota: No usar `prisma db push` en la base de Producción de Supabase sin un respaldo meticuloso de las migraciones)*
4. Arrancar los demonios concurrentes (servidor y cliente Vite):
   ```bash
   npm run dev:full
   ```

---

## 3. Integración Continua (CI/CD)
Cada commit a la rama `main` en GitHub dispara automáticamente un **Vercel Deploy**.
El proceso de Vercel realiza 4 pasos fundamentales dictados por el CLI:
1. Instala el árbol completo de dependencias de Node.
2. Ejecuta `postinstall`: Genera los binarios de Prisma y lanza `npm install` en la subcarpeta del frontend (`client`).
3. Ejecuta `build:ts`: Traspila todo el Typescript de `/src` y lo escupe en `/dist` y `/api`.
4. Ejecuta `build`: Llama al subcomando de Vite en el frontend que empaqueta y minifica los assets de React en `client/dist`.

### Monitoreo
Si un deploy explota durante el proceso, **revisar asiduamente la versión de Prima vs Soporte C++**:
La versión actual anclada `6.4.1` evita los crasheos de compiladores nativos (`node-gyp`) con las imágenes inmutables de Vercel Amazon Linux. **No escalar Prisma a la versión 7 con conectores experimentales.**
