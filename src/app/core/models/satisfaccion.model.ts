export interface DistribucionEstrellas {
  estrellas: number;
  cantidad: number;
  porcentaje: number;
}

export interface ProporcionSentimiento {
  cantidad: number;
  porcentaje: number;
}

export interface SentimientoResenas {
  positivas: ProporcionSentimiento;
  neutras: ProporcionSentimiento;
  negativas: ProporcionSentimiento;
}

export interface TendenciaMensual {
  mes: string;
  promedio: number | null;
  cantidad: number;
}

export interface ProductoCalificado {
  producto_id: number;
  nombre: string;
  promedio: number | null;
  cantidad: number;
}

export interface TasaRespuesta {
  pedidos_entregados: number;
  pedidos_calificados: number;
  porcentaje: number;
}

export interface ResenaTienda {
  id: number;
  calificacion: number;
  comentario: string;
  producto: string | null;
  cliente: string;
  fecha: string;
}

export interface SatisfaccionResponse {
  tienda: { id: number; nombre: string };
  desde: string | null;
  hasta: string | null;
  total: number;
  promedio: number | null;
  distribucion: DistribucionEstrellas[];
  sentimiento: SentimientoResenas;
  tendencia_mensual: TendenciaMensual[];
  minimo_resenas_ranking: number;
  productos_mejor_calificados: ProductoCalificado[];
  productos_peor_calificados: ProductoCalificado[];
  tasa_respuesta: TasaRespuesta;
  ultimas_resenas: ResenaTienda[];
}

export interface ResumenComentariosIa {
  resumen: string;
  temas_positivos: string[];
  temas_negativos: string[];
  recomendacion: string;
  comentarios_analizados: number;
}

export interface FiltroSatisfaccion {
  desde: string;
  hasta: string;
}
