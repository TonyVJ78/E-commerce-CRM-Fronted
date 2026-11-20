import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, ElementRef, NgZone, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Chart, { ChartConfiguration, ChartType } from 'chart.js/auto';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { ContextoInformes } from '../../../core/models/informe.model';
import {
  ModeloAbandono,
  ModeloComprasConjuntas,
  ModeloPronostico,
  RespuestaMl
} from '../../../core/models/ml.model';
import { InformesService } from '../../../core/services/informes.service';
import { MlService } from '../../../core/services/ml.service';
import { configPronostico, configValidacion, leerPaleta } from './ml-graficos';
import {
  fechaHora,
  fechaLarga,
  formatoBs,
  formatoDecimal,
  formatoEntero,
  formatoPorcentaje,
  formatoProporcion
} from './ml-formato';
import { metricasAbandono, metricasComprasConjuntas, metricasPronostico } from './ml-metricas';

type Estado = 'cargando' | 'listo' | 'error' | 'sin-permiso';

/**
 * Machine Learning de la tienda: ficha del dataset, un bloque por modelo con su
 * ficha técnica y métricas, y sus resultados (pronóstico, clientes en riesgo y
 * productos que se compran juntos).
 */
@Component({
  selector: 'app-ml-panel',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './ml-panel.component.html',
  styleUrl: './ml-panel.component.css'
})
export class MlPanelComponent {
  private readonly ml = inject(MlService);
  private readonly informes = inject(InformesService);
  private readonly zona = inject(NgZone);
  private readonly pedirTienda = new Subject<number>();
  private graficos: { destroy(): void }[] = [];

  private readonly lienzoPronostico = viewChild<ElementRef<HTMLCanvasElement>>('lienzoPronostico');
  private readonly lienzoValidacion = viewChild<ElementRef<HTMLCanvasElement>>('lienzoValidacion');

  readonly contexto = signal<ContextoInformes | null>(null);
  readonly tiendaId = signal<number | null>(null);
  readonly respuesta = signal<RespuestaMl | null>(null);
  readonly estado = signal<Estado>('cargando');
  readonly entrenando = signal(false);
  readonly errorEntrenar = signal('');

  readonly puedeEntrenar = computed(() => !!this.contexto()?.puede_crear);
  readonly sinTiendas = computed(() => this.contexto()?.tiendas.length === 0);
  readonly omitidos = computed(() => this.respuesta()?.omitidos ?? []);

  readonly pronostico = computed(() =>
    this.respuesta()?.modelos.find((m): m is ModeloPronostico => m.tipo === 'pronostico_ventas') ?? null);
  readonly abandono = computed(() =>
    this.respuesta()?.modelos.find((m): m is ModeloAbandono => m.tipo === 'riesgo_abandono') ?? null);
  readonly conjuntas = computed(() =>
    this.respuesta()?.modelos.find((m): m is ModeloComprasConjuntas => m.tipo === 'compras_conjuntas') ?? null);

  readonly metricasPronostico = computed(() => {
    const modelo = this.pronostico();
    return modelo ? metricasPronostico(modelo.metricas) : [];
  });
  readonly metricasAbandono = computed(() => {
    const modelo = this.abandono();
    return modelo ? metricasAbandono(modelo.metricas) : [];
  });
  readonly metricasConjuntas = computed(() => {
    const modelo = this.conjuntas();
    return modelo ? metricasComprasConjuntas(modelo.metricas) : [];
  });

  readonly distribucion = computed(() => {
    const d = this.abandono()?.resultados.distribucion;
    if (!d) return [];
    const total = d.bajo + d.medio + d.alto || 1;
    return [
      { clave: 'bajo', etiqueta: 'Riesgo bajo', cantidad: d.bajo, porcentaje: (d.bajo / total) * 100 },
      { clave: 'medio', etiqueta: 'Riesgo medio', cantidad: d.medio, porcentaje: (d.medio / total) * 100 },
      { clave: 'alto', etiqueta: 'Riesgo alto', cantidad: d.alto, porcentaje: (d.alto / total) * 100 }
    ];
  });

  readonly importancia = computed(() => {
    const filas = this.abandono()?.resultados.importancia ?? [];
    const mayor = Math.max(...filas.map(f => Math.abs(f.coeficiente)), 0.001);
    return filas.map(f => ({ ...f, ancho: (Math.abs(f.coeficiente) / mayor) * 100, sube: f.coeficiente > 0 }));
  });

  readonly maxLift = computed(() => Math.max(...(this.conjuntas()?.resultados.pares ?? []).map(p => p.lift), 1));

  readonly fechaLarga = fechaLarga;
  readonly fechaHora = fechaHora;
  readonly formatoBs = formatoBs;
  readonly formatoEntero = formatoEntero;
  readonly formatoDecimal = formatoDecimal;
  readonly formatoPorcentaje = formatoPorcentaje;
  readonly formatoProporcion = formatoProporcion;

  constructor() {
    this.pedirTienda.pipe(
      tap(() => {
        this.estado.set('cargando');
        this.respuesta.set(null);
        this.errorEntrenar.set('');
      }),
      switchMap(id => this.ml.obtener(id).pipe(
        catchError((error: HttpErrorResponse) => {
          this.estado.set(error.status === 403 ? 'sin-permiso' : 'error');
          return EMPTY;
        })
      )),
      takeUntilDestroyed()
    ).subscribe(respuesta => {
      this.respuesta.set(respuesta);
      this.estado.set('listo');
    });

    effect(() => this.dibujarGraficos());
    inject(DestroyRef).onDestroy(() => this.destruirGraficos());
    this.cargarContexto();
  }

  cargarContexto(): void {
    this.estado.set('cargando');
    this.informes.contexto().subscribe({
      next: contexto => {
        this.contexto.set(contexto);
        if (contexto.tiendas.length === 0) {
          this.estado.set('listo');
          return;
        }
        this.elegirTienda(contexto.tiendas[0].id);
      },
      error: (error: HttpErrorResponse) => this.estado.set(error.status === 403 ? 'sin-permiso' : 'error')
    });
  }

  elegirTienda(id: number): void {
    this.tiendaId.set(id);
    this.pedirTienda.next(id);
  }

  reintentar(): void {
    const id = this.tiendaId();
    if (id === null) this.cargarContexto();
    else this.pedirTienda.next(id);
  }

  entrenar(): void {
    const id = this.tiendaId();
    if (id === null || this.entrenando()) return;
    this.entrenando.set(true);
    this.errorEntrenar.set('');
    this.ml.entrenar(id).subscribe({
      next: respuesta => {
        this.entrenando.set(false);
        this.respuesta.set(respuesta);
      },
      error: (error: HttpErrorResponse) => {
        this.entrenando.set(false);
        this.errorEntrenar.set(this.mensajeError(error));
      }
    });
  }

  private mensajeError(error: HttpErrorResponse): string {
    if (error.status === 429) return 'Entrenaste muy seguido. Espera un minuto y vuelve a intentarlo.';
    if (error.status === 403) return 'Tu rol no puede entrenar modelos. Pide el permiso «crear» del módulo informes.';
    if (error.status === 0) return 'No pude conectarme con el servidor. Revisa tu conexión y vuelve a intentarlo.';
    return 'No se pudieron entrenar los modelos. Vuelve a intentarlo en unos segundos.';
  }

  private dibujarGraficos(): void {
    const modelo = this.pronostico();
    const lienzoPronostico = this.lienzoPronostico();
    const lienzoValidacion = this.lienzoValidacion();
    this.destruirGraficos();
    if (!modelo || !lienzoPronostico || !lienzoValidacion) return;
    const paleta = leerPaleta();
    // Fuera de la zona: Chart.js anima con requestAnimationFrame.
    this.zona.runOutsideAngular(() => {
      this.crear(lienzoPronostico, configPronostico(modelo.resultados, paleta));
      this.crear(lienzoValidacion, configValidacion(modelo.resultados.validacion, paleta));
    });
  }

  private crear<T extends ChartType>(lienzo: ElementRef<HTMLCanvasElement>, config: ChartConfiguration<T>): void {
    this.graficos.push(new Chart(lienzo.nativeElement, config));
  }

  private destruirGraficos(): void {
    this.graficos.forEach(grafico => grafico.destroy());
    this.graficos = [];
  }
}
