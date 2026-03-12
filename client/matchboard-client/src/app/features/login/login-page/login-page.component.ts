import { Component, inject } from "@angular/core";
import { LoginComponent, LoginResult } from "../login/login.component";
import { Router } from "@angular/router";
import { DeviceService } from "../../../core/services/device.service";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: 'app-login-page',
  template: `
    <div class="full-screen-center">
      <app-login 
        (loginSubmit)="onLoginSubmit($event)">
      </app-login>
    </div>
  `,
  imports: [LoginComponent]
})

export class LoginPageComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  async onLoginSubmit(result: LoginResult) {
    console.log("Attempted login")
    try {
      var status = await this.authService.registerSession(result.username, result.credential, result.adminMode);
      console.log("Attempted login with mode:" + status.mode)
      switch (status.mode) {
        case 'job': this.router.navigate(['/job']); break;
        case 'admin': this.router.navigate(['/admin']); break;
        default: this.router.navigate(['/login']); break;
      }
    } catch (err) {
      console.error('Login failed', err);
    }
  }
}