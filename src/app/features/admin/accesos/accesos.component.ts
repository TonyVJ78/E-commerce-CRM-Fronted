import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AccesosService,
  Permiso,
  Rol,
  UsuarioAdmin,
  FiltrosUsuarios
} from '../../../core/services/accesos.service';

type Pestania = 'roles' | 'usuarios';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-accesos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './accesos.component.html',
  styleUrls: ['./accesos.component.css']
})
export class AccesosComponent implements OnInit {
  pestania: Pestania = 'roles';

  loading = false;
  errorMessage = '';
  mensaje = '';

  // --- Roles y permisos ---
  roles: Rol[] = [];
  permisosCatalogo: Permiso[] = [];
  rolSeleccionado: Rol | null = null;
  permisosMarcados = new Set<number>();
  guardandoPermisos = false;

  nuevoRolNombre = '';
  creandoRol = false;

  editandoRolId: number | null = null;
  editNombre = '';

  // --- Usuarios ---
  usuarios: UsuarioAdmin[] = [];
  filtroRol = '';
  filtroActivo = '';
  filtroBuscar = '';
  total = 0;
  pagina = 1;
  readonly pageSize = PAGE_SIZE;
  filaGuardando: number | null = null;

  constructor(private accesos: AccesosService) {}

  ngOnInit(): void {
    // Secuencial a propósito: dos peticiones en paralelo que reciben 401 a la vez
    // disparan dos refresh de token simultáneos y, con ROTATE_REFRESH_TOKENS +
    // BLACKLIST_AFTER_ROTATION en el backend, el segundo refresh usa un token ya
    // invalidado y cierra la sesión. Encadenándolas, el interceptor sólo refresca una vez.
    this.cargarRoles(() => {
      this.accesos.listarPermisos().subscribe({
        next: (p) => (this.permisosCatalogo = p),
        error: () => {}
      });
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  cambiarPestania(p: Pestania): void {
    if (this.pestania === p) return;
    this.pestania = p;
    this.errorMessage = '';
    this.mensaje = '';
    if (p === 'usuarios' && this.usuarios.length === 0) {
      this.cargarUsuarios();
    }
  }

  // ============ Roles ============
  cargarRoles(despues?: () => void): void {
    this.loading = true;
    this.errorMessage = '';
    this.accesos.listarRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.loading = false;
        if (this.rolSeleccionado) {
          const actualizado = roles.find((r) => r.id === this.rolSeleccionado!.id);
          this.rolSeleccionado = actualizado ?? null;
        }
        despues?.();
      },
      error: (err) => this.manejarError(err)
    });
  }

  seleccionarRol(rol: Rol): void {
    this.rolSeleccionado = rol;
    this.mensaje = '';
    this.errorMessage = '';
    this.permisosMarcados = new Set(rol.permisos.map((p) => p.id));
  }

  togglePermiso(permisoId: number): void {
    if (this.permisosMarcados.has(permisoId)) {
      this.permisosMarcados.delete(permisoId);
    } else {
      this.permisosMarcados.add(permisoId);
    }
  }

  guardarPermisos(): void {
    if (!this.rolSeleccionado) return;
    this.guardandoPermisos = true;
    this.errorMessage = '';
    this.accesos
      .setPermisosDeRol(this.rolSeleccionado.id, Array.from(this.permisosMarcados))
      .subscribe({
        next: () => {
          this.guardandoPermisos = false;
          this.mensaje = `Permisos del rol "${this.rolSeleccionado?.nombre}" actualizados.`;
          this.cargarRoles();
        },
        error: (err) => {
          this.guardandoPermisos = false;
          this.manejarError(err);
        }
      });
  }

  crearRol(): void {
    const nombre = this.nuevoRolNombre.trim();
    if (!nombre) return;
    this.creandoRol = true;
    this.errorMessage = '';
    this.accesos.crearRol(nombre).subscribe({
      next: (rol) => {
        this.creandoRol = false;
        this.nuevoRolNombre = '';
        this.mensaje = `Rol "${rol.nombre}" creado.`;
        this.cargarRoles();
      },
      error: (err) => {
        this.creandoRol = false;
        this.manejarError(err);
      }
    });
  }

  empezarEdicion(rol: Rol): void {
    this.editandoRolId = rol.id;
    this.editNombre = rol.nombre;
  }

  cancelarEdicion(): void {
    this.editandoRolId = null;
    this.editNombre = '';
  }

  guardarNombre(rol: Rol): void {
    const nombre = this.editNombre.trim();
    if (!nombre || nombre === rol.nombre) {
      this.cancelarEdicion();
      return;
    }
    this.accesos.renombrarRol(rol.id, nombre).subscribe({
      next: () => {
        this.mensaje = 'Rol renombrado.';
        this.cancelarEdicion();
        this.cargarRoles();
      },
      error: (err) => this.manejarError(err)
    });
  }

  eliminarRol(rol: Rol): void {
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.errorMessage = '';
    this.accesos.eliminarRol(rol.id).subscribe({
      next: () => {
        this.mensaje = `Rol "${rol.nombre}" eliminado.`;
        if (this.rolSeleccionado?.id === rol.id) this.rolSeleccionado = null;
        this.cargarRoles();
      },
      error: (err) => this.manejarError(err)
    });
  }

  // ============ Usuarios ============
  cargarUsuarios(): void {
    this.loading = true;
    this.errorMessage = '';
    const filtros: FiltrosUsuarios = {
      rol: this.filtroRol || undefined,
      activo: this.filtroActivo === '' ? undefined : this.filtroActivo === 'true',
      buscar: this.filtroBuscar || undefined,
      page: this.pagina,
      page_size: this.pageSize
    };
    this.accesos.listarUsuarios(filtros).subscribe({
      next: (res) => {
        this.usuarios = res.results;
        this.total = res.count;
        this.loading = false;
      },
      error: (err) => this.manejarError(err)
    });
  }

  aplicarFiltrosUsuarios(): void {
    this.pagina = 1;
    this.cargarUsuarios();
  }

  limpiarFiltrosUsuarios(): void {
    this.filtroRol = '';
    this.filtroActivo = '';
    this.filtroBuscar = '';
    this.pagina = 1;
    this.cargarUsuarios();
  }

  paginaAnterior(): void {
    if (this.pagina > 1) {
      this.pagina--;
      this.cargarUsuarios();
    }
  }

  paginaSiguiente(): void {
    if (this.pagina < this.totalPaginas) {
      this.pagina++;
      this.cargarUsuarios();
    }
  }

  guardarUsuario(u: UsuarioAdmin, rolId: number, activo: boolean): void {
    this.filaGuardando = u.id;
    this.errorMessage = '';
    this.accesos.actualizarUsuario(u.id, { rol_id: rolId, activo }).subscribe({
      next: (actualizado) => {
        this.filaGuardando = null;
        Object.assign(u, actualizado);
        this.mensaje = `Usuario ${u.email} actualizado.`;
      },
      error: (err) => {
        this.filaGuardando = null;
        this.manejarError(err);
        this.cargarUsuarios();
      }
    });
  }

  private manejarError(err: any): void {
    this.loading = false;
    const detalle = err?.error;
    if (err?.status === 403) {
      this.errorMessage = 'No tienes permiso para gestionar accesos.';
    } else if (typeof detalle === 'string') {
      this.errorMessage = detalle;
    } else if (Array.isArray(detalle)) {
      this.errorMessage = detalle.join(' ');
    } else if (detalle && typeof detalle === 'object') {
      const primero = Object.values(detalle)[0];
      this.errorMessage = Array.isArray(primero) ? String(primero[0]) : String(primero);
    } else {
      this.errorMessage = 'Ocurrió un error. Intenta de nuevo.';
    }
  }
}
