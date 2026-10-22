import React from 'react';
import Renderer from 'react-test-renderer';
import { Alert, Text, TextInput } from 'react-native';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action } from '../../components/attention/Controls';
import { useAuth } from '../../context/AuthContext';
import { paymentApi } from '../../services/payment.service';
import { PaymentSettingsScreen } from '../PaymentSettingsScreen';

const mockTranslate = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockTranslate }) }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/payment.service', () => ({ paymentApi: { adminCurrent: jest.fn(), save: jest.fn() } }));
const api = jest.mocked(paymentApi);
const initial = { whatsapp: '+573000000001', mediosPago: 'Efectivo\nNequi de prueba', instruccionesPago: 'Datos ficticios; no pagar', version: 2, configurada: true };
let tree: Renderer.ReactTestRenderer;
const onBack = jest.fn();
const action = (key: string) => tree.root.findAllByType(Action).find(a => a.props.label === key)!;
const texts = () => tree.root.findAllByType(Text).flatMap(n => n.props.children);
async function mount() { await Renderer.act(async () => { tree = Renderer.create(<ThemeProvider><PaymentSettingsScreen onBack={onBack} /></ThemeProvider>); }); }
function edit(label: string, value: string) { Renderer.act(() => tree.root.findAllByType(TextInput).find(f => f.props.accessibilityLabel === label)!.props.onChangeText(value)); }
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'admin', rol: 'ADMIN' } } as never);
  api.adminCurrent.mockResolvedValue(initial);
  api.save.mockResolvedValue({ ...initial, version: 3 });
});
afterEach(() => { Renderer.act(() => tree?.unmount()); jest.restoreAllMocks(); });

it.each(['COMENSAL', 'STAFF'])('no carga datos ni ofrece edición al rol %s', async rol => {
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'u', rol } } as never);
  await mount();
  expect(api.adminCurrent).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
});
it('permite texto libre y confirma antes de guardar versión y datos publicados', async () => {
  await mount();
  edit('payments.methods', 'Efectivo\nNequi\nLlave de transferencia');
  const alert = jest.spyOn(Alert, 'alert');
  Renderer.act(() => action('payments.save').props.onPress());
  expect(api.save).not.toHaveBeenCalled();
  const confirm = alert.mock.calls[0][2]!.find(button => button.text === 'payments.save')!;
  await Renderer.act(async () => { await confirm.onPress!(); });
  expect(api.save).toHaveBeenCalledWith({ whatsapp: initial.whatsapp, mediosPago: 'Efectivo\nNequi\nLlave de transferencia', instruccionesPago: initial.instruccionesPago, version: 2 });
  expect(texts()).toContain('payments.saved');
});
it('rechaza teléfono sin indicativo antes de pedir confirmación', async () => {
  await mount(); edit('payments.whatsapp', '3001234567');
  const alert = jest.spyOn(Alert, 'alert');
  Renderer.act(() => action('payments.save').props.onPress());
  expect(alert).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  expect(texts()).toContain('payments.invalid');
});
it('conserva la edición ante conflicto y exige recarga explícita', async () => {
  await mount(); edit('payments.methods', 'Mi edición pendiente');
  api.save.mockRejectedValue({ response: { status: 409 } });
  const alert = jest.spyOn(Alert, 'alert');
  Renderer.act(() => action('payments.save').props.onPress());
  await Renderer.act(async () => { await alert.mock.calls[0][2]!.find(button => button.text === 'payments.save')!.onPress!(); });
  expect(texts()).toContain('payments.conflict');
  expect(action('payments.save').props.disabled).toBe(true);
  expect(api.adminCurrent).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType(TextInput).some(f => f.props.value === 'Mi edición pendiente')).toBe(true);
  Renderer.act(() => action('payments.reload').props.onPress());
  expect(api.adminCurrent).toHaveBeenCalledTimes(1);
  await Renderer.act(async () => { await alert.mock.calls[1][2]!.find(button => button.style === 'destructive')!.onPress!(); });
  expect(api.adminCurrent).toHaveBeenCalledTimes(2);
});
it('pide confirmación al salir con una edición pendiente', async () => {
  await mount(); edit('payments.instructions', 'Edición sin guardar');
  const alert = jest.spyOn(Alert, 'alert');
  Renderer.act(() => action('common.back').props.onPress());
  expect(onBack).not.toHaveBeenCalled();
  Renderer.act(() => alert.mock.calls[0][2]!.find(button => button.style === 'destructive')!.onPress!());
  expect(onBack).toHaveBeenCalledTimes(1);
});
it('ofrece reintento sin un formulario falso cuando falla la carga inicial', async () => {
  api.adminCurrent.mockRejectedValueOnce(new Error('Sin red')); await mount();
  expect(texts()).toContain('payments.loadError');
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  await Renderer.act(async () => { await action('payments.reload').props.onPress(); });
  expect(tree.root.findAllByType(TextInput)).toHaveLength(3);
});
