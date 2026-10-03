import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { ProductoCatalogo } from '../../core/services/catalogo.service';
import { ProductoRecomendado } from '../../core/models/recomendacion.model';
import { CarritoService, CheckoutResponse } from '../../core/services/carrito.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { RecomendacionService } from '../../core/services/recomendacion.service';
import { HomeClienteComponent } from './home-cliente.component';

describe('HomeClienteComponent, catálogo y CU-14', () => {
  let fixture: ComponentFixture<HomeClienteComponent>;
  let component: HomeClienteComponent;
  let catalog: jasmine.SpyObj<CatalogoService>;
  let cart: jasmine.SpyObj<CarritoService>;
  let recommendations: jasmine.SpyObj<RecomendacionService>;

  const product: ProductoCatalogo = {
    id: 12, tienda_id: 7, tienda_nombre: 'Tienda Andina', nombre: 'Aguayo',
    slug: 'aguayo', descripcion: 'Tejido tradicional', categoria_nombre: 'Textiles',
    precio_base: '30.00', imagen_principal: '', imagenes: [],
    variantes: [{id: 91, nombre: 'Única', precio: '30.00', stock: 5, activa: true}]
  };
  const recommended: ProductoRecomendado = {
    id: 12, tienda_id: 7, tienda_nombre: 'Tienda Andina', nombre: 'Aguayo',
    slug: 'aguayo', descripcion: 'Tejido tradicional', categoria_nombre: 'Textiles',
    precio_base: '30.00', imagen_principal: '', imagenes: [],
    variantes: [{id: 91, nombre: 'Única', precio: '30.00', stock: 5, activa: true}]
  };

  beforeEach(async () => {
    catalog = jasmine.createSpyObj<CatalogoService>('CatalogoService', [
      'listarTiendas', 'listarCategorias', 'listarTodosLosProductos'
    ]);
    catalog.listarTiendas.and.returnValue(of([{
      id: 7, nombre: 'Tienda Andina', slug: 'tienda-andina', logo_url: '',
      color_primario: '', descripcion: ''
    }]));
    catalog.listarCategorias.and.returnValue(of([{id: 3, nombre: 'Textiles'}]));
    catalog.listarTodosLosProductos.and.returnValue(of([product]));

    cart = jasmine.createSpyObj<CarritoService>('CarritoService', ['agregarItem']);
    Object.defineProperty(cart, 'checkoutCompleted$', {value: new Subject<CheckoutResponse>().asObservable()});
    cart.agregarItem.and.returnValue(of({
      id: 1, carrito_id: 1, tienda_id: 7, variante_id: 91, producto_id: 12, cantidad: 1
    }));

    recommendations = jasmine.createSpyObj<RecomendacionService>(
      'RecomendacionService', ['obtenerRecomendaciones', 'registrarInteraccion']
    );
    recommendations.obtenerRecomendaciones.and.returnValue(of([recommended]));
    recommendations.registrarInteraccion.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [HomeClienteComponent],
      providers: [
        {provide: CatalogoService, useValue: catalog},
        {provide: CarritoService, useValue: cart},
        {provide: RecomendacionService, useValue: recommendations}
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('conserva hero, buscador, chips, catálogo y botón de carrito', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.home-hero h1')?.textContent).toContain('Explora lo mejor de nuestras tiendas');
    expect(root.querySelector('.search-input')).not.toBeNull();
    expect(root.querySelectorAll('.filter-row').length).toBe(2);
    expect(root.querySelector('.products-grid')?.textContent).toContain('Aguayo');
    expect(root.querySelector('.btn-add-cart')).not.toBeNull();
    expect(root.querySelector('app-recomendaciones')).toBeNull();
  });

  it('filtra catálogo por tienda y categoría y muestra recomendaciones entre filtros y catálogo', () => {
    component.filtrarPorTienda(7);
    component.filtrarPorCategoria(3);
    fixture.detectChanges();
    expect(catalog.listarTodosLosProductos).toHaveBeenCalledWith({tienda: 7, categoria: 3});
    expect(recommendations.obtenerRecomendaciones).toHaveBeenCalledWith(7, 8);
    const root: HTMLElement = fixture.nativeElement;
    const filters = root.querySelector('.filters-section')!;
    const recs = root.querySelector('app-recomendaciones')!;
    const grid = root.querySelector('.products-grid')!;
    expect(filters.compareDocumentPosition(recs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(recs.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(recs.textContent).toContain('Recomendados para ti');
  });

  it('SEARCH registra la señal y actualiza recomendaciones de la tienda activa', () => {
    component.filtrarPorTienda(7);
    fixture.detectChanges();
    component.terminoBusqueda = 'aguayo';
    component.aplicarFiltros();
    expect(catalog.listarTodosLosProductos).toHaveBeenCalledWith({tienda: 7, q: 'aguayo'});
    expect(recommendations.registrarInteraccion).toHaveBeenCalledWith({
      tienda_id: 7, tipo_interaccion: 'SEARCH', termino_busqueda: 'aguayo'
    });
    expect(recommendations.obtenerRecomendaciones).toHaveBeenCalledTimes(2);
  });

  it('seleccionar un recomendado registra CLICK y VIEW y abre el detalle', () => {
    component.filtrarPorTienda(7);
    fixture.detectChanges();
    component.recomendaciones!.seleccionar(recommended);
    fixture.detectChanges();
    expect(recommendations.registrarInteraccion).toHaveBeenCalledWith({
      tienda_id: 7, producto_id: 12, tipo_interaccion: 'CLICK'
    });
    expect(recommendations.registrarInteraccion).toHaveBeenCalledWith({
      tienda_id: 7, producto_id: 12, tipo_interaccion: 'VIEW'
    });
    expect(fixture.nativeElement.querySelector('.product-detail-dialog')?.textContent).toContain('Tejido tradicional');
  });

  it('rechaza abrir una recomendación ajena a la tienda elegida', () => {
    component.filtrarPorTienda(7);
    fixture.detectChanges();
    component.abrirProducto({...recommended, tienda_id: 8}, false);
    expect(component.productoEnDetalle).toBeNull();
    expect(recommendations.registrarInteraccion).not.toHaveBeenCalled();
  });

  it('agrega desde el catálogo sin perder la vista de recomendaciones', () => {
    component.filtrarPorTienda(7);
    fixture.detectChanges();
    component.agregarAlCarrito(product);
    expect(cart.agregarItem).toHaveBeenCalledWith({tienda_id: 7, variante_id: 91});
    expect(fixture.nativeElement.querySelector('app-recomendaciones')).not.toBeNull();
  });
});
