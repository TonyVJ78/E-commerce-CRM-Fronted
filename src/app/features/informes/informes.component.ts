import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Chart from 'chart.js/auto';
import {
  ColumnaInforme,
  ContextoInformes,
  FormatoExportacion,
  Informe,
  InformeResumen,
  MensajeInforme,
  ValorCelda
} from '../../core/models';
import { InformesService } from '../../core/services/informes.service';
import { MarkdownComponent } from '../../shared/markdown/markdown.component';

/** API de dictado del navegador (Chrome/Edge la exponen con prefijo `webkit`). */
type Reconocimiento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((evento: any) => void) | null;
  onerror: ((evento: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

const NUMERICAS = new Set(['entero', 'moneda', 'decimal']);
const MAX_PUNTOS_GRAFICO = 20;
const CLAVE_TIENDA = 'km_informes_tienda';

/**
 * Informes de tienda con IA (CU-34) para administradores y encargados.
 *
 * A la izquierda, la conversación (texto o voz): si el pedido es muy general
 * la IA pregunta antes de consultar. A la derecha, el informe: tabla con los
 * datos reales de la base, análisis, gráfico y exportación a PDF o Excel.
 */
@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownComponent],
  templateUrl: './informes.component.html',
  styleUrls: ['./informes.component.css']
})
export class InformesComponent implements OnInit, AfterViewChecked, OnDestroy {
  private readonly informes = inject(InformesService);
  private readonly zona = inject(NgZone);

  @ViewChild('lista') lista?: ElementRef<HTMLElement>;
  @ViewChild('entrada') entrada?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('grafico') graficoCanvas?: ElementRef<HTMLCanvasElement>;

  contexto: ContextoInformes | null = null;
  cargandoContexto = true;
  sinPermiso = false;
  errorContexto = '';

  tiendaId: number | null = null;
  texto = '';
  mensajes: MensajeInforme[] = [];
  enviando = false;
  informe: Informe | null = null;
  abriendoInforme = false;

  historialAbierto = false;
  historial: InformeResumen[] = [];
  cargandoHistorial = false;

  exportando: FormatoExportacion | null = null;
  errorExportar = '';

  orden: { columna: number; desc: boolean } | null = null;
  filasVisibles: ValorCelda[][] = [];

  readonly vozDisponible = !!this.claseReconocimiento();
  escuchando = false;
  errorVoz = '';
  private reconocimiento: Reconocimiento | null = null;
  private textoAntesDeDictar = '';

  private chart: Chart | null = null;
  private redibujarGrafico = false;
  private bajarAlFinal = false;
  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(this.informes.mensajes$.subscribe(m => {
      this.mensajes = m;
      this.bajarAlFinal = true;
    }));
    this.subs.add(this.informes.enviando$.subscribe(e => {
      this.enviando = e;
      this.bajarAlFinal = true;
    }));
    this.subs.add(this.informes.informe$.subscribe(informe => {
      this.informe = informe;
      this.orden = null;
      this.filasVisibles = informe ? [...informe.filas] : [];
      this.errorExportar = '';
      this.redibujarGrafico = true;
    }));

    try {
      const guardada = Number(localStorage.getItem(CLAVE_TIENDA));
      this.tiendaId = guardada > 0 ? guardada : null;
    } catch {
      this.tiendaId = null;
    }

    this.informes.contexto().subscribe({
      next: contexto => {
        this.contexto = contexto;
        this.cargandoContexto = false;
        if (this.tiendaId && !contexto.tiendas.some(t => t.id === this.tiendaId)) {
          this.tiendaId = null;
        }
        // Con una sola tienda no hay nada que elegir.
        if (contexto.tiendas.length === 1) {
          this.tiendaId = contexto.tiendas[0].id;
        }
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoContexto = false;
        if (error.status === 403) {
          this.sinPermiso = true;
        } else {
          this.errorContexto = 'No se pudo cargar el módulo de informes. Recarga la página.';
        }
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.bajarAlFinal && this.lista) {
      const el = this.lista.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.bajarAlFinal = false;
    }
    if (this.redibujarGrafico) {
      this.redibujarGrafico = false;
      // Fuera del ciclo de detección: Chart.js anima con requestAnimationFrame.
      this.zona.runOutsideAngular(() => setTimeout(() => this.dibujarGrafico()));
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.chart?.destroy();
    this.reconocimiento?.stop();
  }

  // ---------------------------------------------------------------- conversación

  get puedeCrear(): boolean {
    return !!this.contexto?.puede_crear;
  }

  get sinTiendas(): boolean {
    return !!this.contexto && this.contexto.tiendas.length === 0;
  }

  cambiarTienda(): void {
    try {
      if (this.tiendaId) localStorage.setItem(CLAVE_TIENDA, String(this.tiendaId));
      else localStorage.removeItem(CLAVE_TIENDA);
    } catch {
      // Solo es una preferencia.
    }
  }

  enviar(texto?: string): void {
    const contenido = (texto ?? this.texto).trim();
    if (!contenido || this.enviando || !this.puedeCrear) return;
    this.detenerVoz();
    this.informes.enviar(contenido, this.tiendaId);
    this.texto = '';
    setTimeout(() => this.ajustarAltura());
  }

  alTeclear(evento: KeyboardEvent): void {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      this.enviar();
    }
  }

  ajustarAltura(): void {
    const el = this.entrada?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  nuevaConversacion(): void {
    this.detenerVoz();
    this.informes.reiniciar();
  }

  esUltimoDelAsistente(indice: number): boolean {
    return indice === this.mensajes.length - 1 && this.mensajes[indice].rol === 'asistente';
  }

  trackPorIndice(indice: number): number {
    return indice;
  }

  // ---------------------------------------------------------------- voz

  private claseReconocimiento(): (new () => Reconocimiento) | null {
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  alternarVoz(): void {
    if (this.escuchando) {
      this.detenerVoz();
      return;
    }
    const Clase = this.claseReconocimiento();
    if (!Clase || this.enviando) return;

    const rec = new Clase();
    rec.lang = 'es-BO';
    rec.interimResults = true;
    rec.continuous = false;
    this.textoAntesDeDictar = this.texto ? `${this.texto.trim()} ` : '';

    rec.onresult = evento => this.zona.run(() => {
      let dictado = '';
      for (let i = 0; i < evento.results.length; i++) {
        dictado += evento.results[i][0].transcript;
      }
      this.texto = this.textoAntesDeDictar + dictado;
      setTimeout(() => this.ajustarAltura());
    });
    rec.onerror = evento => this.zona.run(() => {
      this.escuchando = false;
      if (evento?.error === 'not-allowed' || evento?.error === 'service-not-allowed') {
        this.errorVoz = 'Permite el acceso al micrófono para dictar tu pedido.';
      } else if (evento?.error === 'no-speech') {
        this.errorVoz = 'No te escuché. Toca el micrófono e intenta de nuevo.';
      } else if (evento?.error !== 'aborted') {
        this.errorVoz = 'El dictado no está disponible ahora. Puedes escribir tu pedido.';
      }
    });
    rec.onend = () => this.zona.run(() => {
      this.escuchando = false;
      this.reconocimiento = null;
      this.entrada?.nativeElement.focus();
    });

    this.reconocimiento = rec;
    this.errorVoz = '';
    this.escuchando = true;
    rec.start();
  }

  private detenerVoz(): void {
    this.reconocimiento?.stop();
    this.escuchando = false;
  }

  // ---------------------------------------------------------------- informe

  abrirDesdeMensaje(mensaje: MensajeInforme): void {
    if (!mensaje.informeId || this.informe?.id === mensaje.informeId) return;
    this.abrir(mensaje.informeId);
  }

  abrir(id: number): void {
    this.abriendoInforme = true;
    this.informes.obtener(id).subscribe({
      next: informe => {
        this.abriendoInforme = false;
        this.historialAbierto = false;
        this.informes.mostrar(informe);
      },
      error: () => {
        this.abriendoInforme = false;
        this.errorExportar = 'Ese informe ya no está disponible.';
      }
    });
  }

  alternarHistorial(): void {
    this.historialAbierto = !this.historialAbierto;
    if (!this.historialAbierto) return;
    this.cargandoHistorial = true;
    this.informes.historial().subscribe({
      next: lista => {
        this.historial = lista;
        this.cargandoHistorial = false;
      },
      error: () => {
        this.historial = [];
        this.cargandoHistorial = false;
      }
    });
  }

  eliminar(item: InformeResumen, evento: Event): void {
    evento.stopPropagation();
    if (!confirm(`¿Eliminar el informe "${item.titulo}"?`)) return;
    this.informes.eliminar(item.id).subscribe({
      next: () => {
        this.historial = this.historial.filter(i => i.id !== item.id);
        if (this.informe?.id === item.id) this.informes.mostrar(null);
      }
    });
  }

  exportar(formato: FormatoExportacion): void {
    if (!this.informe || this.exportando) return;
    this.exportando = formato;
    this.errorExportar = '';
    const informe = this.informe;
    this.informes.exportar(informe.id, formato).subscribe({
      next: blob => {
        this.exportando = null;
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `${this.nombreArchivo(informe.titulo)}.${formato}`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this.exportando = null;
        this.errorExportar = 'No se pudo exportar el informe. Intenta de nuevo.';
      }
    });
  }

  private nombreArchivo(titulo: string): string {
    const base = titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    return `informe-${base || 'kantu'}`;
  }

  ordenarPor(indice: number): void {
    if (!this.informe) return;
    const desc = this.orden?.columna === indice ? !this.orden.desc : NUMERICAS.has(this.informe.columnas[indice].tipo);
    this.orden = { columna: indice, desc };
    const signo = desc ? -1 : 1;
    this.filasVisibles = [...this.informe.filas].sort((a, b) => {
      const x = a[indice];
      const y = b[indice];
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * signo;
    });
  }

  esNumerica(columna: ColumnaInforme): boolean {
    return NUMERICAS.has(columna.tipo);
  }

  formato(valor: ValorCelda, columna: ColumnaInforme): string {
    if (valor === null || valor === undefined) return '—';
    if (typeof valor !== 'number') return String(valor);
    switch (columna.tipo) {
      case 'moneda':
        return `Bs ${valor.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'entero':
        return valor.toLocaleString('es-BO', { maximumFractionDigits: 0 });
      case 'decimal':
        return valor.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      default:
        return String(valor);
    }
  }

  /** Totales de las columnas que suman (unidades, montos); `null` en las demás. */
  get totales(): (number | null)[] | null {
    if (!this.informe || this.informe.filas.length < 2) return null;
    const sumables = this.informe.columnas.map(c => !!c.sumable);
    if (!sumables.some(Boolean)) return null;
    return this.informe.columnas.map((_, i) =>
      sumables[i] ? this.informe!.filas.reduce((acc, f) => acc + (Number(f[i]) || 0), 0) : null
    );
  }

  get tieneGrafico(): boolean {
    const g = this.informe?.grafico;
    return !!(g?.tipo && g.etiqueta && g.valor && this.informe!.filas.length > 1);
  }

  private dibujarGrafico(): void {
    this.chart?.destroy();
    this.chart = null;
    const informe = this.informe;
    const canvas = this.graficoCanvas?.nativeElement;
    if (!informe || !canvas || !this.tieneGrafico) return;

    const claves = informe.columnas.map(c => c.clave);
    const iEtiqueta = claves.indexOf(informe.grafico.etiqueta!);
    const iValor = claves.indexOf(informe.grafico.valor!);
    if (iEtiqueta < 0 || iValor < 0) return;

    const esLinea = informe.grafico.tipo === 'lineas';
    let filas = informe.filas;
    filas = esLinea ? filas.slice(-MAX_PUNTOS_GRAFICO) : filas.slice(0, MAX_PUNTOS_GRAFICO);
    const columnaValor = informe.columnas[iValor];

    const estilos = getComputedStyle(document.documentElement);
    const primario = estilos.getPropertyValue('--primary').trim() || '#C8102E';
    const linea = estilos.getPropertyValue('--line').trim() || '#E6E8EE';
    const tenue = estilos.getPropertyValue('--muted').trim() || '#5F6675';

    this.chart = new Chart(canvas, {
      type: esLinea ? 'line' : 'bar',
      data: {
        labels: filas.map(f => String(f[iEtiqueta] ?? '—')),
        datasets: [{
          label: columnaValor.titulo,
          data: filas.map(f => Number(f[iValor]) || 0),
          backgroundColor: esLinea ? 'rgba(200, 16, 46, 0.12)' : primario,
          borderColor: primario,
          borderWidth: esLinea ? 2.5 : 0,
          borderRadius: esLinea ? 0 : 6,
          fill: esLinea,
          tension: 0.3,
          pointRadius: esLinea ? 3 : 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // Rankings largos se leen mejor en horizontal.
        indexAxis: !esLinea && filas.length > 6 ? 'y' : 'x',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => `${columnaValor.titulo}: ${this.formato(ctx.raw as number, columnaValor)}` }
          }
        },
        scales: {
          x: { grid: { color: linea }, ticks: { color: tenue, font: { family: 'Inter' } } },
          y: { grid: { color: linea }, ticks: { color: tenue, font: { family: 'Inter' } }, beginAtZero: true }
        }
      }
    });
  }
}
