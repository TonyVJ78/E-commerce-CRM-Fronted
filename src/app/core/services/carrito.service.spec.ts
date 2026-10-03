import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CarritoResponse, CarritoService } from './carrito.service';

describe('CarritoService CU-11', () => {
  let service: CarritoService;
  let http: HttpTestingController;
  const cart: CarritoResponse = {
    total_items: 2, total_global: '60.00', carritos: [{
      id: 1, tienda_id: 7, tienda_nombre: 'Tienda Andina', fecha_creacion: '',
      cantidad_items: 2, total: '60.00', items: [{
        id: 9, carrito_id: 1, tienda_id: 7, tienda_nombre: 'Tienda Andina',
        producto_id: 12, producto_nombre: 'Aguayo', producto_imagen: '',
        variante_id: 91, variante_nombre: 'Única', variante_sku: '',
        precio_unitario: '30.00', cantidad: 2, subtotal: '60.00', stock_disponible: 5
      }]
    }]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    service = TestBed.inject(CarritoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga productos, contador y total desde el carrito existente', () => {
    let count = -1;
    let total = '';
    service.cartCount$.subscribe(value => count = value);
    service.cartData$.subscribe(value => total = value?.total_global ?? '');
    service.obtenerCarrito().subscribe(response => expect(response.carritos[0].items[0].cantidad).toBe(2));
    const request = http.expectOne(req => req.url.endsWith('/pedidos/carrito/'));
    expect(request.request.method).toBe('GET');
    request.flush(cart);
    expect(count).toBe(2);
    expect(total).toBe('60.00');
  });

  it('agregar un producto vuelve a consultar el contador y el drawer', () => {
    service.agregarItem({tienda_id: 7, variante_id: 91}).subscribe();
    const request = http.expectOne(req => req.url.endsWith('/pedidos/carrito/items/'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({tienda_id: 7, variante_id: 91});
    request.flush({id: 9, carrito_id: 1, tienda_id: 7, variante_id: 91, producto_id: 12, cantidad: 2});
    http.expectOne(req => req.url.endsWith('/pedidos/carrito/')).flush(cart);
  });

  it('incrementar, disminuir y eliminar actualizan el carrito visible', () => {
    service.actualizarCantidad(9, 3).subscribe();
    let request = http.expectOne(req => req.url.endsWith('/pedidos/carrito/items/9/'));
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({cantidad: 3});
    request.flush({});
    http.expectOne(req => req.url.endsWith('/pedidos/carrito/')).flush(cart);

    service.actualizarCantidad(9, 1).subscribe();
    request = http.expectOne(req => req.url.endsWith('/pedidos/carrito/items/9/'));
    expect(request.request.body).toEqual({cantidad: 1});
    request.flush({});
    http.expectOne(req => req.url.endsWith('/pedidos/carrito/')).flush(cart);

    service.eliminarItem(9).subscribe();
    request = http.expectOne(req => req.url.endsWith('/pedidos/carrito/items/9/'));
    expect(request.request.method).toBe('DELETE');
    request.flush({});
    http.expectOne(req => req.url.endsWith('/pedidos/carrito/')).flush({carritos: [], total_items: 0, total_global: '0.00'});
  });

  it('vaciar y checkout limpian contador y emiten la compra', () => {
    let count = -1;
    let items = -1;
    let completed = false;
    service.cartCount$.subscribe(value => count = value);
    service.cartData$.subscribe(value => items = value?.total_items ?? -1);
    service.checkoutCompleted$.subscribe(() => completed = true);
    service.obtenerCarrito().subscribe();
    http.expectOne(req => req.url.endsWith('/pedidos/carrito/')).flush(cart);

    service.vaciarCarrito().subscribe();
    const clear = http.expectOne(req => req.url.endsWith('/pedidos/carrito/'));
    expect(clear.request.method).toBe('DELETE');
    clear.flush({});
    expect(count).toBe(0);
    expect(items).toBe(0);

    service.checkout().subscribe();
    const checkout = http.expectOne(req => req.url.endsWith('/pedidos/carrito/checkout/'));
    expect(checkout.request.method).toBe('POST');
    checkout.flush({mensaje: 'Pedido registrado', pedidos: [1]});
    expect(completed).toBeTrue();
    expect(count).toBe(0);
    expect(items).toBe(0);
  });
});
