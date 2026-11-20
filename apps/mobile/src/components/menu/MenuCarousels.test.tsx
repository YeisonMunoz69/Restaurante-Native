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
  data: i === 0 ? [dish] : i === 3 ? [{ ...dish, id: 'd4', nombre: 'Plato de la última categoría' }] : [],
}));
let draft: ReturnType<typeof useOrderDraft>;
function Observe() {
  draft = useOrderDraft();
  return null;
}
it('ofrece acceso a la última categoría desde el selector inicial y permite volver a todas', async () => {
  let tree!: Renderer.ReactTestRenderer;
  const detail = jest.fn();
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <OrderDraftProvider scope="local/r1" ownerId="u1">
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
  expect(text()).toContain('Categoría 3');
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'menu-add-d1' }).props.onPress(),
  );
  expect(draft.lines[0].cantidad).toBe(1);
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'menu-open-detail-d1' }).props.onPress(),
  );
  expect(detail).toHaveBeenCalledWith('d1');
  Renderer.act(() =>
    tree.root.findByProps({ testID: 'menu-category-c3' }).props.onPress(),
  );
  expect(text()).toContain('Plato de la última categoría');
  expect(text()).not.toContain('Sopa');
  Renderer.act(() => tree.root.findByProps({ testID: 'menu-category-all' }).props.onPress());
  expect(text()).toContain('Sopa');
  Renderer.act(() => tree.unmount());
});

it('busca una categoría de páginas posteriores sin anunciar que está vacía', async () => {
  const onMore = jest.fn();
  const latest = sections.map((section, index) => index === 3 ? { ...section, data: [] } : section);
  const render = (items: typeof sections, hasMore: boolean) => (
    <ThemeProvider>
      <MenuCarousels
        sections={items}
        fecha="2026-10-25"
        open
        loadingMore={false}
        hasMore={hasMore}
        onMore={onMore}
        onRefresh={jest.fn()}
        onDetail={jest.fn()}
      />
    </ThemeProvider>
  );
  let tree!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => { tree = Renderer.create(render(latest, true)); });
  onMore.mockClear();
  Renderer.act(() => tree.root.findByProps({ testID: 'menu-category-c3' }).props.onPress());
  expect(onMore).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByProps({ testID: 'menu-empty' })).toHaveLength(0);
  Renderer.act(() => tree.update(render(sections, false)));
  expect(tree.root.findAllByType(Text).map(node => node.props.children)).toContain('Plato de la última categoría');
  Renderer.act(() => tree.unmount());
});

it('solicita Google al pulsar Añadir sin guardar un plato de invitado', async () => {
  const signIn = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <OrderDraftProvider scope="local/r1">
          <Observe />
          <MenuCarousels sections={sections} fecha="2026-10-25" open loadingMore={false}
            hasMore={false} onMore={jest.fn()} onRefresh={jest.fn()} onDetail={jest.fn()}
            onRequireSignIn={signIn} />
        </OrderDraftProvider>
      </ThemeProvider>,
    );
  });
  Renderer.act(() => tree.root.findByProps({ testID: 'menu-add-d1' }).props.onPress());
  expect(signIn).toHaveBeenCalledTimes(1);
  expect(draft.lines).toEqual([]);
  Renderer.act(() => tree.unmount());
});

it('diferencia un toque de carga y dos toques de recarga', async () => {
  const onMore = jest.fn();
  const onRefresh = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <MenuCarousels
          sections={sections}
          fecha="2026-10-25"
          open
          loadingMore={false}
          hasMore
          onMore={onMore}
          onRefresh={onRefresh}
          onDetail={jest.fn()}
        />
      </ThemeProvider>,
    );
  });
  const press = () => tree.root.findByProps({ testID: 'menu-load-control' }).props.onPress();
  jest.useFakeTimers();
  try {
    Renderer.act(press);
    expect(onMore).not.toHaveBeenCalled();
    Renderer.act(() => { jest.advanceTimersByTime(450); });
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();

    Renderer.act(() => { press(); press(); });
    Renderer.act(() => { jest.advanceTimersByTime(450); });
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  } finally {
    Renderer.act(() => tree.unmount());
    jest.useRealTimers();
  }
});
