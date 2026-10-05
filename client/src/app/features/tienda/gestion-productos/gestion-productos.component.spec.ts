import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { GestionProductosComponent } from './gestion-productos.component';
import { AuthService } from '../../../core/services/auth.service';
import { CarritoService } from '../../../core/services/carrito.service';
import { Usuario } from '../../../core/models/auth.model';
import { Producto } from '../../../core/models/producto.model';
import { environment } from '../../../../environments/environment';

describe('Revisar inventario desde alerta CU-17', () => {
  const base = `${environment.apiUrl}/tiendas`;
  const producto: Producto = {
    id: 10, tienda: 2, nombre: 'Polera', slug: 'polera', stock_total: 3,
    variantes: [{id: 15, nombre: 'Azul', sku: 'AZUL', precio: '10.00', precio_oferta: null,
      stock: 3, stock_minimo: 5, activa: true, atributos: {}}],
  };
  let http: HttpTestingController;
  let user: BehaviorSubject<Usuario | null>;

  beforeEach(() => {
    user = new BehaviorSubject<Usuario | null>({id: 1, email: 'empresa@test.local', first_name: '', last_name: '', rol: 'empresa'});
    TestBed.configureTestingModule({
      imports: [GestionProductosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        {provide: AuthService, useValue: {currentUser$: user.asObservable(), sessionClosing$: new Subject<void>()}},
        {provide: CarritoService, useValue: {checkoutCompleted$: new Subject<void>()}},
        {provide: ActivatedRoute, useValue: {snapshot: {queryParamMap: convertToParamMap({tienda_id: 2, producto_id: 10, variante_id: 15})}}},
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify({ignoreCancelled: true}));

  function abrir() {
    const fixture = TestBed.createComponent(GestionProductosComponent);
    fixture.detectChanges();
    http.expectOne(`${base}/`).flush([
      {id: 1, nombre: 'Otra propia', slug: 'otra', activa: true},
      {id: 2, nombre: 'Correcta', slug: 'correcta', activa: true},
    ]);
    http.expectOne(`${base}/2/productos/`).flush([structuredClone(producto)]);
    fixture.detectChanges();
    return fixture;
  }

  it('abre producto y variante indicados en la alerta, en la tienda correcta', () => {
    const fixture = abrir();
    expect(fixture.componentInstance.tiendaSeleccionadaId).toBe(2);
    expect(fixture.componentInstance.productoEnEdicion?.id).toBe(10);
    expect(fixture.componentInstance.varianteEnEdicion?.id).toBe(15);
    expect(fixture.nativeElement.textContent).toContain('Inventario por variante');
    fixture.destroy();
  });

  it('guarda stock y mínimo con control de concurrencia y consulta el inventario actualizado', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    component.inventarioForm.setValue({stock: 6, stock_minimo: 5});
    component.guardarInventario();
    const request = http.expectOne(`${base}/2/productos/10/variantes/15/inventario/`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({stock: 6, stock_minimo: 5, stock_esperado: 3});
    request.flush({id: 15, stock: 6, stock_minimo: 5});
    http.expectOne(`${base}/2/productos/`).flush([]);
    expect(component.varianteEnEdicion?.stock).toBe(6);
    fixture.destroy();
  });

  it('muestra conflicto sin alterar el stock local y permite reintentar', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    component.guardarInventario();
    http.expectOne(`${base}/2/productos/10/variantes/15/inventario/`).flush(
      {detail: 'El stock cambió'}, {status: 409, statusText: 'Conflict'},
    );
    expect(component.errorInventario).toBe('El stock cambió');
    expect(component.varianteEnEdicion?.stock).toBe(3);
    expect(component.guardandoInventario).toBeFalse();
    fixture.destroy();
  });

  it('cancela el ajuste y limpia producto y variante al cerrar sesión', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    component.guardarInventario();
    const request = http.expectOne(`${base}/2/productos/10/variantes/15/inventario/`);
    user.next(null);
    expect(request.cancelled).toBeTrue();
    expect(component.productoEnEdicion).toBeNull();
    expect(component.varianteEnEdicion).toBeNull();
    expect(component.productos).toEqual([]);
    fixture.destroy();
  });
});
