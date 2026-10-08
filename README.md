# El Encanto Campestre - Aplicación Móvil

Proyecto académico desarrollado para la asignatura Electiva V (Desarrollo Móvil, semestre agosto - noviembre 2026). Estamos construyendo la solución digital integral para el restaurante campestre El Encanto Campestre, ubicado en la vereda Las Huacas (Timbío, Cauca).

La solución incluye una aplicación móvil para comensales y el dueño del restaurante con carta digital dinámica según el día de atención, sistema de reservas con comprobante de pago y aprobación manual, muro de novedades campestres y avisos de futuras atracciones (pista de exhibición de motos y lago de pesca deportiva), respaldada por una API modular en NestJS y base de datos relacional en PostgreSQL (Supabase).

Para conocer nuestras normas de desarrollo, formato de commits y convenciones de trabajo en equipo, consulta [Reglas.md](Reglas.md).

---

## Integrantes del equipo (Autores y Contribuidores Únicos)

- **Yeison Muñoz** (Líder frontend móvil y arquitectura monorepo)
- **Alex Santacruz** (Líder backend API y autenticación)
- **Fabián Hoyos** (Líder de infraestructura, datos y seguridad)

> _Nota de autoría:_ Los únicos colaboradores y autores acreditados de este proyecto son los tres integrantes mencionados. No se admiten inteligencias artificiales, bots ni agentes automatizados como colaboradores o co-autores en los registros de Git ni en GitHub.

---

## Estado del proyecto — corte 8 de octubre de 2026

El Sprint 1 no está cerrado al 100%: 43 de sus 51 puntos están verificados localmente; el workspace web aún es un placeholder (3 puntos parciales) y el VPS real/HTTPS sigue pendiente (5 puntos parciales). El perfil Docker de staging y la guía están preparados, pero no se ha afirmado un despliegue externo. El detalle verificable está en [Plan_de_Sprints.md](docs/Plan_de_Sprints.md) y [Backlog_Jira.md](docs/Backlog_Jira.md).

- **Móvil:** React Native bare 0.87, Nueva Arquitectura, Hermes, cinco pestañas, tema e i18n. Ajustes permite iniciar sesión y registrar una cuenta; el token de refresco queda en almacenamiento seguro y el access token en memoria.
- **API:** NestJS con Swagger en desarrollo, manejo centralizado de excepciones, Prisma, migraciones, seed, Docker de desarrollo y endpoint de salud que consulta PostgreSQL.
- **Seguridad:** Argon2id, access/refresh JWT, rotación con control de concurrencia, logout limitado a la sesión del dispositivo y guards de JWT/roles. Los endpoints administrativos de los módulos funcionales deben declarar sus permisos cuando esos módulos se integren.
- **CI/CD:** Preparamos verificaciones para Pull Requests a `dev` y despliegue por SSH después de un push a `dev` que pase los filtros. Corregimos las dependencias nativas de Linux omitidas en el lockfile. Falta publicar esta preparación y comprobar una ejecución completa en GitHub y la VPS; `main` no activa este despliegue.
- **VPS:** Ya conocemos el servidor y la configuración Nginx/SSL de `equipo-7-elev-d-dev.apolobyte.online`. La carpeta del equipo está vacía según la salida SSH recibida. Preparamos el puerto 8084, que debemos volver a comprobar antes de arrancar; el proxy actual apunta al ejemplo de 8083. El procedimiento está en [Despliegue_VPS_Staging.md](docs/Despliegue_VPS_Staging.md).

Para repartir el trabajo de los sprints y entregar cambios a `dev`, usamos [Flujo_Equipo_Dev.md](docs/Flujo_Equipo_Dev.md). Todavía no damos por validado el despliegue remoto ni la conexión real a Supabase en esa VPS.

---

## Estructura del Monorepo

Organizamos el código bajo un esquema de workspaces para compartir lógica de negocio y tipos entre móvil, backend y web:

```
Restaurante-Native/
├── apps/
│   ├── mobile/             # Aplicación móvil en React Native 0.87.1 (Android)
│   │   ├── src/
│   │   │   ├── config/     # Configuración de URLs y endpoints de la API
│   │   │   ├── context/    # Contexto global de autenticación (AuthContext)
│   │   │   ├── i18n/       # Configuración y diccionarios de idiomas (es.json)
│   │   │   ├── navigation/ # Navegador de pestañas inferiores (BottomTabNavigator)
│   │   │   ├── screens/    # Pantallas: Carta, Reservas, Novedades, Próximamente y Ajustes
│   │   │   ├── services/   # Cliente Axios con interceptor 401 y token-storage con Keychain
│   │   │   └── theme/      # Tokens de diseño (colores, tipografía, espaciado) y ThemeContext
│   │   └── android/        # Proyecto nativo Gradle de Android
│   ├── api/                # Backend API REST en NestJS 12
│   │   ├── prisma/         # Esquema Prisma (18 entidades), migraciones SQL y script de seed
│   │   ├── src/
│   │   │   ├── auth/       # Módulo de autenticación (Argon2id, JWT, login, refresh, logout)
│   │   │   ├── common/     # Guards de roles (RolesGuard), filtros de error y pipes Zod
│   │   │   └── prisma/     # Servicio de conexión a Supabase PostgreSQL
│   │   ├── Dockerfile      # Imagen de desarrollo local sobre Node 22 Alpine
│   │   ├── Dockerfile.vps  # Imagen compilada para staging en VPS
│   │   ├── docker-compose.yml      # Orquestador local con hot-reload
│   │   └── docker-compose.vps.yml  # Orquestador de staging, puerto privado por defecto
│   └── web/                # Placeholder; la aplicación web se desarrolla en Sprint 4
├── packages/
│   └── shared/             # Código compartido entre apps (esquemas Zod, DTOs y formateadores)
├── design/                 # Sistema de diseño, tokens JSON/CSS y maquetas HTML
├── docs/                   # Especificación de requisitos (ERS), cronograma y backlog
└── .env.example            # Plantilla de variables de entorno del monorepo
```

---

## Cómo levantar el proyecto localmente

### 1. Requisitos previos

- **Node.js:** Node 22.22.3 o superior dentro de la línea 22.x, con npm 10+. La CLI de Nest instalada por el monorepo requiere una versión reciente de Node 22; la imagen y CI usan Node 22. La tabla oficial de versiones de Node.js lista la línea 22 como LTS y publica sus parches actuales: [releases de Node.js](https://nodejs.org/en/about/previous-releases).
- **Java JDK:** OpenJDK 17 (necesario para compilar la aplicación Android).
- **Android SDK:** Con API 34 o 35 y herramientas de plataforma (`adb`).
- **Docker Desktop:** Para correr el contenedor de la API en local.

### 2. Instalación de dependencias

Desde la raíz del repositorio ejecuta:

```bash
npm ci
```

### 3. Configuración de variables de entorno

Copia el archivo de plantilla a `.env` en la raíz y en `apps/api`:

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

Configura en tu `.env` las credenciales de base de datos de Supabase y los secretos criptográficos de JWT.
Para VPS no reutilices esta configuración: consulta la plantilla `apps/api/.env.vps.example` y la guía manual.

---

## Ejecución de los servicios

### Opción A: Levantar el Backend con Docker

El backend se ejecuta en un contenedor local con recarga automática y acceso a la base de datos de Supabase:

```bash
# Iniciar el contenedor de la API en segundo plano
docker compose -f apps/api/docker-compose.yml up -d

# Ver los logs del backend en tiempo real
docker logs -f encanto_api_dev
```

- **API REST:** `http://localhost:3000/api/v1`
- **Documentación interactiva (Swagger UI):** `http://localhost:3000/api/docs`
- **Estado de API y base de datos:** `http://localhost:3000/api/v1/health`

Para detener el contenedor:

```bash
docker compose -f apps/api/docker-compose.yml down
```

### Preparar el despliegue manual de staging en VPS

El perfil separado compila la API, no monta el código local, separa la herramienta de migraciones, desactiva Swagger y publica el puerto solo en `127.0.0.1`. No abrimos el 3000 en el firewall. Para clonar, completar variables, configurar Nginx/HTTPS y activar GitHub Actions por SSH, seguimos [la guía detallada de despliegue](docs/Despliegue_VPS_Staging.md). No hemos verificado aún esta API desplegada en la VPS.

---

### Opción B: Ejecutar la App Móvil en Android

#### 1. En un dispositivo Android físico por cable USB (sin abrir Android Studio):

1. Activa las **Opciones de desarrollador** y la **Depuración por USB** en tu teléfono.
2. Conecta el celular a la computadora por USB y autoriza la conexión.
3. Verifica que tu PC reconozca el dispositivo:
   ```bash
   adb devices
   ```
4. Redirige los puertos para que el celular se comunique con el empaquetador Metro y con el Docker local:
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000
   ```
5. Compila e instala la app directamente:
   ```bash
   npm run android --workspace=@encanto/mobile
   ```

#### 2. En emulador de Android:

Si usas el emulador oficial de Android Studio, simplemente inicia el emulador y ejecuta:

```bash
npm run android --workspace=@encanto/mobile
```

_Nota para emulador:_ El emulador accede al backend de tu máquina a través de la IP especial `http://10.0.2.2:3000/api/v1`, la cual ya está configurada por defecto en la app móvil.

---

## Pruebas automatizadas

Para ejecutar las suites de pruebas de todo el proyecto:

```bash
# Pruebas del Backend (Vitest)
npm test --workspace=api

# Pruebas de la App Móvil (almacenamiento Keychain, interceptor y renderizado en Jest)
npm test --workspace=@encanto/mobile
```

Antes de las pruebas compilamos `shared` y generamos el cliente Prisma:

```bash
npm run build --workspace=@encanto/shared
npx prisma generate --schema=apps/api/prisma/schema.prisma
```

El flujo configurado en GitHub Actions se activa con Pull Requests dirigidos a `dev` y pushes a `dev`. Los Pull Requests solo verifican; un push aprobado por los filtros despliega al servidor de desarrollo una vez completada su preparación.
