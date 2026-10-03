import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CarritoResponse, CarritoService } from '../../core/services/carrito.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent CU-11', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let cartService: jasmine.SpyObj<CarritoService>;

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

  beforeEach(async () => {
    cartService = jasmine.createSpyObj<CarritoService>('CarritoService', [
      'cargarCarritoSilencioso', 'actualizarCantidad', 'eliminarItem', 'vaciarCarrito', 'checkout'
    ]);
    Object.defineProperty(cartService, 'cartCount$', {value: of(2), configurable: true});
    Object.defineProperty(cartService, 'cartData$', {value: of(cart)});
    cartService.actualizarCantidad.and.returnValue(of({}));
    cartService.eliminarItem.and.returnValue(of({}));
    cartService.vaciarCarrito.and.returnValue(of({}));
    cartService.checkout.and.returnValue(of({mensaje: 'Pedido registrado', pedidos: [1]}));
    const auth = {
      isAuthenticated: true,
      currentUser$: of({id: 1, email: 'cliente@example.com', first_name: '', last_name: '', rol: 'cliente'}),
      logout: jasmine.createSpy().and.returnValue(of({})),
      clearSession: jasmine.createSpy()
    };
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), {provide: AuthService, useValue: auth}, {provide: CarritoService, useValue: cartService}]
    }).compileComponents();
    fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
  });

  it('muestra navegación, usuario, Carrito y contador', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Kantu Market');
    expect(root.textContent).toContain('Catálogo');
    expect(root.textContent).toContain('Mi Perfil');
    expect(root.textContent).toContain('Cerrar Sesión');
    expect(root.querySelector('.cart-trigger-btn.desktop-only')?.textContent).toContain('Carrito');
    expect(root.querySelector('.cart-trigger-btn.desktop-only .cart-badge')?.textContent).toContain('2');
    expect(cartService.cargarCarritoSilencioso).toHaveBeenCalled();
  });

  it('mantiene visible el contador cuando el carrito está vacío', () => {
    Object.defineProperty(cartService, 'cartCount$', {value: of(0), configurable: true});
    fixture.detectChanges();
    const badges = fixture.nativeElement.querySelectorAll('.cart-badge');
    expect(badges.length).toBe(2);
    expect(Array.from(badges).every((badge: any) => badge.textContent.trim() === '0')).toBeTrue();
  });

  it('abre el drawer y muestra producto, cantidades, subtotal y total', () => {
    const root: HTMLElement = fixture.nativeElement;
    (root.querySelector('.cart-trigger-btn.desktop-only') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.cart-drawer.open')).not.toBeNull();
    expect(root.querySelector('.cart-items-list')?.textContent).toContain('Aguayo');
    expect(root.querySelector('.qty-display')?.textContent).toContain('2');
    expect(root.querySelector('.store-subtotal')?.textContent).toContain('60.00');
    expect(root.querySelector('.grand-total-amount')?.textContent).toContain('60.00');
  });

  it('incrementa, disminuye, elimina y vacía desde el drawer', () => {
    const root: HTMLElement = fixture.nativeElement;
    (root.querySelector('.cart-trigger-btn.desktop-only') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.btn-qty[title="Aumentar"]') as HTMLButtonElement).click();
    (root.querySelector('.btn-qty[title="Disminuir"]') as HTMLButtonElement).click();
    (root.querySelector('.btn-remove-item') as HTMLButtonElement).click();
    spyOn(window, 'confirm').and.returnValue(true);
    (root.querySelector('.btn-clear') as HTMLButtonElement).click();
    expect(cartService.actualizarCantidad).toHaveBeenCalledWith(9, 3);
    expect(cartService.actualizarCantidad).toHaveBeenCalledWith(9, 1);
    expect(cartService.eliminarItem).toHaveBeenCalledWith(9);
    expect(cartService.vaciarCarrito).toHaveBeenCalled();
  });

  it('confirma checkout y muestra el resultado', fakeAsync(() => {
    const root: HTMLElement = fixture.nativeElement;
    (root.querySelector('.cart-trigger-btn.desktop-only') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.btn-checkout') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cartService.checkout).toHaveBeenCalled();
    expect(root.querySelector('.checkout-alert-success')?.textContent).toContain('Pedido realizado');
    tick(2800);
  }));
});
