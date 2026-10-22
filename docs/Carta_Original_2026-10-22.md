# Carta original y carga segura

Transcribimos visualmente las páginas 2–4 de «Carta final.pdf», entregada por Yeison el 22/10/2026. Son 44 productos en nueve categorías, incluidos platos, porciones y bebidas. No copiamos las fotos del PDF ni añadimos fotos aleatorias; los nuevos registros quedan sin galería para cargarla después desde la app hacia Storage.

Yeison confirmó que **todos empiezan disponibles** y que el administrador puede cambiar precios, disponibilidad, descripción y fotos, así como crear productos nuevos. Los ocho habituales son Milanesa de Pollo, Tilapia Ahumada, Milanesa de Pollo Junior, Sancocho de Gallina, Ajiaco, Costilla Ahumada, Carne Ahumada y Churrasco. Esa lista no impide desactivarlos y no sobreescribe decisiones posteriores del administrador.

El PDF no muestra precio de empanadas. Yeison confirmó $1.000 por unidad y $6.000 por porción de seis: creamos ambas presentaciones. «Agua» y «Leche» debajo de «Jugos naturales» son dos preparaciones de jugo, no una segunda botella de agua ni un vaso de leche suelto. No inventamos sabores, alérgenos o ingredientes que la carta no especifica.

## Archivos y comportamiento

- `apps/api/prisma/carta-original.ts`: datos versionados, valores COP numéricos, sin fotos.
- `apps/api/prisma/importar-carta.ts`: previsualización por defecto; escritura solo con `--apply`, sede exacta obligatoria, transacción y bloqueo entre importaciones.
- Conservamos un producto existente que coincida por nombre o slug dentro de la sede. No lo reactivamos, no restauramos el precio del PDF y no tocamos sus fotos. Los datos editados por ADMIN prevalecen.
- No ejecutamos `prisma db seed`: el seed histórico contiene cuentas/contraseñas de demostración y datos ficticios ajenos a esta carga.
- No retiramos automáticamente los platos ficticios existentes. Primero revisamos el catálogo con el dueño y desactivamos desde su panel los que no correspondan, sin borrar historial de reservas.

## En la VPS, después de revisar e integrar la rama

La carga no forma parte del arranque ni se repite en cada deploy. Usamos la imagen de herramientas ya construida por el proyecto, con las variables privadas que permanecen en el servidor. Desde `/root/projects/equipo-7`:

```bash
docker compose --env-file apps/api/.env.vps -p elev-d-e-7-dev -f apps/api/docker-compose.vps.yml --profile tools run --rm --entrypoint npx -e CATALOG_RESTAURANT_ID=6933b63c-24cf-495b-b396-f88c4956624c migrate tsx apps/api/prisma/importar-carta.ts
```

Revisamos el número de nuevos/conservados. Si la sede es correcta y aprobamos el resultado, repetimos añadiendo `--apply`:

```bash
docker compose --env-file apps/api/.env.vps -p elev-d-e-7-dev -f apps/api/docker-compose.vps.yml --profile tools run --rm --entrypoint npx -e CATALOG_RESTAURANT_ID=6933b63c-24cf-495b-b396-f88c4956624c migrate tsx apps/api/prisma/importar-carta.ts --apply
```

La imagen debe contener esta versión del importador; una imagen antigua no sirve. La API debe tener las migraciones vigentes y su contenedor saludable antes de validar desde el teléfono. Este documento no certifica que ya ejecutamos la carga en Supabase/VPS.

**Pendiente actualizar requisitos en Drive y Word local:** RF-MEN01 y RF-ADM01/03, catálogo inicial real, disponibilidad y precio modificables; RF-ADM02, galería posterior sin imágenes ficticias. El Markdown no actualiza esos documentos automáticamente.
