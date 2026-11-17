import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../../../core/auth/session.service';
import { NotificationService } from '../../../../shared/ui/notification.service';
import { ClassGroupsComponent } from './class-groups.component';

describe('Class groups with actual academic requests', () => {
  let http: HttpTestingController;
  const years = [
    { id: 81, anio: 2026, estado: 'activa', periodos: [] },
    { id: 82, anio: 2027, estado: 'planificada', periodos: [] },
  ];
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ClassGroupsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: SessionService,
          useValue: {
            activeSpace: () => ({
              id: 42,
              slug: 'colegio-real',
              tipo: 'colegio',
            }),
            activeRole: () => 'direccion',
            roleRoute: () => ['/'],
          },
        },
        {
          provide: NotificationService,
          useValue: { success: () => {}, error: () => {} },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('selects the future year without activating it or closing the current one', async () => {
    const fixture = TestBed.createComponent(ClassGroupsComponent);
    const requestedYears: string[] = [];
    async function flushReads() {
      for (let round = 0; round < 5; round++) {
        fixture.detectChanges();
        for (const request of http.match(() => true)) {
          expect(request.request.method).toBe('GET');
          if (request.request.url.endsWith('/paralelos'))
            requestedYears.push(request.request.params.get('gestion')!);
          request.flush(
            request.request.url.endsWith('/gestiones') ? years : [],
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      fixture.detectChanges();
    }
    await flushReads();
    expect(fixture.componentInstance.gestion.value()?.anio).toBe(2026);
    const picker: HTMLSelectElement = fixture.nativeElement.querySelector(
      'app-page-header select',
    );
    picker.value = '82';
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    await flushReads();
    expect(fixture.componentInstance.gestion.value()?.anio).toBe(2027);
    expect(requestedYears).toContain('82');
    expect(fixture.nativeElement.textContent).toContain('Nuevo paralelo');
    fixture.destroy();
  });
  it('shows a retry action instead of claiming the school has no years when the API fails', async () => {
    const fixture = TestBed.createComponent(ClassGroupsComponent);
    fixture.detectChanges();
    for (const request of http.match(() => true)) {
      if (request.request.url.endsWith('/gestiones'))
        request.flush(
          { code: 'error_interno', message: 'No se pudo consultar.' },
          { status: 500, statusText: 'Server error' },
        );
      else request.flush([]);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Volver a cargar');
    expect(fixture.nativeElement.textContent).not.toContain(
      'No hay una gestión disponible',
    );
    fixture.destroy();
  });
});
