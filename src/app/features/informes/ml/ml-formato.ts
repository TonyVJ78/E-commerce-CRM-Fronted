const ENTERO = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
const ESPACIO_FINO = ' ';

export function formatoEntero(valor: number): string {
  return ENTERO.format(valor);
}

export function formatoDecimal(valor: number, decimales: number): string {
  return valor.toLocaleString('es-BO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function formatoBs(valor: number): string {
  return `Bs${ESPACIO_FINO}${ENTERO.format(valor)}`;
}

/** Recibe un porcentaje ya en escala 0-100: «75,7 %». */
export function formatoPorcentaje(valor: number, decimales = 1): string {
  return `${formatoDecimal(valor, decimales)}${ESPACIO_FINO}%`;
}

/** Recibe una proporción 0-1: «75,7 %». */
export function formatoProporcion(valor: number, decimales = 1): string {
  return formatoPorcentaje(valor * 100, decimales);
}

function aFecha(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

/** «20 nov 2026». */
export function fechaLarga(iso: string): string {
  return aFecha(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
}

/** «20 nov». */
export function fechaCorta(iso: string): string {
  return aFecha(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }).replace(/\./g, '');
}

export function fechaHora(iso: string): string {
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
  const hora = fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  return `${dia}, ${hora}`;
}
