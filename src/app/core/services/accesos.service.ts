import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated } from './auditoria.service';

export interface Permiso {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Rol {
  id: number;
  nombre: string;
  permisos: Permiso[];
  es_semilla: boolean;
  usuarios_count: number;
}

export interface PermisosDeRol {
  asignados: number[];
  disponibles: Permiso[];
}

export interface RolRef {
  id: number;
  nombre: string;
}

export interface UsuarioAdmin {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  rol: RolRef | null;
  activo: boolean;
  is_active: boolean;
  fecha_registro: string;
}

export interface FiltrosUsuarios {
  rol?: string;
  activo?: boolean;
  buscar?: string;
  page?: number;
  page_size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AccesosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private toParams(filtros: object): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && `${valor}` !== '') {
        params = params.set(clave, `${valor}`);
      }
    }
    return params;
  }

  // --- Roles ---
  listarRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.apiUrl}/roles/`);
  }

  crearRol(nombre: string): Observable<Rol> {
    return this.http.post<Rol>(`${this.apiUrl}/roles/`, { nombre });
  }

  renombrarRol(id: number, nombre: string): Observable<Rol> {
    return this.http.patch<Rol>(`${this.apiUrl}/roles/${id}/`, { nombre });
  }

  eliminarRol(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/roles/${id}/`);
  }

  getPermisosDeRol(id: number): Observable<PermisosDeRol> {
    return this.http.get<PermisosDeRol>(`${this.apiUrl}/roles/${id}/permisos/`);
  }

  setPermisosDeRol(id: number, permisos: number[]): Observable<{ asignados: number[] }> {
    return this.http.put<{ asignados: number[] }>(`${this.apiUrl}/roles/${id}/permisos/`, { permisos });
  }

  // --- Permisos ---
  listarPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.apiUrl}/permisos/`);
  }

  // --- Usuarios ---
  listarUsuarios(filtros: FiltrosUsuarios = {}): Observable<Paginated<UsuarioAdmin>> {
    return this.http.get<Paginated<UsuarioAdmin>>(`${this.apiUrl}/usuarios/`, {
      params: this.toParams(filtros)
    });
  }

  actualizarUsuario(id: number, data: { rol_id?: number; activo?: boolean }): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${this.apiUrl}/usuarios/${id}/`, data);
  }
}
