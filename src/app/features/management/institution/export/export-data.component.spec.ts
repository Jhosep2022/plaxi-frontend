import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../../../../core/auth/session.service';
import { ExportDataComponent } from './export-data.component';

describe('Exportar los datos del colegio', () => {
  it('asks the API for every section and marks each one as ready', async () => {
    TestBed.configureTestingModule({
      imports: [ExportDataComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: SessionService, useValue: { activeSpace: () => ({ slug: 'colegio-san-jose' }) } }],
    });
    const fixture = TestBed.createComponent(ExportDataComponent);
    const component = fixture.componentInstance;
    const requests = TestBed.inject(HttpTestingController);
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    const downloading = component.download();
    // Answer requests one by one as the component asks for them
    for (const section of component.sections) {
      let request;
      for (let attempt = 0; attempt < 400 && !request; attempt++) {
        request = requests.match((r) => r.url.endsWith(`/exportacion/${section.id}`))[0];
        if (!request) await new Promise((resolve) => setTimeout(resolve, 5));
      }
      request!.flush({ titulo: section.label, columnas: ['A', 'B'], filas: [['x', true]] });
    }
    await downloading;
    expect(Object.keys(component.done()).length).toBe(component.sections.length);
    expect(click).toHaveBeenCalled();
    expect(component.error()).toBe('');
  });
});
