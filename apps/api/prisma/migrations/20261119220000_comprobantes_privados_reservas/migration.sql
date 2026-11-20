CREATE TABLE "comprobantes_reserva" (
    "id" TEXT NOT NULL,
    "reserva_id" TEXT NOT NULL,
    "imagen" BYTEA NOT NULL,
    "ancho" INTEGER NOT NULL,
    "alto" INTEGER NOT NULL,
    "subido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comprobantes_reserva_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "comprobantes_reserva_reserva_id_key" ON "comprobantes_reserva"("reserva_id");
ALTER TABLE "comprobantes_reserva" ADD CONSTRAINT "comprobantes_reserva_reserva_id_fkey"
    FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
