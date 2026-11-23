import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import type { ProfileSpace } from '../../core/models/profile.model';
import { AccountProfileService } from '../../services/account-profile.service';
import { ProfileActivityService } from '../../services/profile-activity.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { ProfileSpacesComponent } from './profile-spaces.component';

const colegio = (rol: ProfileSpace['rol'], puedeRechazar: boolean): ProfileSpace => ({
  espacioId: 1,
  slug: 'colegio-san-jose',
  nombre: 'San José',
  tipo: 'colegio',
  rol,
  desde: '2026-11-20',
  puedeSalir: false,
  motivo: 'Para salir del colegio habla con la dirección.',
  puedeRechazar,
});

describe('Mis espacios: «No me corresponde»', () => {
  function crear(espacios: ProfileSpace[]) {
    const actividad = jasmine.createSpyObj<ProfileActivityService>('ProfileActivityService', ['espacios', 'rechazarEspacio', 'salirDeEspacio']);
    actividad.espacios.and.returnValue(of(espacios));
    actividad.rechazarEspacio.and.returnValue(of(undefined));
    const session = jasmine.createSpyObj('SessionService', ['defaultSpace', 'activeSpace', 'removeMembership', 'postLoginRoute', 'setDefaultSpace']);
    session.activeSpace.and.returnValue({ id: 9 });
    TestBed.configureTestingModule({
      imports: [ProfileSpacesComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileActivityService, useValue: actividad },
        { provide: AccountProfileService, useValue: {} },
        { provide: SessionService, useValue: session },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['success', 'error']) },
      ],
    });
    const fixture = TestBed.createComponent(ProfileSpacesComponent);
    fixture.detectChanges();
    return { fixture, actividad, session };
  }

  it('shows the button only on a space the school joined by email', async () => {
    const { fixture } = crear([colegio('docente', true), { ...colegio('padre', false), rol: 'padre' }]);
    await fixture.whenStable();
    fixture.detectChanges();
    const botones = [...fixture.nativeElement.querySelectorAll('button')].filter((b: HTMLButtonElement) => b.textContent?.includes('No me corresponde'));
    expect(botones.length).toBe(1);
  });

  it('refuses only that role and keeps the space when the person has another role in it', async () => {
    const { fixture, actividad, session } = crear([colegio('docente', true), colegio('padre', false)]);
    await fixture.whenStable();
    spyOn(window, 'confirm').and.returnValue(true);
    await fixture.componentInstance.rechazar(colegio('docente', true));
    expect(actividad.rechazarEspacio).toHaveBeenCalledWith('colegio-san-jose', 'docente');
    expect(session.removeMembership).not.toHaveBeenCalled();
  });
});
