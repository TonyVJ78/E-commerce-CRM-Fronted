import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MensajeChat, ProductoCatalogo } from '../../core/models';
import { ChatbotService } from '../../core/services/chatbot.service';
import { MarkdownComponent } from '../markdown/markdown.component';

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
  abort(): void;
};

const IMAGEN_RESPALDO =
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=200&q=60';

/**
 * Chatbot de recomendaciones para el cliente: botón flotante + panel.
 *
 * Las respuestas llegan en Markdown; los productos citados se muestran además
 * como tarjetas que abren su ficha (`/producto/:id`). En pantallas angostas el
 * panel ocupa toda la pantalla y se cierra al abrir un producto.
 *
 * Se le puede hablar: el micrófono dicta el mensaje (Web Speech API) y lo
 * envía al terminar la frase; la respuesta a un mensaje hablado se lee en voz
 * alta con `speechSynthesis`, que se corta al volver a tocar el micrófono.
 */
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MarkdownComponent],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements AfterViewChecked, OnDestroy {
  private readonly chatbot = inject(ChatbotService);
  private readonly zona = inject(NgZone);

  @ViewChild('lista') lista?: ElementRef<HTMLElement>;
  @ViewChild('entrada') entrada?: ElementRef<HTMLTextAreaElement>;

  abierto = false;
  texto = '';
  mensajes: MensajeChat[] = [];
  enviando = false;

  readonly vozDisponible = !!this.claseReconocimiento();
  readonly lecturaDisponible = typeof window !== 'undefined' && 'speechSynthesis' in window;
  escuchando = false;
  hablando = false;
  errorVoz = '';
  private reconocimiento: Reconocimiento | null = null;
  private textoAntesDeDictar = '';
  /** La próxima respuesta del asistente se lee en voz alta (la pregunta fue hablada). */
  private leerProximaRespuesta = false;

  private bajarAlFinal = false;
  private readonly subs = new Subscription();

  constructor() {
    this.subs.add(this.chatbot.mensajes$.subscribe(m => {
      const anterior = this.mensajes.length;
      this.mensajes = m;
      this.bajarAlFinal = true;
      const ultimo = m[m.length - 1];
      if (this.leerProximaRespuesta && m.length > anterior && ultimo?.rol === 'asistente') {
        this.leerProximaRespuesta = false;
        this.leerEnVozAlta(ultimo.contenido);
      }
    }));
    this.subs.add(this.chatbot.enviando$.subscribe(e => {
      this.enviando = e;
      this.bajarAlFinal = true;
    }));
  }

  ngAfterViewChecked(): void {
    if (this.bajarAlFinal && this.lista) {
      const el = this.lista.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.bajarAlFinal = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.reconocimiento?.abort();
    this.callar();
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.abierto) this.cerrar();
  }

  alternar(): void {
    if (this.abierto) {
      this.cerrar();
    } else {
      this.abrir();
    }
  }

  abrir(): void {
    this.abierto = true;
    this.bajarAlFinal = true;
    setTimeout(() => this.entrada?.nativeElement.focus(), 50);
  }

  cerrar(): void {
    this.abierto = false;
    this.reconocimiento?.abort();
    this.callar();
  }

  enviar(texto: string = this.texto, porVoz = false): void {
    if (!texto.trim() || this.enviando) return;
    this.reconocimiento?.abort();
    this.callar();
    this.leerProximaRespuesta = porVoz && this.lecturaDisponible;
    this.chatbot.enviar(texto);
    this.texto = '';
    this.ajustarAltura();
  }

  alTeclear(evento: KeyboardEvent): void {
    // Enter envía; Shift+Enter hace salto de línea.
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.isComposing) {
      evento.preventDefault();
      this.enviar();
    }
  }

  ajustarAltura(): void {
    const el = this.entrada?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  reiniciar(): void {
    this.callar();
    this.chatbot.reiniciar();
  }

  // ---------------------------------------------------------------- voz

  private claseReconocimiento(): (new () => Reconocimiento) | null {
    if (typeof window === 'undefined') return null;
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  /** Empieza o detiene el dictado. Si Kantu estaba hablando, primero lo calla. */
  alternarVoz(): void {
    if (this.escuchando) {
      this.reconocimiento?.stop();
      return;
    }
    this.callar();
    const Clase = this.claseReconocimiento();
    if (!Clase || this.enviando) return;

    const rec = new Clase();
    rec.lang = 'es-BO';
    rec.interimResults = true;
    rec.continuous = false;
    this.textoAntesDeDictar = this.texto.trim() ? `${this.texto.trim()} ` : '';
    let dictado = '';

    rec.onresult = evento => this.zona.run(() => {
      dictado = '';
      for (let i = 0; i < evento.results.length; i++) {
        dictado += evento.results[i][0].transcript;
      }
      this.texto = this.textoAntesDeDictar + dictado;
      setTimeout(() => this.ajustarAltura());
    });
    rec.onerror = evento => this.zona.run(() => {
      dictado = '';
      if (evento?.error === 'not-allowed' || evento?.error === 'service-not-allowed') {
        this.errorVoz = 'Permite el acceso al micrófono para hablar con Kantu.';
      } else if (evento?.error === 'no-speech') {
        this.errorVoz = 'No te escuché. Toca el micrófono e intenta de nuevo.';
      } else if (evento?.error !== 'aborted') {
        this.errorVoz = 'La voz no está disponible ahora. Puedes escribir tu mensaje.';
      }
    });
    // Al terminar la frase el mensaje se envía solo, como en una conversación.
    rec.onend = () => this.zona.run(() => {
      const enviarlo = this.reconocimiento === rec && !!dictado.trim();
      this.escuchando = false;
      this.reconocimiento = null;
      if (enviarlo) {
        this.enviar(this.texto, true);
      } else {
        this.entrada?.nativeElement.focus();
      }
    });

    this.reconocimiento = rec;
    this.errorVoz = '';
    this.escuchando = true;
    rec.start();
  }

  callar(): void {
    this.leerProximaRespuesta = false;
    if (!this.lecturaDisponible) return;
    window.speechSynthesis.cancel();
    this.hablando = false;
  }

  private leerEnVozAlta(markdown: string): void {
    const texto = textoParaLeer(markdown);
    if (!texto || !this.lecturaDisponible) return;
    const sintesis = window.speechSynthesis;
    const frase = new SpeechSynthesisUtterance(texto);
    frase.lang = 'es-BO';
    // Una voz en español si el sistema tiene; si no, la que el navegador elija para es-BO.
    const voces = sintesis.getVoices();
    const voz = voces.find(v => v.lang.replace('_', '-') === 'es-BO')
      ?? voces.find(v => v.lang.toLowerCase().startsWith('es'));
    if (voz) frase.voice = voz;
    frase.onend = frase.onerror = () => this.zona.run(() => (this.hablando = false));
    sintesis.cancel();
    this.hablando = true;
    sintesis.speak(frase);
  }

  /** En móvil el panel tapa la ficha del producto: se cierra al abrirla. */
  alAbrirProducto(): void {
    if (window.matchMedia('(max-width: 640px)').matches) this.cerrar();
  }

  esUltimoDelAsistente(indice: number): boolean {
    return indice === this.mensajes.length - 1 && this.mensajes[indice].rol === 'asistente';
  }

  imagen(producto: ProductoCatalogo): string {
    if (producto.imagen_principal) return producto.imagen_principal;
    const primera = producto.imagenes?.[0];
    if (primera) return typeof primera === 'object' ? primera.url : String(primera);
    return IMAGEN_RESPALDO;
  }

  /** Precio más bajo considerando ofertas, como lo ve el modelo. */
  precio(producto: ProductoCatalogo): string {
    const precios = (producto.variantes || []).map(v => Number(v.precio_oferta ?? v.precio));
    const minimo = precios.length ? Math.min(...precios) : Number(producto.precio_base || 0);
    return minimo.toFixed(2);
  }

  enOferta(producto: ProductoCatalogo): boolean {
    return (producto.variantes || []).some(v => v.precio_oferta !== null && v.precio_oferta !== undefined);
  }

  trackPorIndice(indice: number): number {
    return indice;
  }
}

/**
 * Texto plano para leer en voz alta: los enlaces `[Nombre](producto:ID)` se
 * leen solo por su nombre y se quitan las marcas de Markdown y los emojis.
 */
function textoParaLeer(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_`~#>|]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\bBs\.?\s*(\d+(?:[.,]\d+)?)/g, '$1 bolivianos')
    // Cada línea (ítem de lista, título) termina en pausa al leerse.
    .replace(/([^.!?:;,\s])[ \t]*\n+/g, '$1. ')
    .replace(/\s+/g, ' ')
    .trim();
}
