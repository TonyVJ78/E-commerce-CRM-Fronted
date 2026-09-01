import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="admin-card">
        <div class="admin-badge">🛡️ Panel de Administración</div>
        <h1>Panel de Control — Kantu Market</h1>
        <p class="admin-text">
          Bienvenido al módulo administrativo global de la plataforma multitenant.
        </p>

        <div class="info-grid">
          <div class="info-item">
            <h4>Bitácora y Auditoría</h4>
            <p>Historial de accesos (login) y registro de cambios en la plataforma. <a routerLink="/auditoria">Abrir bitácora</a>.</p>
          </div>
          <div class="info-item">
            <span class="info-icon">⚙️</span>
            <h4>Panel Django Admin</h4>
            <p>Acceso administrativo completo a la base de datos disponible en <a href="http://localhost:8001/admin/" target="_blank">/admin/</a>.</p>
          </div>
        </div>

        <div class="quick-actions">
          <a routerLink="/auditoria" class="btn btn-primary">Ver Bitácora</a>
          <a routerLink="/perfil" class="btn btn-secondary">Mi Perfil</a>
          <a href="http://localhost:8001/admin/" target="_blank" class="btn btn-secondary">Django Admin ↗</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-card {
      background: var(--surface);
      border-radius: var(--radius-xl);
      padding: 3rem 2.5rem;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border);
      text-align: center;
      max-width: 800px;
      margin: 2rem auto;
      animation: fadeUp 0.4s ease-out;
    }

    .admin-badge {
      display: inline-block;
      background: var(--primary-light);
      color: var(--primary);
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.35rem 1rem;
      border-radius: 20px;
      margin-bottom: 1.25rem;
    }

    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
      color: var(--text-primary);
    }

    .admin-text {
      font-size: 1.05rem;
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
      text-align: left;
    }

    .info-item {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1.5rem;
    }

    .info-icon {
      font-size: 1.75rem;
      display: block;
      margin-bottom: 0.5rem;
    }

    .info-item h4 {
      font-size: 1rem;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .info-item p {
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .info-item a {
      color: var(--primary);
      font-weight: 600;
      text-decoration: underline;
    }

    .quick-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardAdminComponent {
  constructor(public authService: AuthService) {}
}
