import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FiltrosPanel,
  InterpretacionPanel,
  PanelKpis,
  PeticionInterpretacion
} from '../models/panel-kpis.model';

/** Panel de KPIs de tienda e interpretación con IA de sus números. */
@Injectable({ providedIn: 'root' })
export class PanelKpisService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ia/informes/panel`;

  panel(filtros: FiltrosPanel): Observable<PanelKpis> {
    let params = new HttpParams()
      .set('desde', filtros.desde)
      .set('hasta', filtros.hasta)
      .set('comparar_con', filtros.comparar_con);
    if (filtros.tienda) params = params.set('tienda', filtros.tienda);
    return this.http.get<PanelKpis>(`${this.apiUrl}/`, { params });
  }

  interpretar(peticion: PeticionInterpretacion): Observable<InterpretacionPanel> {
    return this.http.post<InterpretacionPanel>(`${this.apiUrl}/interpretar/`, peticion);
  }
}
