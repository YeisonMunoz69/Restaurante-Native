import React from 'react';
import Renderer from 'react-test-renderer';
import { Modal } from 'react-native';
import type { MenuDish } from '@encanto/shared';
import { ThemeProvider } from '../../theme/ThemeContext';
import {
  OrderDraftProvider,
  useOrderDraft,
} from '../../context/OrderDraftContext';
import { OrderDraftPanel } from './OrderDraftPanel';
import { Feedback } from '../feedback/Feedback';
import { MenuDishDetailModal } from './MenuDishDetailModal';
import { menuApi } from '../../services/menu.service';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../services/menu.service', () => ({ menuApi: { dish: jest.fn() } }));
const dish = {
  id: 'd1', nombre: 'Plato', precio: 32000, etiquetas: [],
  fotos: [{ id: 'foto1', path: 'https://images.example.test/plato.jpg', pathOg: null, principal: true, orden: 0 }],
} as MenuDish;
let draft: ReturnType<typeof useOrderDraft>;
let tree: Renderer.ReactTestRenderer;
function Observe() {
  draft = useOrderDraft();
  return null;
}
const reserve = jest.fn();
beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(menuApi.dish).mockResolvedValue(dish);
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <OrderDraftProvider scope="local/r1">
          <Observe />
          <OrderDraftPanel restauranteId="r1" onReserve={reserve} />
        </OrderDraftProvider>
      </ThemeProvider>,
    );
  });
});
afterEach(() => {
  Renderer.act(() => tree.unmount());
  Feedback.clear();
  jest.restoreAllMocks();
});
const press = (testID: string) =>
  Renderer.act(() => tree.root.findAllByProps({ testID }).find(node => node.props.onPress)!.props.onPress());
it('revisa y modifica cantidades antes de continuar sin enviar una reserva', () => {
  Renderer.act(() => draft.setQuantity(dish, 2, '2026-10-25'));
  press('order-open');
  press('order-increase-d1');
  expect(tree.root.findAllByProps({ testID: 'order-sheet' }).length).toBeGreaterThan(0);
  expect(draft.lines[0].cantidad).toBe(3);
  expect(reserve).not.toHaveBeenCalled();
  press('order-reserve');
  expect(draft.pending).toBe(true);
  expect(reserve).toHaveBeenCalledTimes(1);
});
it('solo mesa confirma el descarte; volver/cerrar no pierde platos', () => {
  const confirm = jest.spyOn(Feedback, 'alert');
  Renderer.act(() => draft.setQuantity(dish, 1, '2026-10-25'));
  press('order-open');
  Renderer.act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(draft.lines).toHaveLength(1);
  press('order-open');
  press('order-table-only');
  expect(draft.lines).toHaveLength(1);
  expect(reserve).not.toHaveBeenCalled();
  Renderer.act(() => {
    confirm.mock.calls[0][2]![1].onPress!();
  });
  expect(draft.lines).toEqual([]);
  expect(reserve).toHaveBeenCalledTimes(1);
});

it('cierra por fuera y con el botón sin modificar el borrador', () => {
  Renderer.act(() => draft.setQuantity(dish, 1, '2026-10-25'));
  press('order-open');
  press('order-dismiss');
  expect(tree.root.findAllByProps({ testID: 'order-sheet' })).toHaveLength(0);
  press('order-open');
  press('order-close');
  expect(tree.root.findAllByProps({ testID: 'order-sheet' })).toHaveLength(0);
  expect(draft.lines[0].cantidad).toBe(1);
  expect(reserve).not.toHaveBeenCalled();
});

it('muestra la portada y vuelve de la ficha a la misma fecha y cantidades del pedido', async () => {
  Renderer.act(() => draft.setQuantity(dish, 2, '2026-10-25'));
  press('order-open');
  expect(tree.root.findAllByProps({ testID: 'order-dish-photo' })[0].props.source)
    .toEqual({ uri: 'https://images.example.test/plato.jpg' });
  await Renderer.act(async () => {
    tree.root.findAllByProps({ testID: 'order-dish-d1' }).find(node => node.props.onPress)!.props.onPress();
  });
  expect(menuApi.dish).toHaveBeenCalledWith('r1', '2026-10-25', 'd1');
  Renderer.act(() => tree.root.findByType(MenuDishDetailModal).props.onClose());
  expect(tree.root.findAllByProps({ testID: 'order-sheet' }).length).toBeGreaterThan(0);
  expect(draft.lines[0].cantidad).toBe(2);
});
