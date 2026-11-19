import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { type NewsPost } from '@encanto/shared';
import { Feedback } from '../../components/feedback/Feedback';
import { Action, Field } from '../../components/attention/Controls';
import { adminNewsApi } from '../../services/admin-news.service';
import { ThemeProvider } from '../../theme/ThemeContext';
import { AdminNewsScreen } from '../AdminNewsScreen';

const mockTranslate = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockTranslate }) }));
jest.mock('../../context/ConnectionContext', () => ({
  useConnection: () => ({ settings: { restauranteId: '10000000-0000-4000-8000-000000000001' } }),
}));
jest.mock('../../services/admin-news.service', () => ({
  adminNewsApi: { list: jest.fn(), create: jest.fn(), update: jest.fn(), upload: jest.fn() },
}));

const api = jest.mocked(adminNewsApi);
const draft: NewsPost = {
  id: '20000000-0000-4000-8000-000000000001',
  titulo: 'Aviso para el domingo',
  cuerpo: 'Abrimos con el horario habitual.',
  enlaces: [],
  fijada: false,
  publicada: false,
  publicadaEn: '2026-11-19T11:30:00.000Z',
  version: '2026-11-19T11:30:00.000Z',
  imagen: null,
};

afterEach(() => jest.restoreAllMocks());

it('crea un borrador y publica únicamente tras aceptar la confirmación', async () => {
  const dialog = jest.spyOn(Feedback, 'alert').mockImplementation(() => undefined);
  api.list.mockResolvedValue([]);
  api.create.mockResolvedValue(draft);
  api.update.mockResolvedValue({ ...draft, publicada: true });
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider><AdminNewsScreen onBack={jest.fn()} /></ThemeProvider>);
  });
  const action = (label: string) => tree.root.findAllByType(Action).find(node => node.props.label === label)!.props;
  const field = (label: string) => tree.root.findAllByType(Field).find(node => node.props.label === label)!.props;
  await ReactTestRenderer.act(async () => action('newsAdmin.new').onPress());
  await ReactTestRenderer.act(async () => {
    field('newsAdmin.headline').onChangeText(draft.titulo);
    field('newsAdmin.body').onChangeText(draft.cuerpo);
  });
  await ReactTestRenderer.act(async () => action('newsAdmin.saveDraft').onPress());
  expect(api.create).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ publicada: false }));
  await ReactTestRenderer.act(async () => action('newsAdmin.publish').onPress());
  expect(api.update).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => { await dialog.mock.calls[0][2]?.[1]?.onPress?.(); });
  expect(api.update).toHaveBeenCalledWith(expect.any(String), draft.id, expect.objectContaining({
    publicada: true, version: draft.version,
  }));
  expect(action('newsAdmin.archive')).toBeDefined();
  ReactTestRenderer.act(() => tree.unmount());
});
