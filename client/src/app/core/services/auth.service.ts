import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  rol: string | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  usuario: Usuario;
}

export interface RegistroData {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  rol_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const userData = localStorage.getItem('km_user');
    if (userData) {
      this.currentUserSubject.next(JSON.parse(userData));
    }
  }

  get isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  get currentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('km_access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('km_refresh_token');
  }

  registro(data: RegistroData): Observable<any> {
    return this.http.post(`${this.apiUrl}/registro/`, data);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login/`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem('km_access_token', response.access);
        localStorage.setItem('km_refresh_token', response.refresh);
        localStorage.setItem('km_user', JSON.stringify(response.usuario));
        this.currentUserSubject.next(response.usuario);
      })
    );
  }

  logout(): Observable<any> {
    const refresh = this.getRefreshToken();
    return this.http.post(`${this.apiUrl}/logout/`, { refresh }).pipe(
      tap(() => this.clearSession())
    );
  }

  clearSession(): void {
    localStorage.removeItem('km_access_token');
    localStorage.removeItem('km_refresh_token');
    localStorage.removeItem('km_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<any> {
    const refresh = this.getRefreshToken();
    return this.http.post<any>(`${this.apiUrl}/token/refresh/`, { refresh }).pipe(
      tap(response => {
        localStorage.setItem('km_access_token', response.access);
        if (response.refresh) {
          localStorage.setItem('km_refresh_token', response.refresh);
        }
      })
    );
  }

  getPerfil(): Observable<any> {
    return this.http.get(`${this.apiUrl}/perfil/`);
  }

  updatePerfil(data: { first_name: string; last_name: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/perfil/`, data).pipe(
      tap((updatedUser: any) => {
        const current = this.currentUser;
        if (current) {
          const merged = { ...current, ...updatedUser };
          localStorage.setItem('km_user', JSON.stringify(merged));
          this.currentUserSubject.next(merged);
        }
      })
    );
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset/`, { email });
  }

  confirmPasswordReset(uid: string, token: string, new_password: string, new_password_confirm: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset-confirm/`, {
      uid, token, new_password, new_password_confirm
    });
  }
}
