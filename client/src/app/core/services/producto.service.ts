import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private apiUrl = `${environment.apiUrl}/tiendas/productos/`;

  constructor(private http: HttpClient) {}

  // Listar productos de las tiendas del usuario empresa
  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl);
  }

  // Obtener detalle de un producto por ID
  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}${id}/`);
  }

  // Registrar un producto nuevo
  crear(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, producto);
  }

  // CU09: Editar / Actualizar producto (PATCH)
  actualizar(id: number, data: Partial<Producto>): Observable<Producto> {
    return this.http.patch<Producto>(`${this.apiUrl}${id}/`, data);
  }

  // CU09: Eliminar producto (DELETE -> Soft delete en backend)
  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`);
  }
}