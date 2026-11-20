import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { Tienda } from '../../../core/models';
import {
  ResumenComentariosIa,
  SatisfaccionResponse,
  TendenciaMensual,
} from '../../../core/models/satisfaccion.model';
import { SatisfaccionService } from '../../../core/services/satisfaccion.service';
import { TiendaService } from '../../../core/services/tienda.service';

const ESTRELLAS = [1, 2, 3, 4, 5];
const MAX_CALIFICACION = 5;

@Component({
  selector: 'app-satisfaccion-clientes',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './satisfaccion-clientes.component.html',
  styleUrl: './satisfaccion-clientes.component.css',
})
export class SatisfaccionClientesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly tiendaService = inject(TiendaService);
  private readonly satisfaccionService = inject(SatisfaccionService);
  private consulta?: Subscription;

  readonly estrellas = ESTRELLAS;
  readonly tiendas = signal<Tienda[]>([]);
  readonly tiendaId = signal<number | null>(null);
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly datos = signal<SatisfaccionResponse | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumenIa = signal<ResumenComentariosIa | null>(null);
  readonly resumiendo = signal(false);
  readonly errorResumen = signal<string | null>(null);

  ngOnInit(): void {
    this.tiendaService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tiendas) => {
        this.tiendas.set(tiendas);
        if (!tiendas.length) {
          this.cargando.set(false);
          return;
        }
        this.seleccionarTienda(tiendas[0].id);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(this.mensajeError(err, 'No se pudieron cargar tus tiendas.'));
      },
    });
  }

  seleccionarTienda(id: number): void {
    this.tiendaId.set(id);
    this.cargar();
  }

  cambiarFecha(campo: 'desde' | 'hasta', valor: string): void {
    (campo === 'desde' ? this.desde : this.hasta).set(valor);
    this.cargar();
  }

  limpiarFechas(): void {
    this.desde.set('');
    this.hasta.set('');
    this.cargar();
  }

  resumir(): void {
    const id = this.tiendaId();
    if (!id || this.resumiendo()) return;
    this.resumiendo.set(true);
    this.errorResumen.set(null);
    this.satisfaccionService
      .resumirComentarios(id, { desde: this.desde(), hasta: this.hasta() })
      .pipe(
        finalize(() => this.resumiendo.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resumen) => this.resumenIa.set(resumen),
        error: (err: unknown) =>
          this.errorResumen.set(this.mensajeError(err, 'No se pudo generar el resumen.')),
      });
  }

  anchoBarra(cantidad: number): number {
    const maximo = Math.max(...(this.datos()?.distribucion.map((d) => d.cantidad) ?? [0]));
    return maximo ? (cantidad * 100) / maximo : 0;
  }

  alturaMes(mes: TendenciaMensual): number {
    return ((mes.promedio ?? 0) * 100) / MAX_CALIFICACION;
  }

  etiquetaMes(mes: string): string {
    const [anio, numero] = mes.split('-').map(Number);
    return new Intl.DateTimeFormat('es-BO', { month: 'short', year: '2-digit' }).format(
      new Date(anio, numero - 1, 1),
    );
  }

  private cargar(): void {
    const id = this.tiendaId();
    if (!id) return;
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    this.resumenIa.set(null);
    this.errorResumen.set(null);
    this.consulta = this.satisfaccionService
      .obtener(id, { desde: this.desde(), hasta: this.hasta() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.datos.set(datos);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(this.mensajeError(err, 'No se pudo cargar la satisfacción de clientes.'));
        },
      });
  }

  private mensajeError(err: unknown, porDefecto: string): string {
    if (err instanceof HttpErrorResponse && typeof err.error?.detail === 'string') {
      return err.error.detail;
    }
    return porDefecto;
  }
}
