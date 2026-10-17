-- Registro los antecedentes y el responsable de cerrar cada atención.
ALTER TABLE "usuarios"
ADD COLUMN "inasistencias" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "reservas"
ADD COLUMN "inasistio_por_id" TEXT,
ADD COLUMN "inasistio_en" TIMESTAMP(3),
ADD COLUMN "completada_por_id" TEXT,
ADD COLUMN "completada_en" TIMESTAMP(3);

CREATE INDEX "reservas_inasistio_por_id_idx" ON "reservas"("inasistio_por_id");
CREATE INDEX "reservas_completada_por_id_idx" ON "reservas"("completada_por_id");

ALTER TABLE "reservas"
ADD CONSTRAINT "reservas_inasistio_por_id_fkey"
FOREIGN KEY ("inasistio_por_id") REFERENCES "usuarios"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reservas"
ADD CONSTRAINT "reservas_completada_por_id_fkey"
FOREIGN KEY ("completada_por_id") REFERENCES "usuarios"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
