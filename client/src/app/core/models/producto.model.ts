export interface Producto {
  id?: number;
  tienda: number;
  tienda_nombre?: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  categoria?: string;
  imagen_url?: string;
  activo?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}