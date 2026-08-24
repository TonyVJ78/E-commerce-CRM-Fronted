import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home-cliente',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="hero-card">
        <div class="hero-badge">🇧🇴 Mercado Digital Boliviano</div>
        <h1>¡Bienvenido a Kantu Market!</h1>
        <p class="hero-text">
          Explora productos auténticos de emprendedores y empresas bolivianas.
        </p>

        <div class="status-box">
          <div class="status-icon">🛍️</div>
          <div>
            <h3>Catálogo de Productos en Preparación</h3>
            <p>
              El catálogo interactivo de tiendas y productos estará disponible próximamente en el Sprint 2.
              Aquí podrás descubrir artesanías, textiles, gastronomía y tecnología local.
            </p>
          </div>
        </div>

        <div class="quick-actions">
          <a routerLink="/perfil" class="btn btn-primary">Ver Mi Perfil</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero-card {
      background: var(--surface);
      border-radius: var(--radius-xl);
      padding: 3rem 2.5rem;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border);
      text-align: center;
      max-width: 750px;
      margin: 2rem auto;
      animation: fadeUp 0.4s ease-out;
    }

    .hero-badge {
      display: inline-block;
      background: rgba(39, 174, 96, 0.1);
      color: var(--success);
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
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-text {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }

    .status-box {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      text-align: left;
      background: rgba(244, 208, 63, 0.12);
      border: 1px solid rgba(244, 208, 63, 0.4);
      border-radius: var(--radius-md);
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .status-icon {
      font-size: 2.5rem;
    }

    .status-box h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .status-box p {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .quick-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
    }
  `]
})
export class HomeClienteComponent {
  constructor(public authService: AuthService) {}
}
