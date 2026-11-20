import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FiltroSatisfaccion,
  ResumenComentariosIa,
  SatisfaccionResponse,
} from '../models/satisfaccion.model';

@Injectable({ providedIn: 'root' })
export class SatisfaccionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tiendas`;

  obtener(tiendaId: number, filtro: FiltroSatisfaccion): Observable<SatisfaccionResponse> {
    let params = new HttpParams();
    if (filtro.desde) params = params.set('desde', filtro.desde);
    if (filtro.hasta) params = params.set('hasta', filtro.hasta);
    return this.http.get<SatisfaccionResponse>(`${this.apiUrl}/${tiendaId}/satisfaccion/`, { params });
  }

  resumirComentarios(tiendaId: number, filtro: FiltroSatisfaccion): Observable<ResumenComentariosIa> {
    const cuerpo = {
      ...(filtro.desde ? { desde: filtro.desde } : {}),
      ...(filtro.hasta ? { hasta: filtro.hasta } : {}),
    };
    return this.http.post<ResumenComentariosIa>(
      `${this.apiUrl}/${tiendaId}/satisfaccion/resumen-ia/`,
      cuerpo,
    );
  }
}
