import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarDateSchema,
  DishAvailabilityCopySchema,
  DishAvailabilityWriteSchema,
  type DishAvailabilityCopyPreview,
  type DishAvailabilityPage,
} from '@encanto/shared';
import { attentionApi, attentionError } from '../../services/attention.service';
import { Action, Field, Note, Panel } from './Controls';
import { commercialToday } from './CalendarPanel';

// El formulario edita excepciones del día cargado, nunca Dish.disponible.
export function AvailabilityPanel({
  restauranteId,
}: {
  restauranteId: string;
}) {
  const { t } = useTranslation();
  const [fecha, setFecha] = useState(commercialToday);
  const [origen, setOrigen] = useState('');
  const [result, setResult] = useState<DishAvailabilityPage | null>(null);
  const [changes, setChanges] = useState<Record<string, boolean | null>>({});
  const [preview, setPreview] = useState<DishAvailabilityCopyPreview | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async (pagina = 1) => {
    CalendarDateSchema.parse(fecha);
    setResult(await attentionApi.availability(restauranteId, fecha, pagina));
    setChanges({});
  };
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setPreview(null);
      const text = t(`attention.${attentionError(error)}`);
      setMessage(text);
      Alert.alert(t('attention.errorTitle'), text);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    run(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restauranteId]);
  const dirty = Object.keys(changes).length > 0;
  const locked = busy || !!preview;
  return (
    <View>
      <Note>{t('attention.availabilityIntro')}</Note>
      <Field
        label={t('attention.date')}
        value={fecha}
        editable={!locked && !dirty}
        onChangeText={value => {
          setFecha(value);
          setResult(null);
        }}
      />
      <Action
        label={t('attention.loadDate')}
        disabled={locked || dirty}
        onPress={() => {
          run(() => load());
        }}
      />
      {!!message && <Note live>{message}</Note>}
      {dirty && <Note>{t('attention.unsaved')}</Note>}
      {result && (
        <>
          {!result.data.length && <Note>{t('attention.noDishes')}</Note>}
          {result.data.map(row => {
            const value = Object.hasOwn(changes, row.platoId)
              ? changes[row.platoId]
              : (row.excepcion?.disponible ?? null);
            return (
              <Panel key={row.platoId}>
                <Note>
                  {row.nombre} · {row.categoria.nombre}
                </Note>
                <Note>
                  {t('attention.generalAvailability')}{' '}
                  {t(
                    row.disponibleGeneral
                      ? 'attention.available'
                      : 'attention.unavailable',
                  )}
                </Note>
                <Note>
                  {t(
                    value === null
                      ? 'attention.generalSelected'
                      : 'attention.dateSelected',
                  )}
                </Note>
                <Action
                  label={t('attention.availableDate')}
                  selected={value === true}
                  disabled={locked}
                  onPress={() =>
                    setChanges({ ...changes, [row.platoId]: true })
                  }
                />
                <Action
                  label={t('attention.unavailableDate')}
                  selected={value === false}
                  disabled={locked}
                  onPress={() =>
                    setChanges({ ...changes, [row.platoId]: false })
                  }
                />
                <Action
                  label={t('attention.useGeneral')}
                  selected={value === null}
                  disabled={locked}
                  onPress={() =>
                    setChanges({ ...changes, [row.platoId]: null })
                  }
                />
              </Panel>
            );
          })}
          <Action
            testID="availability-save"
            label={t('attention.saveAvailability')}
            disabled={locked || !dirty}
            onPress={() => {
              run(async () => {
                const body = DishAvailabilityWriteSchema.parse({
                  cambios: Object.entries(changes).map(
                    ([platoId, disponible]) => ({ platoId, disponible }),
                  ),
                });
                await attentionApi.availabilitySave(
                  restauranteId,
                  result.fecha,
                  body,
                );
                await load(result.paginacion.pagina);
                setMessage(t('attention.saved'));
              });
            }}
          />
          <Action
            label={t('attention.discard')}
            disabled={locked || !dirty}
            onPress={() => setChanges({})}
          />
          <Note>
            {t('attention.page', {
              page: result.paginacion.pagina,
              total: result.paginacion.totalPaginas,
            })}
          </Note>
          <Action
            label={t('attention.previous')}
            disabled={locked || dirty || result.paginacion.pagina <= 1}
            onPress={() => {
              run(() => load(result.paginacion.pagina - 1));
            }}
          />
          <Action
            label={t('attention.next')}
            disabled={
              locked ||
              dirty ||
              result.paginacion.pagina >= result.paginacion.totalPaginas
            }
            onPress={() => {
              run(() => load(result.paginacion.pagina + 1));
            }}
          />
        </>
      )}
      <Panel>
        <Note>{t('attention.copyTitle')}</Note>
        <Note>{t('attention.copyScope')}</Note>
        <Field
          label={t('attention.sourceDate')}
          value={origen}
          editable={!locked && !dirty}
          onChangeText={setOrigen}
        />
        <Note>{t('attention.destination', { date: fecha })}</Note>
        <Action
          label={t('attention.previewCopy')}
          disabled={locked || dirty}
          onPress={() => {
            run(async () => {
              const body = DishAvailabilityCopySchema.parse({
                origen,
                destino: fecha,
              });
              const response = await attentionApi.copy(restauranteId, body);
              if (!response.aplicada) setPreview(response.previsualizacion);
            });
          }}
        />
        {preview && (
          <>
            <Note live>
              {t('attention.copyPreview', {
                count: preview.total,
                changes: preview.cambios,
                origin: preview.origen,
                destination: preview.destino,
              })}
            </Note>
            <Action
              testID="availability-copy-confirm"
              label={t('attention.confirmCopy')}
              disabled={busy}
              onPress={() => {
                run(async () => {
                  await attentionApi.copy(restauranteId, {
                    origen: preview.origen,
                    destino: preview.destino,
                    confirmacion: preview.confirmacion,
                  });
                  setPreview(null);
                  await load();
                  setMessage(t('attention.saved'));
                });
              }}
            />
            <Action
              label={t('attention.cancel')}
              disabled={busy}
              onPress={() => setPreview(null)}
            />
          </>
        )}
      </Panel>
    </View>
  );
}
