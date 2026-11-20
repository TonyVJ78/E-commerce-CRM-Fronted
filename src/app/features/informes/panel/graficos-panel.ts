import { ChartConfiguration } from 'chart.js';
import {
  ResultadoMensual,
  TopProducto,
  VentaCategoria,
  VentaCiudad,
  VentaDiaria
} from '../../../core/models/panel-kpis.model';
import {
  fechaCorta,
  formatoCompacto,
  formatoEntero,
  formatoMoneda,
  formatoPorcentaje,
  mesCorto
} from './formato-panel';

export interface Paleta {
  titicaca: string;
  primary: string;
  accent: string;
  success: string;
  ink: string;
  line: string;
  muted: string;
}

const MAX_ETIQUETA = 24;

/** Chart.js pinta en canvas y no resuelve `var(--x)`: se leen los tokens ya calculados. */
export function leerPaleta(): Paleta {
  const estilos = getComputedStyle(document.documentElement);
  const token = (nombre: string) => estilos.getPropertyValue(nombre).trim();
  return {
    titicaca: token('--titicaca'),
    primary: token('--primary'),
    accent: token('--accent'),
    success: token('--success'),
    ink: token('--ink'),
    line: token('--line'),
    muted: token('--muted')
  };
}

const truncar = (texto: string) => (texto.length > MAX_ETIQUETA ? `${texto.slice(0, MAX_ETIQUETA - 1)}…` : texto);

function ticks(p: Paleta) {
  return { color: p.muted, font: { family: "'IBM Plex Mono', monospace", size: 11 } };
}

function ejeDinero(p: Paleta) {
  return {
    beginAtZero: true,
    grid: { color: p.line },
    border: { display: false },
    ticks: { ...ticks(p), callback: (valor: string | number) => formatoCompacto(Number(valor)) }
  };
}

function ejeCategorias(p: Paleta) {
  return { grid: { display: false }, border: { color: p.line }, ticks: ticks(p) };
}

const base = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const
};

export function configVentasDiarias(serie: VentaDiaria[], p: Paleta): ChartConfiguration<'line'> {
  return {
    type: 'line',
    data: {
      labels: serie.map(v => fechaCorta(v.fecha)),
      datasets: [{
        label: 'Ingresos',
        data: serie.map(v => v.ingresos),
        borderColor: p.titicaca,
        backgroundColor: `${p.titicaca}1F`,
        borderWidth: 2,
        fill: true,
        tension: 0.25,
        pointRadius: serie.length > 31 ? 0 : 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      ...base,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => serie[items[0].dataIndex].fecha,
            label: ctx => `Ingresos: ${formatoMoneda(Number(ctx.raw))}`,
            afterLabel: ctx => `Pedidos: ${formatoEntero(serie[ctx.dataIndex].pedidos)}`
          }
        }
      },
      scales: { x: { ...ejeCategorias(p), ticks: { ...ticks(p), maxTicksLimit: 10, maxRotation: 0 } }, y: ejeDinero(p) }
    }
  };
}

export function configResultadoMensual(serie: ResultadoMensual[], p: Paleta): ChartConfiguration<'bar' | 'line'> {
  return {
    type: 'bar',
    data: {
      labels: serie.map(m => mesCorto(m.mes)),
      datasets: [
        { label: 'Ingresos', data: serie.map(m => m.ingresos), backgroundColor: p.titicaca, borderRadius: 3 },
        { label: 'Ganancia bruta', data: serie.map(m => m.ganancia_bruta), backgroundColor: p.success, borderRadius: 3 },
        { label: 'Gastos', data: serie.map(m => m.gastos), backgroundColor: p.accent, borderRadius: 3 },
        {
          type: 'line',
          label: 'Utilidad neta',
          data: serie.map(m => m.utilidad_neta),
          borderColor: p.ink,
          backgroundColor: p.ink,
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.2
        }
      ]
    },
    options: {
      ...base,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { color: p.ink, usePointStyle: true, boxWidth: 8, font: { family: 'Inter', size: 12 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatoMoneda(Number(ctx.raw))}` } }
      },
      scales: { x: ejeCategorias(p), y: ejeDinero(p) }
    }
  };
}

function barrasHorizontales(
  etiquetas: string[],
  valores: number[],
  color: string,
  p: Paleta,
  formatoEje: (valor: number) => string,
  tooltip: { title: (indice: number) => string; lineas: (indice: number) => string[] }
): ChartConfiguration<'bar'> {
  return {
    type: 'bar',
    data: {
      labels: etiquetas.map(truncar),
      datasets: [{ data: valores, backgroundColor: color, borderRadius: 3, barThickness: 18 }]
    },
    options: {
      ...base,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => tooltip.title(items[0].dataIndex),
            label: ctx => tooltip.lineas(ctx.dataIndex)
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: p.line },
          border: { display: false },
          ticks: { ...ticks(p), callback: valor => formatoEje(Number(valor)) }
        },
        y: { ...ejeCategorias(p), ticks: { color: p.ink, font: { family: 'Inter', size: 12 } } }
      }
    }
  };
}

export function configTopProductos(serie: TopProducto[], p: Paleta): ChartConfiguration<'bar'> {
  return barrasHorizontales(serie.map(s => s.producto), serie.map(s => s.ingresos), p.titicaca, p, formatoCompacto, {
    title: i => serie[i].producto,
    lineas: i => [
      `Ingresos: ${formatoMoneda(serie[i].ingresos)}`,
      `Unidades: ${formatoEntero(serie[i].unidades)}`,
      `Margen: ${formatoPorcentaje(serie[i].margen_pct)}`
    ]
  });
}

export function configVentasCategoria(serie: VentaCategoria[], p: Paleta): ChartConfiguration<'bar'> {
  return barrasHorizontales(serie.map(s => s.categoria), serie.map(s => s.participacion_pct), p.titicaca, p, v => `${formatoEntero(v)} %`, {
    title: i => serie[i].categoria,
    lineas: i => [`Participación: ${formatoPorcentaje(serie[i].participacion_pct)}`, `Ingresos: ${formatoMoneda(serie[i].ingresos)}`]
  });
}

export function configVentasCiudad(serie: VentaCiudad[], p: Paleta): ChartConfiguration<'bar'> {
  return barrasHorizontales(serie.map(s => s.ciudad), serie.map(s => s.ingresos), p.titicaca, p, formatoCompacto, {
    title: i => serie[i].ciudad,
    lineas: i => [`Ingresos: ${formatoMoneda(serie[i].ingresos)}`, `Pedidos: ${formatoEntero(serie[i].pedidos)}`]
  });
}
