import { Component, inject } from "@angular/core";
import { LoginComponent, LoginResult } from "../login/login.component";
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
  private authService = inject(AuthService);

  async onLoginSubmit(result: LoginResult) {
    var status = await this.authService.registerSession(result.username, result.credential, result.adminMode);
    this.authService.redirectAfterLogin(status, result.username);
  }
}