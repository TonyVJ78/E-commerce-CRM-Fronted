export interface Tienda {
  id: number;
  propietario: number;
  propietario_email?: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  logo_url?: string;
  banner_url?: string;
  color_primario?: string;
  activa: boolean;
  creada?: string;
  fecha_creacion?: string;
}

export interface TiendaCreate {
  nombre: string;
  slug?: string;
  descripcion?: string;
  logo_url?: string;
  banner_url?: string;
  color_primario?: string;
}

export type CreateTiendaData = TiendaCreate;

export interface TiendaIdentidad {
  id: number;
  nombre: string;
  slug: string;
  logo_url: string;
  color_primario: string;
}

export interface TiendaIdentidadUpdate {
  slug: string;
  color_primario: string;
}

export interface SlugDisponibilidad {
  slug: string;
  disponible: boolean;
}

export interface VentaDia {
  fecha: string;
  cantidad: number;
}

export interface DashboardVendedorMetrics {
  total_productos: number;
  productos_activos: number;
  total_pedidos: number;
  pedidos_pendientes: number;
  tienda: Pick<Tienda, 'id' | 'nombre' | 'slug' | 'descripcion' | 'logo_url' | 'color_primario' | 'activa'>;
  tienda_id: number;
  tienda_nombre: string;
  ingresos_totales: string;
  productos_bajo_stock: number;
  ventas_semana: VentaDia[];
  alertas_stock: AlertaStock[];
}

export interface AlertaStock {
  producto_id: number;
  producto_nombre: string;
  variante_id: number;
  variante_nombre: string;
  sku: string;
  stock: number;
  stock_minimo: number;
}

export interface AlertasStockResponse {
  tienda_id: number;
  cantidad: number;
  alertas_stock: AlertaStock[];
}

export type DashboardMetrics = DashboardVendedorMetrics;
