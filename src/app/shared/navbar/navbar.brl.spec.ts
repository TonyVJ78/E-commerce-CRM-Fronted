import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { CarritoService } from '../../core/services/carrito.service';

describe('CU39 BRL selector de la ficha pública', () => {
  beforeEach(() => {
    localStorage.removeItem('km_moneda');
    TestBed.configureTestingModule({ imports:[NavbarComponent], providers:[provideRouter([]),
      provideHttpClient(), provideHttpClientTesting(),
      {provide:AuthService, useValue:{currentUser$:new BehaviorSubject(null),currentUser:null}},
      {provide:CarritoService, useValue:{cartData$:new BehaviorSubject(null),cartCount$:new BehaviorSubject(0)}}] });
  });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); localStorage.removeItem('km_moneda'); });

  it('permite consultar BRL en ficha pública sin habilitar un carrito anónimo', () => {
    const f = TestBed.createComponent(NavbarComponent);
    TestBed.inject(HttpTestingController).expectOne(r=>r.url.endsWith('/finanzas/tipo-cambio/')).flush({
      vigente:null,historial:[],brl:{estado:'disponible',disponible:true,fecha:'2026-11-21',
        tasa_bob_por_brl:'2.00000000',fuente:'DEMO',demo:true}});
    f.detectChanges();
    const selector = f.nativeElement.querySelector('[aria-label="Ver catálogo en reales brasileños"]');
    expect(selector).not.toBeNull(); expect(selector.disabled).toBeFalse();
    expect(f.nativeElement.querySelector('[aria-label="Abrir carrito de compras"]')).toBeNull();
    selector.click(); f.detectChanges();
    expect(f.componentInstance.monedaService.moneda()).toBe('BRL');
  });
  it('oculta BRL en la configuración bimoneda anterior', () => {
    const f = TestBed.createComponent(NavbarComponent);
    TestBed.inject(HttpTestingController).expectOne(r=>r.url.endsWith('/finanzas/tipo-cambio/')).flush({vigente:null,historial:[]});
    f.detectChanges();
    expect(f.nativeElement.querySelector('[aria-label="Ver catálogo en reales brasileños"]')).toBeNull();
  });
  it('expone el menú con su estado accesible y permite cerrarlo con Escape', () => {
    const f = TestBed.createComponent(NavbarComponent);
    TestBed.inject(HttpTestingController).expectOne(r=>r.url.endsWith('/finanzas/tipo-cambio/')).flush({vigente:null,historial:[]});
    f.detectChanges();
    const toggle=f.nativeElement.querySelector('[aria-controls="kantu-navigation"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click(); f.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); f.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
