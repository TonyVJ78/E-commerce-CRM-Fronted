import { ChartConfiguration } from 'chart.js';
import { ResultadosPronostico } from '../../../core/models/ml.model';
import { fechaCorta, fechaLarga, formatoBs } from './ml-formato';

export interface Paleta {
  titicaca: string;
  ink: string;
  muted: string;
  line: string;
}

export function leerPaleta(): Paleta {
  const estilos = getComputedStyle(document.documentElement);
  const token = (nombre: string) => estilos.getPropertyValue(nombre).trim();
  return { titicaca: token('--titicaca'), ink: token('--ink'), muted: token('--muted'), line: token('--line') };
}

const base = { responsive: true, maintainAspectRatio: false, animation: false as const };

function ejes(p: Paleta) {
  const ticks = { color: p.muted, font: { family: "'IBM Plex Mono', monospace", size: 11 } };
  return {
    x: { grid: { display: false }, border: { color: p.line }, ticks: { ...ticks, maxTicksLimit: 8, maxRotation: 0 } },
    y: {
      beginAtZero: true,
      grid: { color: p.line },
      border: { display: false },
      ticks: { ...ticks, callback: (valor: string | number) => formatoCompacto(Number(valor)) }
    }
  };
}

function formatoCompacto(valor: number): string {
  return valor >= 1000 ? `${Math.round(valor / 1000).toLocaleString('es-BO')} mil` : String(valor);
}

const huecos = (cantidad: number): null[] => Array<null>(cantidad).fill(null);

/** Histórico continuo, pronóstico punteado y banda del 80 %; el pronóstico arranca en el último día real. */
export function configPronostico(r: ResultadosPronostico, p: Paleta): ChartConfiguration<'line'> {
  const n = r.historico.valores.length;
  const ultimo = r.historico.valores[n - 1];
  const desdeUltimo = (valores: number[]): (number | null)[] => [...huecos(n - 1), ultimo, ...valores];
  const fechas = [...r.historico.fechas, ...r.pronostico.fechas];
  const sinPunto = { pointRadius: 0, pointHoverRadius: 4, tension: 0.2 };

  return {
    type: 'line',
    data: {
      labels: fechas.map(fechaCorta),
      datasets: [
        {
          label: 'Ventas reales',
          data: [...r.historico.valores, ...huecos(r.pronostico.valores.length)],
          borderColor: p.titicaca,
          borderWidth: 2,
          ...sinPunto
        },
        {
          label: 'Pronóstico',
          data: desdeUltimo(r.pronostico.valores),
          borderColor: p.titicaca,
          borderWidth: 2,
          borderDash: [6, 4],
          ...sinPunto
        },
        { label: 'Mínimo probable', data: desdeUltimo(r.pronostico.inferior), borderWidth: 0, ...sinPunto },
        {
          label: 'Máximo probable',
          data: desdeUltimo(r.pronostico.superior),
          borderWidth: 0,
          backgroundColor: `${p.titicaca}26`,
          fill: '-1',
          ...sinPunto
        }
      ]
    },
    options: {
      ...base,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: item => item.datasetIndex < 2 && item.raw !== null,
          callbacks: {
            title: items => fechaLarga(fechas[items[0].dataIndex]),
            label: ctx => `${ctx.dataset.label}: ${formatoBs(Number(ctx.raw))}`,
            afterBody: items => {
              const i = items[0].dataIndex - n;
              if (i < 0) return '';
              return `Rango del 80 %: ${formatoBs(r.pronostico.inferior[i])} a ${formatoBs(r.pronostico.superior[i])}`;
            }
          }
        }
      },
      scales: ejes(p)
    }
  };
}

/** Prueba con los 28 días que el modelo no vio: real, modelo y línea base. */
export function configValidacion(r: ResultadosPronostico['validacion'], p: Paleta): ChartConfiguration<'line'> {
  const serie = (label: string, data: number[], color: string, punteada: boolean) => ({
    label,
    data,
    borderColor: color,
    borderWidth: 2,
    borderDash: punteada ? [4, 4] : [],
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.2
  });
  return {
    type: 'line',
    data: {
      labels: r.fechas.map(fechaCorta),
      datasets: [
        serie('Real', r.real, p.ink, false),
        serie('Modelo', r.modelo, p.titicaca, false),
        serie('Repetir la última semana', r.base, p.muted, true)
      ]
    },
    options: {
      ...base,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => fechaLarga(r.fechas[items[0].dataIndex]),
            label: ctx => `${ctx.dataset.label}: ${formatoBs(Number(ctx.raw))}`
          }
        }
      },
      scales: ejes(p)
    }
  };
}
