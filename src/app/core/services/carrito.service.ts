import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgregarItemCarritoRequest {
  tienda_id: number;
  variante_id: number;
}

export interface ItemCarritoCreado {
  id: number;
  carrito_id: number;
  tienda_id: number;
  variante_id: number;
  producto_id: number;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private apiUrl = `${environment.apiUrl}/pedidos/carrito`;

  constructor(private http: HttpClient) {}

  agregarItem(data: AgregarItemCarritoRequest): Observable<ItemCarritoCreado> {
    return this.http.post<ItemCarritoCreado>(`${this.apiUrl}/items/`, data);
  }
}
