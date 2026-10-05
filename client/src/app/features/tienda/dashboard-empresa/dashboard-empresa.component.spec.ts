import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { DashboardEmpresaComponent } from './dashboard-empresa.component';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/models/auth.model';
import { DashboardMetrics, Tienda } from '../../../core/models/tienda.model';
import { environment } from '../../../../environments/environment';

describe('Panel propio de tienda CU-17/CU-18', () => {
  let fixture: ComponentFixture<DashboardEmpresaComponent>;
  let component: DashboardEmpresaComponent;
  let http: HttpTestingController;
  let usuario: BehaviorSubject<Usuario | null>;
  let cierre: Subject<void>;
  const base = `${environment.apiUrl}/tiendas`;
  const tiendas: Tienda[] = [
    {id: 1, propietario: 1, nombre: 'Tienda A', slug: 'a', activa: true},
    {id: 2, propietario: 1, nombre: 'Tienda B', slug: 'b', activa: true},
  ];

  function panel(id = 1): DashboardMetrics {
    return {
      tienda: tiendas[id - 1], tienda_id: id, tienda_nombre: tiendas[id - 1].nombre,
      total_productos: 9, productos_activos: 7, total_pedidos: 12, pedidos_pendientes: 3,
      ingresos_totales: '1250.50', productos_bajo_stock: 1,
      alertas_stock: [{producto_id: 10, producto_nombre: 'Polera', variante_id: 15,
        variante_nombre: 'Azul', sku: 'AZUL', stock: 3, stock_minimo: 5}],
      ventas_semana: Array.from({length: 7}, (_, i) => ({fecha: `2026-10-0${i + 1}`, cantidad: i === 3 ? 4 : 0})),
    };
  }

  function cargar(): void {
    fixture.detectChanges();
    http.expectOne(`${base}/`).flush(tiendas);
    http.expectOne(`${base}/1/dashboard/`).flush(panel());
    fixture.detectChanges();
  }

  beforeEach(() => {
    cierre = new Subject<void>();
    usuario = new BehaviorSubject<Usuario | null>({id: 1, email: 'empresa@test.local', first_name: '', last_name: '', rol: 'empresa'});
    TestBed.configureTestingModule({
      imports: [DashboardEmpresaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        {provide: AuthService, useValue: {currentUser$: usuario.asObservable(), sessionClosing$: cierre.asObservable(), get currentUser() {return usuario.value;}}}],
    });
    fixture = TestBed.createComponent(DashboardEmpresaComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify({ignoreCancelled: true});
  });

  it('presenta las seis métricas y el gráfico usando valores de la API', () => {
    cargar();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Tienda A');
    expect(text).toContain('Productos totales');
    expect(text).toContain('Productos Activos');
    expect(text).toContain('Importe acumulado');
    expect(component.chart?.data.labels).toEqual(panel().ventas_semana.map(d => d.fecha));
    expect(component.chart?.data.datasets[0].data).toEqual([0, 0, 0, 4, 0, 0, 0]);
  });

  it('limpia tarjetas, gráfico y alertas inmediatamente al cambiar de tienda', () => {
    cargar();
    const anterior = component.chart;
    component.cambiarTienda(2);
    fixture.detectChanges();
    expect(component.metrics).toBeNull();
    expect(component.alertas).toEqual([]);
    expect(component.chart).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Polera');
    http.expectOne(`${base}/2/dashboard/`).flush(panel(2));
    fixture.detectChanges();
    expect(component.metrics?.tienda_id).toBe(2);
    expect(component.chart).not.toBe(anterior);
  });

  it('cancela consultas anteriores para evitar respuestas tardías de otro tenant', () => {
    fixture.detectChanges();
    http.expectOne(`${base}/`).flush(tiendas);
    const anterior = http.expectOne(`${base}/1/dashboard/`);
    component.cambiarTienda(2);
    expect(anterior.cancelled).toBeTrue();
    http.expectOne(`${base}/2/dashboard/`).flush(panel(2));
    expect(component.metrics?.tienda_id).toBe(2);
  });

  it('limpia y cancela al cerrar sesión', () => {
    cargar();
    component.cargarAlertas();
    const pendiente = http.expectOne(`${base}/1/alertas-stock/`);
    usuario.next(null);
    fixture.detectChanges();
    expect(pendiente.cancelled).toBeTrue();
    expect(component.metrics).toBeNull();
    expect(component.chart).toBeNull();
    expect(component.alertas).toEqual([]);
    expect(component.tiendas).toEqual([]);
  });

  it('limpia inmediatamente al iniciar logout sin esperar respuesta del servidor', () => {
    cargar();
    cierre.next();
    expect(usuario.value).not.toBeNull();
    expect(component.metrics).toBeNull();
    expect(component.chart).toBeNull();
    expect(component.alertas).toEqual([]);
    expect(component.tiendaId).toBeNull();
  });

  it('maneja error del panel y permite reintentar', () => {
    fixture.detectChanges();
    http.expectOne(`${base}/`).flush(tiendas);
    http.expectOne(`${base}/1/dashboard/`).flush({}, {status: 500, statusText: 'Error'});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
    component.reintentar();
    expect(component.error).toBeNull();
    expect(component.loading).toBeTrue();
    http.expectOne(`${base}/1/dashboard/`).flush(panel());
    expect(component.metrics?.total_productos).toBe(9);
  });

  it('abre listado con SKU, stock y enlace a la variante existente', () => {
    cargar();
    component.abrirAlertas();
    http.expectOne(`${base}/1/alertas-stock/`).flush({tienda_id: 1, cantidad: 1, alertas_stock: panel().alertas_stock});
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[href*="variante_id"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('Revisar inventario');
    expect(link.getAttribute('href')).toContain('/tiendas/productos?tienda_id=1&producto_id=10&variante_id=15');
    expect(fixture.nativeElement.textContent).toContain('AZUL');
  });

  it('muestra estado vacío tras reposición y actualiza el contador con la API', () => {
    cargar();
    component.abrirAlertas();
    http.expectOne(`${base}/1/alertas-stock/`).flush({tienda_id: 1, cantidad: 0, alertas_stock: []});
    fixture.detectChanges();
    expect(component.metrics?.productos_bajo_stock).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No hay alertas de stock bajo');
  });

  it('maneja loading y error de alertas, con reintento', () => {
    cargar();
    component.abrirAlertas();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando alertas');
    http.expectOne(`${base}/1/alertas-stock/`).flush({}, {status: 500, statusText: 'Error'});
    expect(component.errorAlertas).not.toBeNull();
    component.cargarAlertas();
    http.expectOne(`${base}/1/alertas-stock/`).flush({tienda_id: 1, cantidad: 0, alertas_stock: []});
    expect(component.errorAlertas).toBeNull();
  });

  it('muestra tienda sin actividad y conserva los siete ceros de backend', () => {
    fixture.detectChanges();
    http.expectOne(`${base}/`).flush(tiendas);
    const data = panel();
    data.ventas_semana.forEach(d => d.cantidad = 0);
    http.expectOne(`${base}/1/dashboard/`).flush(data);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay ventas en los últimos 7 días');
    expect(component.chart?.data.datasets[0].data).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('muestra estado sin tiendas', () => {
    fixture.detectChanges();
    http.expectOne(`${base}/`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes tiendas registradas');
    expect(component.loading).toBeFalse();
  });

  it('recarga el inventario vigente al actualizar el panel', () => {
    cargar();
    component.cargarMetricas();
    const data = panel();
    data.alertas_stock = [];
    data.productos_bajo_stock = 0;
    http.expectOne(`${base}/1/dashboard/`).flush(data);
    fixture.detectChanges();
    expect(component.alertas).toEqual([]);
    expect(component.metrics?.productos_bajo_stock).toBe(0);
  });
});
