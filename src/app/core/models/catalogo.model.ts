export interface VarianteCatalogo {
  id: number;
  nombre: string;
  sku: string;
  precio: string;
  /** Precio fijado en dólares; `precio` es su equivalente en Bs con la cotización de hoy. */
  precio_usd: string | null;
  precio_oferta: string | null;
  stock: number;
  activa: boolean;
  atributos: Record<string, string>;
  nombre_variante?: string;
  sku_variante?: string;
  precio_adicional?: string;
}

export interface ProductoCatalogo {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  imagenes: Array<{ url: string; public_id: string } | string>;
  imagen_principal?: string;
  variantes: VarianteCatalogo[];
  sku?: string;
  precio_base?: string;
  /** Precio en dólares de la variante más barata, si está fijada en dólares. */
  precio_base_usd?: string | null;
  tienda_id?: number;
  tienda_nombre?: string;
  tienda_slug?: string;
  categoria_id?: number | null;
  categoria_nombre?: string;
}

export interface TiendaCatalogo {
  id: number;
  nombre: string;
  slug: string;
  logo_url: string | null;
  color_primario: string | null;
  descripcion: string;
}

export interface CategoriaCatalogo {
  id: number;
  nombre: string;
  categoria_padre?: number | null;
}
