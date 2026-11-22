/**
 * Componente de Informes de Machine Learning (CU-35).
 * Muestra tres secciones: Pronóstico de ventas, Riesgo de abandono y
 * Predicción de compras. Consume los endpoints /api/ml/ del backend.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MlService } from '../../core/services/ml.service';
import { Tienda, TiendaService } from '../../core/services/tienda.service';
import { AuthService } from '../../core/services/auth.service';

import {
  PronosticoVentaResponse,
  RiesgoAbandonoResponse,
  PrediccionCompraResponse,
  EntrenamientoModelo,
  NivelRiesgo,
  NivelCompra,
} from '../../core/models/ml.model';

type Pestana = 'ventas' | 'abandono' | 'compras';

@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './informes.component.html',
  styleUrls: ['./informes.component.css'],
})
export class InformesComponent implements OnInit {
  private readonly mlService = inject(MlService);
  private readonly tiendaService = inject(TiendaService);
  private readonly authService = inject(AuthService);

  // Estado general
  tiendas = signal<Tienda[]>([]);
  tiendaSeleccionadaId = signal<number | null>(null);
  cargandoTiendas = signal(false);
  errorTiendas = signal<string | null>(null);

  pestanaActiva = signal<Pestana>('ventas');

  pestanas: { valor: Pestana; etiqueta: string }[] = [
    { valor: 'ventas', etiqueta: 'Pronóstico de ventas' },
    { valor: 'abandono', etiqueta: 'Riesgo de abandono' },
    { valor: 'compras', etiqueta: 'Predicción de compras' },
  ];

  // --- Pronóstico de ventas ---
  cargandoVentas = signal(false);
  errorVentas = signal<string | null>(null);
  datosVentas = signal<PronosticoVentaResponse | null>(null);
  datosInsuficientesVentas = signal(false);
  sinPermisoVentas = signal(false);
  horizonteVentas = signal(7);

  // --- Riesgo de abandono ---
  cargandoAbandono = signal(false);
  errorAbandono = signal<string | null>(null);
  datosAbandono = signal<RiesgoAbandonoResponse | null>(null);
  datosInsuficientesAbandono = signal(false);
  sinPermisoAbandono = signal(false);
  umbralAbandono = signal(90);

  // --- Predicción de compras ---
  cargandoCompras = signal(false);
  errorCompras = signal<string | null>(null);
  datosCompras = signal<PrediccionCompraResponse | null>(null);
  datosInsuficientesCompras = signal(false);
  sinPermisoCompras = signal(false);
  clienteIdCompra = signal<number | null>(null);
  horizonteCompras = signal(7);

  // --- Entrenamientos ---
  cargandoEntrenamientos = signal(false);
  entrenamientos = signal<EntrenamientoModelo[]>([]);

  ngOnInit(): void {
    this.cargarTiendas();
  }

  // Tiendas
  cargarTiendas(): void {
    this.cargandoTiendas.set(true);
    this.tiendaService.listar().subscribe({
      next: (tiendas: Tienda[]) => {
        this.tiendas.set(tiendas);
        if (tiendas.length > 0) {
          this.tiendaSeleccionadaId.set(tiendas[0].id);
        }
        this.cargandoTiendas.set(false);
      },
      error: (err: any) => {
        this.errorTiendas.set(
          this.mlService.extraerMensajeError(err.error ?? {})
        );
        this.cargandoTiendas.set(false);
      },
    });
  }

  get tiendaSeleccionada(): Tienda | undefined {
    const id = this.tiendaSeleccionadaId();
    return this.tiendas().find((t) => t.id === id);
  }

  // Pestañas
  seleccionarPestana(p: Pestana): void {
    this.pestanaActiva.set(p);
  }

  actualizarTienda(value: string | number | null): void {
    this.tiendaSeleccionadaId.set(value === null ? null : Number(value));
  }

  actualizarHorizonteVentas(value: string | number): void {
    this.horizonteVentas.set(Number(value));
  }

  actualizarUmbralAbandono(value: string | number): void {
    this.umbralAbandono.set(Number(value));
  }

  actualizarClienteCompra(value: string | number | null): void {
    this.clienteIdCompra.set(value === null || value === '' ? null : Number(value));
  }

  actualizarHorizonteCompras(value: string | number): void {
    this.horizonteCompras.set(Number(value));
  }

  get esVentas(): boolean {
    return this.pestanaActiva() === 'ventas';
  }
  get esAbandono(): boolean {
    return this.pestanaActiva() === 'abandono';
  }
  get esCompras(): boolean {
    return this.pestanaActiva() === 'compras';
  }

  // Pronóstico de ventas
  ejecutarPronosticoVentas(): void {
    const tiendaId = this.tiendaSeleccionadaId();
    if (!tiendaId) return;

    this.cargandoVentas.set(true);
    this.errorVentas.set(null);
    this.sinPermisoVentas.set(false);
    this.datosInsuficientesVentas.set(false);
    this.datosVentas.set(null);

    this.mlService
      .pronosticarVentas({ tienda_id: tiendaId, horizonte_dias: this.horizonteVentas() })
      .subscribe({
        next: (data: PronosticoVentaResponse) => {
          if (data.estado === 'datos_insuficientes') {
            this.datosInsuficientesVentas.set(true);
          } else {
            this.datosVentas.set(data);
          }
          this.cargandoVentas.set(false);
        },
        error: (err: any) => {
          const status = err.status ?? null;
          if (this.mlService.esErrorPermiso(status)) {
            this.sinPermisoVentas.set(true);
          } else {
            this.errorVentas.set(
              this.mlService.extraerMensajeError(err.error ?? {})
            );
          }
          this.cargandoVentas.set(false);
        },
      });
  }

  // Riesgo de abandono
  evaluarRiesgoAbandono(): void {
    const tiendaId = this.tiendaSeleccionadaId();
    if (!tiendaId) return;

    this.cargandoAbandono.set(true);
    this.errorAbandono.set(null);
    this.sinPermisoAbandono.set(false);
    this.datosInsuficientesAbandono.set(false);
    this.datosAbandono.set(null);

    this.mlService
      .evaluarRiesgoAbandono({
        tienda_id: tiendaId,
        dias_umbral_abandono: this.umbralAbandono(),
      })
      .subscribe({
        next: (data: RiesgoAbandonoResponse) => {
          if (data.estado === 'datos_insuficientes') {
            this.datosInsuficientesAbandono.set(true);
          } else {
            this.datosAbandono.set(data);
          }
          this.cargandoAbandono.set(false);
        },
        error: (err: any) => {
          const status = err.status ?? null;
          if (this.mlService.esErrorPermiso(status)) {
            this.sinPermisoAbandono.set(true);
          } else {
            this.errorAbandono.set(
              this.mlService.extraerMensajeError(err.error ?? {})
            );
          }
          this.cargandoAbandono.set(false);
        },
      });
  }

  // Predicción de compras
  predecirCompra(): void {
    const tiendaId = this.tiendaSeleccionadaId();
    if (!tiendaId) return;

    const clienteId = this.clienteIdCompra() ?? undefined;

    this.cargandoCompras.set(true);
    this.errorCompras.set(null);
    this.sinPermisoCompras.set(false);
    this.datosInsuficientesCompras.set(false);
    this.datosCompras.set(null);

    this.mlService
      .predecirCompra({
        tienda_id: tiendaId,
        cliente_id: clienteId,
        horizonte_dias: this.horizonteCompras(),
      })
      .subscribe({
        next: (data: PrediccionCompraResponse) => {
          if (data.estado === 'datos_insuficientes') {
            this.datosInsuficientesCompras.set(true);
          } else {
            this.datosCompras.set(data);
          }
          this.cargandoCompras.set(false);
        },
        error: (err: any) => {
          const status = err.status ?? null;
          if (this.mlService.esErrorPermiso(status)) {
            this.sinPermisoCompras.set(true);
          } else {
            this.errorCompras.set(
              this.mlService.extraerMensajeError(err.error ?? {})
            );
          }
          this.cargandoCompras.set(false);
        },
      });
  }

  // Entrenamientos
  cargarEntrenamientos(): void {
    this.cargandoEntrenamientos.set(true);
    this.mlService.listarEntrenamientos().subscribe({
      next: (data: EntrenamientoModelo[]) => {
        this.entrenamientos.set(data);
        this.cargandoEntrenamientos.set(false);
      },
      error: () => {
        this.cargandoEntrenamientos.set(false);
      },
    });
  }

  // Helpers de vista
  get rol(): string | null | undefined {
    return this.authService.currentUser?.rol;
  }

  get esEmpresa(): boolean {
    return this.rol === 'empresa';
  }

  get esCliente(): boolean {
    return this.rol === 'cliente';
  }

  claseRiesgo(nivel: NivelRiesgo): string {
    return `riesgo-${nivel}`;
  }

  claseNivelCompra(nivel: NivelCompra): string {
    return `nivel-${nivel}`;
  }

  formatearMonto(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
    }).format(valor);
  }

  formatearPorcentaje(valor: number): string {
    return `${(valor * 100).toFixed(1)}%`;
  }

  esDatosInsuficientes(estado: string | undefined): boolean {
    return this.mlService.esDatosInsuficientes(estado);
  }
}
