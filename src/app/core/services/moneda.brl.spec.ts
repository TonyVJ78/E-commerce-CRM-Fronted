import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { EstadoBrl, Moneda, VisualizacionBrl } from '../models/finanzas.model';
import { MonedaService, formatearDecimalExacto } from './moneda.service';
import { PrecioComponent } from '../../shared/precio/precio.component';
import { MonedaPrecioComponent } from '../../shared/precio/moneda-precio.component';

const estado: EstadoBrl = { estado: 'disponible', disponible: true, fecha: '2026-11-21',
  tasa_bob_por_brl: '2.00000000', fuente: 'DEMO SINTÉTICA', demo: true };
const vista: VisualizacionBrl = { moneda: 'BRL', precio_normal: '32.00', precio_efectivo: '30.00',
  cotizacion_fecha: '2026-11-21', tasa_bob_por_brl: '2.00000000', fuente: 'DEMO SINTÉTICA', demo: true };

describe('CU39 BRL: presentación de catálogo y regresión BOB/USD', () => {
  let service: MonedaService;
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.setItem('km_moneda', 'INVALIDA');
    TestBed.configureTestingModule({ imports: [PrecioComponent, MonedaPrecioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(MonedaService);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('km_moneda'); });

  function responder(brl: EstadoBrl | null = estado) {
    http.expectOne(r => r.url.endsWith('/finanzas/tipo-cambio/')).flush({ vigente: {
      fecha: '2026-11-21', usd_bob: '8.0000', ufv_bob: null, fuente: 'DEMO USD' }, historial: [], ...(brl ? { brl } : {}) });
  }
  function componente(contexto = true, info: VisualizacionBrl | null = vista) {
    const f = TestBed.createComponent(PrecioComponent);
    f.componentRef.setInput('bs', '60.00'); f.componentRef.setInput('contextoCatalogo', contexto);
    f.componentRef.setInput('brl', info); f.detectChanges(); return f;
  }

  it('BRL-01/02 muestra la cadena calculada por Django, sin reconvertir en JS', () => {
    responder(); service.elegir('BRL'); const f = componente();
    f.componentRef.setInput('bs', '777.00'); f.detectChanges();
    expect(f.componentInstance.vista().principal).toBe('≈ R$ 30,00');
    expect(f.nativeElement.textContent).toContain('DEMO — tasa sintética');
    expect(f.nativeElement.textContent).toContain('21/11/2026');
  });
  it('BRL-02 formatea centavos exactos y rechaza valores no redondeados', () => {
    responder();
    expect(formatearDecimalExacto('9999999999.99', 'BRL')).toBe('R$ 9.999.999.999,99');
    expect(formatearDecimalExacto('0.51', 'BRL')).toBe('R$ 0,51');
    expect(formatearDecimalExacto('1.005', 'BRL')).toBeNull();
  });
  it('BRL-03/19 conserva BOB/USD como únicas monedas de fijación', () => {
    responder();
    // @ts-expect-error BRL pertenece a visualización, nunca al tipo de fijación.
    const prohibida: Moneda = 'BRL';
    expect(prohibida).toBe('BRL'); // La comprobación del tipo se realiza al compilar.
    const f = TestBed.createComponent(MonedaPrecioComponent);
    f.componentRef.setInput('grupo', new FormGroup({ moneda_precio: new FormControl('BOB'),
      precio: new FormControl('64.00'), precio_usd: new FormControl(null) }));
    f.detectChanges();
    const botones = [...f.nativeElement.querySelectorAll('button')].map((b: any) => b.textContent.trim());
    expect(botones).toEqual(['Bs', 'USD']);
  });
  it('BRL-04/05 distingue oferta normal, efectiva y cero', () => {
    responder(); service.elegir('BRL'); const f = componente();
    expect(f.componentInstance.vista().principal).toBe('≈ R$ 30,00');
    f.componentRef.setInput('brlCampo', 'precio_normal'); f.detectChanges();
    expect(f.componentInstance.vista().principal).toBe('≈ R$ 32,00');
    f.componentRef.setInput('brlCampo', 'precio_efectivo');
    f.componentRef.setInput('brl', { ...vista, precio_efectivo: '0.00' }); f.detectChanges();
    expect(f.componentInstance.vista().principal).toBe('≈ R$ 0,00');
  });
  it('BRL-15/16 no convierte historial con el BRL actual', () => {
    responder(); service.elegir('BRL'); const f = componente();
    f.componentRef.setInput('historico', true); f.componentRef.setInput('tipoCambio', '8.0000'); f.detectChanges();
    expect(f.componentInstance.vista().principal).toContain('Bs');
    expect(f.componentInstance.referenciaBrl()).toBeNull();
    service.elegir('USD'); f.detectChanges();
    expect(f.componentInstance.vista().principal).toContain('US$ 7,50');
  });
  it('BRL-12/16/18 deja carrito y recomendaciones heredadas en Bs', () => {
    responder(); service.elegir('BRL'); const f = componente(false);
    expect(f.componentInstance.vista().principal).toContain('Bs 60,00');
    expect(f.componentInstance.referenciaBrl()).toBeNull();
  });
  it('BRL-09/18 rechaza equivalencia de una observación distinta', () => {
    responder(); service.elegir('BRL'); const f = componente(true, { ...vista, cotizacion_fecha: '2026-11-20' });
    expect(f.componentInstance.vista().principal).toContain('Bs');
    f.componentRef.setInput('brl', { ...vista, tasa_bob_por_brl: '3.00000000' }); f.detectChanges();
    expect(f.componentInstance.vista().principal).toContain('Bs');
  });
  it('BRL-14 muestra la fuente como texto escapado', () => {
    const fuente = '<script>no_ejecutar()</script>';
    responder({ ...estado, fuente }); service.elegir('BRL');
    const f = componente(true, { ...vista, fuente });
    expect(f.nativeElement.textContent).toContain(fuente);
    expect(f.nativeElement.querySelector('script')).toBeNull();
  });
  it('BRL-07/17 vuelve a Bs sin cotización válida', () => {
    responder({ ...estado, estado: 'sin_cotizacion', disponible: false }); service.elegir('BRL');
    expect(service.mostrarBrl()).toBeFalse();
    expect(componente().componentInstance.vista().principal).toContain('Bs');
  });
  it('BRL-08/17 tolera caída del servicio sin inventar un importe', () => {
    http.expectOne(r => r.url.endsWith('/finanzas/tipo-cambio/')).flush({}, { status: 503, statusText: 'Demo' });
    service.elegir('BRL'); expect(service.brlDisponible()).toBeFalse();
    expect(componente().componentInstance.vista().principal).toBe('Bs 60,00');
  });
  it('BRL-20 es compatible con la API bimoneda anterior sin bloque BRL', () => {
    responder(null);
    expect(service.brlPreparado()).toBeFalse(); service.elegir('USD');
    expect(componente().componentInstance.vista().principal).toContain('US$ 7,50');
  });
  it('BRL-17/19 valida la preferencia y conserva el selector BOB/USD', () => {
    responder(); expect(service.moneda()).toBe('BOB');
    service.elegir('BRL'); expect(localStorage.getItem('km_moneda')).toBe('BRL');
    service.elegir('BOB'); expect(service.moneda()).toBe('BOB');
    service.elegir('USD'); expect(service.usdABs('10')).toBe(80);
  });
});
