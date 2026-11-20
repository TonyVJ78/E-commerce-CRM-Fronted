import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, NgZone, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import Chart, { ChartConfiguration, ChartType } from 'chart.js/auto';
import { EMPTY, Subject, catchError, filter, map, merge, switchMap, tap } from 'rxjs';
import { InterpretacionPanel, PanelKpis } from '../../../core/models/panel-kpis.model';
import { PanelKpisService } from '../../../core/services/panel-kpis.service';
import { aIso, COMPARACIONES, FiltrosUi, leerFiltros, PRESETS, PresetPeriodo } from './filtros-panel';
import { fechaLarga, formatoEntero, formatoPorcentaje, formatoValor, formatoVariacion } from './formato-panel';
import {
  configResultadoMensual,
  configTopProductos,
  configVentasCategoria,
  configVentasCiudad,
  configVentasDiarias,
  leerPaleta
} from './graficos-panel';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const HORAS = Array.from({ length: 24 }, (_, hora) => hora);
const ALTO_FILA_BARRAS = 30;

interface VistaKpi {
  clave: string;
  titulo: string;
  valor: string;
  descripcion: string;
  variacion: string | null;
  flecha: string;
  tono: 'buena' | 'mala' | 'neutra';
  lectura: string;
  previo: string | null;
  sinBase: boolean;
}

/**
 * Panel de KPIs de la tienda: números verificados de la base por pregunta de
 * negocio, con filtros guardados en la URL e interpretación opcional con IA.
 */
@Component({
  selector: 'app-panel-kpis',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './panel-kpis.component.html',
  styleUrl: './panel-kpis.component.css'
})
export class PanelKpisComponent {
  private readonly servicio = inject(PanelKpisService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly zona = inject(NgZone);

  readonly presets = PRESETS;
  readonly comparaciones = COMPARACIONES;
  readonly horas = HORAS;
  readonly hoy = aIso(new Date());

  readonly filtros = signal<FiltrosUi>(leerFiltros(this.route.snapshot.queryParamMap, new Date()));
  readonly datos = signal<PanelKpis | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<'sin-permiso' | 'fallo' | null>(null);

  readonly pregunta = signal('');
  readonly interpretacion = signal<InterpretacionPanel | null>(null);
  readonly interpretando = signal(false);
  readonly errorInterpretacion = signal('');

  private readonly reintentar$ = new Subject<void>();
  private graficos: { destroy(): void }[] = [];

  private readonly lienzoVentas = viewChild<ElementRef<HTMLCanvasElement>>('lienzoVentas');
  private readonly lienzoResultado = viewChild<ElementRef<HTMLCanvasElement>>('lienzoResultado');
  private readonly lienzoProductos = viewChild<ElementRef<HTMLCanvasElement>>('lienzoProductos');
  private readonly lienzoCategorias = viewChild<ElementRef<HTMLCanvasElement>>('lienzoCategorias');
  private readonly lienzoCiudades = viewChild<ElementRef<HTMLCanvasElement>>('lienzoCiudades');

  readonly errorRango = computed(() => {
    const { desde, hasta } = this.filtros();
    return desde > hasta ? 'La fecha inicial no puede ser posterior a la final.' : '';
  });

  readonly periodoTexto = computed(() => {
    const periodo = this.datos()?.periodo;
    return periodo ? `${fechaLarga(periodo.desde)} – ${fechaLarga(periodo.hasta)}` : '';
  });

  readonly comparadoTexto = computed(() => {
    const periodo = this.datos()?.periodo;
    if (!periodo?.comparado_desde || !periodo.comparado_hasta) return '';
    return `${fechaLarga(periodo.comparado_desde)} – ${fechaLarga(periodo.comparado_hasta)}`;
  });

  readonly grupos = computed(() => {
    const comparando = this.filtros().comparar !== 'ninguno';
    return (this.datos()?.grupos ?? []).map(grupo => ({
      clave: grupo.clave,
      titulo: grupo.titulo,
      kpis: grupo.kpis.map((kpi): VistaKpi => {
        const { variacion } = kpi;
        const vista = {
          clave: kpi.clave,
          titulo: kpi.titulo,
          valor: formatoValor(kpi.valor, kpi.tipo),
          descripcion: kpi.descripcion,
          previo: comparando && kpi.anterior !== null ? formatoValor(kpi.anterior, kpi.tipo) : null
        };
        if (variacion === null) {
          return { ...vista, variacion: null, flecha: '', tono: 'neutra', lectura: '', sinBase: comparando };
        }
        const texto = formatoVariacion(variacion, kpi.tipo);
        const favorable = (variacion > 0) === (kpi.mejor_si === 'sube');
        const tono = variacion === 0 ? 'neutra' : favorable ? 'buena' : 'mala';
        const sentido = variacion === 0 ? 'Sin cambio' : variacion > 0 ? 'Sube' : 'Baja';
        const juicio = tono === 'neutra' ? '' : favorable ? ', favorable' : ', desfavorable';
        return {
          ...vista,
          variacion: texto,
          flecha: variacion === 0 ? '→' : variacion > 0 ? '↑' : '↓',
          tono,
          lectura: `${sentido} ${texto.replace('+', '')}${juicio}`,
          sinBase: false
        };
      })
    }));
  });

  readonly sinActividad = computed(() => {
    const datos = this.datos();
    return !!datos && datos.grupos.every(g => g.kpis.every(k => !k.valor));
  });

  readonly embudo = computed(() => {
    const embudo = this.datos()?.series.embudo;
    if (!embudo) return [];
    const pasos = [
      { etiqueta: 'Vieron un producto', valor: embudo.vistas },
      { etiqueta: 'Agregaron al carrito', valor: embudo.carritos },
      { etiqueta: 'Compraron', valor: embudo.compras }
    ];
    return pasos.map((paso, i) => ({
      ...paso,
      cantidad: formatoEntero(paso.valor),
      ancho: embudo.vistas ? Math.max((paso.valor / embudo.vistas) * 100, 1.5) : 0,
      tasa:
        i > 0 && pasos[i - 1].valor
          ? `${formatoPorcentaje((paso.valor / pasos[i - 1].valor) * 100)} del paso anterior`
          : null
    }));
  });

  readonly mapaCalor = computed(() => {
    const totales = DIAS.map(() => HORAS.map(() => 0));
    for (const c of this.datos()?.series.pedidos_por_dia_hora ?? []) {
      totales[c.dia_semana][c.hora] += c.pedidos;
    }
    const maximo = Math.max(0, ...totales.flat());
    let pico = '';
    const filas = totales.map((pedidosDia, dia) => ({
      dia: DIAS[dia],
      celdas: pedidosDia.map((pedidos, hora) => {
        const momento = `${DIAS_LARGOS[dia]} ${String(hora).padStart(2, '0')}:00`;
        if (maximo > 0 && pedidos === maximo && !pico) {
          pico = `${momento}, con ${formatoEntero(pedidos)} pedidos`;
        }
        return {
          intensidad: pedidos ? 0.2 + 0.8 * (pedidos / maximo) : 0,
          titulo: `${momento} · ${formatoEntero(pedidos)} pedidos`
        };
      })
    }));
    return { filas, maximo, pico };
  });

  constructor() {
    const filtros$ = this.route.queryParamMap.pipe(
      map(params => leerFiltros(params, new Date())),
      tap(filtros => {
        this.filtros.set(filtros);
        this.interpretacion.set(null);
        this.errorInterpretacion.set('');
      })
    );

    merge(filtros$, this.reintentar$.pipe(map(() => this.filtros())))
      .pipe(
        filter(() => !this.errorRango()),
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(filtros =>
          this.servicio
            .panel({ tienda: filtros.tienda, desde: filtros.desde, hasta: filtros.hasta, comparar_con: filtros.comparar })
            .pipe(
              tap(datos => {
                this.datos.set(datos);
                this.cargando.set(false);
              }),
              catchError((falla: HttpErrorResponse) => {
                this.datos.set(null);
                this.cargando.set(false);
                this.error.set(falla.status === 403 ? 'sin-permiso' : 'fallo');
                return EMPTY;
              })
            )
        ),
        takeUntilDestroyed()
      )
      .subscribe();

    effect(() => this.dibujarGraficos());
    inject(DestroyRef).onDestroy(() => this.destruirGraficos());
  }

  reintentar(): void {
    this.reintentar$.next();
  }

  elegirPreset(preset: PresetPeriodo): void {
    if (preset === 'personalizado') {
      const { desde, hasta } = this.filtros();
      this.navegar({ preset, desde, hasta });
      return;
    }
    this.navegar({ preset, desde: null, hasta: null });
  }

  cambiarRango(desde: string, hasta: string): void {
    if (!desde || !hasta) return;
    this.navegar({ preset: 'personalizado', desde, hasta });
  }

  cambiarComparacion(comparar: string): void {
    this.navegar({ comparar });
  }

  cambiarTienda(tienda: string): void {
    this.navegar({ tienda });
  }

  private navegar(queryParams: Params): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  interpretar(): void {
    const datos = this.datos();
    if (!datos || this.interpretando()) return;
    const filtros = this.filtros();
    const pregunta = this.pregunta().trim();

    this.interpretando.set(true);
    this.errorInterpretacion.set('');
    this.servicio
      .interpretar({
        tienda: datos.tienda_id,
        desde: filtros.desde,
        hasta: filtros.hasta,
        comparar_con: filtros.comparar,
        ...(pregunta && { pregunta })
      })
      .subscribe({
        next: interpretacion => {
          this.interpretando.set(false);
          this.interpretacion.set(interpretacion);
        },
        error: (falla: HttpErrorResponse) => {
          this.interpretando.set(false);
          this.errorInterpretacion.set(mensajeInterpretacion(falla));
        }
      });
  }

  alturaBarras(filas: number): number {
    return Math.max(filas * ALTO_FILA_BARRAS + 40, 160);
  }

  private dibujarGraficos(): void {
    const datos = this.datos();
    this.destruirGraficos();
    if (!datos) return;

    const paleta = leerPaleta();
    const { series } = datos;
    this.zona.runOutsideAngular(() => {
      this.crear(this.lienzoVentas(), configVentasDiarias(series.ventas_diarias, paleta));
      this.crear(this.lienzoResultado(), configResultadoMensual(series.resultado_mensual, paleta));
      this.crear(this.lienzoProductos(), configTopProductos(series.top_productos, paleta));
      this.crear(this.lienzoCategorias(), configVentasCategoria(series.ventas_por_categoria, paleta));
      this.crear(this.lienzoCiudades(), configVentasCiudad(series.ventas_por_ciudad, paleta));
    });
  }

  private crear<T extends ChartType>(lienzo: ElementRef<HTMLCanvasElement> | undefined, config: ChartConfiguration<T>): void {
    if (lienzo) this.graficos.push(new Chart(lienzo.nativeElement, config));
  }

  private destruirGraficos(): void {
    this.graficos.forEach(grafico => grafico.destroy());
    this.graficos = [];
  }
}

function mensajeInterpretacion(falla: HttpErrorResponse): string {
  if (falla.status === 0) return 'No pude conectarme con el servidor. Revisa tu conexión e intenta de nuevo.';
  if (falla.status === 429) return 'Hiciste muchas consultas seguidas. Espera un minuto e intenta de nuevo.';
  if (falla.status === 403) return falla.error?.detail || 'Tu rol no tiene permiso para interpretar informes.';
  if (falla.status === 502 || falla.status === 503) {
    return falla.error?.detail || 'La IA no está disponible ahora. Intenta de nuevo en unos minutos.';
  }
  return falla.error?.detail || 'No se pudo interpretar este periodo. Intenta de nuevo.';
}
