export type CompararCon = 'periodo_anterior' | 'mismo_periodo_anio_anterior' | 'ninguno';

export type TipoKpi = 'moneda' | 'entero' | 'decimal' | 'porcentaje' | 'dias';

export type GrupoKpiClave = 'ventas' | 'ganancia' | 'clientes' | 'operacion' | 'experiencia';

export interface FiltrosPanel {
  tienda: number | null;
  desde: string;
  hasta: string;
  comparar_con: CompararCon;
}

export interface Kpi {
  clave: string;
  titulo: string;
  valor: number | null;
  anterior: number | null;
  /** Cambio en % (en puntos porcentuales si `tipo` es `porcentaje`); null sin base de comparación. */
  variacion: number | null;
  tipo: TipoKpi;
  mejor_si: 'sube' | 'baja';
  descripcion: string;
}

export interface GrupoKpi {
  clave: GrupoKpiClave;
  titulo: string;
  kpis: Kpi[];
}

export interface VentaDiaria {
  fecha: string;
  ingresos: number;
  pedidos: number;
}

export interface ResultadoMensual {
  mes: string;
  ingresos: number;
  ganancia_bruta: number;
  gastos: number;
  utilidad_neta: number;
}

export interface TopProducto {
  producto: string;
  ingresos: number;
  unidades: number;
  margen_pct: number;
}

export interface VentaCategoria {
  categoria: string;
  ingresos: number;
  participacion_pct: number;
}

export interface Embudo {
  vistas: number;
  carritos: number;
  compras: number;
}

export interface PedidosDiaHora {
  /** 0 = lunes. */
  dia_semana: number;
  hora: number;
  pedidos: number;
}

export interface VentaCiudad {
  ciudad: string;
  pedidos: number;
  ingresos: number;
}

export interface SeriesPanel {
  ventas_diarias: VentaDiaria[];
  resultado_mensual: ResultadoMensual[];
  top_productos: TopProducto[];
  ventas_por_categoria: VentaCategoria[];
  embudo: Embudo;
  pedidos_por_dia_hora: PedidosDiaHora[];
  ventas_por_ciudad: VentaCiudad[];
}

export interface PeriodoPanel {
  desde: string;
  hasta: string;
  comparado_desde: string | null;
  comparado_hasta: string | null;
}

export interface PanelKpis {
  periodo: PeriodoPanel;
  tiendas: { id: number; nombre: string }[];
  tienda_id: number;
  grupos: GrupoKpi[];
  series: SeriesPanel;
  notas: string[];
}

export interface PeticionInterpretacion {
  tienda?: number;
  desde?: string;
  hasta?: string;
  comparar_con?: CompararCon;
  pregunta?: string;
}

export interface InterpretacionPanel {
  resumen: string;
  hallazgos: string[];
  alertas: string[];
  recomendaciones: string[];
}
