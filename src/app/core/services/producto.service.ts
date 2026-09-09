import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Categoria {
  id: number;
  nombre: string;
  categoria_padre: number | null;
}

export interface VarianteProducto {
  id: number;
  sku: string;
  nombre: string;
  precio: string;
  precio_oferta: string | null;
  stock: number;
  stock_minimo: number;
  atributos: Record<string, string>;
  activa: boolean;
}

export interface Producto {
  id: number;
  tienda: number;
  categoria_id: number | null;
  nombre: string;
  slug: string;
  descripcion: string;
  etiquetas: string[];
  imagenes: Array<{ url: string; public_id: string }>;
  activo: boolean;
  creado: string;
  actualizado: string;
  variantes: VarianteProducto[];
  stock_total: number;
  agotado: boolean;
  en_stock: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private apiUrl = `${environment.apiUrl}/tiendas`;

  constructor(private http: HttpClient) {}

  listarCategorias(tiendaId: number): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/${tiendaId}/categorias/`);
  }

  listar(tiendaId?: number): Observable<any[]> {
    if (tiendaId !== undefined) {
      return this.http.get<any[]>(`${this.apiUrl}/${tiendaId}/productos/`);
    }
    return this.http.get<any[]>(`${this.apiUrl}/productos/`);
  }

  obtener(idOrTiendaId: number, productoId?: number): Observable<any> {
    if (productoId !== undefined) {
      return this.http.get<any>(`${this.apiUrl}/${idOrTiendaId}/productos/${productoId}/`);
    }
    return this.http.get<any>(`${this.apiUrl}/productos/${idOrTiendaId}/`);
  }

  crear(tiendaId: number, data: FormData): Observable<Producto> {
    return this.http.post<Producto>(`${this.apiUrl}/${tiendaId}/productos/`, data);
  }

  // CU09: Editar / Actualizar producto (PATCH)
  actualizar(id: number, data: Partial<any>): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/productos/${id}/`, data);
  }

  // CU09: Eliminar producto (DELETE -> Soft delete en backend)
  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/productos/${id}/`);
  }
}
