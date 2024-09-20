import { Component } from '@angular/core';
import { faBars, faBell, faEnvelope, faUser, faPlusCircle } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  faBars = faBars;
  faBell = faBell;
  faEnvelope = faEnvelope;
  faUser = faUser;
  faPlusCircle = faPlusCircle;
}
