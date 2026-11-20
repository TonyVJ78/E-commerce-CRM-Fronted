import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaMl } from '../models/ml.model';

/** Machine Learning de la tienda: modelos entrenados sobre sus pedidos, clientes y eventos. */
@Injectable({ providedIn: 'root' })
export class MlService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ia/ml/tiendas`;

  obtener(tiendaId: number): Observable<RespuestaMl> {
    return this.http.get<RespuestaMl>(`${this.apiUrl}/${tiendaId}/`);
  }

  entrenar(tiendaId: number): Observable<RespuestaMl> {
    return this.http.post<RespuestaMl>(`${this.apiUrl}/${tiendaId}/entrenar/`, {});
  }
}
