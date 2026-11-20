import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FiltrosGasto, Gasto, GastoPayload, TotalesGastos } from '../models/finanzas.model';

@Injectable({ providedIn: 'root' })
export class GastosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/finanzas/tiendas`;

  listar(tiendaId: number, filtros: FiltrosGasto): Observable<Gasto[]> {
    return this.http.get<Gasto[]>(`${this.apiUrl}/${tiendaId}/gastos/`, { params: this.parametros(filtros) });
  }

  totales(tiendaId: number, filtros: FiltrosGasto): Observable<TotalesGastos> {
    return this.http.get<TotalesGastos>(`${this.apiUrl}/${tiendaId}/gastos/totales/`, {
      params: this.parametros(filtros),
    });
  }

  crear(tiendaId: number, datos: GastoPayload): Observable<Gasto> {
    return this.http.post<Gasto>(`${this.apiUrl}/${tiendaId}/gastos/`, datos);
  }

  actualizar(tiendaId: number, gastoId: number, datos: GastoPayload): Observable<Gasto> {
    return this.http.put<Gasto>(`${this.apiUrl}/${tiendaId}/gastos/${gastoId}/`, datos);
  }

  eliminar(tiendaId: number, gastoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${tiendaId}/gastos/${gastoId}/`);
  }

  private parametros(filtros: FiltrosGasto): HttpParams {
    let params = new HttpParams();
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    return params;
  }
}
