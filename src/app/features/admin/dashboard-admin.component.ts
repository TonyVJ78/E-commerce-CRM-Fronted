import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PanelKpisService } from '../../core/services/panel-kpis.service';
import { GrupoKpi } from '../../core/models/panel-kpis.model';
import { formatoValor, formatoVariacion } from '../informes/panel/formato-panel';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly formatoValor = formatoValor;
  readonly formatoVariacion = formatoVariacion;
  private readonly panelService = inject(PanelKpisService);
  readonly cargandoResumen = signal(true);
  readonly errorResumen = signal('');
  readonly gruposResumen = signal<GrupoKpi[]>([]);

  ngOnInit(): void {
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.cargandoResumen.set(true);
    this.errorResumen.set('');
    const fechaBolivia = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/La_Paz' }).format(new Date());
    const hasta = new Date(`${fechaBolivia}T00:00:00Z`);
    const desde = new Date(hasta);
    desde.setUTCDate(desde.getUTCDate() - 29);
    this.panelService.panel({
      tienda: null,
      desde: this.iso(desde),
      hasta: this.iso(hasta),
      comparar_con: 'periodo_anterior'
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: panel => {
        this.gruposResumen.set(panel.grupos.filter(grupo => grupo.clave === 'ventas' || grupo.clave === 'ganancia'));
        this.cargandoResumen.set(false);
      },
      error: () => {
        this.errorResumen.set('No se pudo cargar el resumen analítico. Puedes consultar el panel completo.');
        this.cargandoResumen.set(false);
      }
    });
  }

  kpi(grupo: GrupoKpi, clave: string) {
    return grupo.kpis.find(item => item.clave === clave);
  }

  private iso(fecha: Date): string {
    return fecha.toISOString().slice(0, 10);
  }

  abrirEnlaceExterno(ruta: string): void {
    window.open(ruta, '_blank', 'noopener,noreferrer');
  }
}
