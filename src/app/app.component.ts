import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showNavbar: boolean = true;

  constructor(private router: Router) {}

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

