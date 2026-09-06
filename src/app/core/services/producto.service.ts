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

  listar(tiendaId: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/${tiendaId}/productos/`);
  }

  obtener(tiendaId: number, productoId: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${tiendaId}/productos/${productoId}/`);
  }

  crear(tiendaId: number, data: FormData): Observable<Producto> {
    return this.http.post<Producto>(`${this.apiUrl}/${tiendaId}/productos/`, data);
  }
}
