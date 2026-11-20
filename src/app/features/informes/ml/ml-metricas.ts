import { MetricasAbandono, MetricasComprasConjuntas, MetricasPronostico } from '../../../core/models/ml.model';
import { formatoBs, formatoDecimal, formatoEntero, formatoPorcentaje, formatoProporcion } from './ml-formato';

export interface Comparacion {
  etiquetaBase: string;
  valorModelo: string;
  valorBase: string;
  anchoModelo: number;
  anchoBase: number;
  gana: 'modelo' | 'base' | 'empate';
}

export interface VistaMetrica {
  etiqueta: string;
  valor: string;
  explicacion: string;
  comparacion: Comparacion | null;
}

function comparar(
  modelo: number,
  base: number,
  menorEsMejor: boolean,
  etiquetaBase: string,
  formato: (n: number) => string
): Comparacion {
  const mayor = Math.max(modelo, base) || 1;
  const gana = modelo === base ? 'empate' : (modelo < base) === menorEsMejor ? 'modelo' : 'base';
  return {
    etiquetaBase,
    valorModelo: formato(modelo),
    valorBase: formato(base),
    anchoModelo: (modelo / mayor) * 100,
    anchoBase: (base / mayor) * 100,
    gana
  };
}

export function metricasPronostico(m: MetricasPronostico): VistaMetrica[] {
  const base = 'Repetir la última semana';
  const lecturaBanda =
    m.cobertura_intervalo_pct >= 70
      ? 'La banda es confiable.'
      : 'La banda quedó más angosta de lo ideal: tómala como el mínimo de incertidumbre.';
  return [
    {
      etiqueta: 'Error medio por día',
      valor: formatoBs(m.mae),
      explicacion:
        `En los ${m.dias_validacion} días de prueba, el pronóstico se alejó de la venta real ${formatoBs(m.mae)} por día en promedio. ` +
        (m.mejora_mae_pct > 0
          ? `Es ${formatoPorcentaje(m.mejora_mae_pct, 0)} menos error que repetir la última semana.`
          : 'No mejora a repetir la última semana.'),
      comparacion: comparar(m.mae, m.mae_base, true, base, formatoBs)
    },
    {
      etiqueta: 'Error porcentual medio',
      valor: formatoPorcentaje(m.mape),
      explicacion: 'Cuánto se equivoca cada día, en porcentaje de la venta real. Con ventas diarias tan variables, un error de dos dígitos es normal.',
      comparacion: comparar(m.mape, m.mape_base, true, base, n => formatoPorcentaje(n))
    },
    {
      etiqueta: `Error del total de ${m.dias_validacion} días`,
      valor: formatoPorcentaje(m.error_total_pct),
      explicacion: 'Si sumas todos los días, cuánto se equivocó el total. Es la cifra más útil para planificar compras y caja.',
      comparacion: comparar(m.error_total_pct, m.error_total_base_pct, true, base, n => formatoPorcentaje(n))
    },
    {
      etiqueta: 'Días dentro de la banda',
      valor: formatoPorcentaje(m.cobertura_intervalo_pct, 0),
      explicacion: `La banda promete contener 8 de cada 10 días. En la prueba contuvo ${formatoPorcentaje(m.cobertura_intervalo_pct, 0)}. ${lecturaBanda}`,
      comparacion: null
    }
  ];
}

export function metricasAbandono(m: MetricasAbandono): VistaMetrica[] {
  const mayoria = Math.max(m.tasa_base, 1 - m.tasa_base);
  const etiquetaMayoria = m.tasa_base >= 0.5 ? 'Decir siempre «abandona»' : 'Decir siempre «sigue»';
  return [
    {
      etiqueta: 'AUC',
      valor: formatoDecimal(m.auc, 2),
      explicacion:
        'Si eliges un cliente que abandonó y uno que siguió, es la probabilidad de que el modelo dé más riesgo al que abandonó. 0,5 es lanzar una moneda; 1 es acertar siempre.',
      comparacion: comparar(m.auc, 0.5, false, 'Al azar', n => formatoDecimal(n, 2))
    },
    {
      etiqueta: 'Exactitud',
      valor: formatoProporcion(m.exactitud),
      explicacion: `De cada 100 clientes de prueba, cuántos clasificó bien. Se compara con no usar modelo y decir siempre lo más común (${formatoProporcion(mayoria)}).`,
      comparacion: comparar(m.exactitud, mayoria, false, etiquetaMayoria, formatoProporcion)
    },
    {
      etiqueta: 'Precisión',
      valor: formatoProporcion(m.precision),
      explicacion: `Cuando el modelo avisa que un cliente se va, cuántas veces tiene razón. Elegir clientes al azar acertaría ${formatoProporcion(m.tasa_base)} de las veces.`,
      comparacion: comparar(m.precision, m.tasa_base, false, 'Elegir al azar', formatoProporcion)
    },
    {
      etiqueta: 'Exhaustividad',
      valor: formatoProporcion(m.exhaustividad),
      explicacion: 'De los clientes que de verdad abandonaron, cuántos detectó el modelo. Si es alta, pocos se escapan sin aviso.',
      comparacion: null
    }
  ];
}

export function metricasComprasConjuntas(m: MetricasComprasConjuntas): VistaMetrica[] {
  return [
    {
      etiqueta: 'Acierto entre las 5 primeras',
      valor: formatoProporcion(m.hit_rate_5),
      explicacion: `Se escondió un producto de ${formatoEntero(m.pedidos_prueba)} pedidos de prueba y se midió cuántas veces aparecía entre las 5 recomendaciones del modelo, contra recomendar siempre los más vendidos.`,
      comparacion: comparar(m.hit_rate_5, m.hit_rate_5_populares, false, 'Los 5 más vendidos', formatoProporcion)
    },
    {
      etiqueta: 'Pedidos con 2 o más productos',
      valor: formatoEntero(m.pedidos_con_varios),
      explicacion: `De ${formatoEntero(m.pedidos_analizados)} pedidos, solo estos permiten aprender qué se compra junto. ${formatoEntero(m.pares_utiles)} de ${formatoEntero(m.pares_distintos)} pares se repitieron al menos ${m.minimo_pedidos_par} veces.`,
      comparacion: null
    }
  ];
}
