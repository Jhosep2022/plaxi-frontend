import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SessionService } from '../../../core/auth/session.service';
import { AcademicsService } from '../../../services/academics.service';
import { GradesApiService, type Planilla } from '../../../services/grades-api.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { GradeCorrectionsComponent } from './grade-corrections.component';

describe('Corregir notas de un periodo cerrado', () => {
  const planilla = {
    gestion: { id: 1, anio: 2026, periodos: [] },
    periodo: 0,
    cerrado: true,
    editable: false,
    config: { notaMaxima: 100, notaAprobacion: 51, criterios: [] },
    actividades: [{ id: 7, nombre: 'Examen', fecha: '2026-03-10', criterioId: 2, origen: 'manual' }],
    estudiantes: [{ id: 2, nombre: 'Luis Mamani', notas: { 7: 40 }, resultado: { final: 40 }, aprueba: false }],
    resumen: { promedio: 40, aprobados: 0, reprobados: 1 },
  } as unknown as Planilla;
  let api: jasmine.SpyObj<GradesApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj('GradesApiService', ['progress', 'sheet', 'correctClosedGrade', 'gradeHistory']);
    api.progress.and.returnValue(
      of([{ paralelo: '3ro A', paraleloId: 5, materia: 'Física', materiaId: 8, docente: 'María', periodos: [
        { periodo: 0, cerrado: true, actividades: 1, notas: 1, esperadas: 1, porcentaje: 100 },
        { periodo: 1, cerrado: false, actividades: 1, notas: 0, esperadas: 1, porcentaje: 0 },
      ] }]),
    );
    api.sheet.and.returnValue(of(planilla));
    api.gradeHistory.and.returnValue(of([]));
    api.correctClosedGrade.and.returnValue(of(60));
    TestBed.configureTestingModule({
      imports: [GradeCorrectionsComponent],
      providers: [
        provideRouter([]),
        { provide: GradesApiService, useValue: api },
        { provide: AcademicsService, useValue: { getActiveAcademicYear: () => of({ periodos: [{ nombre: '1er trimestre' }, { nombre: '2do trimestre' }] }) } },
        { provide: SessionService, useValue: { activeSpace: () => ({ id: 1 }) } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['success', 'error']) },
      ],
    });
  });

  it('offers only the closed periods and saves a correction with its reason', async () => {
    const fixture = TestBed.createComponent(GradeCorrectionsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.clave.set('5:8');
    fixture.detectChanges();
    expect(component.periodosCerrados()).toEqual([{ indice: 0, nombre: '1er trimestre' }]);
    component.elegirPeriodo('0');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.sheet).toHaveBeenCalledWith(5, 8, 0);

    component.abrir({ estudiante: planilla.estudiantes[0], actividad: planilla.actividades[0] });
    expect(component.valor()).toBe('40');
    component.valor.set('60');
    component.motivo.set('corto');
    fixture.detectChanges();
    const guardar = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) =>
      b.textContent?.includes('Guardar corrección'),
    ) as HTMLButtonElement;
    expect(guardar.disabled).toBeTrue();
    component.motivo.set('Error al transcribir el examen escrito');
    await component.guardar();
    expect(api.correctClosedGrade).toHaveBeenCalledWith({
      actividadId: 7,
      estudianteId: 2,
      valor: 60,
      motivo: 'Error al transcribir el examen escrito',
    });
    expect(component.celda()).toBeNull();
    fixture.destroy();
  });
});
