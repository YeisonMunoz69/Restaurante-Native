import React from 'react';
import Renderer from 'react-test-renderer';
import type { MenuDish } from '@encanto/shared';
import { OrderDraftProvider, useOrderDraft } from '../OrderDraftContext';

const dish = { id: 'd1', nombre: 'Plato', precio: 32000 } as MenuDish;
let current: ReturnType<typeof useOrderDraft>;
function Observe() { current = useOrderDraft(); return null; }
const content = (scope: string, ownerId?: string) => <OrderDraftProvider scope={scope} ownerId={ownerId}><Observe /></OrderDraftProvider>;
let tree: Renderer.ReactTestRenderer;
beforeEach(() => { Renderer.act(() => { tree = Renderer.create(content('dev/r1')); }); });
afterEach(() => Renderer.act(() => tree.unmount()));

it('agrega, cambia cantidades y elimina sin aceptar cantidades inválidas', () => {
  Renderer.act(() => current.setQuantity(dish, 2, '2026-10-25'));
  expect(current.lines[0].cantidad).toBe(2);
  Renderer.act(() => { current.setQuantity(dish, -1, '2026-10-25'); current.setQuantity(dish, 100, '2026-10-25'); });
  expect(current.lines[0].cantidad).toBe(2);
  Renderer.act(() => current.setQuantity(dish, 0, '2026-10-25'));
  expect(current.lines).toEqual([]);
});
it('conserva al primer login y descarta al cambiar cuenta o sede', () => {
  Renderer.act(() => current.setQuantity(dish, 1, '2026-10-25'));
  Renderer.act(() => tree.update(content('dev/r1', 'u1')));
  expect(current.lines).toHaveLength(1);
  Renderer.act(() => tree.update(content('dev/r1', 'u2')));
  expect(current.lines).toEqual([]);
  Renderer.act(() => current.setQuantity(dish, 1, '2026-10-25'));
  Renderer.act(() => tree.update(content('local/r2', 'u2')));
  expect(current.lines).toEqual([]);
});
it('solicita abrir un nuevo flujo y no pierde platos al consumir la navegación', () => {
  Renderer.act(() => { current.setQuantity(dish, 3, '2026-10-25'); current.request(); });
  expect(current.pending).toBe(true);
  expect(current.requestId).toBe(1);
  Renderer.act(() => current.consume());
  expect(current.lines[0].cantidad).toBe(3);
  expect(current.pending).toBe(false);
  Renderer.act(() => current.clear());
  expect(current.lines).toEqual([]);
});
