import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { AuthService } from '../../core/services/auth.service';
import { CarritoService } from '../../core/services/carrito.service';
import { ItemCarritoDetalle } from '../../core/models/carrito.model';

type MetodoPago = 'efectivo' | 'stripe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  menuOpen = false;
  cartOpen = false;
  checkoutSuccess = false;

  constructor(
    public authService: AuthService,
    public carritoService: CarritoService
  ) {}

  ngOnInit(): void {
    // Cargar carrito inicial para cualquier usuario autenticado
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.carritoService.cargarCarritoSilencioso();
      }
    });
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
          // Precargar Stripe.js + el PaymentIntent en segundo plano mientras el
          // usuario revisa su carrito, para que el formulario de tarjeta esté
          // listo de inmediato si luego elige pagar con Stripe.
          if (data.total_items > 0) {
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

  /** Abre/cierra el drawer y bloquea el scroll del fondo mientras está abierto, para que solo se pueda hacer scroll dentro del carrito. */
  private setCartOpen(open: boolean): void {
    this.cartOpen = open;
    document.body.style.overflow = open ? 'hidden' : '';
  }

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

  isCheckingOut = false;
  checkoutError: string | null = null;

  // --- Pago con tarjeta (Stripe) — CU-19 ---
  metodoPago: MetodoPago = 'efectivo';
  cargandoStripe = false;
  pagandoStripe = false;
  stripeError: string | null = null;
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;
  private stripeMontado = false;
  private stripePreload: Promise<{ stripe: Stripe; clientSecret: string }> | null = null;

  eliminar(itemId: number): void {
    this.carritoService.eliminarItem(itemId).subscribe();
  }

  vaciar(): void {
    if (confirm('¿Deseas vaciar todos los productos de tu carrito?')) {
      this.carritoService.vaciarCarrito().subscribe();
    }
  }

  /** Cambia el método de pago del checkout; al elegir Stripe monta el formulario de tarjeta debajo, sin salir de la página. */
  seleccionarMetodoPago(metodo: MetodoPago): void {
    if (this.metodoPago === metodo) return;
    this.metodoPago = metodo;
    this.checkoutError = null;
    this.stripeError = null;

    if (metodo === 'stripe' && !this.stripeMontado) {
      this.iniciarPagoStripe();
    }
  }

  /** Crea el PaymentIntent y carga Stripe.js por adelantado, sin esperar a que el usuario elija ese método de pago. */
  private precargarStripe(): Promise<{ stripe: Stripe; clientSecret: string }> {
    const preload = firstValueFrom(this.carritoService.crearIntentoPagoStripe()).then(async (intento) => {
      const stripe = await loadStripe(intento.publishable_key);
      if (!stripe) {
        throw new Error('No se pudo cargar el formulario de pago de Stripe.');
      }
      return { stripe, clientSecret: intento.client_secret };
    });

    this.stripePreload = preload;
    preload.catch(() => {}); // evita "unhandled rejection"; el error real se maneja al mostrar el formulario
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
        this.stripeError = err?.error?.error || err?.message || 'No se pudo iniciar el pago con Stripe.';
        this.cargandoStripe = false;
        this.stripePreload = null;
      });
  }

  /** Limpia el estado de Stripe. Desmonta el PaymentElement explícitamente porque el
   * nodo `#stripe-payment-element` ya no se destruye al cerrar el carrito (se usa
   * [hidden] para poder pivotear Efectivo/Stripe sin perder el formulario montado);
   * sin este unmount, el siguiente montaje se haría sobre un nodo que ya tiene un
   * iframe de una sesión de pago anterior. */
  private resetPagoStripe(): void {
    this.metodoPago = 'efectivo';
    this.paymentElement?.unmount();
    this.paymentElement = null;
    this.stripe = null;
    this.elements = null;
    this.stripeMontado = false;
    this.stripeError = null;
    this.pagandoStripe = false;
    this.stripePreload = null;
  }

  async pagarConStripe(): Promise<void> {
    if (!this.stripe || !this.elements || this.pagandoStripe) return;
    this.pagandoStripe = true;
    this.stripeError = null;

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
      this.stripeError = 'El pago no se completó. Intenta nuevamente.';
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
        this.stripeError = err.error?.error || 'El pago se realizó pero no se pudo registrar el pedido. Contacta a soporte.';
      }
    });
  }

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
