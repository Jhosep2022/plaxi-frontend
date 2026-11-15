import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminOverviewApiService, countSpaces } from './admin-overview-api.service';

describe('AdminOverviewApiService', () => {
  let service: AdminOverviewApiService;
  let requests: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminOverviewApiService);
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());

  it('uses global API counts even when the spaces preview only contains one page', () => {
    service.getOverview().subscribe(({ summary, spaces }) => {
      expect(countSpaces(summary, 'school')).toBe(87);
      expect(countSpaces(summary, undefined, 'suspended')).toBe(7);
      expect(spaces).toHaveSize(1);
      expect(spaces[0].memberCount).toBe(3);
    });
    requests.expectOne(`${environment.API_URL}/admin/summary`).flush({
      spaces: [{ type: 'school', status: 'active', count: 80 }, { type: 'school', status: 'suspended', count: 7 }],
      newRequests: 3, paymentsDueSoon: 2, activeUsers: 5, storageBytes: 0,
    });
    requests.expectOne(`${environment.API_URL}/admin/spaces?page=1`).flush([
      { id: 42, type: 'school', memberCounts: { directors: 1, teachers: 2, students: 0, parents: 0 } },
    ]);
  });
});
