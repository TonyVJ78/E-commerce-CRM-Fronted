import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductoService } from '../../../../core/services/producto.service';
import { TiendaService, Tienda } from '../../../../core/services/tienda.service';
import { Producto } from '../../../../core/models/producto.model';

@Component({
  selector: 'app-gestion-productos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './gestion-productos.component.html',
  styleUrls: ['./gestion-productos.component.css']
})
export class GestionProductosComponent implements OnInit {
  productos: Producto[] = [];
  tiendas: Tienda[] = [];
  editForm: FormGroup;
  
  cargando = false;
  productoEnEdicion: Producto | null = null;
  mensajeExito = '';
  mensajeError = '';
  paginaActual = 1;
  readonly productosPorPagina = 6;

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService,
    private tiendaService: TiendaService
  ) {
    this.editForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      precio: [0, [Validators.required, Validators.min(0.01)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      categoria: [''],
      imagen_url: [''],
      descripcion: ['']
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.tiendaService.listar().subscribe({
      next: (tiendas) => this.tiendas = tiendas,
      error: () => {}
    });

    this.productoService.listar().subscribe({
      next: (data) => {
        this.productos = data;
        this.paginaActual = 1;
        this.cargando = false;
      },
      error: () => {
        this.mensajeError = 'Error al cargar productos.';
        this.cargando = false;
      }
    });
  }

  get productosVisibles(): Producto[] {
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    return this.productos.slice(inicio, inicio + this.productosPorPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.productos.length / this.productosPorPagina));
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, index) => index + 1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) this.paginaActual = pagina;
  }

  // CU09: Cargar datos en el formulario de edición
  iniciarEdicion(producto: Producto): void {
    this.productoEnEdicion = producto;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.editForm.patchValue({
      nombre: producto.nombre,
      precio: producto.precio,
      stock: producto.stock,
      categoria: producto.categoria || '',
      imagen_url: producto.imagen_url || '',
      descripcion: producto.descripcion || ''
    });
  }

  cancelarEdicion(): void {
    this.productoEnEdicion = null;
    this.editForm.reset();
  }

  // CU09: Guardar cambios editados
  guardarEdicion(): void {
    if (this.editForm.invalid || !this.productoEnEdicion?.id) return;

    this.cargando = true;
    this.mensajeExito = '';
    this.mensajeError = '';

    const datosModificados = this.editForm.value;

    this.productoService.actualizar(this.productoEnEdicion.id, datosModificados).subscribe({
      next: (prodActualizado) => {
        this.cargando = false;
        this.mensajeExito = `Producto "${prodActualizado.nombre}" actualizado correctamente.`;
        // Actualizar en memoria
        const idx = this.productos.findIndex(p => p.id === prodActualizado.id);
        if (idx !== -1) this.productos[idx] = prodActualizado;
        this.cancelarEdicion();
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = err.error?.detail || 'Error al guardar los cambios del producto.';
      }
    });
  }

  // CU09: Eliminar producto del catálogo (Soft Delete)
  eliminar(producto: Producto): void {
    if (!producto.id) return;

    const confirmacion = confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}" de tu catálogo?`);
    if (!confirmacion) return;

    this.cargando = true;
    this.productoService.eliminar(producto.id).subscribe({
      next: () => {
        this.cargando = false;
        this.mensajeExito = `Producto "${producto.nombre}" eliminado exitosamente.`;
        this.productos = this.productos.filter(p => p.id !== producto.id);
        if (this.paginaActual > this.totalPaginas) this.paginaActual = this.totalPaginas;
        if (this.productoEnEdicion?.id === producto.id) {
          this.cancelarEdicion();
        }
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'No se pudo eliminar el producto.';
      }
    });
  }
}