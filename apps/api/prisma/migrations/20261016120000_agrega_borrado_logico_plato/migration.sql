-- Separo la disponibilidad cotidiana de la baja lógica para conservar el historial.
ALTER TABLE "platos"
ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
