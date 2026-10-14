import { MensajeChatApi } from './chatbot.model';

/** Tipo de una columna del informe: define cómo se formatea y alinea. */
export type TipoColumnaInforme = 'texto' | 'entero' | 'moneda' | 'decimal' | 'fecha';

export interface ColumnaInforme {
  clave: string;
  titulo: string;
  tipo: TipoColumnaInforme;
  /** Se totaliza al pie. Los conteos distintos y los promedios no. */
  sumable?: boolean;
}

export type ValorCelda = string | number | null;

export interface GraficoInforme {
  tipo?: 'barras' | 'lineas';
  etiqueta?: string;
  valor?: string;
}

/** Fila del historial (`GET /api/ia/informes/`). */
export interface InformeResumen {
  id: number;
  titulo: string;
  pregunta: string;
  tienda: number | null;
  tienda_nombre: string | null;
  total_filas: number;
  fecha_generacion: string;
}

/** Informe completo: tabla + análisis (`GET /api/ia/informes/<id>/`). */
export interface Informe extends InformeResumen {
  analisis: string;
  grafico: GraficoInforme;
  columnas: ColumnaInforme[];
  filas: ValorCelda[][];
  truncado: boolean;
  filtros: string;
}

export interface ContextoInformes {
  tiendas: { id: number; nombre: string }[];
  es_administrador: boolean;
  puede_crear: boolean;
  puede_eliminar: boolean;
  ejemplos: string[];
}

export interface GenerarInformeResponse {
  tipo: 'pregunta' | 'informe';
  mensaje: string;
  sugerencias: string[];
  informe: Informe | null;
}

/** Mensaje de la conversación de informes en pantalla. */
export interface MensajeInforme extends MensajeChatApi {
  sugerencias?: string[];
  error?: boolean;
  /** Si la respuesta generó un informe, su id y título para volver a abrirlo. */
  informeId?: number;
  informeTitulo?: string;
}

export type FormatoExportacion = 'pdf' | 'xlsx';
