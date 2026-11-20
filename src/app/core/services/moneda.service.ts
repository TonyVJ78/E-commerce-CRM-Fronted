import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Moneda, TipoCambio, TipoCambioResponse } from '../models/finanzas.model';

const CLAVE_MONEDA = 'km_moneda';

export interface EquivalenteUsd {
  monto: string;
  tasa: string;
  /** Fecha de la cotización vigente; null cuando la tasa es la guardada con un pedido. */
  fecha: string | null;
}

@Injectable({ providedIn: 'root' })
export class MonedaService {
  private readonly http = inject(HttpClient);

  readonly moneda = signal<Moneda>(this.leerMonedaGuardada());
  readonly cotizacion = signal<TipoCambio | null>(null);
  readonly usdDisponible = computed(() => this.cotizacion() !== null);
  /** Sin cotización no se inventa una tasa: se muestra solo en Bs aunque se haya elegido USD. */
  readonly mostrarUsd = computed(() => this.moneda() === 'USD' && this.usdDisponible());

  constructor() {
    this.http.get<TipoCambioResponse>(`${environment.apiUrl}/finanzas/tipo-cambio/`).subscribe({
      next: (respuesta) => this.cotizacion.set(respuesta.vigente),
      error: () => this.cotizacion.set(null),
    });
  }

  elegir(moneda: Moneda): void {
    this.moneda.set(moneda);
    try {
      localStorage.setItem(CLAVE_MONEDA, moneda);
    } catch {
      // Sin almacenamiento (modo privado o bloqueado) la elección dura solo la sesión.
    }
  }

  /** Equivalente en USD de un monto en Bs, o null si el usuario no eligió USD o no hay tasa. */
  equivalenteUsd(bs: number | string | null | undefined, tasaPedido?: string | null): EquivalenteUsd | null {
    const cotizacion = this.cotizacion();
    const monto = Number(bs);
    if (!this.mostrarUsd() || !cotizacion || bs === null || bs === undefined || Number.isNaN(monto)) {
      return null;
    }
    const tasa = tasaPedido ? Number(tasaPedido) : Number(cotizacion.usd_bob);
    return {
      monto: (monto / tasa).toFixed(2),
      tasa: String(tasa),
      fecha: tasaPedido ? null : cotizacion.fecha,
    };
  }

  private leerMonedaGuardada(): Moneda {
    try {
      return localStorage.getItem(CLAVE_MONEDA) === 'USD' ? 'USD' : 'BOB';
    } catch {
      return 'BOB';
    }
  }
}
