import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { MonedaService } from '../../core/services/moneda.service';

/** Precio en Bs; si el usuario eligió USD agrega el equivalente con la fecha de la cotización. */
@Component({
  selector: 'app-precio',
  standalone: true,
  imports: [DatePipe],
  template: `
    <span class="precio-bs">Bs {{ bolivianos() }}</span>
    @if (usd(); as eq) {
      <small class="precio-usd">
        ≈ US$ {{ eq.monto }}
        <span class="precio-tc">
          TC {{ eq.tasa }}
          @if (eq.fecha) { del {{ eq.fecha | date: 'dd/MM/yyyy' }} } @else { al comprar }
        </span>
      </small>
    }
  `,
  styles: `
    :host { display: inline-block; }
    .precio-usd {
      display: block;
      font-size: 0.72em;
      font-weight: 500;
      line-height: 1.3;
      color: var(--text-secondary);
    }
    .precio-tc { display: block; font-size: 0.9em; }
  `,
})
export class PrecioComponent {
  readonly bs = input.required<number | string | null | undefined>();
  /** Bs por USD guardados con un pedido ya hecho; sin él se usa la cotización vigente. */
  readonly tipoCambio = input<string | null | undefined>(null);

  private readonly moneda = inject(MonedaService);

  readonly bolivianos = computed(() => Number(this.bs()).toFixed(2));
  readonly usd = computed(() => this.moneda.equivalenteUsd(this.bs(), this.tipoCambio()));
}
