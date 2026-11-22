/**
 * Modelos TypeScript para las respuestas de la API de Machine Learning (CU-35).
 * Estos modelos reflejan exactamente los serializers del backend Django.
 */

export interface MetricaVentas {
  mae: number;
  rmse: number;
  datos_entrenamiento: number;
  datos_prueba: number;
  baseline_mae?: number;
  baseline_rmse?: number;
  metodo: string;
}

export interface CoeficientesRegresion {
  intercepto: number;
  pendiente: number;
}

export interface FechaPrevista {
  fecha: string;
  valor_previsto: number;
}

export interface PronosticoVentaResponse {
  tienda_id: number;
  tienda_nombre: string;
  fecha_corte: string;
  horizonte_dias: number;
  estado: 'completado' | 'datos_insuficientes';
  mensaje: string;
  fechas_previstas: FechaPrevista[];
  metrica: MetricaVentas | null;
  coeficientes: CoeficientesRegresion | null;
}

export interface PronosticarVentasInput {
  tienda_id: number;
  horizonte_dias?: number;
}

/** Fila persistida por GET /api/ml/ventas/pronosticos/. */
export interface PronosticoVentaGuardado {
  id: number;
  tienda: number;
  tienda_nombre: string;
  periodo_inicio: string;
  periodo_fin: string;
  horizonte_dias: number;
  valor_previsto: string;
  mae: string | null;
  rmse: string | null;
  fecha_entrenamiento: string;
  version_modelo: string;
}

export interface NivelRiesgoCliente {
  cliente_id: number;
  cliente_email: string;
  probabilidad_abandono: number;
  nivel_riesgo: 'bajo' | 'medio' | 'alto' | 'critico';
  recencia_dias: number;
  frecuencia: number;
  monetario_total: number;
  variables_explicativas: {
    recencia_dias: number;
    frecuencia_compras: number;
    monetario_total: number;
    es_abandono_etiquetado: boolean;
  };
}

export interface MatrizConfusion {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
}

export interface MetricaAbandono {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  matriz_confusion: MatrizConfusion;
  brier_score: number | null;
  clientes_entrenados: number;
  clientes_prueba: number;
  abandono_en_entrenamiento: number;
  abandono_en_prueba: number;
  metodo: string;
}

export interface RiesgoAbandonoResponse {
  tienda_id: number;
  tienda_nombre: string;
  fecha_referencia: string;
  dias_umbral_abandono: number;
  estado: 'completado' | 'datos_insuficientes';
  mensaje: string;
  clientes: NivelRiesgoCliente[];
  metrica: MetricaAbandono | null;
}

export interface EvaluarRiesgoAbandonoInput {
  tienda_id: number;
  dias_umbral_abandono?: number;
}

/** Fila persistida por GET /api/ml/clientes/riesgos-abandono/. */
export interface RiesgoAbandonoGuardado {
  id: number;
  cliente: number;
  cliente_email: string;
  tienda: number;
  tienda_nombre: string;
  probabilidad_abandono: string;
  nivel_riesgo: NivelRiesgo;
  fecha_scoring: string;
  version_modelo: string;
}

export interface VariablesExplicativasCompra {
  tiene_historial: boolean;
  frecuencia: number;
  recencia_dias: number;
  monetario_total: number;
  promedio_intervalo_dias: number;
  dias_cliente: number;
}

export interface MetricaCompra {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  matriz_confusion: MatrizConfusion;
  brier_score: number | null;
  clientes_entrenados: number;
  clientes_prueba: number;
  compra_en_entrenamiento: number;
  compra_en_prueba: number;
  metodo: string;
  baseline_clase_mayoritaria?: MetricaCompra;
}

export interface PrediccionCompraResponse {
  tienda_id: number;
  tienda_nombre: string;
  cliente_id: number;
  horizonte_dias: number;
  fecha_corte: string;
  estado: 'completado' | 'datos_insuficientes';
  mensaje: string;
  probabilidad_compra: number | null;
  nivel: 'bajo' | 'medio' | 'alto' | 'desconocido';
  variables_explicativas: VariablesExplicativasCompra;
  metrica: MetricaCompra | null;
}

export interface PredecirCompraInput {
  tienda_id: number;
  cliente_id?: number;
  horizonte_dias?: number;
}

/** Fila persistida por GET /api/ml/compras/predicciones/. */
export interface PrediccionCompraGuardada {
  id: number;
  cliente: number;
  cliente_email: string;
  tienda: number;
  tienda_nombre: string;
  probabilidad_compra: string;
  horizonte_dias: number;
  fecha_prediccion: string;
  version_modelo: string;
}

export interface EntrenamientoModelo {
  id: number;
  tipo_modelo: string;
  estado: string;
  metricas: Record<string, any>;
  fecha_inicio: string;
  fecha_fin: string | null;
  usuario_email: string | null;
}

export interface MLErrorResponse {
  detail?: string;
  error?: string;
  [key: string]: any;
}

export type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'critico';
export type NivelCompra = 'bajo' | 'medio' | 'alto' | 'desconocido';
