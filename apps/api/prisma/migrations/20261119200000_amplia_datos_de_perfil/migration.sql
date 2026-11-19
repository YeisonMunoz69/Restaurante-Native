-- Conservo los perfiles creados y calculo la edad a partir de la fecha civil.
ALTER TABLE "usuarios"
  ADD COLUMN "region" TEXT,
  ADD COLUMN "nacionalidad" TEXT NOT NULL DEFAULT 'Colombia',
  ADD COLUMN "fecha_nacimiento" DATE;
