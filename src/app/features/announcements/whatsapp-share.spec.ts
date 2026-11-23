import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { announcementLinkGuard } from '../../core/guards/announcement-link.guard';
import { whatsappShareUrl } from './announcements.ui';

describe('Compartir comunicados por WhatsApp', () => {
  const notice = { id: 42, titulo: 'Reunión de padres', mensaje: 'Los esperamos el viernes a las 18:00 en el patio.', fechaEvento: '2026-11-28' };
  const school = { nombre: 'Colegio San José', slug: 'colegio-san-jose' };
  const text = (url: string) => decodeURIComponent(url.replace('https://wa.me/?text=', ''));

  it('builds the WhatsApp text with title, date, message and the link to read it in Aulix', () => {
    const shared = text(whatsappShareUrl(notice, school, 'https://app.alclick.dev'));
    expect(shared).toContain('*Reunión de padres*');
    expect(shared).toContain('Los esperamos el viernes');
    expect(shared).toContain('https://app.alclick.dev/comunicado/colegio-san-jose/42');
    expect(shared).toContain('— Colegio San José');
  });

  it('sends only the start of a long message: the rest stays in Aulix', () => {
    const shared = text(whatsappShareUrl({ ...notice, mensaje: 'x'.repeat(1000), fechaEvento: '' }, school, 'https://a.b'));
    expect(shared).toContain('x'.repeat(277) + '…');
    expect(shared).not.toContain('x'.repeat(300));
    expect(shared).not.toContain('📅');
  });

  describe('link /comunicado/:espacio/:id', () => {
    const run = (session: object, slug = 'colegio-san-jose', id = '42') => {
      TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: SessionService, useValue: session }] });
      const route = { paramMap: convertToParamMap({ espacio: slug, id }) } as ActivatedRouteSnapshot;
      const result = TestBed.runInInjectionContext(() => announcementLinkGuard(route, {} as RouterStateSnapshot)) as UrlTree;
      return TestBed.inject(Router).serializeUrl(result);
    };
    const member = (...roles: string[]) => ({
      isAuthenticated: () => true,
      pendingStep: () => null,
      memberships: (() => roles.map((rol) => ({ rol, espacio: { slug: 'colegio-san-jose' } }))) as unknown as SessionService['memberships'],
      postLoginRoute: () => '/espacios',
    });
    afterEach(() => sessionStorage.clear());

    it('signs in first and remembers where to come back', () => {
      expect(run({ isAuthenticated: () => false })).toBe('/auth/login');
      expect(Object.values(sessionStorage).some((value) => value === '/comunicado/colegio-san-jose/42')).toBeTrue();
    });

    it('opens the notice in the inbox of a parent, even if they are also a teacher there', () => {
      expect(run(member('docente', 'padre'))).toBe('/colegio-san-jose/padre/comunicados?c=42');
    });

    it('goes home when the person is not in that school', () => {
      expect(run(member(), 'otro-colegio')).toBe('/espacios');
    });
  });
});
