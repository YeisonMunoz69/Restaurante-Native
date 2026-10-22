# Textos de interfaz

Guardo los textos fijos de la interfaz en `locales/es.json` o en el recurso del módulo correspondiente y los muestro con `t('seccion.clave')`. Antes de integrar, ejecuto `npm run check:i18n --workspace=@encanto/mobile` y `npm run lint --workspace=@encanto/mobile`.

No traduzco nombres, descripciones, etiquetas ni otros datos que devuelve la API: esos valores pertenecen al restaurante. Mantengo fechas civiles y moneda COP en `src/utils/formatters.ts`; COP se muestra sin decimales y la fecha numérica usa `dd/mm/aaaa`.

El CI ejecuta el verificador en los PR hacia `dev` y en sus pushes. La comprobación es estática: revisa literales JSX, atributos visibles y claves literales de `t()`. No garantiza que todas las claves dinámicas existan ni que una interpolación reciba sus parámetros; revisamos también las pantallas en Android. Tampoco convierte los mensajes de negocio de la API en un contrato multilingüe. Conservamos español como idioma inicial.
