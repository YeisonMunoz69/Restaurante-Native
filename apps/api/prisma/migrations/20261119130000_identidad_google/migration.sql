-- Las cuentas existentes conservan su UUID y su credencial durante el vínculo.
ALTER TABLE "usuarios"
  ALTER COLUMN "password_hash" DROP NOT NULL,
  ADD COLUMN "google_sub" TEXT;

CREATE UNIQUE INDEX "usuarios_google_sub_key" ON "usuarios"("google_sub");
