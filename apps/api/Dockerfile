FROM node:22-alpine

WORKDIR /usr/src/app

# Herramientas para compilar módulos nativos (argon2) y OpenSSL para el motor de Prisma
RUN apk add --no-cache python3 make g++ openssl

# Copiamos manifiestos del monorepo
COPY package*.json ./

# Copiamos los package.json de la API y paquete compartido
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Instalamos dependencias
RUN npm install

# Copiamos el código fuente, configuraciones de TS y esquemas
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Compilo el paquete compartido aquí adentro.
# Lo hago porque la API importa @encanto/shared y ese paquete se resuelve por su dist/,
# que está en el .gitignore. Si dependiera del dist del computador de cada uno, a quien
# clone el repo de cero no le arrancaría la API. Compilándolo acá la imagen se basta sola.
RUN npm run build --workspace=@encanto/shared

# Generamos el cliente de Prisma para que esté listo al arrancar
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Exponemos el puerto de NestJS
EXPOSE 3000

# Iniciamos en desarrollo con recarga automática
CMD ["npm", "run", "start:dev", "-w", "api"]
