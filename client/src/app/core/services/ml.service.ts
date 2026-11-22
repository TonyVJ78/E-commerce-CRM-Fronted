/**
 * Servicio de Machine Learning (CU-35).
 * Conecta con los endpoints /api/ml/ del backend Django.
 * El authInterceptor inyecta automáticamente el token JWT en cada petición.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  PronosticoVentaResponse,
  PronosticarVentasInput,
  RiesgoAbandonoResponse,
  EvaluarRiesgoAbandonoInput,
  PrediccionCompraResponse,
  PredecirCompraInput,
  PrediccionCompraGuardada,
  PronosticoVentaGuardado,
  RiesgoAbandonoGuardado,
  EntrenamientoModelo,
  MLErrorResponse,
} from '../models/ml.model';

@Injectable({ providedIn: 'root' })
export class MlService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ml`;

  // A. Pronóstico de ventas

  /**
   * POST /api/ml/ventas/pronosticar/
   * Ejecuta un pronóstico de ventas para la tienda indicada.
   * Requiere rol empresa sobre su propia tienda.
   */
  pronosticarVentas(data: PronosticarVentasInput): Observable<PronosticoVentaResponse> {
    return this.http.post<PronosticoVentaResponse>(
      `${this.apiUrl}/ventas/pronosticar/`,
      data
    );
  }

  /**
   * GET /api/ml/ventas/pronosticos/?tienda_id=X
   * Lista los pronósticos de venta guardados de la tienda.
   */
  listarPronosticosVenta(tiendaId?: number): Observable<PronosticoVentaGuardado[]> {
    let params = new HttpParams();
    if (tiendaId) {
      params = params.set('tienda_id', String(tiendaId));
    }
    return this.http.get<PronosticoVentaGuardado[]>(
      `${this.apiUrl}/ventas/pronosticos/`,
      { params }
    );
  }

  // B. Riesgo de abandono

  /**
   * POST /api/ml/clientes/riesgo-abandono/
   * Evalúa el riesgo de abandono de clientes de una tienda.
   * Requiere rol empresa sobre su propia tienda.
   */
  evaluarRiesgoAbandono(data: EvaluarRiesgoAbandonoInput): Observable<RiesgoAbandonoResponse> {
    return this.http.post<RiesgoAbandonoResponse>(
      `${this.apiUrl}/clientes/riesgo-abandono/`,
      data
    );
  }

  /**
   * GET /api/ml/clientes/riesgos-abandono/?tienda_id=X
   * Lista los riesgos de abandono guardados.
   */
  listarRiesgosAbandono(tiendaId?: number): Observable<RiesgoAbandonoGuardado[]> {
    let params = new HttpParams();
    if (tiendaId) {
      params = params.set('tienda_id', String(tiendaId));
    }
    return this.http.get<RiesgoAbandonoGuardado[]>(
      `${this.apiUrl}/clientes/riesgos-abandono/`,
      { params }
    );
  }

  // C. Predicción de compras

  /**
   * POST /api/ml/compras/predecir/
   * Predice la probabilidad de próxima compra de un cliente en una tienda.
   * Empresa: puede consultar clientes de su tienda. Cliente: solo a sí mismo.
   */
  predecirCompra(data: PredecirCompraInput): Observable<PrediccionCompraResponse> {
    return this.http.post<PrediccionCompraResponse>(
      `${this.apiUrl}/compras/predecir/`,
      data
    );
  }

  /**
   * GET /api/ml/compras/predicciones/?tienda_id=X
   * Lista las predicciones de compra.
   */
  listarPrediccionesCompra(tiendaId?: number): Observable<PrediccionCompraGuardada[]> {
    let params = new HttpParams();
    if (tiendaId) {
      params = params.set('tienda_id', String(tiendaId));
    }
    return this.http.get<PrediccionCompraGuardada[]>(
      `${this.apiUrl}/compras/predicciones/`,
      { params }
    );
  }

  // D. Entrenamientos

  /**
   * GET /api/ml/entrenamientos/
   * Historial de entrenamientos del usuario autenticado.
   */
  listarEntrenamientos(): Observable<EntrenamientoModelo[]> {
    return this.http.get<EntrenamientoModelo[]>(
      `${this.apiUrl}/entrenamientos/`
    );
  }

  // Utilidades

  /**
   * Extrae un mensaje de error legible desde una respuesta de error del backend.
   */
  extraerMensajeError(error: MLErrorResponse): string {
    if (!error) {
      return 'Error inesperado del servidor.';
    }
    if (error.detail) {
      return String(error.detail);
    }
    if (error.error) {
      return String(error.error);
    }
    return 'Error al procesar la solicitud de Machine Learning.';
  }

  /**
   * Determina si un error HTTP es de permiso denegado (403).
   */
  esErrorPermiso(status: number | null): boolean {
    return status === 403;
  }

  /**
   * Determina si un error HTTP es de autenticación (401).
   */
  esErrorAutenticacion(status: number | null): boolean {
    return status === 401;
  }

  /**
   * Determina si el resultado indica datos insuficientes (no es un error,
   * sino una respuesta válida del modelo sin datos suficientes).
   */
  esDatosInsuficientes(estado: string | undefined): boolean {
    return estado === 'datos_insuficientes';
  }
}
