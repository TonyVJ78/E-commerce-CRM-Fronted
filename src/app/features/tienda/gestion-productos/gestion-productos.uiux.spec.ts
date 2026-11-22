import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { GestionProductosComponent } from './gestion-productos.component';
import { ProductoService } from '../../../core/services/producto.service';
import { TiendaService } from '../../../core/services/tienda.service';
import { CarritoService } from '../../../core/services/carrito.service';
import { Producto } from '../../../core/models/producto.model';

describe('CU39 IU/UX: edición de Empresa conserva el alcance monetario', () => {
  const actualizar = jasmine.createSpy('actualizar');
  beforeEach(() => TestBed.configureTestingModule({imports:[GestionProductosComponent],providers:[
    provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
    {provide:ProductoService,useValue:{actualizar}},{provide:TiendaService,useValue:{listar:()=>of([])}},{provide:CarritoService,useValue:{checkoutCompleted$:of()}}
  ]}));
  afterEach(()=>TestBed.inject(HttpTestingController).verify());
  function render() {
    const f=TestBed.createComponent(GestionProductosComponent);
    actualizar.calls.reset();
    const p:Producto={id:1,tienda:1,nombre:'Demo',slug:'demo',precio:'96.00',precio_usd:'12.00',stock_total:20,stock:20,variantes:[
      {id:1,sku:'A',nombre:'Primera',precio:'96.00',precio_usd:'12.00',costo_unitario:'30.00',precio_oferta:null,stock:10,stock_minimo:0,atributos:{},activa:true},
      {id:2,sku:'B',nombre:'Segunda',precio:'80.00',precio_usd:'10.00',costo_unitario:'20.00',precio_oferta:'72.00',stock:10,stock_minimo:0,atributos:{},activa:true}
    ]};
    f.componentInstance.iniciarEdicion(p); f.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(r=>r.url.endsWith('/finanzas/tipo-cambio/')).flush({
      vigente:{id:1,fecha:'2026-11-21',usd_bob:'8.0000',fuente:'DEMO'},historial:[]});
    f.detectChanges(); return f;
  }
  it('ofrece Bs y USD para fijar precio, aunque el catálogo pueda consultar BRL',()=>{
    const f=render();
    const buttons=Array.from(f.nativeElement.querySelectorAll('app-moneda-precio button')) as HTMLElement[];
    expect(buttons.map(b=>b.textContent?.trim())).toEqual(['Bs','USD']);
    const price=f.nativeElement.querySelector('[aria-label="Precio unitario en dólares"]');
    expect(Number(price.value)).toBe(12);
    expect(f.nativeElement.querySelector('app-moneda-precio').textContent).toContain('96,00');
  });
  it('la selección de otra variante carga solo sus importes y conserva la primera',()=>{
    const f=render(); const select=f.nativeElement.querySelector('#price-edit-variant');
    select.value='2'; select.dispatchEvent(new Event('change')); f.detectChanges();
    expect(f.componentInstance.editForm.value.variante_id).toBe(2);
    expect(Number(f.nativeElement.querySelector('[aria-label="Precio unitario en dólares"]').value)).toBe(10);
    expect(Number(f.nativeElement.querySelector('#price-edit-precio_oferta').value)).toBe(72);
    expect(Number(f.componentInstance.editForm.value.costo_unitario)).toBe(20);
    expect(f.componentInstance.productoEnEdicion?.variantes?.[0].precio_usd).toBe('12.00');
  });
  it('muestra el rechazo monetario dentro del diálogo y conserva los datos para corregirlos',()=>{
    const f=render();
    actualizar.and.returnValue(throwError(()=>({error:{precio_oferta:['La oferta no es un importe válido.']}})));
    f.componentInstance.guardarEdicion(); f.detectChanges();
    const alerta=f.nativeElement.querySelector('.price-edit-dialog [role="alert"]');
    expect(alerta.textContent).toContain('La oferta no es un importe válido.');
    expect(f.componentInstance.productoEnEdicion?.id).toBe(1);
    expect(Number(f.componentInstance.editForm.value.precio_usd)).toBe(12);
  });
  it('conserva el stock total de las variantes después de guardar solo el precio',()=>{
    const f=render(); const c=f.componentInstance;
    c.productos=[structuredClone(c.productoEnEdicion!)];
    actualizar.and.returnValue(of({...c.productoEnEdicion!,stock:10,stock_total:20}));
    c.guardarEdicion(); f.detectChanges();
    expect(c.productos[0].stock).toBe(20);
    expect(actualizar.calls.mostRecent().args[2].stock).toBeUndefined();
    expect(c.productoEnEdicion).toBeNull();
  });
  it('al reabrir edición vuelve a los datos de la primera variante y conserva su costo',()=>{
    const f=render(); const c=f.componentInstance;
    c.productos=[structuredClone(c.productoEnEdicion!)];
    c.seleccionarVarianteEdicion('2');
    const respuesta=structuredClone(c.productoEnEdicion!);
    respuesta.variantes![1].costo_unitario='25.00';
    actualizar.and.returnValue(of(respuesta));
    c.guardarEdicion(); c.iniciarEdicion(c.productos[0]); f.detectChanges();
    expect(c.editForm.value.variante_id).toBe(1);
    expect(Number(c.editForm.value.costo_unitario)).toBe(30);
    expect(Number(c.editForm.value.precio_usd)).toBe(12);
    expect(c.productos[0].variantes![1].costo_unitario).toBe('25.00');
  });
});
