/** Producto real serializado por GET /recomendaciones/tiendas/{id}/. */
export interface ProductoRecomendado {
  id: number;
  tienda_id: number;
  tienda_nombre: string;
  nombre: string;
  slug: string;
  descripcion: string;
  categoria_nombre: string;
  precio_base: string;
  imagen_principal: string;
  imagenes: Array<{url: string} | string>;
  variantes: Array<{
    id: number;
    nombre: string;
    precio: string;
    stock: number;
    activa: boolean;
  }>;
}
