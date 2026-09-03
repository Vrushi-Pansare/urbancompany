import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  private authSub = new Subscription();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authSub.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
      })
    );
  }

  ngOnDestroy(): void {
    this.authSub.unsubscribe();
  }

  openLoginModal(): void {
    this.authService.openLoginModal();
  }

  logout(): void {
    this.authService.logout();
  }
}
