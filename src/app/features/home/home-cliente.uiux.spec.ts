import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HomeClienteComponent } from './home-cliente.component';
import { CatalogoService } from '../../core/services/catalogo.service';
import { CarritoService } from '../../core/services/carrito.service';
import { RecomendacionService } from '../../core/services/recomendacion.service';
import { MonedaService } from '../../core/services/moneda.service';
import { ProductoCatalogo } from '../../core/models/catalogo.model';

describe('CU39 IU/UX: variante, ficha y precio coherentes', () => {
  const producto: ProductoCatalogo = {
    id:1, nombre:'Producto sintético', slug:'demo', descripcion:'Demo', imagenes:[], tienda_id:1,
    precio_base:'72.00', precio_base_usd:null,
    variantes:[
      {id:1,nombre:'Primera',sku:'DEMO-A',precio:'96.00',precio_usd:'12.00',precio_oferta:null,stock:10,activa:true,atributos:{}},
      {id:2,nombre:'Oferta',sku:'DEMO-B',precio:'80.00',precio_usd:'10.00',precio_oferta:'72.00',stock:10,activa:true,atributos:{}}
    ]
  };
  const interaccion = jasmine.createSpy('notificarInteraccion');
  beforeEach(() => {
    interaccion.calls.reset();
    TestBed.configureTestingModule({imports:[HomeClienteComponent],providers:[provideRouter([]),
      {provide:CatalogoService,useValue:{listarCategorias:()=>of([]),listarTiendas:()=>of([]),listarTodosLosProductos:()=>of([structuredClone(producto)])}},
      {provide:CarritoService,useValue:{checkoutCompleted$:of()}},
      {provide:RecomendacionService,useValue:{notificarInteraccion:interaccion}},
      {provide:MonedaService,useValue:{moneda:signal('BOB'),usdBob:signal(8)}}]});
  });
  function render() {
    const f=TestBed.createComponent(HomeClienteComponent);
    f.detectChanges(); return f;
  }
  it('ofrece enlaces reales a la ficha sin un botón contenedor de otros botones', () => {
    const f=render(); const card=f.nativeElement.querySelector('article.product-card');
    expect(card.getAttribute('role')).toBeNull();
    expect(card.querySelector('.link-details').getAttribute('href')).toBe('/producto/1');
    expect(card.querySelector('h3 a').getAttribute('href')).toBe('/producto/1');
  });
  it('al elegir una oferta cambia el precio y el estado accesible de la opción', () => {
    const f=render(); const buttons=f.nativeElement.querySelectorAll('.variant-btn');
    buttons[1].click(); f.detectChanges();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(f.nativeElement.querySelector('.price-amount').textContent).toContain('72,00');
    expect(f.componentInstance.productos[0].variantes[0].precio).toBe('96.00');
  });
  it('la vista rápida muestra el precio de la opción seleccionada, no el mínimo de otra', () => {
    const f=render(); const p=f.componentInstance.productos[0];
    f.componentInstance.abrirProducto(p); f.detectChanges();
    const dialog=f.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('Opción seleccionada: Primera');
    expect(dialog.querySelector('strong').textContent).toContain('96,00');
    expect(dialog.querySelector('strong').textContent).not.toContain('72,00');
  });
  it('conserva los eventos CLICK y VIEW del catálogo', () => {
    const f=render(); f.componentInstance.registrarAccesoFicha(f.componentInstance.productos[0]);
    expect(interaccion.calls.allArgs().map(a=>a[0].tipo_interaccion)).toEqual(['CLICK','VIEW']);
  });
});
