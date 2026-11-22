import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PrecioComponent } from './precio.component';
import { MonedaService } from '../../core/services/moneda.service';

describe('CU-39 representación monetaria e historial', () => {
  const moneda = signal<'BOB' | 'USD'>('USD');
  const tasa = signal<number | null>(8);

  beforeEach(() => {
    moneda.set('USD'); tasa.set(8);
    TestBed.configureTestingModule({ imports: [PrecioComponent], providers: [
      { provide: MonedaService, useValue: { moneda, usdBob: tasa } },
    ] });
  });

  it('muestra el precio USD fijado con su equivalente Bs', () => {
    const f = TestBed.createComponent(PrecioComponent);
    f.componentRef.setInput('bs', '80.00'); f.componentRef.setInput('usd', '10.00'); f.detectChanges();
    expect(f.componentInstance.vista().principal).toContain('10,00');
    expect(f.componentInstance.vista().secundario).toContain('80,00');
  });

  it('usa la tasa histórica aunque cambie la cotización actual', () => {
    const f = TestBed.createComponent(PrecioComponent);
    f.componentRef.setInput('bs', '80.00'); f.componentRef.setInput('tipoCambio', '8.0000');
    f.componentRef.setInput('historico', true); tasa.set(20); f.detectChanges();
    expect(f.componentInstance.vista().principal).toContain('10,00');
  });

  it('no inventa USD para pedidos anteriores sin tasa guardada', () => {
    const f = TestBed.createComponent(PrecioComponent);
    f.componentRef.setInput('bs', '80.00'); f.componentRef.setInput('historico', true); f.detectChanges();
    expect(f.componentInstance.vista().principal).toContain('Bs');
    expect(f.componentInstance.vista().secundario).toBeNull();
  });
});
