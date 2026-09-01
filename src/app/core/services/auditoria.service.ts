import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BitacoraAcceso {
  id: number;
  usuario: number;
  usuario_email: string;
  usuario_nombre: string;
  fecha: string;
  ip: string;
  dispositivo: string;
}

export interface LogAuditoria {
  id: number;
  usuario: number | null;
  usuario_email: string | null;
  tabla_afectada: string;
  registro_id: number;
  accion: string;
  datos_anteriores: any;
  datos_nuevos: any;
  fecha: string;
}

export interface FiltrosBitacora {
  usuario?: string;
  ip?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  page_size?: number;
}

export interface FiltrosLogs {
  usuario?: string;
  tabla?: string;
  accion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  page_size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private apiUrl = `${environment.apiUrl}/auditoria`;

  constructor(private http: HttpClient) {}

  private toParams(filtros: object): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && `${valor}` !== '') {
        params = params.set(clave, `${valor}`);
      }
    }
    return params;
  }

  listarBitacora(filtros: FiltrosBitacora = {}): Observable<Paginated<BitacoraAcceso>> {
    return this.http.get<Paginated<BitacoraAcceso>>(`${this.apiUrl}/bitacora/`, {
      params: this.toParams(filtros)
    });
  }

  listarLogs(filtros: FiltrosLogs = {}): Observable<Paginated<LogAuditoria>> {
    return this.http.get<Paginated<LogAuditoria>>(`${this.apiUrl}/logs/`, {
      params: this.toParams(filtros)
    });
  }
}
