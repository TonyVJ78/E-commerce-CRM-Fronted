import { Component, computed, inject, input } from '@angular/core';
import { formatearMonto, MonedaService } from '../../core/services/moneda.service';

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
    :host { display: inline-block; }
    .precio-principal { font-variant-numeric: tabular-nums; }
    .precio-detalle {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      column-gap: 0.5em;
      justify-content: var(--precio-detalle-justify, flex-start);
      font-size: var(--precio-detalle-size, 0.72em);
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

  private readonly moneda = inject(MonedaService);

  readonly vista = computed<VistaPrecio>(() => {
    const bs = Number(this.bs() ?? 0);
    const tasaPedido = this.tipoCambio();
    const tasa = tasaPedido ? Number(tasaPedido) : this.moneda.usdBob();
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
