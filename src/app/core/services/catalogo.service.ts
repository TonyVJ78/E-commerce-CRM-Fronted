import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TiendaCatalogo {
  id: number;
  nombre: string;
  slug: string;
  logo_url: string;
  color_primario: string;
  descripcion: string;
}

export interface VarianteCatalogo {
  id: number;
  nombre_variante: string;
  precio_adicional: string;
  sku_variante: string;
}

export interface ProductoCatalogo {
  id: number;
  nombre: string;
  descripcion: string;
  precio_base: string;
  sku: string;
  variantes: VarianteCatalogo[];
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private apiUrl = `${environment.apiUrl}/catalogo`;

  constructor(private http: HttpClient) {}

  listarTiendas(): Observable<TiendaCatalogo[]> {
    return this.http.get<TiendaCatalogo[]>(`${this.apiUrl}/tiendas/`);
  }

  listarProductos(tiendaId: number): Observable<ProductoCatalogo[]> {
    return this.http.get<ProductoCatalogo[]>(
      `${this.apiUrl}/tiendas/${tiendaId}/productos/`
    );
  }
}
