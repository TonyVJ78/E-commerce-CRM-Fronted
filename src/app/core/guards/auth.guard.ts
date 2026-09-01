import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return true;
  }

  const rol = authService.currentUser?.rol;
  if (rol === 'cliente') {
    router.navigate(['/inicio']);
  } else if (rol === 'administrador') {
    router.navigate(['/dashboard']);
  } else {
    router.navigate(['/perfil']);
  }
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  const rol = authService.currentUser?.rol;
  if (rol === 'administrador') {
    return true;
  }

  // Redirigir según rol si no es administrador
  if (rol === 'cliente') {
    router.navigate(['/inicio']);
  } else if (rol === 'empresa') {
    router.navigate(['/tiendas']);
  } else {
    router.navigate(['/perfil']);
  }
  return false;
};

export const empresaGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  const rol = authService.currentUser?.rol;
  if (rol === 'empresa') {
    return true;
  }

  // Redirigir según rol si no es empresa
  if (rol === 'cliente') {
    router.navigate(['/inicio']);
  } else {
    router.navigate(['/perfil']);
  }
  return false;
};
