-- Guardo una imagen compacta por noticia para aplicar las mismas reglas de visibilidad.
ALTER TABLE "noticias" ADD COLUMN "imagen_webp" BYTEA;
