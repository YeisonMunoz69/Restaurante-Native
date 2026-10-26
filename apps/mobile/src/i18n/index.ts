import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import attention from './locales/attention.es.json';
import discovery from './locales/discovery.es.json';
import admins from './locales/admins.es.json';

// configuramos i18next para que la app cargue en espanol desde el primer commit
// cumpliendo la regla RNF-03 de tener cero textos literales en componentes
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    es: { translation: { ...es, attention, discovery, admins } },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false, // react ya protege contra XSS
  },
});

export default i18n;
