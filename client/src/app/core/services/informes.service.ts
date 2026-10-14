import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ContextoInformes,
  FormatoExportacion,
  GenerarInformeResponse,
  Informe,
  InformeResumen,
  MensajeChatApi,
  MensajeInforme
} from '../models';
import { AuthService } from './auth.service';

const SALUDO: MensajeInforme = {
  rol: 'asistente',
  contenido:
    'Hola, soy el **analista de Kantu**. Dime qué informe necesitas —por escrito o por voz— ' +
    'y consulto los datos de tu tienda. Te devuelvo una tabla, un análisis y puedes ' +
    'exportarlo a **PDF** o **Excel**.'
};

/**
 * Informes de tienda con IA (CU-34).
 *
 * Igual que el chatbot, el backend no guarda la conversación: se manda el
 * historial en cada turno. La conversación y el informe abierto viven en
 * sessionStorage por usuario para sobrevivir a una recarga de la pestaña.
 */
@Injectable({ providedIn: 'root' })
export class InformesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly apiUrl = `${environment.apiUrl}/ia/informes`;

  private readonly mensajesSubject = new BehaviorSubject<MensajeInforme[]>([SALUDO]);
  readonly mensajes$ = this.mensajesSubject.asObservable();
  private readonly enviandoSubject = new BehaviorSubject<boolean>(false);
  readonly enviando$ = this.enviandoSubject.asObservable();
  private readonly informeSubject = new BehaviorSubject<Informe | null>(null);
  readonly informe$ = this.informeSubject.asObservable();

  private claveUsuario: string | null = null;

  constructor() {
    this.authService.currentUser$.subscribe(usuario => {
      this.claveUsuario = usuario ? `km_informes_${usuario.id}` : null;
      this.mensajesSubject.next(this.leerGuardados());
      this.informeSubject.next(null);
    });
  }

  get enviando(): boolean {
    return this.enviandoSubject.value;
  }

  contexto(): Observable<ContextoInformes> {
    return this.http.get<ContextoInformes>(`${this.apiUrl}/contexto/`);
  }

  historial(): Observable<InformeResumen[]> {
    return this.http.get<InformeResumen[]>(`${this.apiUrl}/`);
  }

  obtener(id: number): Observable<Informe> {
    return this.http.get<Informe>(`${this.apiUrl}/${id}/`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }

  exportar(id: number, formato: FormatoExportacion): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/exportar/`, {
      params: { formato },
      responseType: 'blob'
    });
  }

  mostrar(informe: Informe | null): void {
    this.informeSubject.next(informe);
  }

  enviar(texto: string, tiendaId: number | null): void {
    const contenido = texto.trim();
    if (!contenido || this.enviando) return;

    // Los mensajes con error no se reenvían: confundirían al modelo.
    const conversacion: MensajeInforme[] = [
      ...this.mensajesSubject.value.filter(m => !m.error),
      { rol: 'usuario', contenido }
    ];
    this.publicar(conversacion);
    this.enviandoSubject.next(true);

    const mensajes: MensajeChatApi[] = conversacion.map(m => ({
      rol: m.rol,
      // El modelo recuerda qué informe armó por su título y su análisis.
      contenido: m.informeTitulo ? `Informe "${m.informeTitulo}":\n${m.contenido}` : m.contenido
    }));

    this.http.post<GenerarInformeResponse>(`${this.apiUrl}/generar/`, { mensajes, tienda_id: tiendaId }).subscribe({
      next: res => {
        this.enviandoSubject.next(false);
        const mensaje: MensajeInforme = {
          rol: 'asistente',
          contenido: res.mensaje,
          sugerencias: res.sugerencias ?? []
        };
        if (res.informe) {
          mensaje.informeId = res.informe.id;
          mensaje.informeTitulo = res.informe.titulo;
          this.informeSubject.next(res.informe);
        }
        this.publicar([...conversacion, mensaje]);
      },
      error: (error: HttpErrorResponse) => {
        this.enviandoSubject.next(false);
        this.publicar([...conversacion, { rol: 'asistente', contenido: this.mensajeError(error), error: true }]);
      }
    });
  }

  reiniciar(): void {
    if (this.enviando) return;
    this.publicar([SALUDO]);
    this.informeSubject.next(null);
  }

  private publicar(mensajes: MensajeInforme[]): void {
    this.mensajesSubject.next(mensajes);
    if (!this.claveUsuario) return;
    try {
      sessionStorage.setItem(this.claveUsuario, JSON.stringify(mensajes));
    } catch {
      // Sin almacenamiento la conversación solo dura hasta recargar.
    }
  }

  private leerGuardados(): MensajeInforme[] {
    if (!this.claveUsuario) return [SALUDO];
    try {
      const guardados = JSON.parse(sessionStorage.getItem(this.claveUsuario) || 'null');
      return Array.isArray(guardados) && guardados.length ? guardados : [SALUDO];
    } catch {
      return [SALUDO];
    }
  }

  private mensajeError(error: HttpErrorResponse): string {
    if (error.status === 429) {
      return 'Vas muy rápido. Espera un momento y vuelve a intentarlo.';
    }
    if (error.status === 0) {
      return 'No pude conectarme con el servidor. Revisa tu conexión e intenta de nuevo.';
    }
    if (error.status === 403) {
      return error.error?.detail || 'No tienes permiso para generar informes.';
    }
    return error.error?.detail || 'No pude generar el informe ahora. Intenta de nuevo en unos segundos.';
  }
}
