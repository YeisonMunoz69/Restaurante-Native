-- Conservo la duración configurada como valor para grupos de hasta cuatro personas.
ALTER TABLE "restaurantes"
    ADD COLUMN "duracion_reserva_hasta_4_min" INTEGER NOT NULL DEFAULT 90,
    ADD COLUMN "duracion_reserva_desde_5_min" INTEGER NOT NULL DEFAULT 120,
    ADD COLUMN "anticipacion_max_meses" INTEGER NOT NULL DEFAULT 3;

UPDATE "restaurantes"
SET "duracion_reserva_hasta_4_min" = "duracion_reserva_min",
    "anticipacion_min_min" = 60,
    "horas_expiracion_solicitud" = 12;

ALTER TABLE "restaurantes"
    ALTER COLUMN "anticipacion_min_min" SET DEFAULT 60,
    ALTER COLUMN "horas_expiracion_solicitud" SET DEFAULT 12,
    DROP COLUMN "duracion_reserva_min",
    DROP COLUMN "anticipacion_max_dias";
