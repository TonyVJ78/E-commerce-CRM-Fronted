export type TipoModeloMl = 'pronostico_ventas' | 'riesgo_abandono' | 'compras_conjuntas';

export interface DatasetMl {
  pedidos: number;
  pedidos_cancelados: number;
  clientes: number;
  eventos: number;
  resenas: number;
  desde: string | null;
  hasta: string | null;
  sintetico: boolean;
}

export interface MetricasPronostico {
  dias_validacion: number;
  mae: number;
  mape: number;
  mae_base: number;
  mape_base: number;
  mejora_mae_pct: number;
  error_total_pct: number;
  error_total_base_pct: number;
  cobertura_intervalo_pct: number;
}

export interface MetricasAbandono {
  auc: number;
  exactitud: number;
  precision: number;
  exhaustividad: number;
  tasa_base: number;
  clientes_entrenamiento: number;
  clientes_prueba: number;
  dias_ventana: number;
  fecha_corte: string;
}

export interface MetricasComprasConjuntas {
  pedidos_analizados: number;
  pedidos_con_varios: number;
  pares_distintos: number;
  pares_utiles: number;
  minimo_pedidos_par: number;
  pedidos_prueba: number;
  hit_rate_5: number;
  hit_rate_5_populares: number;
  avisos: string[];
}

export interface SerieFechada {
  fechas: string[];
  valores: number[];
}

export interface ResultadosPronostico {
  historico: SerieFechada;
  pronostico: SerieFechada & { inferior: number[]; superior: number[] };
  validacion: { fechas: string[]; real: number[]; modelo: number[]; base: number[] };
  total_pronosticado: number;
  total_ultimos_dias: number;
  variacion_pct: number | null;
  dias_pronostico: number;
}

export interface ClienteEnRiesgo {
  cliente_id: number;
  nombre: string;
  correo: string;
  probabilidad: number;
  ultima_compra: string;
  pedidos: number;
}

export interface ResultadosAbandono {
  importancia: { variable: string; etiqueta: string; coeficiente: number }[];
  clientes_puntuados: number;
  dias_cliente_activo: number;
  distribucion: { bajo: number; medio: number; alto: number };
  en_riesgo: ClienteEnRiesgo[];
}

export interface ParProductos {
  producto_a: string;
  producto_b: string;
  pedidos: number;
  soporte: number;
  confianza_a_b: number;
  confianza_b_a: number;
  lift: number;
}

export interface ResultadosComprasConjuntas {
  pares: ParProductos[];
}

interface ModeloMlBase {
  titulo: string;
  algoritmo: string;
  entrenado_en: string;
  filas_entrenamiento: number;
  explicacion: string;
}

export interface ModeloPronostico extends ModeloMlBase {
  tipo: 'pronostico_ventas';
  metricas: MetricasPronostico;
  resultados: ResultadosPronostico;
}

export interface ModeloAbandono extends ModeloMlBase {
  tipo: 'riesgo_abandono';
  metricas: MetricasAbandono;
  resultados: ResultadosAbandono;
}

export interface ModeloComprasConjuntas extends ModeloMlBase {
  tipo: 'compras_conjuntas';
  metricas: MetricasComprasConjuntas;
  resultados: ResultadosComprasConjuntas;
}

export type ModeloMl = ModeloPronostico | ModeloAbandono | ModeloComprasConjuntas;

export interface ModeloOmitido {
  tipo: TipoModeloMl;
  titulo: string;
  motivo: string;
}

export interface RespuestaMl {
  entrenado: boolean;
  dataset: DatasetMl;
  modelos: ModeloMl[];
  omitidos: ModeloOmitido[];
}
