import { TipoKpi } from '../../../core/models/panel-kpis.model';

const LOCALE = 'es-BO';
const numero = (decimales: number) =>
  new Intl.NumberFormat(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

const SIN_DECIMALES = numero(0);
const UN_DECIMAL = numero(1);
const DOS_DECIMALES = numero(2);
const COMPACTO = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const FECHA = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const MES = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: '2-digit' });

export function formatoMoneda(valor: number): string {
  return `Bs ${DOS_DECIMALES.format(valor)}`;
}

export function formatoEntero(valor: number): string {
  return SIN_DECIMALES.format(valor);
}

export function formatoPorcentaje(valor: number): string {
  return `${UN_DECIMAL.format(valor)} %`;
}

export function formatoCompacto(valor: number): string {
  return COMPACTO.format(valor);
}

export function formatoValor(valor: number | null, tipo: TipoKpi): string {
  if (valor === null) return '—';
  switch (tipo) {
    case 'moneda':
      return formatoMoneda(valor);
    case 'entero':
      return formatoEntero(valor);
    case 'decimal':
      return DOS_DECIMALES.format(valor);
    case 'porcentaje':
      return formatoPorcentaje(valor);
    case 'dias':
      return `${UN_DECIMAL.format(valor)} ${valor === 1 ? 'día' : 'días'}`;
  }
}

export function formatoVariacion(variacion: number, tipo: TipoKpi): string {
  const signo = variacion > 0 ? '+' : '';
  return `${signo}${UN_DECIMAL.format(variacion)} ${tipo === 'porcentaje' ? 'pp' : '%'}`;
}

function aFecha(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function fechaLarga(iso: string): string {
  return FECHA.format(aFecha(iso));
}

export function fechaCorta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export function mesCorto(mes: string): string {
  return MES.format(aFecha(`${mes}-01`));
}
