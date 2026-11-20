import { ParamMap } from '@angular/router';
import { CompararCon } from '../../../core/models/panel-kpis.model';

export type PresetPeriodo =
  | 'ultimos_7'
  | 'ultimos_30'
  | 'este_mes'
  | 'mes_anterior'
  | 'este_trimestre'
  | 'ultimos_12_meses'
  | 'personalizado';

export interface FiltrosUi {
  preset: PresetPeriodo;
  desde: string;
  hasta: string;
  comparar: CompararCon;
  tienda: number | null;
}

export const PRESETS: { clave: PresetPeriodo; etiqueta: string }[] = [
  { clave: 'ultimos_7', etiqueta: 'Últimos 7 días' },
  { clave: 'ultimos_30', etiqueta: 'Últimos 30 días' },
  { clave: 'este_mes', etiqueta: 'Este mes' },
  { clave: 'mes_anterior', etiqueta: 'Mes anterior' },
  { clave: 'este_trimestre', etiqueta: 'Este trimestre' },
  { clave: 'ultimos_12_meses', etiqueta: 'Últimos 12 meses' },
  { clave: 'personalizado', etiqueta: 'Personalizado' }
];

export const COMPARACIONES: { clave: CompararCon; etiqueta: string }[] = [
  { clave: 'periodo_anterior', etiqueta: 'Periodo anterior' },
  { clave: 'mismo_periodo_anio_anterior', etiqueta: 'Mismo periodo del año anterior' },
  { clave: 'ninguno', etiqueta: 'Sin comparar' }
];

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Los presets son relativos a hoy: en la URL se guarda el preset, no las fechas. */
export function rangoDePreset(preset: Exclude<PresetPeriodo, 'personalizado'>, hoy: Date): { desde: string; hasta: string } {
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const d = hoy.getDate();
  switch (preset) {
    case 'ultimos_7':
      return { desde: aIso(new Date(y, m, d - 6)), hasta: aIso(hoy) };
    case 'ultimos_30':
      return { desde: aIso(new Date(y, m, d - 29)), hasta: aIso(hoy) };
    case 'este_mes':
      return { desde: aIso(new Date(y, m, 1)), hasta: aIso(hoy) };
    case 'mes_anterior':
      return { desde: aIso(new Date(y, m - 1, 1)), hasta: aIso(new Date(y, m, 0)) };
    case 'este_trimestre':
      return { desde: aIso(new Date(y, Math.floor(m / 3) * 3, 1)), hasta: aIso(hoy) };
    case 'ultimos_12_meses':
      return { desde: aIso(new Date(y - 1, m, d + 1)), hasta: aIso(hoy) };
  }
}

function esPreset(valor: string | null): valor is PresetPeriodo {
  return PRESETS.some(p => p.clave === valor);
}

function esComparacion(valor: string | null): valor is CompararCon {
  return COMPARACIONES.some(c => c.clave === valor);
}

export function leerFiltros(params: ParamMap, hoy: Date): FiltrosUi {
  const presetParam = params.get('preset');
  const preset = esPreset(presetParam) ? presetParam : 'ultimos_30';
  const comparar = params.get('comparar');
  const tienda = Number(params.get('tienda'));

  let rango: { desde: string; hasta: string };
  if (preset === 'personalizado') {
    const base = rangoDePreset('ultimos_30', hoy);
    const desde = params.get('desde');
    const hasta = params.get('hasta');
    rango = {
      desde: desde && FECHA_ISO.test(desde) ? desde : base.desde,
      hasta: hasta && FECHA_ISO.test(hasta) ? hasta : base.hasta
    };
  } else {
    rango = rangoDePreset(preset, hoy);
  }

  return {
    preset,
    ...rango,
    comparar: esComparacion(comparar) ? comparar : 'periodo_anterior',
    tienda: tienda > 0 ? tienda : null
  };
}
