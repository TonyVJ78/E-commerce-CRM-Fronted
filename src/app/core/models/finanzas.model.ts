export type Moneda = 'BOB' | 'USD';

export interface TipoCambio {
  fecha: string;
  usd_bob: string;
  ufv_bob: string | null;
  fuente: string;
}

export interface TipoCambioResponse {
  vigente: TipoCambio | null;
  historial: TipoCambio[];
}

export type CategoriaGasto =
  | 'alquiler'
  | 'servicios'
  | 'sueldos'
  | 'marketing'
  | 'transporte'
  | 'impuestos'
  | 'otros';

export const CATEGORIAS_GASTO: { valor: CategoriaGasto; etiqueta: string }[] = [
  { valor: 'alquiler', etiqueta: 'Alquiler' },
  { valor: 'servicios', etiqueta: 'Servicios básicos' },
  { valor: 'sueldos', etiqueta: 'Sueldos' },
  { valor: 'marketing', etiqueta: 'Marketing' },
  { valor: 'transporte', etiqueta: 'Transporte y envíos' },
  { valor: 'impuestos', etiqueta: 'Impuestos' },
  { valor: 'otros', etiqueta: 'Otros' },
];

export interface Gasto {
  id: number;
  categoria: CategoriaGasto;
  categoria_etiqueta: string;
  descripcion: string;
  monto: string;
  fecha: string;
}

export interface GastoPayload {
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  fecha: string;
}

export interface FiltrosGasto {
  desde?: string;
  hasta?: string;
  categoria?: CategoriaGasto | '';
}

export interface TotalesGastos {
  total: string;
  por_categoria: { categoria: CategoriaGasto; etiqueta: string; total: string }[];
  por_mes: { mes: string; total: string }[];
}
