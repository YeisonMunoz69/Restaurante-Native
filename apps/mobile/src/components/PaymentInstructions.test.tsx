import React from 'react';
import Renderer from 'react-test-renderer';
import { Linking, Text } from 'react-native';
import { ThemeProvider } from '../theme/ThemeContext';
import { paymentApi } from '../services/payment.service';
import { Action } from './attention/Controls';
import { PaymentInstructions } from './PaymentInstructions';
const mockTranslate = (key: string) => key;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockTranslate }),
}));
jest.mock('../services/payment.service', () => ({
  paymentApi: { current: jest.fn() },
}));
let tree: Renderer.ReactTestRenderer;
const data = {
  whatsapp: '+573000000001',
  mediosPago: 'Llave anterior de prueba',
  instruccionesPago: 'Solo prueba',
  version: 1,
  configurada: true,
};
const action = (name: string) =>
  tree.root.findAllByType(Action).find(a => a.props.label === name)!;
const texts = () =>
  tree.root.findAllByType(Text).flatMap(n => n.props.children);
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(paymentApi.current).mockResolvedValue(data);
});
afterEach(() => {
  Renderer.act(() => tree?.unmount());
  jest.restoreAllMocks();
});
async function mount() {
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <PaymentInstructions codigo="EC-QA" ticket="Ticket QA" />
      </ThemeProvider>,
    );
  });
}
it('consulta una cuenta nueva al abrir WhatsApp desde una reserva existente', async () => {
  await mount();
  jest
    .mocked(paymentApi.current)
    .mockResolvedValue({
      ...data,
      whatsapp: '+573000000002',
      mediosPago: 'Llave vigente',
      version: 2,
    });
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await Renderer.act(async () => {
    await action('reservations.sendWhatsApp').props.onPress();
  });
  expect(open).toHaveBeenCalledWith(
    expect.stringContaining('wa.me/573000000002'),
  );
  expect(decodeURIComponent(open.mock.calls[0][0])).toContain('EC-QA');
  expect(texts()).toContain('Llave vigente');
});
it('retira cuentas antiguas si falla la red y no abre un destino de respaldo', async () => {
  await mount();
  jest.mocked(paymentApi.current).mockRejectedValue(new Error('Sin red'));
  const open = jest.spyOn(Linking, 'openURL');
  await Renderer.act(async () => {
    await action('reservations.sendWhatsApp').props.onPress();
  });
  expect(open).not.toHaveBeenCalled();
  expect(texts()).toContain('payments.loadError');
  expect(texts()).not.toContain(data.mediosPago);
});
it('informa configuración incompleta sin intentar abrir WhatsApp', async () => {
  jest
    .mocked(paymentApi.current)
    .mockResolvedValue({ ...data, configurada: false, whatsapp: '' });
  await mount();
  const open = jest.spyOn(Linking, 'openURL');
  await Renderer.act(async () => {
    await action('reservations.sendWhatsApp').props.onPress();
  });
  expect(open).not.toHaveBeenCalled();
  expect(texts()).toContain('payments.unconfigured');
});
