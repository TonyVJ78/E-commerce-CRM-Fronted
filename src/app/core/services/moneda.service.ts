import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Moneda, TipoCambio, TipoCambioResponse } from '../models/finanzas.model';

const CLAVE_MONEDA = 'km_moneda';

const PREFIJO: Record<Moneda, string> = { BOB: 'Bs', USD: 'US$' };

const formatoMonto = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoTasa = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** «Bs 1.234,50» o «US$ 1.234,50». */
export function formatearMonto(monto: number, moneda: Moneda): string {
  return `${PREFIJO[moneda]} ${formatoMonto.format(monto)}`;
}

/** Tasa Bs por USD sin ceros de más: «11,75». */
export function formatearTasa(tasa: number): string {
  return formatoTasa.format(tasa);
}

@Injectable({ providedIn: 'root' })
export class MonedaService {
  private readonly http = inject(HttpClient);

  readonly moneda = signal<Moneda>(this.leerMonedaGuardada());
  readonly cotizacion = signal<TipoCambio | null>(null);
  readonly usdDisponible = computed(() => this.cotizacion() !== null);
  /** Sin cotización no se inventa una tasa: se muestra solo en Bs aunque se haya elegido USD. */
  readonly mostrarUsd = computed(() => this.moneda() === 'USD' && this.usdDisponible());
  readonly usdBob = computed(() => {
    const cotizacion = this.cotizacion();
    return cotizacion ? Number(cotizacion.usd_bob) : null;
  });

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

  /** Bs equivalentes a un monto en USD con la cotización vigente, redondeados a centavos; null sin cotización. */
  usdABs(usd: number | string | null | undefined): number | null {
    const tasa = this.usdBob();
    const monto = Number(usd);
    if (tasa === null || usd === null || usd === undefined || usd === '' || Number.isNaN(monto)) return null;
    return Math.round(monto * tasa * 100) / 100;
  }

  /** Precio en Bs de un formulario de producto: el equivalente de `precio_usd` si se fija en dólares. */
  precioEnBs(valor: {
    moneda_precio: Moneda;
    precio: number | string | null;
    precio_usd: number | string | null;
  }): number | string | null {
    return valor.moneda_precio === 'USD' ? this.usdABs(valor.precio_usd) : valor.precio;
  }

  private leerMonedaGuardada(): Moneda {
    try {
      return localStorage.getItem(CLAVE_MONEDA) === 'USD' ? 'USD' : 'BOB';
    } catch {
      return 'BOB';
    }
  }
}
