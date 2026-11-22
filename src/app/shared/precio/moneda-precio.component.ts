import { Component, DestroyRef, OnInit, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, Validators } from '@angular/forms';
import { Moneda } from '../../core/models/finanzas.model';
import { formatearMonto, MonedaService } from '../../core/services/moneda.service';
import { TcNotaComponent } from './tc-nota.component';

let siguienteId = 0;

/**
 * Elige en qué moneda se fija el precio de una variante y muestra el equivalente en Bs.
 * Va alrededor del input del precio: `grupo` debe tener los controles `moneda_precio`,
 * `precio` (Bs) y `precio_usd`; el contenido proyectado es el input que corresponda.
 */
@Component({
  selector: 'app-moneda-precio',
  standalone: true,
  imports: [TcNotaComponent],
  template: `
    <div class="mp-fila">
      <span class="mp-etiqueta" [id]="id + '-etiqueta'">Fijar precio en</span>
      <div class="mp-opciones" role="group" [attr.aria-labelledby]="id + '-etiqueta'">
        <button type="button" [attr.aria-pressed]="!enUsd()" (click)="elegir('BOB')">Bs</button>
        <button
          type="button"
          [attr.aria-pressed]="enUsd()"
          [disabled]="!moneda.usdDisponible() && !enUsd()"
          [attr.aria-describedby]="moneda.usdDisponible() ? null : id + '-aviso'"
          (click)="elegir('USD')">USD</button>
      </div>
    </div>
    <ng-content />
    @if (!moneda.usdDisponible() && !enUsd()) {
      <small class="mp-nota" [id]="id + '-aviso'">
        No hay cotización USD disponible: el precio solo se puede fijar en Bs.
      </small>
    }
    @if (enUsd()) {
      <small class="mp-nota">
        @if (equivalente(); as eq) {
          <span class="mp-cifra">Equivale a {{ eq }}</span>
        } @else {
          Ingresa el precio en dólares para ver su equivalente.
        }
        Se recalcula con cada cotización nueva.
      </small>
      <app-tc-nota />
    }
  `,
  styles: `
    :host { display: block; }
    .mp-fila {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem 0.75rem;
      margin-bottom: 0.4rem;
    }
    .mp-etiqueta {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .mp-opciones {
      display: inline-flex;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--surface);
    }
    .mp-opciones button {
      min-width: 3rem;
      min-height: 40px;
      padding: 0.3rem 0.7rem;
      border: 0;
      background: transparent;
      color: var(--text-secondary);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .mp-opciones button + button { border-left: 1px solid var(--border); }
    .mp-opciones button[aria-pressed='true'] {
      background: var(--ink);
      color: #fff;
    }
    .mp-opciones button:disabled { opacity: 0.5; cursor: not-allowed; }
    .mp-opciones button:focus-visible {
      outline: 2px solid var(--titicaca);
      outline-offset: -2px;
    }
    .mp-nota {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.75rem;
      line-height: 1.4;
      color: var(--text-secondary);
    }
    .mp-cifra {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      color: var(--titicaca);
    }
  `,
})
export class MonedaPrecioComponent implements OnInit {
  readonly grupo = input.required<FormGroup>();
  /** Mínimo del precio en Bs cuando se fija en Bs. */
  readonly precioMin = input(0);

  readonly moneda = inject(MonedaService);
  protected readonly id = `mp-${siguienteId++}`;
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const control = this.grupo().controls['moneda_precio'];
    this.aplicarValidadores(control.value);
    control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((m) => this.aplicarValidadores(m));
  }

  enUsd(): boolean {
    return this.grupo().controls['moneda_precio'].value === 'USD';
  }

  equivalente(): string | null {
    const bs = this.moneda.usdABs(this.grupo().controls['precio_usd'].value);
    return bs === null ? null : formatearMonto(bs, 'BOB');
  }

  elegir(moneda: Moneda): void {
    const { moneda_precio, precio, precio_usd } = this.grupo().controls;
    if (moneda_precio.value === moneda) return;
    if (moneda === 'BOB') {
      const bs = this.moneda.usdABs(precio_usd.value);
      if (bs !== null) precio.setValue(bs);
      precio_usd.setValue(null);
    }
    moneda_precio.setValue(moneda);
  }

  private aplicarValidadores(moneda: Moneda): void {
    const { precio, precio_usd } = this.grupo().controls;
    if (moneda === 'USD') {
      precio.setValidators([]);
      precio_usd.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      precio.setValidators([Validators.required, Validators.min(this.precioMin())]);
      precio_usd.setValidators([]);
    }
    precio.updateValueAndValidity({ emitEvent: false });
    precio_usd.updateValueAndValidity({ emitEvent: false });
  }
}
