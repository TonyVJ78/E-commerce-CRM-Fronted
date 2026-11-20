import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Informes de tienda en tres partes: panel de KPIs, asistente conversacional y Machine Learning.
 * Pone el contenedor y la cabecera comunes: las vistas hijas no añaden su propio margen exterior.
 */
@Component({
  selector: 'app-informes-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './informes-shell.component.html',
  styleUrl: './informes-shell.component.css'
})
export class InformesShellComponent {}
