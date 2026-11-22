import { Component, computed, inject, input } from '@angular/core';
import { formatearMonto, formatearDecimalExacto, MonedaService } from '../../core/services/moneda.service';
import { VisualizacionBrl } from '../../core/models/finanzas.model';

interface VistaPrecio {
  principal: string;
  secundario: string | null;
  fijoEnUsd: boolean;
}

/**
 * Precio en la moneda que eligió el usuario, con la otra en segundo plano.
 * Un producto fijado en dólares (`usd`) lleva una marca; el tipo de cambio no se
 * repite aquí: va una vez en el total o el detalle con `<app-tc-nota>`.
 */
@Component({
  selector: 'app-precio',
  standalone: true,
  template: `
    <span class="precio-principal">{{ vista().principal }}</span>
    @if (brlCampo() === 'precio_efectivo') {
      @if (referenciaBrl(); as referencia) {
        <small class="precio-detalle">{{ referencia }}</small>
      }
    }
    @if (vista().secundario || vista().fijoEnUsd) {
      <small class="precio-detalle">
        @if (vista().secundario) {
          <span class="precio-secundario">{{ vista().secundario }}</span>
        }
        @if (vista().fijoEnUsd) {
          <span class="precio-marca">precio en dólares</span>
        }
      </small>
    }
  `,
  styles: `
    :host { display: inline-block; min-width: 0; max-width: 100%; }
    .precio-principal { font-variant-numeric: tabular-nums; white-space: nowrap; line-height: 1.2; }
    .precio-detalle {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      column-gap: 0.5em;
      justify-content: var(--precio-detalle-justify, flex-start);
      font-size: var(--precio-detalle-size, 0.8125rem);
      overflow-wrap: anywhere;
      margin-top: 0.25rem;
      font-weight: 500;
      font-style: normal;
      line-height: 1.4;
      text-decoration: none;
      color: var(--text-secondary);
    }
    .precio-secundario {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
    }
    .precio-marca {
      color: var(--titicaca);
      font-weight: 600;
    }
    .precio-secundario + .precio-marca::before {
      content: '·';
      margin-right: 0.5em;
      color: var(--text-secondary);
    }
  `,
})
export class PrecioComponent {
  readonly bs = input.required<number | string | null | undefined>();
  /** Precio fijado en dólares del producto; `bs` es su equivalente guardado. */
  readonly usd = input<number | string | null | undefined>(null);
  /** Bs por USD guardados con un pedido ya hecho; sin él se usa la cotización vigente. */
  readonly tipoCambio = input<string | null | undefined>(null);
  /** Falso en listas densas donde la otra moneda estorba. Un producto en dólares siempre la muestra. */
  readonly secundaria = input(true);
  readonly historico = input(false);
  readonly contextoCatalogo = input(false);
  readonly brl = input<VisualizacionBrl | null>(null);
  readonly brlCampo = input<'precio_normal' | 'precio_efectivo'>('precio_efectivo');

  private readonly moneda = inject(MonedaService);

  readonly referenciaBrl = computed(() => {
    const info = this.brl();
    if (!this.contextoCatalogo() || this.historico() || this.moneda.moneda() !== 'BRL' || !info
        || !this.moneda.brlCoincide(info) || !formatearDecimalExacto(info[this.brlCampo()], 'BRL')) return null;
    return `${info.demo ? 'DEMO — tasa sintética' : 'Equivalencia indicativa'} · ${info.cotizacion_fecha.split('-').reverse().join('/')} · ${info.fuente}`;
  });

  readonly vista = computed<VistaPrecio>(() => {
    const info = this.brl();
    if (this.referenciaBrl() && info) {
      return { principal: `≈ ${formatearDecimalExacto(info[this.brlCampo()], 'BRL')}`,
        secundario: formatearMonto(Number(this.bs() ?? 0), 'BOB'), fijoEnUsd: false };
    }
    const bs = Number(this.bs() ?? 0);
    const tasaPedido = this.tipoCambio();
    const tasa = tasaPedido ? Number(tasaPedido) : (this.historico() ? null : this.moneda.usdBob());
    if (tasa === null) {
      return { principal: formatearMonto(bs, 'BOB'), secundario: null, fijoEnUsd: false };
    }

    const usdFijo = this.usd();
    const fijoEnUsd = usdFijo !== null && usdFijo !== undefined && usdFijo !== '';
    const montoUsd = fijoEnUsd ? Number(usdFijo) : bs / tasa;
    const textoBs = formatearMonto(bs, 'BOB');
    const textoUsd = formatearMonto(montoUsd, 'USD');
    const enUsd = this.moneda.moneda() === 'USD';

    if (!this.secundaria() && !fijoEnUsd) {
      return { principal: enUsd ? textoUsd : textoBs, secundario: null, fijoEnUsd };
    }
    if (enUsd) {
      const hoy = fijoEnUsd && !tasaPedido ? ' hoy' : '';
      return { principal: textoUsd, secundario: `${textoBs}${hoy}`, fijoEnUsd };
    }
    return { principal: textoBs, secundario: fijoEnUsd ? textoUsd : `≈ ${textoUsd}`, fijoEnUsd };
  });
}
