import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CourseCategory {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CourseCategoryApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/course-categories`;

  search(search: string): Observable<CourseCategory[]> {
    const params = search.trim() ? new HttpParams().set('search', search.trim()) : undefined;
    return this.http.get<CourseCategory[]>(this.url, { params });
  }

  create(name: string): Observable<CourseCategory> {
    return this.http.post<CourseCategory>(this.url, { name });
  }
}
