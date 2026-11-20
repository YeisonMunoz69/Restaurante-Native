import React from 'react';
import Renderer from 'react-test-renderer';
import { AdminsScreen } from '../AdminsScreen';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action, Field } from '../../components/attention/Controls';
import { Feedback } from '../../components/feedback/Feedback';
import { adminsApi } from '../../services/admins.service';
const mockTranslate = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockTranslate }) }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a', rol: 'ADMIN', correo: 'actor@example.test' } }) }));
jest.mock('../../services/admins.service', () => ({ adminsApi: { list: jest.fn(), change: jest.fn() } }));
const api = jest.mocked(adminsApi);
let tree: Renderer.ReactTestRenderer;
beforeEach(() => {
  jest.clearAllMocks();
  api.list.mockResolvedValue({ minimo: 3, activos: 3, usuarios: [
    { id: 'b', nombre: 'QA', correo: 'qa@example.test', rol: 'ADMIN', activo: true, protegido: false },
    { id: 'c', nombre: 'Protegido', correo: 'owner@example.test', rol: 'ADMIN', activo: true, protegido: true },
  ] });
});
afterEach(() => { Renderer.act(() => tree?.unmount()); Feedback.clear(); jest.restoreAllMocks(); });
it('protege administradores y permite delegar a personal tras confirmar', async () => {
  await Renderer.act(async () => { tree = Renderer.create(<ThemeProvider><AdminsScreen onBack={jest.fn()} /></ThemeProvider>); });
  const remove = tree.root.findAllByType(Action).filter(node => node.props.label === 'admins.removeTitle');
  expect(remove).toHaveLength(1);
  expect(remove[0].props.disabled).toBe(true);
  Renderer.act(() => tree.root.findByType(Field).props.onChangeText('new@example.test'));
  const alert = jest.spyOn(Feedback, 'alert');
  const action = (label: string) => tree.root.findAllByType(Action).find(node => node.props.label === label)!;
  Renderer.act(() => action('admins.roles.STAFF').props.onPress());
  Renderer.act(() => action('admins.changeTitle').props.onPress());
  expect(api.change).not.toHaveBeenCalled();
  await Renderer.act(async () => { await alert.mock.calls[0][2]!.find(button => button.text === 'admins.confirm')!.onPress!(); });
  expect(api.change).toHaveBeenCalledWith('new@example.test', 'STAFF');
  expect(api.list).toHaveBeenCalledTimes(2);
});
