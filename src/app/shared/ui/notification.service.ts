import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

// Show brief success and error notifications.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messages = inject(MessageService);

  success(message: string): void {
    this.messages.add({ severity: 'success', summary: '¡Listo!', detail: message, life: 4000 });
  }

  error(message: string): void {
    this.messages.add({ severity: 'error', summary: 'Algo salió mal', detail: message, life: 5000 });
  }
}
