import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TiendaService, DashboardMetrics } from '../../../core/services/tienda.service';
import { AlertaStock, Tienda } from '../../../core/models/tienda.model';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard-empresa',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-empresa.component.html',
  styles: [`
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background-color: #ffffff;
      border-radius: 0.5rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #f3f4f6;
      transition: all 0.2s;
    }
    .metric-card:hover {
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .metric-header h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }
    .metric-value {
      font-size: 1.875rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }
    .metric-subtext {
      font-size: 0.875rem;
      font-weight: 400;
      color: #9ca3af;
    }
    .icon-container {
      padding: 0.5rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-green { background-color: #dcfce7; color: #16a34a; }
    .icon-yellow { background-color: #fef9c3; color: #ca8a04; }
    .icon-blue { background-color: #dbeafe; color: #2563eb; }
    .icon-purple { background-color: #f3e8ff; color: #9333ea; }
    .icon-red { background-color: #fee2e2; color: #dc2626; }
    .status-alert { font-size: 0.875rem; color: #ef4444; margin-top: 0.5rem; }
    .status-ok { font-size: 0.875rem; color: #22c55e; margin-top: 0.5rem; }
    .loading-state { text-align: center; padding: 4rem; color: #6b7280; }
    .error-state { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 1rem; color: #b91c1c; max-width: 1200px; margin: 0 auto 2rem; }
    .panel-actions { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
    .alerts-section { background: white; padding: 1.5rem; border-radius: .5rem; margin-top: 1rem; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .75rem; border-bottom: 1px solid #eee; }
    
    .chart-container {
      background-color: #ffffff;
      border-radius: 0.5rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #f3f4f6;
      margin-top: 2rem;
      height: 400px;
    }
    .chart-container h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 640px) {
      .metrics-grid {
        grid-template-columns: 1fr;
        gap: 0.85rem;
        margin-bottom: 1.25rem;
      }
      .metric-card {
        padding: 1.15rem;
      }
      .chart-container {
        padding: 1rem;
        height: 280px;
        margin-top: 1.25rem;
      }
      .chart-container h3 {
        font-size: 1.05rem;
        margin-bottom: 1rem;
      }
    }
  `]

})
export class DashboardEmpresaComponent implements OnInit, OnDestroy {
  metrics: DashboardMetrics | null = null;
  tiendas: Tienda[] = [];
  tiendaId: number | null = null;
  loading = true;
  error: string | null = null;
  alertas: AlertaStock[] = [];
  mostrarAlertas = false;
  loadingAlertas = false;
  errorAlertas: string | null = null;
  chart: Chart<'bar', number[], string> | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private readonly subs = new Subscription();
  private tiendasRequest?: Subscription;
  private metricsRequest?: Subscription;
  private alertasRequest?: Subscription;

  @ViewChild('ventasChart') set ventasChart(element: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvas = element?.nativeElement ?? null;
    this.createChart();
  }

  constructor(
    private readonly tiendaService: TiendaService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.subs.add(this.auth.sessionClosing$.subscribe(() => {
      this.tiendasRequest?.unsubscribe();
      this.limpiarDatos();
      this.tiendas = [];
      this.tiendaId = null;
      this.loading = false;
    }));
    this.subs.add(this.auth.currentUser$.subscribe(user => {
      this.tiendasRequest?.unsubscribe();
      this.limpiarDatos();
      this.tiendas = [];
      this.tiendaId = null;
      if (user) this.cargarTiendas();
      else this.loading = false;
    }));
  }

  cargarTiendas(): void {
    this.tiendasRequest?.unsubscribe();
    this.loading = true;
    this.error = null;
    this.tiendasRequest = this.tiendaService.listar().subscribe({
      next: tiendas => {
        this.tiendas = tiendas;
        const seleccion = Number(this.route.snapshot.queryParamMap.get('tienda_id'));
        const tienda = tiendas.find(t => t.id === seleccion) ?? tiendas[0];
        if (tienda) this.cambiarTienda(tienda.id);
        else this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar tus tiendas.';
        this.loading = false;
      },
    });
  }

  cambiarTienda(tiendaId: number): void {
    this.limpiarDatos();
    this.tiendaId = tiendaId;
    this.cargarMetricas();
  }

  seleccionarTienda(event: Event): void {
    this.cambiarTienda(Number((event.target as HTMLSelectElement).value));
  }

  private limpiarDatos(): void {
    this.metricsRequest?.unsubscribe();
    this.alertasRequest?.unsubscribe();
    this.chart?.destroy();
    this.chart = null;
    this.metrics = null;
    this.alertas = [];
    this.error = null;
    this.errorAlertas = null;
    this.mostrarAlertas = false;
    this.loadingAlertas = false;
  }

  reintentar(): void {
    if (this.tiendaId) this.cargarMetricas();
    else this.cargarTiendas();
  }

  cargarMetricas(): void {
    if (!this.tiendaId) return;
    const abierto = this.mostrarAlertas;
    this.limpiarDatos();
    this.mostrarAlertas = abierto;
    this.loading = true;
    this.metricsRequest = this.tiendaService.getDashboardMetrics(this.tiendaId).subscribe({
      next: (data) => {
        this.metrics = data;
        this.alertas = data.alertas_stock;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las métricas. Verifica tu conexión o intenta más tarde.';
        this.loading = false;
      }
    });
  }

  abrirAlertas(): void {
    this.mostrarAlertas = !this.mostrarAlertas;
    if (this.mostrarAlertas) this.cargarAlertas();
  }

  cargarAlertas(): void {
    if (!this.tiendaId) return;
    this.alertasRequest?.unsubscribe();
    this.alertas = [];
    this.loadingAlertas = true;
    this.errorAlertas = null;
    this.alertasRequest = this.tiendaService.getAlertasStock(this.tiendaId).subscribe({
      next: data => {
        this.alertas = data.alertas_stock;
        if (this.metrics) this.metrics.productos_bajo_stock = data.cantidad;
        this.loadingAlertas = false;
      },
      error: () => {
        this.errorAlertas = 'No se pudieron cargar las alertas de stock bajo.';
        this.loadingAlertas = false;
      },
    });
  }

  get sinActividad(): boolean {
    return !!this.metrics && this.metrics.ventas_semana.every(dia => dia.cantidad === 0);
  }

  @HostListener('window:focus') actualizarAlVolver(): void {
    if (this.tiendaId && this.auth.currentUser) this.cargarMetricas();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.tiendasRequest?.unsubscribe();
    this.limpiarDatos();
  }

  createChart(): void {
    this.chart?.destroy();
    this.chart = null;
    if (!this.metrics || !this.canvas) return;
    
    const labels = this.metrics.ventas_semana.map(v => v.fecha);
    const data = this.metrics.ventas_semana.map(v => v.cantidad);

    this.chart = new Chart(this.canvas, {
      type: 'bar', // Gráfico de barras
      data: {
        labels: labels,
        datasets: [{
          label: 'Unidades vendidas',
          data: data,
          backgroundColor: 'rgba(200, 16, 46, 0.8)', // Usando el rojo Kantu Market
          borderColor: '#C8102E',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }
}
