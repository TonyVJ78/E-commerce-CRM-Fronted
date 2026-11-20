import { Component, computed, inject, input } from '@angular/core';
import { formatearTasa, MonedaService } from '../../core/services/moneda.service';

/** Nota con el tipo de cambio: el vigente, o el guardado con un pedido si se pasa `tasa`. */
@Component({
  selector: 'app-tc-nota',
  standalone: true,
  template: `@if (texto(); as t) { <small class="tc-nota">{{ t }}</small> }`,
  styles: `
    :host { display: block; }
    .tc-nota {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      color: var(--text-secondary);
    }
  `,
})
export class TcNotaComponent {
  /** Bs por USD guardados con un pedido; sin él se usa la cotización vigente. */
  readonly tasa = input<string | null | undefined>(null);

  private readonly moneda = inject(MonedaService);

  readonly texto = computed(() => {
    const tasaPedido = this.tasa();
    if (tasaPedido) return `TC al comprar ${formatearTasa(Number(tasaPedido))}`;
    const cotizacion = this.moneda.cotizacion();
    if (!cotizacion) return null;
    const fecha = cotizacion.fecha.split('-').reverse().join('/');
    return `TC oficial BCB ${formatearTasa(Number(cotizacion.usd_bob))} · ${fecha}`;
  });
}
