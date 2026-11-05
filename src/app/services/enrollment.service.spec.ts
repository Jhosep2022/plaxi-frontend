import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MOCK_DELAY, MOCK_INSCRIPCIONES } from '../mocks/mock-data';
import { EnrollmentService } from './enrollment.service';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let originalEnrollments: typeof MOCK_INSCRIPCIONES;

  beforeEach(() => {
    originalEnrollments = structuredClone(MOCK_INSCRIPCIONES);
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnrollmentService);
  });
  afterEach(() => MOCK_INSCRIPCIONES.splice(0, MOCK_INSCRIPCIONES.length, ...originalEnrollments));

  it('creates, filters, updates and removes an enrollment', fakeAsync(() => {
    let enrollmentId = 0;
    service.createEnrollment({ usuarioId: 98765, cursoId: 87654 }).subscribe((enrollment) => {
      enrollmentId = enrollment.idInscripcion;
      expect(enrollment.estadoInscripcion).toBe('ACTIVA');
    });
    tick(MOCK_DELAY);
    service.getEnrollmentsByUserId(98765).subscribe((enrollments) => expect(enrollments.map((item) => item.idInscripcion)).toContain(enrollmentId));
    service.getEnrollmentsByCourseId(87654).subscribe((enrollments) => expect(enrollments.map((item) => item.idInscripcion)).toContain(enrollmentId));
    tick(MOCK_DELAY);
    service.updateEnrollment(enrollmentId, { usuarioId: 98765, cursoId: 87655 }).subscribe();
    tick(MOCK_DELAY);
    service.getEnrollmentById(enrollmentId).subscribe((enrollment) => expect(enrollment.cursoId).toBe(87655));
    tick(MOCK_DELAY);
    service.deleteEnrollment(enrollmentId).subscribe();
    tick(MOCK_DELAY);
    service.getAllEnrollments().subscribe((enrollments) => expect(enrollments.some((item) => item.idInscripcion === enrollmentId)).toBeFalse());
    tick(MOCK_DELAY);
  }));
});
