import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ProductoRecomendado } from '../../core/models/recomendacion.model';
import { CarritoService } from '../../core/services/carrito.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { RecomendacionService } from '../../core/services/recomendacion.service';
import { HomeClienteComponent } from './home-cliente.component';

describe('HomeClienteComponent CU-14', () => {
  let fixture: ComponentFixture<HomeClienteComponent>;
  let component: HomeClienteComponent;
  let recommendations: jasmine.SpyObj<RecomendacionService>;

  const product: ProductoRecomendado = {
    id: 12,
    tienda_id: 7,
    tienda_nombre: 'Tienda',
    nombre: 'Producto recomendado',
    slug: 'producto-recomendado',
    descripcion: 'Detalle',
    categoria_nombre: 'Calzado',
    precio_base: '30.00',
    imagen_principal: '',
    imagenes: [],
    variantes: []
  };

  beforeEach(async () => {
    const catalog = jasmine.createSpyObj<CatalogoService>('CatalogoService', [
      'listarTiendas', 'listarProductos'
    ]);
    catalog.listarTiendas.and.returnValue(of([{
      id: 7, nombre: 'Tienda', slug: 'tienda', logo_url: '',
      color_primario: '', descripcion: ''
    }]));
    catalog.listarProductos.and.returnValue(of([]));
    recommendations = jasmine.createSpyObj<RecomendacionService>(
      'RecomendacionService', ['obtenerRecomendaciones', 'registrarInteraccion']
    );
    recommendations.obtenerRecomendaciones.and.returnValue(of([product]));
    recommendations.registrarInteraccion.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [HomeClienteComponent],
      providers: [
        {provide: CatalogoService, useValue: catalog},
        {provide: CarritoService, useValue: {}},
        {provide: RecomendacionService, useValue: recommendations}
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra recomendaciones de la tienda seleccionada', () => {
    expect(recommendations.obtenerRecomendaciones).toHaveBeenCalledWith(7, 8);
    expect(fixture.nativeElement.textContent).toContain('Recomendados para ti');
  });

  it('SEARCH registra la señal y vuelve a cargar las recomendaciones', () => {
    component.terminoRecomendaciones = 'calzado';
    component.buscarParaRecomendaciones();
    expect(recommendations.registrarInteraccion).toHaveBeenCalledWith({
      tienda_id: 7, tipo_interaccion: 'SEARCH', termino_busqueda: 'calzado'
    });
    expect(recommendations.obtenerRecomendaciones).toHaveBeenCalledTimes(2);
  });

  it('abrir un recomendado muestra el producto real y registra VIEW', () => {
    component.abrirRecomendacion(product);
    fixture.detectChanges();
    expect(component.productoRecomendadoEnDetalle?.id).toBe(12);
    expect(fixture.nativeElement.textContent).toContain('Detalle');
    expect(recommendations.registrarInteraccion).toHaveBeenCalledWith({
      tienda_id: 7, producto_id: 12, tipo_interaccion: 'VIEW'
    });
  });
});
