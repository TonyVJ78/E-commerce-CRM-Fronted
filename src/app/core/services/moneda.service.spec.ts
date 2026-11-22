import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MonedaService } from './moneda.service';

describe('CU-39 MonedaService', () => {
  let http: HttpTestingController;
  let service: MonedaService;

  beforeEach(() => {
    localStorage.removeItem('km_moneda');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(MonedaService);
  });

  afterEach(() => { http.verify(); localStorage.removeItem('km_moneda'); });

  it('consulta la tasa y convierte el equivalente publicado por el servidor', () => {
    http.expectOne(r => r.url.endsWith('/finanzas/tipo-cambio/')).flush({
      vigente: { fecha: '2026-01-01', usd_bob: '8.1250', ufv_bob: null, fuente: 'Fixture' }, historial: [],
    });
    service.elegir('USD');
    expect(service.mostrarUsd()).toBeTrue();
    expect(service.usdABs('12.00')).toBe(97.5);
    expect(localStorage.getItem('km_moneda')).toBe('USD');
  });

  it('mantiene Bs cuando no existe cotización y no inventa un equivalente', () => {
    http.expectOne(r => r.url.endsWith('/finanzas/tipo-cambio/')).flush({ vigente: null, historial: [] });
    service.elegir('USD');
    expect(service.mostrarUsd()).toBeFalse();
    expect(service.usdABs(10)).toBeNull();
  });

  it('tolera indisponibilidad del servicio de cotización', () => {
    http.expectOne(r => r.url.endsWith('/finanzas/tipo-cambio/')).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.usdDisponible()).toBeFalse();
  });
});
