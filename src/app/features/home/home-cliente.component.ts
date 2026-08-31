import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CatalogoService,
  ProductoCatalogo,
  TiendaCatalogo,
  VarianteCatalogo
} from '../../core/services/catalogo.service';
import { CarritoService } from '../../core/services/carrito.service';

@Component({
  selector: 'app-home-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container catalogo-page">
      <section class="catalogo-header">
        <div>
          <span class="catalogo-badge">Mercado Digital Boliviano</span>
          <h1>Catálogo de productos</h1>
          <p>Selecciona una tienda y agrega una variante a tu carrito.</p>
        </div>

        <div class="selector-tienda" *ngIf="tiendas.length > 0">
          <label for="tienda-catalogo">Tienda</label>
          <select
            id="tienda-catalogo"
            [(ngModel)]="tiendaSeleccionadaId"
            (ngModelChange)="cargarProductos()"
          >
            <option *ngFor="let tienda of tiendas" [ngValue]="tienda.id">
              {{ tienda.nombre }}
            </option>
          </select>
        </div>
      </section>

      <p class="alert alert-success" role="status" *ngIf="mensajeExito">
        {{ mensajeExito }}
      </p>
      <p class="alert alert-error" role="alert" *ngIf="mensajeError">
        {{ mensajeError }}
      </p>

      <div class="loading-state" *ngIf="cargandoTiendas || cargandoProductos">
        Cargando catálogo...
      </div>

      <div class="empty-state" *ngIf="!cargandoTiendas && tiendas.length === 0 && !mensajeError">
        <h3>No hay tiendas disponibles</h3>
      </div>

      <div
        class="empty-state"
        *ngIf="!cargandoProductos && tiendaSeleccionadaId && productos.length === 0 && !mensajeError"
      >
        <h3>Esta tienda no tiene productos</h3>
      </div>

      <section class="productos-grid" *ngIf="!cargandoProductos && productos.length > 0">
        <article class="producto-card" *ngFor="let producto of productos">
          <div class="producto-info">
            <span class="producto-sku" *ngIf="producto.sku">SKU: {{ producto.sku }}</span>
            <h2>{{ producto.nombre }}</h2>
            <p class="producto-descripcion" *ngIf="producto.descripcion">
              {{ producto.descripcion }}
            </p>
            <p class="precio-base">Precio base: Bs {{ producto.precio_base }}</p>
          </div>

          <div class="variantes">
            <h3>Variantes</h3>
            <p class="sin-variantes" *ngIf="producto.variantes.length === 0">
              Este producto no tiene variantes disponibles.
            </p>

            <div class="variante-row" *ngFor="let variante of producto.variantes">
              <div>
                <strong>{{ variante.nombre_variante }}</strong>
                <span *ngIf="variante.sku_variante">SKU: {{ variante.sku_variante }}</span>
                <span>Precio adicional: Bs {{ variante.precio_adicional }}</span>
              </div>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="agregandoVarianteId !== null"
                (click)="agregarAlCarrito(producto, variante)"
              >
                {{ agregandoVarianteId === variante.id ? 'Agregando...' : 'Agregar al carrito' }}
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  `,
  styles: [`
    .catalogo-page {
      padding-top: 2rem;
      padding-bottom: 3rem;
    }

    .catalogo-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 2rem;
      margin-bottom: 1.5rem;
    }

    .catalogo-badge {
      display: inline-block;
      color: var(--success);
      font-size: 0.82rem;
      font-weight: 700;
      margin-bottom: 0.45rem;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 0.35rem;
    }

    .catalogo-header p,
    .producto-descripcion,
    .sin-variantes {
      color: var(--text-secondary);
    }

    .selector-tienda {
      min-width: 250px;
    }

    .selector-tienda label {
      display: block;
      font-weight: 700;
      margin-bottom: 0.4rem;
    }

    .selector-tienda select {
      width: 100%;
      padding: 0.7rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
    }

    .alert {
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      padding: 0.85rem 1rem;
    }

    .alert-success {
      color: var(--success);
      background: rgba(39, 174, 96, 0.1);
      border: 1px solid rgba(39, 174, 96, 0.35);
    }

    .alert-error {
      color: var(--primary);
      background: rgba(200, 16, 46, 0.08);
      border: 1px solid rgba(200, 16, 46, 0.25);
    }

    .loading-state,
    .empty-state {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2rem;
      text-align: center;
    }

    .productos-grid {
      display: grid;
      gap: 1.25rem;
    }

    .producto-card {
      display: grid;
      grid-template-columns: minmax(220px, 0.8fr) minmax(300px, 1.2fr);
      gap: 1.5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
    }

    .producto-card h2 {
      margin: 0.35rem 0 0.65rem;
    }

    .producto-sku,
    .variante-row span {
      display: block;
      color: var(--text-secondary);
      font-size: 0.82rem;
    }

    .precio-base {
      font-weight: 700;
      margin-top: 1rem;
    }

    .variantes h3 {
      margin-bottom: 0.75rem;
    }

    .variante-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 0;
      border-top: 1px solid var(--border);
    }

    .variante-row strong {
      display: block;
      margin-bottom: 0.2rem;
    }

    @media (max-width: 760px) {
      .catalogo-header,
      .producto-card {
        display: block;
      }

      .selector-tienda {
        margin-top: 1rem;
        min-width: 100%;
      }

      .variantes {
        margin-top: 1.25rem;
      }

      .variante-row {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `]
})
export class HomeClienteComponent implements OnInit {
  tiendas: TiendaCatalogo[] = [];
  productos: ProductoCatalogo[] = [];
  tiendaSeleccionadaId: number | null = null;
  cargandoTiendas = false;
  cargandoProductos = false;
  agregandoVarianteId: number | null = null;
  mensajeExito = '';
  mensajeError = '';

  constructor(
    private catalogoService: CatalogoService,
    private carritoService: CarritoService
  ) {}

  ngOnInit(): void {
    this.cargarTiendas();
  }

  cargarTiendas(): void {
    this.cargandoTiendas = true;
    this.limpiarMensajes();

    this.catalogoService.listarTiendas().subscribe({
      next: (tiendas) => {
        this.tiendas = tiendas;
        this.cargandoTiendas = false;
        if (tiendas.length > 0) {
          this.tiendaSeleccionadaId = tiendas[0].id;
          this.cargarProductos();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoTiendas = false;
        this.mensajeError = this.obtenerMensajeError(error);
      }
    });
  }

  cargarProductos(): void {
    this.productos = [];
    this.limpiarMensajes();
    if (this.tiendaSeleccionadaId === null) {
      return;
    }

    this.cargandoProductos = true;
    this.catalogoService.listarProductos(this.tiendaSeleccionadaId).subscribe({
      next: (productos) => {
        this.productos = productos;
        this.cargandoProductos = false;
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoProductos = false;
        this.mensajeError = this.obtenerMensajeError(error);
      }
    });
  }

  agregarAlCarrito(producto: ProductoCatalogo, variante: VarianteCatalogo): void {
    if (this.tiendaSeleccionadaId === null) {
      return;
    }

    this.limpiarMensajes();
    this.agregandoVarianteId = variante.id;
    this.carritoService.agregarItem({
      tienda_id: this.tiendaSeleccionadaId,
      variante_id: variante.id
    }).subscribe({
      next: () => {
        this.agregandoVarianteId = null;
        this.mensajeExito = `${producto.nombre} - ${variante.nombre_variante} fue agregado al carrito.`;
      },
      error: (error: HttpErrorResponse) => {
        this.agregandoVarianteId = null;
        this.mensajeError = this.obtenerMensajeError(error);
      }
    });
  }

  private limpiarMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const respuesta = error.error;
    if (typeof respuesta === 'string' && respuesta) {
      return respuesta;
    }
    if (respuesta?.detail) {
      return respuesta.detail;
    }
    if (respuesta && typeof respuesta === 'object') {
      const primerCampo = Object.keys(respuesta)[0];
      const detalle = respuesta[primerCampo];
      if (Array.isArray(detalle) && detalle.length > 0) {
        return String(detalle[0]);
      }
      if (detalle) {
        return String(detalle);
      }
    }
    return 'No fue posible completar la operación.';
  }
}
