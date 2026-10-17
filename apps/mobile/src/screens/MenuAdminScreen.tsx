import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  CategoryCreateSchema,
  DishCreateSchema,
  DishUpdateSchema,
} from '@encanto/shared';
import type { CategoryCreate, MenuTag } from '@encanto/shared';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConnection } from '../context/ConnectionContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { Action, Field, Note, Panel } from '../components/attention/Controls';
import {
  adminMenuApi,
  type AdminCategory,
  type AdminDish,
} from '../services/admin-menu.service';

type Tab = 'categories' | 'dishes';
type DishDraft = {
  categoriaId: string;
  nombre: string;
  slug: string;
  descripcionBreve: string;
  descripcion: string;
  precio: string;
  alergenos: string;
  destacado: boolean;
  orden: string;
  disponible: boolean;
  etiquetasIds: string[];
};

const emptyDish = (categoriaId = ''): DishDraft => ({
  categoriaId,
  nombre: '',
  slug: '',
  descripcionBreve: '',
  descripcion: '',
  precio: '',
  alergenos: '',
  destacado: false,
  orden: '0',
  disponible: true,
  etiquetasIds: [],
});

function messageFrom(error: unknown, fallback: string) {
  const value = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return typeof value === 'string' ? value : fallback;
}

// Administro categorías, platos y galería desde una sola subpantalla protegida por el rol de la API.
export function MenuAdminScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings } = useConnection();
  const { colors, typography } = useTheme();
  const restauranteId = settings.restauranteId;
  const [tab, setTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [dishes, setDishes] = useState<AdminDish[]>([]);
  const [tags, setTags] = useState<MenuTag[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryOrder, setCategoryOrder] = useState('0');
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DishDraft>(emptyDish());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!restauranteId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextCategories, nextDishes, nextTags] = await Promise.all([
        adminMenuApi.categories(restauranteId),
        adminMenuApi.dishes(restauranteId),
        adminMenuApi.tags(restauranteId),
      ]);
      setCategories(nextCategories);
      setDishes(nextDishes);
      setTags(nextTags);
    } catch (cause) {
      setError(messageFrom(cause, t('menuAdmin.loadError')));
    } finally {
      setLoading(false);
    }
  }, [restauranteId, t]);

  useEffect(() => {
    if (user?.rol === 'ADMIN') void load();
  }, [load, user?.rol]);

  const selectedDish = useMemo(
    () => dishes.find(dish => dish.id === selectedDishId) ?? null,
    [dishes, selectedDishId],
  );

  const run = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await load();
    } catch (cause) {
      setError(messageFrom(cause, t('menuAdmin.saveError')));
    } finally {
      setBusy(false);
    }
  };

  const createCategory = async () => {
    const parsed = CategoryCreateSchema.safeParse({
      nombre: categoryName,
      orden: Number(categoryOrder),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('menuAdmin.invalidCategory'));
      return;
    }
    await run(async () => {
      await adminMenuApi.createCategory(restauranteId, parsed.data as CategoryCreate);
      setCategoryName('');
      setCategoryOrder('0');
    }, t('menuAdmin.categoryCreated'));
  };

  const startNewDish = () => {
    setSelectedDishId(null);
    setDraft(emptyDish(categories.find(category => category.activa)?.id ?? ''));
    setError(null);
    setNotice(null);
  };

  const editDish = (dish: AdminDish) => {
    setSelectedDishId(dish.id);
    setDraft({
      categoriaId: dish.categoryId,
      nombre: dish.nombre,
      slug: dish.slug,
      descripcionBreve: dish.descripcionBreve ?? '',
      descripcion: dish.descripcion,
      precio: String(dish.precio),
      alergenos: dish.alergenos ?? '',
      destacado: dish.destacado,
      orden: String(dish.orden),
      disponible: dish.disponible,
      etiquetasIds: [...dish.etiquetasIds],
    });
    setError(null);
    setNotice(null);
  };

  const saveDish = async () => {
    const values = {
      categoriaId: draft.categoriaId,
      nombre: draft.nombre,
      slug: draft.slug,
      descripcionBreve: draft.descripcionBreve.trim() || null,
      descripcion: draft.descripcion,
      precio: Number(draft.precio),
      alergenos: draft.alergenos.trim() || null,
      destacado: draft.destacado,
      orden: Number(draft.orden),
      disponible: draft.disponible,
      etiquetasIds: draft.etiquetasIds,
    };
    if (selectedDishId) {
      const parsed = DishUpdateSchema.safeParse(values);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? t('menuAdmin.invalidDish'));
        return;
      }
      await run(
        () => adminMenuApi.updateDish(restauranteId, selectedDishId, parsed.data),
        t('menuAdmin.dishSaved'),
      );
      return;
    }
    const parsed = DishCreateSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('menuAdmin.invalidDish'));
      return;
    }
    await run(async () => {
      const created = await adminMenuApi.createDish(restauranteId, parsed.data);
      setSelectedDishId(created.id);
    }, t('menuAdmin.dishCreated'));
  };

  const choosePhoto = async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      maxWidth: 2400,
      maxHeight: 2400,
      quality: 0.9,
    });
    if (response.didCancel || response.errorCode) {
      if (response.errorCode) setError(t('menuAdmin.photoPickerError'));
      return;
    }
    const asset = response.assets?.[0];
    if (!asset?.uri) return;
    const selectedAsset = {
      uri: asset.uri,
      fileName: asset.fileName,
      type: asset.type,
    };
    await run(async () => {
      if (!selectedDishId) return;
      await adminMenuApi.uploadPhoto(restauranteId, selectedDishId, selectedAsset);
    }, t('menuAdmin.photoUploaded'));
  };

  const movePhoto = async (photoIndex: number, offset: -1 | 1) => {
    if (!selectedDish) return;
    const photos = [...selectedDish.photos].sort((a, b) => a.orden - b.orden);
    const target = photoIndex + offset;
    if (target < 0 || target >= photos.length) return;
    [photos[photoIndex], photos[target]] = [photos[target], photos[photoIndex]];
    await run(
      () => adminMenuApi.reorderPhotos(restauranteId, selectedDish.id, photos),
      t('menuAdmin.photoOrderSaved'),
    );
  };

  if (user?.rol !== 'ADMIN') {
    return <Note>{t('menuAdmin.forbidden')}</Note>;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <Action label={t('common.back')} onPress={onBack} />
        <Text style={[typography.display, { color: colors.texto.primario }]}>{t('menuAdmin.title')}</Text>
        <Note>{t('menuAdmin.subtitle')}</Note>

        {!restauranteId ? (
          <Note>{t('menu.configureRestaurant')}</Note>
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Action label={t('menuAdmin.categories')} selected={tab === 'categories'} onPress={() => setTab('categories')} />
              </View>
              <View style={styles.flex}>
                <Action label={t('menuAdmin.dishes')} selected={tab === 'dishes'} onPress={() => setTab('dishes')} />
              </View>
            </View>

            {error && <Note live>{error}</Note>}
            {notice && <Note live>{notice}</Note>}
            {(loading || busy) && <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />}

            {tab === 'categories' ? (
              <Panel>
                <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{t('menuAdmin.newCategory')}</Text>
                <Field label={t('menuAdmin.categoryName')} value={categoryName} onChangeText={setCategoryName} maxLength={80} />
                <Field label={t('menuAdmin.order')} value={categoryOrder} onChangeText={setCategoryOrder} keyboardType="number-pad" />
                <Action label={t('menuAdmin.createCategory')} disabled={busy} onPress={() => void createCategory()} />
                {categories.map(category => (
                  <Panel key={category.id}>
                    <Field
                      label={t('menuAdmin.categoryName')}
                      value={category.nombre}
                      onChangeText={nombre => setCategories(current => current.map(item => item.id === category.id ? { ...item, nombre } : item))}
                      maxLength={80}
                    />
                    <Field
                      label={t('menuAdmin.order')}
                      value={String(category.orden)}
                      onChangeText={value => setCategories(current => current.map(item => item.id === category.id ? { ...item, orden: Number(value) || 0 } : item))}
                      keyboardType="number-pad"
                    />
                    <Note>{t('menuAdmin.dishCount', { count: category.cantidadPlatos ?? 0 })} · {category.activa ? t('menuAdmin.active') : t('menuAdmin.inactive')}</Note>
                    <Action
                      label={t('menuAdmin.saveCategory')}
                      disabled={busy}
                      onPress={() => void run(
                        () => adminMenuApi.updateCategory(restauranteId, category.id, { nombre: category.nombre, orden: category.orden }),
                        t('menuAdmin.categorySaved'),
                      )}
                    />
                    <Action
                      label={category.activa ? t('menuAdmin.deactivateCategory') : t('menuAdmin.activateCategory')}
                      disabled={busy}
                      onPress={() => void run(
                        () => adminMenuApi.updateCategory(restauranteId, category.id, { activa: !category.activa }),
                        t('menuAdmin.categorySaved'),
                      )}
                    />
                  </Panel>
                ))}
              </Panel>
            ) : (
              <Panel>
                {!selectedDishId && (
                  <Action label={t('menuAdmin.newDish')} disabled={busy || !categories.some(category => category.activa)} onPress={startNewDish} />
                )}
                {(selectedDishId || draft.nombre || !dishes.length) && (
                  <>
                    <Text style={[typography.tituloM, { color: colors.texto.primario }]}>
                      {selectedDishId ? t('menuAdmin.editDish') : t('menuAdmin.newDish')}
                    </Text>
                    <Note>{t('menuAdmin.photoLimit')}</Note>
                    <Text style={[typography.etiqueta, { color: colors.texto.secundario }]}>{t('menuAdmin.category')}</Text>
                    {categories.filter(category => category.activa).map(category => (
                      <Action key={category.id} label={category.nombre} selected={draft.categoriaId === category.id} onPress={() => setDraft(current => ({ ...current, categoriaId: category.id }))} />
                    ))}
                    <Field label={t('menuAdmin.dishName')} value={draft.nombre} onChangeText={nombre => setDraft(current => ({ ...current, nombre, slug: selectedDishId ? current.slug : slugFrom(nombre) }))} maxLength={120} />
                    <Field label={t('menuAdmin.slug')} value={draft.slug} onChangeText={slug => setDraft(current => ({ ...current, slug }))} maxLength={120} />
                    <Field label={t('menuAdmin.shortDescription')} value={draft.descripcionBreve} onChangeText={descripcionBreve => setDraft(current => ({ ...current, descripcionBreve }))} maxLength={240} />
                    <Field label={t('menuAdmin.description')} value={draft.descripcion} onChangeText={descripcion => setDraft(current => ({ ...current, descripcion }))} multiline numberOfLines={4} maxLength={4000} />
                    <Field label={t('menuAdmin.price')} value={draft.precio} onChangeText={precio => setDraft(current => ({ ...current, precio }))} keyboardType="decimal-pad" />
                    <Field label={t('menuAdmin.allergens')} value={draft.alergenos} onChangeText={alergenos => setDraft(current => ({ ...current, alergenos }))} maxLength={1000} />
                    <Field label={t('menuAdmin.order')} value={draft.orden} onChangeText={orden => setDraft(current => ({ ...current, orden }))} keyboardType="number-pad" />
                    <Action label={draft.disponible ? t('menuAdmin.available') : t('menuAdmin.unavailable')} selected={draft.disponible} onPress={() => setDraft(current => ({ ...current, disponible: !current.disponible }))} />
                    <Action label={draft.destacado ? t('menuAdmin.featured') : t('menuAdmin.notFeatured')} selected={draft.destacado} onPress={() => setDraft(current => ({ ...current, destacado: !current.destacado }))} />
                    <Text style={[typography.etiqueta, { color: colors.texto.secundario }]}>{t('menuAdmin.tags')}</Text>
                    {tags.map(tag => {
                      const selected = draft.etiquetasIds.includes(tag.id);
                      return <Action key={tag.id} label={tag.nombre} selected={selected} onPress={() => setDraft(current => ({ ...current, etiquetasIds: selected ? current.etiquetasIds.filter(id => id !== tag.id) : [...current.etiquetasIds, tag.id] }))} />;
                    })}
                    <Action label={t('menuAdmin.saveDish')} disabled={busy} onPress={() => void saveDish()} />
                    {selectedDishId && (
                      <>
                        <Action label={t('menuAdmin.uploadPhoto')} disabled={busy || (selectedDish?.photos.length ?? 0) >= 10} onPress={() => void choosePhoto()} />
                        {selectedDish?.photos.map((photo, index) => (
                          <View key={photo.id} style={styles.photoRow}>
                            <Image source={{ uri: photo.path }} accessibilityLabel={t('menuAdmin.photoNumber', { number: index + 1 })} style={styles.photo} />
                            <View style={styles.photoActions}>
                              <Action label="↑" disabled={busy || index === 0} onPress={() => void movePhoto(index, -1)} />
                              <Action label="↓" disabled={busy || index === (selectedDish?.photos.length ?? 0) - 1} onPress={() => void movePhoto(index, 1)} />
                              <Action label={t('menuAdmin.removePhoto')} disabled={busy} onPress={() => void run(() => adminMenuApi.removePhoto(restauranteId, selectedDish.id, photo.id), t('menuAdmin.photoRemoved'))} />
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                    <Action label={t('common.back')} onPress={startNewDish} />
                  </>
                )}
                <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{t('menuAdmin.existingDishes')}</Text>
                {dishes.map(dish => (
                  <Panel key={dish.id}>
                    <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{dish.nombre}</Text>
                    <Note>{dish.category.nombre} · {dish.activo ? t('menuAdmin.active') : t('menuAdmin.inactive')} · {dish.disponible ? t('menuAdmin.available') : t('menuAdmin.unavailable')}</Note>
                    <Action label={t('menuAdmin.editDish')} onPress={() => editDish(dish)} />
                    <Action label={dish.disponible ? t('menuAdmin.markUnavailable') : t('menuAdmin.markAvailable')} disabled={!dish.activo || busy} onPress={() => void run(() => adminMenuApi.setAvailability(restauranteId, dish.id, !dish.disponible), t('menuAdmin.availabilitySaved'))} />
                    <Action label={dish.activo ? t('menuAdmin.deactivateDish') : t('menuAdmin.activateDish')} disabled={busy} onPress={() => void run(() => adminMenuApi.setDishActive(restauranteId, dish.id, !dish.activo), t('menuAdmin.statusSaved'))} />
                  </Panel>
                ))}
              </Panel>
            )}
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function slugFrom(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  photo: { width: 88, height: 88, borderRadius: 8, backgroundColor: '#ddd' },
  photoActions: { flex: 1 },
});
