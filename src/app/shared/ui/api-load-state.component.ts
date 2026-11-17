import { Component, computed, input } from '@angular/core';
import { readApiError } from '../../core/api/api-error';

export interface ApiResourceState {
  error(): unknown;
  isLoading(): boolean;
  reload(): boolean;
}
@Component({
  selector: 'app-api-load-state',
  template: `
    @if (failure()) {
      <div class="ui-card" role="alert">
        <p class="ui-error">{{ failure() }}</p>
        <button
          class="ui-btn ui-btn--secundario"
          type="button"
          (click)="retry()"
        >
          Volver a cargar
        </button>
      </div>
    } @else if (loading()) {
      <p role="status" aria-live="polite">Cargando los datos del colegio…</p>
    }
  `,
})
export class ApiLoadStateComponent {
  readonly resources = input.required<ApiResourceState[]>();
  readonly failure = computed(() => {
    const error = this.resources()
      .map((resource) => resource.error())
      .find(Boolean);
    return error ? readApiError(error).message : '';
  });
  readonly loading = computed(() =>
    this.resources().some((resource) => resource.isLoading()),
  );
  retry(): void {
    for (const resource of this.resources()) resource.reload();
  }
}
