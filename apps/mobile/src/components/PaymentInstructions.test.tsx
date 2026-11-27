import React from 'react';
import Renderer from 'react-test-renderer';
import { Linking, NativeModules, Text } from 'react-native';
import { ThemeProvider } from '../theme/ThemeContext';
import { paymentApi } from '../services/payment.service';
import { Action } from './attention/Controls';
import { PaymentInstructions } from './PaymentInstructions';
const mockTranslate = (key: string, values?: { name?: string }) =>
  values?.name ? `${key}: ${values.name}` : key;
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
  delete NativeModules.EncantoPaymentApps;
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
    .mockResolvedValue({ ...data, configurada: false, whatsapp: '', mediosPago: '', instruccionesPago: '' });
  await mount();
  const open = jest.spyOn(Linking, 'openURL');
  await Renderer.act(async () => {
    await action('reservations.sendWhatsApp').props.onPress();
  });
  expect(open).not.toHaveBeenCalled();
  expect(texts().filter(text => text === 'payments.unconfigured')).toHaveLength(1);
  expect(texts()).toContain('payments.whatsappNotPublished');
});
it('recarga el contacto y abre una consulta aunque los datos de pago estén pendientes', async () => {
  const incomplete = { ...data, configurada: false, mediosPago: '', instruccionesPago: '' };
  const current = jest.mocked(paymentApi.current);
  current.mockResolvedValue({ ...incomplete, whatsapp: '' });
  await mount();
  expect(texts()).toContain('payments.unconfigured');

  current.mockResolvedValue(incomplete);
  await Renderer.act(async () => {
    await action('payments.reload').props.onPress();
  });
  expect(texts()).toContain(incomplete.whatsapp);

  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await Renderer.act(async () => {
    await action('reservations.sendWhatsApp').props.onPress();
  });
  expect(current).toHaveBeenCalledTimes(3);
  expect(open).toHaveBeenCalledWith('https://wa.me/573000000001?text=EC-QA%0ATicket%20QA%0Apayments.whatsappInquiry');
  expect(texts()).not.toContain('payments.whatsappNotPublished');
});

it('ofrece solo las apps detectadas y abre exclusivamente la que el usuario eligió', async () => {
  const available = jest.fn().mockResolvedValue([
    { packageName: 'com.nequi.MobileApp', name: 'Nequi' },
    { packageName: 'co.com.bancolombia.personas.superapp', name: 'Mi Bancolombia' },
  ]);
  const open = jest.fn().mockResolvedValue(undefined);
  NativeModules.EncantoPaymentApps = { available, open };
  await mount();

  expect(available).not.toHaveBeenCalled();
  await Renderer.act(async () => action('payments.openPaymentApps').props.onPress());
  expect(action('payments.openPaymentApp: Nequi')).toBeDefined();
  expect(action('payments.openPaymentApp: DaviPlata')).toBeUndefined();
  expect(open).not.toHaveBeenCalled();
  await Renderer.act(async () => action('payments.openPaymentApp: Mi Bancolombia').props.onPress());
  expect(open).toHaveBeenCalledWith('co.com.bancolombia.personas.superapp');
  expect(texts()).toContain('payments.shareAfterPayment');
});

it('mantiene los datos visibles si Android no encuentra apps o falla al abrir una disponible', async () => {
  const available = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([
    { packageName: 'com.davivienda.daviplataapp', name: 'DaviPlata' },
  ]);
  const open = jest.fn().mockRejectedValue(new Error('Ya no está instalada'));
  NativeModules.EncantoPaymentApps = { available, open };
  await mount();

  await Renderer.act(async () => action('payments.openPaymentApps').props.onPress());
  expect(texts()).toContain('payments.noPaymentApps');
  await Renderer.act(async () => action('payments.openPaymentApps').props.onPress());
  await Renderer.act(async () => action('payments.openPaymentApp: DaviPlata').props.onPress());
  expect(texts()).toContain('payments.paymentAppOpenError: DaviPlata');
  expect(texts()).toContain(data.mediosPago);
});
