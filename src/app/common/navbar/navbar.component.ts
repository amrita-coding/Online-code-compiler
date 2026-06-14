import { Component, HostListener } from '@angular/core';
import { AuthService } from '../../auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  isScrolled = false;

  constructor(private authService: AuthService, public router: Router) {}

  openLogin(): void {
    this.router.navigate(['/home'], { queryParams: { auth: 'login' } });
  }

  openSignup(): void {
    this.router.navigate(['/home'], { queryParams: { auth: 'signup' } });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 50;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // logout completed, user redirected by AuthService.clearSession()
      },
      error: () => {
        // ensure session state is cleaned even if backend logout fails
      }
    });
  }
}
