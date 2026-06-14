import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        this.scrollToSection(fragment);
      }
    });

    this.route.queryParams.subscribe(params => {
      const shareId = params['share'];
      if (shareId) {
        this.router.navigate(['/home'], { queryParams: { share: shareId } });
      }
    });
  }

  startCoding() {
    this.router.navigate(['/home']);
  }

  scrollToFeatures() {
    this.scrollToSection('features');
  }

  scrollToSection(id: string) {
    const section = document.getElementById(id);
    if (section) {
      const navbar = document.querySelector('.navbar');
      const offset = navbar ? navbar.clientHeight + 20 : 20;
      const top = section.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }
}