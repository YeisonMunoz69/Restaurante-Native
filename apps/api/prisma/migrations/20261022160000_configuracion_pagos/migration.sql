-- Dejamos datos vacíos: el dueño debe configurar medios reales, no cuentas de ejemplo.
ALTER TABLE "restaurantes"
ADD COLUMN "medios_pago" TEXT NOT NULL DEFAULT '',
ADD COLUMN "instrucciones_pago" TEXT NOT NULL DEFAULT '',
ADD COLUMN "pago_version" INTEGER NOT NULL DEFAULT 0;
