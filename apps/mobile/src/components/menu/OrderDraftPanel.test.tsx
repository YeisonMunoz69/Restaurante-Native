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
import { Action } from '../attention/Controls';
import { Feedback } from '../feedback/Feedback';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const dish = { id: 'd1', nombre: 'Plato', precio: 32000 } as MenuDish;
let draft: ReturnType<typeof useOrderDraft>;
let tree: Renderer.ReactTestRenderer;
function Observe() {
  draft = useOrderDraft();
  return null;
}
const reserve = jest.fn();
beforeEach(async () => {
  jest.clearAllMocks();
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <OrderDraftProvider scope="local/r1">
          <Observe />
          <OrderDraftPanel onReserve={reserve} />
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
const action = (label: string) =>
  tree.root.findAllByType(Action).find(node => node.props.label === label)!;
it('revisa y modifica cantidades antes de continuar sin enviar una reserva', () => {
  Renderer.act(() => draft.setQuantity(dish, 2, '2026-10-25'));
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'order-open' }).props.onPress(),
  );
  Renderer.act(() => action('+').props.onPress());
  expect(draft.lines[0].cantidad).toBe(3);
  expect(reserve).not.toHaveBeenCalled();
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'order-reserve' }).props.onPress(),
  );
  expect(draft.pending).toBe(true);
  expect(reserve).toHaveBeenCalledTimes(1);
});
it('solo mesa confirma el descarte; volver/cerrar no pierde platos', () => {
  const confirm = jest.spyOn(Feedback, 'alert');
  Renderer.act(() => draft.setQuantity(dish, 1, '2026-10-25'));
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'order-open' }).props.onPress(),
  );
  Renderer.act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(draft.lines).toHaveLength(1);
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'order-open' }).props.onPress(),
  );
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'order-table-only' }).props.onPress(),
  );
  expect(draft.lines).toHaveLength(1);
  expect(reserve).not.toHaveBeenCalled();
  Renderer.act(() => {
    confirm.mock.calls[0][2]![1].onPress!();
  });
  expect(draft.lines).toEqual([]);
  expect(reserve).toHaveBeenCalledTimes(1);
});
