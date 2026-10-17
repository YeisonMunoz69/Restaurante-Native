-- Guardo quién registró la llegada y cuándo, sin introducir todavía una bitácora completa.
ALTER TABLE "reservas"
ADD COLUMN "llegada_por_id" TEXT,
ADD COLUMN "llegada_en" TIMESTAMP(3);

CREATE INDEX "reservas_llegada_por_id_idx" ON "reservas"("llegada_por_id");

ALTER TABLE "reservas"
ADD CONSTRAINT "reservas_llegada_por_id_fkey"
FOREIGN KEY ("llegada_por_id") REFERENCES "usuarios"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
