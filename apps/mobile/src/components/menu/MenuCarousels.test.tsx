import React from 'react';
import Renderer from 'react-test-renderer';
import { Text } from 'react-native';
import type { MenuDish } from '@encanto/shared';
import { ThemeProvider } from '../../theme/ThemeContext';
import {
  OrderDraftProvider,
  useOrderDraft,
} from '../../context/OrderDraftContext';
import { MenuCarousels } from './MenuCarousels';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const dish = {
  id: 'd1',
  nombre: 'Sopa',
  precio: 32000,
  fotos: [],
  disponible: true,
} as unknown as MenuDish;
const sections = Array.from({ length: 4 }, (_, i) => ({
  id: `c${i}`,
  title: `Categoría ${i}`,
  data: i === 0 ? [dish] : [],
}));
let draft: ReturnType<typeof useOrderDraft>;
function Observe() {
  draft = useOrderDraft();
  return null;
}
it('ofrece tres categorías por bloque y llega a la cuarta sin rotación automática', async () => {
  let tree!: Renderer.ReactTestRenderer;
  const detail = jest.fn();
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <OrderDraftProvider scope="local/r1">
          <Observe />
          <MenuCarousels
            sections={sections}
            fecha="2026-10-25"
            open
            loadingMore={false}
            hasMore={false}
            onMore={jest.fn()}
            onRefresh={jest.fn()}
            onDetail={detail}
          />
        </OrderDraftProvider>
      </ThemeProvider>,
    );
  });
  const text = () =>
    tree.root.findAllByType(Text).map(node => node.props.children);
  expect(text()).toContain('Categoría 2');
  expect(text()).not.toContain('Categoría 3');
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'menu-add-d1' }).props.onPress(),
  );
  expect(draft.lines[0].cantidad).toBe(1);
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'menu-open-detail-d1' }).props.onPress(),
  );
  expect(detail).toHaveBeenCalledWith('d1');
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'menu-next-categories' }).props.onPress(),
  );
  expect(text()).toContain('Categoría 3');
  Renderer.act(() => tree.unmount());
});
