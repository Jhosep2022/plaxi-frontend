import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faPlus } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { ResumenService } from '../../services/resumen.service';
import { ResumenData } from '../../shared/dashboard/dashboard.models';
import { AssistantCardComponent } from '../../shared/dashboard/assistant-card.component';
import { DashCardComponent } from '../../shared/dashboard/dash-card.component';
import { DashHeaderComponent } from '../../shared/dashboard/dash-header.component';
import { ItemListComponent } from '../../shared/dashboard/item-list.component';
import { ProfileCardComponent } from '../../shared/dashboard/profile-card.component';
import { ProgressCardComponent } from '../../shared/dashboard/progress-card.component';
import { ScheduleTimelineComponent } from '../../shared/dashboard/schedule-timeline.component';
import { UpcomingListComponent } from '../../shared/dashboard/upcoming-list.component';

// Resumen (inicio) de cualquier rol: misma grilla de widgets, distintos datos
@Component({
  selector: 'app-resumen',
  templateUrl: './resumen.component.html',
  styleUrls: ['./resumen.component.css'],
  imports: [
    FaIconComponent,
    DashHeaderComponent,
    DashCardComponent,
    ProgressCardComponent,
    ScheduleTimelineComponent,
    UpcomingListComponent,
    AssistantCardComponent,
    ItemListComponent,
    ProfileCardComponent,
  ],
})
export class ResumenComponent {
  private session = inject(SessionService);
  private resumenService = inject(ResumenService);

  readonly faChevronDown = faChevronDown;
  readonly faPlus = faPlus;

  readonly data = toSignal<ResumenData | null | undefined>(
    this.resumenService
      .obtener(this.session.membresiaActiva()!, this.session.usuarioId()!)
      .pipe(catchError(() => of(null))),
    { initialValue: undefined }
  );
}
