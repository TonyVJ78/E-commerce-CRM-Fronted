import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Tienda {
  id: number;
  propietario: number;
  propietario_email: string;
  nombre: string;
  slug: string;
  logo_url: string;
  color_primario: string;
  descripcion: string;
  fecha_creacion: string;
  activa: boolean;
}

export interface CreateTiendaData {
  nombre: string;
  slug?: string;
  logo_url?: string;
  color_primario?: string;
  descripcion?: string;
}

export interface VentaDia {
  fecha: string;
  cantidad: number;
}

export interface DashboardMetrics {
  total_productos: number;
  productos_activos: number;
  total_pedidos: number;
  pedidos_pendientes: number;
  ingresos_totales: number;
  productos_bajo_stock: number;
  grafico_ventas: VentaDia[];
}

@Injectable({
  providedIn: 'root'
})
export class TiendaService {
  private apiUrl = `${environment.apiUrl}/tiendas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Tienda[]> {
    return this.http.get<Tienda[]>(`${this.apiUrl}/`);
  }

  crear(data: CreateTiendaData): Observable<Tienda> {
    return this.http.post<Tienda>(`${this.apiUrl}/`, data);
  }

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.apiUrl}/dashboard/`);
  }
}
