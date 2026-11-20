import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { MargenProducto, calcularMargen } from '../../../core/models/producto.model';
import { MonedaService } from '../../../core/services/moneda.service';
import { Categoria, ProductoService } from '../../../core/services/producto.service';
import { Tienda, TiendaService } from '../../../core/services/tienda.service';
import { MonedaPrecioComponent } from '../../../shared/precio/moneda-precio.component';

@Component({
  selector: 'app-create-producto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MonedaPrecioComponent],
  templateUrl: './create-producto.component.html',
  styleUrls: ['./create-producto.component.css']
})
export class CreateProductoComponent implements OnInit, OnDestroy {
  tiendaId = 0;
  tienda: Tienda | null = null;
  categorias: Categoria[] = [];
  productForm: FormGroup;
  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  loading = false;
  loadingTienda = true;
  message = '';
  errorMessage = '';
  duplicateSku = false;
  private previewObjectUrls: string[] = [];
  private routeSubscription?: Subscription;

  /** Campos de la variante "única"; solo aplican cuando el producto NO tiene opciones. */
  private readonly simpleVariantControls = ['codigo', 'moneda_precio', 'precio', 'precio_usd', 'precio_oferta', 'costo_unitario', 'stock', 'stock_minimo'];

  readonly acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  readonly maxImageSize = 5 * 1024 * 1024;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productoService: ProductoService,
    private tiendaService: TiendaService,
    private moneda: MonedaService
  ) {
    this.productForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: ['', Validators.required],
      categoria_id: [null],
      etiquetas: [''],
      activo: [true],
      tieneOpciones: [false],
      codigo: ['', [Validators.required, Validators.maxLength(60)]],
      moneda_precio: ['BOB'],
      precio: [null, [Validators.required, Validators.min(0)]],
      precio_usd: [null],
      precio_oferta: [null, Validators.min(0)],
      costo_unitario: [null, Validators.min(0)],
      stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
      stock_minimo: [5, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
      variantes: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('tiendaId'));
      if (!Number.isInteger(id) || id <= 0) {
        this.router.navigate(['/tiendas']);
        return;
      }
      this.tiendaId = id;
      this.loadTienda();
    });
  }

  ngOnDestroy(): void {
    this.revokePreviewUrls();
    this.routeSubscription?.unsubscribe();
  }

  get variants(): FormArray {
    return this.productForm.get('variantes') as FormArray;
  }

  get variantGroups(): FormGroup[] {
    return this.variants.controls as FormGroup[];
  }

  get hasOptions(): boolean {
    return this.productForm.get('tieneOpciones')?.value === true;
  }

  loadTienda(): void {
    this.loadingTienda = true;
    this.tiendaService.listar().subscribe({
      next: tiendas => {
        this.tienda = tiendas.find(item => item.id === this.tiendaId) ?? null;
        if (!this.tienda) {
          this.errorMessage = 'No tienes acceso a esta tienda.';
          return;
        }
        this.productoService.listarCategorias(this.tiendaId).subscribe({
          next: categorias => this.categorias = categorias,
          error: () => this.errorMessage = 'No se pudieron cargar las categorías.'
        });
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la tienda.';
        this.loadingTienda = false;
      },
      complete: () => this.loadingTienda = false
    });
  }

  createVariant(): FormGroup {
    return this.fb.group({
      nombre: ['', Validators.required],
      sku: ['', [Validators.required, Validators.maxLength(60)]],
      moneda_precio: ['BOB'],
      precio: [null, [Validators.required, Validators.min(0)]],
      precio_usd: [null],
      precio_oferta: [null, Validators.min(0)],
      costo_unitario: [null, Validators.min(0)],
      stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
      stock_minimo: [5, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
      activa: [true],
      atributos: this.fb.array([])
    });
  }

  variantAttributes(index: number): FormArray {
    return this.variants.at(index).get('atributos') as FormArray;
  }

  addVariant(): void {
    this.variants.push(this.createVariant());
  }

  removeVariant(index: number): void {
    if (this.variants.length > 1) {
      this.variants.removeAt(index);
      this.checkDuplicateSkus();
    }
  }

  addAttribute(variantIndex: number): void {
    this.variantAttributes(variantIndex).push(this.fb.group({
      clave: ['', Validators.required],
      valor: ['', Validators.required]
    }));
  }

  removeAttribute(variantIndex: number, attributeIndex: number): void {
    this.variantAttributes(variantIndex).removeAt(attributeIndex);
  }

  onOptionsChange(): void {
    if (this.hasOptions) {
      // Los campos de la variante única quedan ocultos: hay que sacarlos de la
      // validación o el formulario nunca será válido (codigo/precio vacíos).
      this.setSimpleVariantEnabled(false);
      if (this.variants.length === 0) {
        this.addVariant();
      }
    } else {
      // Volvemos a producto único: reactivamos sus campos y descartamos las
      // variantes a medio llenar (sus validadores required bloquearían el submit).
      this.setSimpleVariantEnabled(true);
      this.variants.clear();
    }
    this.duplicateSku = false;
  }

  private setSimpleVariantEnabled(enabled: boolean): void {
    for (const name of this.simpleVariantControls) {
      const control = this.productForm.get(name);
      if (!control) continue;
      if (enabled) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.errorMessage = '';
    this.revokePreviewUrls();

    const invalidFile = files.find(file =>
      !this.acceptedImageTypes.includes(file.type) || file.size > this.maxImageSize
    );
    if (invalidFile) {
      this.selectedFiles = [];
      this.previewUrls = [];
      this.errorMessage = 'Cada imagen debe ser JPEG, PNG o WebP y pesar máximo 5 MB.';
      input.value = '';
      return;
    }

    this.selectedFiles = files;
    this.previewObjectUrls = files.map(file => URL.createObjectURL(file));
    this.previewUrls = [...this.previewObjectUrls];
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
    const url = this.previewObjectUrls.splice(index, 1)[0];
    if (url) URL.revokeObjectURL(url);
  }

  checkDuplicateSkus(): void {
    const skus = this.variants.controls
      .map(control => String(control.get('sku')?.value ?? '').trim().toLowerCase())
      .filter(Boolean);
    this.duplicateSku = new Set(skus).size !== skus.length;
  }

  margen(control: AbstractControl): MargenProducto | null {
    return calcularMargen(this.moneda.precioEnBs(control.value), control.get('costo_unitario')?.value);
  }

  variantStatus(index: number): string {
    const variant = this.variants.at(index);
    if (!variant.get('activa')?.value || Number(variant.get('stock')?.value) === 0) return 'Agotado';
    if (Number(variant.get('stock')?.value) <= Number(variant.get('stock_minimo')?.value)) return 'Bajo stock';
    return 'En stock';
  }

  onSubmit(): void {
    this.productForm.markAllAsTouched();
    this.checkDuplicateSkus();
    if (this.productForm.invalid || this.duplicateSku || this.selectedFiles.length === 0 || this.loading) {
      if (this.selectedFiles.length === 0) this.errorMessage = 'Selecciona al menos una imagen.';
      return;
    }

    this.loading = true;
    this.message = '';
    this.errorMessage = '';
    const formData = this.buildFormData();

    this.productoService.crear(this.tiendaId, formData).subscribe({
      next: producto => {
        this.loading = false;
        this.message = `Producto "${producto.nombre}" registrado correctamente.`;
        this.resetForm();
      },
      error: error => {
        this.loading = false;
        this.errorMessage = this.readError(error);
      }
    });
  }

  buildFormData(): FormData {
    const value = this.productForm.value;
    const formData = new FormData();
    formData.append('nombre', String(value.nombre).trim());
    formData.append('descripcion', String(value.descripcion).trim());
    formData.append('activo', String(Boolean(value.activo)));

    if (value.categoria_id !== null && value.categoria_id !== '') {
      formData.append('categoria_id', String(value.categoria_id));
    }

    const etiquetas = String(value.etiquetas ?? '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    formData.append('etiquetas', JSON.stringify([...new Set(etiquetas)]));

    const variantes = this.hasOptions
      ? this.variants.controls.map(control => this.serializeVariant(control))
      : [{
        sku: String(value.codigo).trim(),
        nombre: 'Unica',
        ...this.precioPayload(value),
        precio_oferta: value.precio_oferta === null || value.precio_oferta === '' ? null : String(value.precio_oferta),
        costo_unitario: value.costo_unitario === null || value.costo_unitario === '' ? null : String(value.costo_unitario),
        stock: Number(value.stock),
        stock_minimo: Number(value.stock_minimo),
        atributos: {},
        activa: Boolean(value.activo)
      }];
    formData.append('variantes', JSON.stringify(variantes));

    this.selectedFiles.forEach(file => formData.append('imagenes', file, file.name));
    return formData;
  }

  private precioPayload(value: { moneda_precio: string; precio: unknown; precio_usd: unknown }): Record<string, string> {
    return value.moneda_precio === 'USD'
      ? { precio_usd: String(value.precio_usd) }
      : { precio: String(value.precio) };
  }

  private serializeVariant(control: AbstractControl): Record<string, unknown> {
    const value = control.value;
    const attributes: Record<string, string> = {};
    (value.atributos ?? []).forEach((attribute: { clave: string; valor: string }) => {
      const key = attribute.clave.trim();
      if (key) attributes[key] = attribute.valor.trim();
    });
    return {
      sku: String(value.sku).trim(),
      nombre: String(value.nombre).trim(),
      ...this.precioPayload(value),
      precio_oferta: value.precio_oferta === null || value.precio_oferta === '' ? null : String(value.precio_oferta),
      costo_unitario: value.costo_unitario === null || value.costo_unitario === '' ? null : String(value.costo_unitario),
      stock: Number(value.stock),
      stock_minimo: Number(value.stock_minimo),
      atributos: attributes,
      activa: Boolean(value.activa)
    };
  }

  private resetForm(): void {
    this.revokePreviewUrls();
    this.selectedFiles = [];
    this.previewUrls = [];
    this.variants.clear();
    this.setSimpleVariantEnabled(true);
    this.productForm.reset({
      nombre: '', descripcion: '', categoria_id: null, etiquetas: '', activo: true,
      tieneOpciones: false, codigo: '', moneda_precio: 'BOB', precio: null, precio_usd: null, precio_oferta: null, costo_unitario: null,
      stock: 0, stock_minimo: 5
    });
  }

  private revokePreviewUrls(): void {
    this.previewObjectUrls.forEach(url => URL.revokeObjectURL(url));
    this.previewObjectUrls = [];
  }

  /** Los errores de las variantes llegan anidados: `{ variantes: [{ precio_usd: ['...'] }] }`. */
  private flattenMessages(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(item => this.flattenMessages(item));
    if (value && typeof value === 'object') return Object.values(value).flatMap(item => this.flattenMessages(item));
    return [];
  }

  private readError(error: any): string {
    const payload = error?.error;
    if (typeof payload === 'string') return payload;
    if (payload?.detail) return Array.isArray(payload.detail) ? payload.detail.join(', ') : payload.detail;
    if (payload && typeof payload === 'object') {
      return Object.entries(payload)
        .map(([field, messages]) => `${field}: ${this.flattenMessages(messages).join(', ')}`)
        .join(' | ');
    }
    return 'No se pudo registrar el producto. Intenta de nuevo.';
  }
}
