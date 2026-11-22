import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateProductoComponent } from './create-producto.component';
import { ProductoService } from '../../../core/services/producto.service';
import { TiendaService } from '../../../core/services/tienda.service';
import { MonedaService } from '../../../core/services/moneda.service';

describe('CU-39 carga útil de alta de productos', () => {
  function component(): CreateProductoComponent {
    return new CreateProductoComponent(new FormBuilder(), {} as ActivatedRoute, {} as Router,
      {} as ProductoService, {} as TiendaService, {} as MonedaService);
  }

  it('envía USD y deja el cálculo Bs a cargo del backend', () => {
    const c = component();
    c.productForm.patchValue({ moneda_precio: 'USD', precio: 999, precio_usd: 12 });
    const [variante] = JSON.parse(c.buildFormData().get('variantes') as string);
    expect(variante.precio_usd).toBe('12');
    expect(variante.precio).toBeUndefined();
  });

  it('envía Bs sin arrastrar el precio USD de otro modo', () => {
    const c = component();
    c.productForm.patchValue({ moneda_precio: 'BOB', precio: 85, precio_usd: 12 });
    const [variante] = JSON.parse(c.buildFormData().get('variantes') as string);
    expect(variante.precio).toBe('85');
    expect(variante.precio_usd).toBeUndefined();
  });
});
