import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [NavbarComponent, RouterOutlet]
})
export class AppComponent {
  private router = inject(Router);

  showNavbar: boolean = true;

  ngOnInit(): void {
    this.router.events.subscribe(() => {
      const currentRoute = this.router.url;
      this.showNavbar = !(
        currentRoute.includes('/login') ||
        currentRoute.includes('/registrar') ||
        currentRoute.includes('/forgot-password')
      );
    });
  }
}

