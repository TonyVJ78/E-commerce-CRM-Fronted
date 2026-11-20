import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Tienda } from '../../../core/models';
import {
  CATEGORIAS_GASTO,
  CategoriaGasto,
  FiltrosGasto,
  Gasto,
  GastoPayload,
  TotalesGastos,
} from '../../../core/models/finanzas.model';
import { GastosService } from '../../../core/services/gastos.service';
import { TiendaService } from '../../../core/services/tienda.service';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './gastos.component.html',
  styleUrl: './gastos.component.css',
})
export class GastosComponent implements OnInit {
  private readonly gastosService = inject(GastosService);
  private readonly tiendaService = inject(TiendaService);
  private readonly fb = inject(FormBuilder);

  readonly categorias = CATEGORIAS_GASTO;

  readonly tiendas = signal<Tienda[]>([]);
  readonly tiendaId = signal<number | null>(null);
  readonly gastos = signal<Gasto[]>([]);
  readonly totales = signal<TotalesGastos | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly editandoId = signal<number | null>(null);
  readonly mensajeExito = signal('');
  readonly mensajeError = signal('');

  readonly filtros = signal<FiltrosGasto>({ desde: '', hasta: '', categoria: '' });

  readonly maximoMes = computed(() => Math.max(1, ...(this.totales()?.por_mes ?? []).map((m) => Number(m.total))));

  readonly form = this.fb.nonNullable.group({
    categoria: ['alquiler' as CategoriaGasto, Validators.required],
    descripcion: ['', Validators.maxLength(200)],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    fecha: [this.hoy(), Validators.required],
  });

  ngOnInit(): void {
    this.tiendaService.listar().subscribe({
      next: (tiendas) => {
        this.tiendas.set(tiendas);
        if (tiendas.length === 0) {
          this.cargando.set(false);
          return;
        }
        this.tiendaId.set(tiendas[0].id);
        this.cargar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar tus tiendas.');
        this.cargando.set(false);
      },
    });
  }

  seleccionarTienda(id: number): void {
    this.tiendaId.set(id);
    this.cancelarEdicion();
    this.cargar();
  }

  cambiarFiltro(campo: keyof FiltrosGasto, valor: string): void {
    this.filtros.update((f) => ({ ...f, [campo]: valor }));
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtros.set({ desde: '', hasta: '', categoria: '' });
    this.cargar();
  }

  cargar(): void {
    const tiendaId = this.tiendaId();
    if (tiendaId === null) return;
    this.cargando.set(true);
    forkJoin({
      gastos: this.gastosService.listar(tiendaId, this.filtros()),
      totales: this.gastosService.totales(tiendaId, this.filtros()),
    }).subscribe({
      next: ({ gastos, totales }) => {
        this.gastos.set(gastos);
        this.totales.set(totales);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.mensajeError.set(this.textoDeError(err, 'No se pudieron cargar los gastos.'));
        this.cargando.set(false);
      },
    });
  }

  guardar(): void {
    const tiendaId = this.tiendaId();
    if (tiendaId === null || this.form.invalid || this.guardando()) return;
    const { categoria, descripcion, monto, fecha } = this.form.getRawValue();
    const datos: GastoPayload = { categoria, descripcion: descripcion.trim(), monto: Number(monto), fecha };
    const editandoId = this.editandoId();

    this.guardando.set(true);
    this.limpiarMensajes();
    const peticion =
      editandoId === null
        ? this.gastosService.crear(tiendaId, datos)
        : this.gastosService.actualizar(tiendaId, editandoId, datos);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mensajeExito.set(editandoId === null ? 'Gasto registrado.' : 'Gasto actualizado.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.mensajeError.set(this.textoDeError(err, 'No se pudo guardar el gasto.'));
      },
    });
  }

  editar(gasto: Gasto): void {
    this.limpiarMensajes();
    this.editandoId.set(gasto.id);
    this.form.setValue({
      categoria: gasto.categoria,
      descripcion: gasto.descripcion,
      monto: Number(gasto.monto),
      fecha: gasto.fecha,
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.form.reset({ categoria: 'alquiler', descripcion: '', monto: null, fecha: this.hoy() });
  }

  eliminar(gasto: Gasto): void {
    const tiendaId = this.tiendaId();
    if (tiendaId === null || !confirm(`¿Eliminar el gasto de Bs ${gasto.monto} (${gasto.categoria_etiqueta})?`)) return;
    this.limpiarMensajes();
    this.gastosService.eliminar(tiendaId, gasto.id).subscribe({
      next: () => {
        this.mensajeExito.set('Gasto eliminado.');
        if (this.editandoId() === gasto.id) this.cancelarEdicion();
        this.cargar();
      },
      error: (err: HttpErrorResponse) =>
        this.mensajeError.set(this.textoDeError(err, 'No se pudo eliminar el gasto.')),
    });
  }

  limpiarMensajes(): void {
    this.mensajeExito.set('');
    this.mensajeError.set('');
  }

  porcentajeMes(total: string): number {
    return (Number(total) / this.maximoMes()) * 100;
  }

  private hoy(): string {
    return new Date().toLocaleDateString('en-CA');
  }

  private textoDeError(err: HttpErrorResponse, porDefecto: string): string {
    if (err.status !== 400 || typeof err.error !== 'object' || err.error === null) return porDefecto;
    const mensajes = Object.values<string | string[]>(err.error).flat();
    return mensajes.length > 0 ? mensajes.join(' ') : porDefecto;
  }
}
