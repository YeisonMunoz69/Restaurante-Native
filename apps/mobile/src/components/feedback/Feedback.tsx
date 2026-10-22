import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Info, TriangleAlert, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';

export type FeedbackKind = 'info' | 'success' | 'warning' | 'error';
export interface FeedbackAction {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}
interface FeedbackRequest {
  id: number;
  title: string;
  message?: string;
  actions: FeedbackAction[];
  kind: FeedbackKind;
}
let nextId = 0;
let requests: FeedbackRequest[] = [];
const listeners = new Set<() => void>();
const publish = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const current = () => requests[0] ?? null;

// Encolo mensajes para que dos eventos no se oculten entre sí y ninguna acción se ejecute al mostrarla.
export const Feedback = {
  alert(
    title: string,
    message?: string,
    actions: FeedbackAction[] = [],
    options?: { kind?: FeedbackKind },
  ) {
    requests = [
      ...requests,
      {
        id: ++nextId,
        title,
        message,
        actions,
        kind:
          options?.kind ??
          (actions.some(action => action.style === 'destructive')
            ? 'warning'
            : 'info'),
      },
    ];
    publish();
  },
  clear() {
    requests = [];
    publish();
  },
};

// Uso un solo diálogo visual para toda la app; respeta tema, fuente grande y área segura.
export function FeedbackHost({ scope }: { scope?: string }) {
  const request = useSyncExternalStore(subscribe, current, current);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const titleRef = useRef<React.ElementRef<typeof Text>>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => listener.remove();
  }, []);
  // Cierro confirmaciones antiguas al cambiar de cuenta o desmontar el host.
  useEffect(
    () => () => {
      Feedback.clear();
    },
    [scope],
  );
  useEffect(() => {
    if (request) Keyboard.dismiss();
  }, [request]);
  if (!request) return null;
  const iconColor =
    request.kind === 'error'
      ? colors.estado.error
      : request.kind === 'warning'
        ? colors.estado.atencion
        : request.kind === 'success'
          ? colors.estado.exito
          : colors.marca.primario;
  const Icon =
    request.kind === 'error'
      ? XCircle
      : request.kind === 'warning'
        ? TriangleAlert
        : request.kind === 'success'
          ? Check
          : Info;
  const actions = request.actions.length
    ? request.actions
    : [{ text: t('feedback.understood') }];
  const select = (action?: FeedbackAction) => {
    // Retiro primero para bloquear dobles toques; solo después ejecuto la acción confirmada.
    if (current()?.id !== request.id) return;
    requests = requests.slice(1);
    publish();
    Promise.resolve()
      .then(() => action?.onPress?.())
      .catch(() =>
        Feedback.alert(
          t('feedback.errorTitle'),
          t('feedback.actionError'),
          [],
          { kind: 'error' },
        ),
      );
  };
  const cancel = () => {
    const action = actions.find(item => item.style === 'cancel');
    if (action || request.actions.length <= 1) select(action);
  };
  return (
    <Modal
      testID="feedback-modal"
      transparent
      visible
      statusBarTranslucent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={cancel}
      onShow={() => {
        const node = findNodeHandle(titleRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }}
    >
      <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.placement}
        >
          <View
            accessibilityViewIsModal
            style={[
              styles.card,
              {
                maxHeight: height * 0.84,
                backgroundColor: colors.superficie.elevada,
                borderColor: colors.superficie.borde,
              },
            ]}
          >
            <View style={[styles.accent, { backgroundColor: iconColor }]} />
            <ScrollView contentContainerStyle={styles.body} bounces={false}>
              <View
                style={[
                  styles.icon,
                  { backgroundColor: colors.marca.primarioSuave },
                ]}
              >
                <Icon size={30} color={iconColor} accessible={false} />
              </View>
              <Text
                ref={titleRef}
                accessibilityRole="header"
                style={[styles.title, { color: colors.texto.primario }]}
              >
                {request.title}
              </Text>
              {!!request.message && (
                <Text
                  style={[styles.message, { color: colors.texto.secundario }]}
                >
                  {request.message}
                </Text>
              )}
              <View style={styles.actions}>
                {actions.map((action, index) => {
                  const secondary = action.style === 'cancel';
                  const backgroundColor = secondary
                    ? colors.superficie.fondo
                    : action.style === 'destructive'
                      ? colors.estado.error
                      : colors.marca.primario;
                  return (
                    <TouchableOpacity
                      key={index}
                      testID={`feedback-action-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={
                        action.text ?? t('feedback.understood')
                      }
                      onPress={() => select(action)}
                      style={[
                        styles.button,
                        {
                          backgroundColor,
                          borderColor: secondary
                            ? colors.superficie.borde
                            : backgroundColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.buttonLabel,
                          {
                            color: secondary
                              ? colors.texto.primario
                              : colors.texto.inverso,
                          },
                        ]}
                      >
                        {action.text ?? t('feedback.understood')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
// Uso la misma familia visual para avisos dentro de formularios, sin tapar su contenido.
export function FeedbackMessage({
  children,
  kind = 'info',
}: {
  children: React.ReactNode;
  kind?: FeedbackKind;
}) {
  const { colors } = useTheme();
  const color =
    kind === 'error'
      ? colors.estado.error
      : kind === 'warning'
        ? colors.estado.atencion
        : kind === 'success'
          ? colors.estado.exito
          : colors.marca.primario;
  const Icon =
    kind === 'error'
      ? XCircle
      : kind === 'warning'
        ? TriangleAlert
        : kind === 'success'
          ? Check
          : Info;
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.superficie.elevada, borderColor: color },
      ]}
    >
      <Icon size={22} color={color} accessible={false} />
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.bannerText, { color: colors.texto.primario }]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
  },
  bannerText: { flex: 1, fontSize: 16, lineHeight: 24 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.64)' },
  placement: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
  },
  accent: { height: 5 },
  body: { padding: 24 },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, lineHeight: 31, fontWeight: '700' },
  message: { fontSize: 16, lineHeight: 24, marginTop: 12 },
  actions: { gap: 10, marginTop: 24 },
  button: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
