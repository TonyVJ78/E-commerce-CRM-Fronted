import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { AuthService } from '../../core/services/auth.service';
import { CarritoService } from '../../core/services/carrito.service';
import { ItemCarritoDetalle } from '../../core/models/carrito.model';

export type MetodoPago = 'efectivo' | 'stripe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  public readonly authService = inject(AuthService);
  public readonly carritoService = inject(CarritoService);

  menuOpen = false;
  cartOpen = false;
  checkoutSuccess = false;
  isCheckingOut = false;
  checkoutError: string | null = null;

  // --- Estado de Pasarela Stripe (CU-19) ---
  metodoPago: MetodoPago = 'efectivo';
  cargandoStripe = false;
  pagandoStripe = false;
  stripeError: string | null = null;

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;
  private stripeMontado = false;
  private stripePreload: Promise<{ stripe: Stripe; clientSecret: string }> | null = null;
  private firmaCarrito = '';
  /** Firma (ítems|total) del carrito con la que se creó el PaymentIntent vigente. */
  private firmaStripe = '';
  private readonly subs = new Subscription();

  ngOnInit(): void {
    // Cargar carrito inicial para cualquier usuario autenticado
    this.subs.add(this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.carritoService.cargarCarritoSilencioso();
      }
    }));

    // El PaymentIntent se crea por el total del carrito en ese momento: si el
    // carrito cambia (cantidades, ítems quitados o agregados desde el catálogo),
    // hay que crear otro cuando llega el total nuevo, porque si no se cobraría
    // un monto distinto y el checkout lo rechazaría.
    this.subs.add(this.carritoService.cartData$.subscribe((data) => {
      this.firmaCarrito = data ? `${data.total_items}|${data.total_global}` : '';
      if (this.cartOpen && this.stripePreload && this.firmaCarrito !== this.firmaStripe) {
        this.refrescarPagoStripe(data?.total_items ?? 0);
      }
    }));
  }

  ngOnDestroy(): void {
    this.resetPagoStripe();
    this.setCartOpen(false);
    this.subs.unsubscribe();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  toggleCart(): void {
    this.setCartOpen(!this.cartOpen);
    if (this.cartOpen) {
      this.checkoutSuccess = false;
      this.carritoService.obtenerCarrito().subscribe({
        next: (data) => {
          // Precarga en segundo plano mientras el usuario revisa el carrito
          if (data && data.total_items > 0) {
            this.precargarStripe();
          }
        },
        error: () => {}
      });
    } else {
      this.resetPagoStripe();
    }
  }

  closeCart(): void {
    this.setCartOpen(false);
    this.resetPagoStripe();
  }

  /**
   * Abre/cierra el drawer lateral y bloquea el scroll del viewport para evitar desplazamientos accidentales de fondo.
   */
  private setCartOpen(open: boolean): void {
    this.cartOpen = open;
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = open ? 'hidden' : '';
    }
  }

  // --- Operaciones de Ítems en Carrito ---
  // Cualquier cambio invalida el monto del PaymentIntent previo; la suscripción a
  // cartData$ de ngOnInit lo recrea con el total actualizado, conservando el método elegido.

  incrementar(item: ItemCarritoDetalle): void {
    this.carritoService.actualizarCantidad(item.id, item.cantidad + 1).subscribe();
  }

  decrementar(item: ItemCarritoDetalle): void {
    if (item.cantidad > 1) {
      this.carritoService.actualizarCantidad(item.id, item.cantidad - 1).subscribe();
    } else {
      this.eliminar(item.id);
    }
  }

  eliminar(itemId: number): void {
    this.carritoService.eliminarItem(itemId).subscribe();
  }

  vaciar(): void {
    if (confirm('¿Deseas vaciar todos los productos de tu carrito?')) {
      this.resetPagoStripe();
      this.carritoService.vaciarCarrito().subscribe();
    }
  }

  /**
   * Cambia el método de pago activo. Si se selecciona tarjeta, monta el elemento seguro de Stripe.
   */
  seleccionarMetodoPago(metodo: MetodoPago): void {
    if (this.metodoPago === metodo) return;
    this.metodoPago = metodo;
    this.checkoutError = null;
    this.stripeError = null;

    if (metodo === 'stripe' && !this.stripeMontado) {
      this.iniciarPagoStripe();
    }
  }

  /**
   * Crea el PaymentIntent en el backend y descarga Stripe.js anticipadamente.
   */
  private precargarStripe(): Promise<{ stripe: Stripe; clientSecret: string }> {
    const preload = firstValueFrom(this.carritoService.crearIntentoPagoStripe()).then(async (intento) => {
      const stripe = await loadStripe(intento.publishable_key);
      if (!stripe) {
        throw new Error('No se pudo inicializar la pasarela de pagos Stripe.');
      }
      return { stripe, clientSecret: intento.client_secret };
    });

    this.stripePreload = preload;
    this.firmaStripe = this.firmaCarrito;
    preload.catch(() => {}); // Previene errores no capturados en consola
    return preload;
  }

  private iniciarPagoStripe(): void {
    this.cargandoStripe = true;
    this.stripeError = null;
    const preload = this.stripePreload ?? this.precargarStripe();

    preload
      .then(({ stripe, clientSecret }) => {
        this.stripe = stripe;
        this.elements = stripe.elements({ clientSecret });
        this.paymentElement = this.elements.create('payment');
        this.paymentElement.mount('#stripe-payment-element');
        this.stripeMontado = true;
        this.cargandoStripe = false;
      })
      .catch((err) => {
        this.stripeError = err?.error?.error || err?.message || 'No se pudo cargar el formulario seguro de Stripe.';
        this.cargandoStripe = false;
        this.stripePreload = null;
      });
  }

  /** Descarta el PaymentIntent vigente (el carrito cambió) y crea uno nuevo por el total actual,
   * conservando el método de pago elegido. Si se está cobrando, no se toca nada. */
  private refrescarPagoStripe(totalItems: number): void {
    if (this.pagandoStripe) return;
    const metodo = this.metodoPago;
    this.resetPagoStripe();
    if (totalItems <= 0) return;
    this.precargarStripe();
    if (metodo === 'stripe') {
      this.metodoPago = 'stripe';
      this.iniciarPagoStripe();
    }
  }

  /**
   * Limpia y destruye meticulosamente la instancia de Stripe y el nodo del DOM.
   * Evita memory leaks, iframes huérfanos o colisiones al reabrir el drawer.
   */
  private resetPagoStripe(): void {
    this.metodoPago = 'efectivo';
    if (this.paymentElement) {
      try {
        this.paymentElement.unmount();
        this.paymentElement.destroy();
      } catch {
        // Ignora posibles excepciones si el elemento ya fue destruido
      }
      this.paymentElement = null;
    }
    this.stripe = null;
    this.elements = null;
    this.stripeMontado = false;
    this.stripeError = null;
    this.pagandoStripe = false;
    this.stripePreload = null;
    this.firmaStripe = '';

    if (typeof document !== 'undefined') {
      const mountNode = document.getElementById('stripe-payment-element');
      if (mountNode) {
        mountNode.innerHTML = '';
      }
    }
  }

  /**
   * Confirma el pago en Stripe con confirmPayment() y ejecuta el checkout en el Backend.
   */
  async pagarConStripe(): Promise<void> {
    if (!this.stripe || !this.elements || this.pagandoStripe) return;
    this.pagandoStripe = true;
    this.stripeError = null;

    try {
      const { error, paymentIntent } = await this.stripe.confirmPayment({
        elements: this.elements,
        redirect: 'if_required',
      });

      if (error) {
        this.stripeError = error.message || 'No se pudo procesar el pago con tarjeta.';
        this.pagandoStripe = false;
        return;
      }

      if (paymentIntent?.status !== 'succeeded') {
        this.stripeError = `El pago con tarjeta no se completó (estado: ${paymentIntent?.status}).`;
        this.pagandoStripe = false;
        return;
      }

      this.carritoService.checkout('stripe', paymentIntent.id).subscribe({
        next: () => {
          this.pagandoStripe = false;
          this.mostrarCheckoutExitoso();
        },
        error: (err) => {
          this.pagandoStripe = false;
          this.stripeError = err.error?.error || 'El pago se debitó pero ocurrió un error al registrar el pedido. Contacta a soporte.';
        }
      });
    } catch (err: any) {
      this.pagandoStripe = false;
      this.stripeError = err?.message || 'Error inesperado al conectar con Stripe.';
    }
  }

  /**
   * Checkout tradicional para pago en efectivo o contra entrega.
   */
  procederCheckout(): void {
    if (this.isCheckingOut) return;
    this.isCheckingOut = true;
    this.checkoutError = null;

    this.carritoService.checkout('efectivo').subscribe({
      next: () => {
        this.isCheckingOut = false;
        this.mostrarCheckoutExitoso();
      },
      error: (err) => {
        this.isCheckingOut = false;
        const msg = err.error?.error || err.error?.detail || 'Error al procesar la compra. Verifica la disponibilidad del producto.';
        this.checkoutError = msg;
        alert(msg);
      }
    });
  }

  private mostrarCheckoutExitoso(): void {
    this.checkoutSuccess = true;
    this.checkoutError = null;
    this.resetPagoStripe();
    setTimeout(() => {
      this.setCartOpen(false);
      this.checkoutSuccess = false;
    }, 2800);
  }

  logout(): void {
    this.setCartOpen(false);
    this.authService.logout().subscribe({
      next: () => {},
      error: () => {
        this.authService.clearSession();
      }
    });
  }
}
