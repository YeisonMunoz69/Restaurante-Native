-- Guardo la identidad de Google y los datos elegidos en campos separados.
ALTER TABLE "usuarios"
  ADD COLUMN "google_nombre" TEXT,
  ADD COLUMN "google_foto_url" TEXT,
  ADD COLUMN "nombre_perfil" TEXT,
  ADD COLUMN "ciudad" TEXT;
