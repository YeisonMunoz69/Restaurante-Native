import React from 'react';
import Renderer from 'react-test-renderer';
import { Modal, Text } from 'react-native';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Feedback, FeedbackHost } from './Feedback';

const mockTranslate = (key: string) => key;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockTranslate }),
}));
let tree: Renderer.ReactTestRenderer;
async function mount(scope = 'u1') {
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <FeedbackHost scope={scope} />
      </ThemeProvider>,
    );
  });
}
const text = () => tree.root.findAllByType(Text).map(n => n.props.children);
afterEach(() => {
  Renderer.act(() => tree?.unmount());
  Feedback.clear();
});

it('muestra una confirmación propia sin ejecutar la acción al abrir y Atrás solo cancela', async () => {
  await mount();
  const confirm = jest.fn(),
    cancel = jest.fn();
  Renderer.act(() =>
    Feedback.alert('Título', 'Explicación', [
      { text: 'Volver', style: 'cancel', onPress: cancel },
      { text: 'Eliminar', style: 'destructive', onPress: confirm },
    ]),
  );
  expect(text()).toContain('Título');
  expect(text()).toContain('Explicación');
  expect(confirm).not.toHaveBeenCalled();
  await Renderer.act(async () => {
    tree.root.findByType(Modal).props.onRequestClose();
  });
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(Modal)).toHaveLength(0);
});
it('la acción se ejecuta una vez incluso si llega doble toque', async () => {
  await mount();
  const confirm = jest.fn();
  Renderer.act(() =>
    Feedback.alert('Publicar', 'Revisar datos', [
      { text: 'Guardar', onPress: confirm },
    ]),
  );
  const button = tree.root.findByProps({ testID: 'feedback-action-0' });
  await Renderer.act(async () => {
    button.props.onPress();
    button.props.onPress();
  });
  expect(confirm).toHaveBeenCalledTimes(1);
});
it('encola eventos sin perder mensajes y localiza la acción por defecto', async () => {
  await mount();
  Renderer.act(() => {
    Feedback.alert('Primero');
    Feedback.alert('Segundo', 'Contenido', [], { kind: 'success' });
  });
  expect(text()).toContain('Primero');
  expect(text()).not.toContain('Segundo');
  expect(text()).toContain('feedback.understood');
  await Renderer.act(async () => {
    tree.root.findByProps({ testID: 'feedback-action-0' }).props.onPress();
  });
  expect(text()).toContain('Segundo');
});
it('retira confirmaciones de la cuenta anterior y no confirma si se toca fuera', async () => {
  await mount();
  const confirm = jest.fn();
  Renderer.act(() =>
    Feedback.alert('Cuenta anterior', '', [
      { text: 'Guardar', onPress: confirm },
    ]),
  );
  expect(tree.root.findByType(Modal).props.transparent).toBe(true);
  await Renderer.act(async () => {
    tree.update(
      <ThemeProvider>
        <FeedbackHost scope="u2" />
      </ThemeProvider>,
    );
  });
  expect(tree.root.findAllByType(Modal)).toHaveLength(0);
  expect(confirm).not.toHaveBeenCalled();
});
