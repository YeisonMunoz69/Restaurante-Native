-- Conservamos las aperturas existentes como restaurante, sin borrar reservas ni reglas.
ALTER TABLE "dias_atencion" ADD COLUMN "servicios" TEXT[] NOT NULL DEFAULT ARRAY['RESTAURANTE']::TEXT[];
ALTER TABLE "reglas_atencion" ADD COLUMN "servicios" TEXT[] NOT NULL DEFAULT ARRAY['RESTAURANTE']::TEXT[];
