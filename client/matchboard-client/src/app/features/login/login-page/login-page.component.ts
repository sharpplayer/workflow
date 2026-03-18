import { Component, inject } from "@angular/core";
import { LoginComponent, LoginResult } from "../login/login.component";
import { AuthService } from "../../../core/services/auth.service";
import { StatusLine } from "../../../core/components/status-line/status-line.component";

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [LoginComponent, StatusLine],
  template: `
    <header class="app-header">
      <h1>Matchboard</h1>
    </header>
    <div class="full-screen-center">
      <app-login 
        (loginSubmit)="onLoginSubmit($event)">
      </app-login>
    </div>
    <footer class="status-bar">
      <status-line />
    </footer>
  `,
  styles: `
  .app-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1a1a1a;
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    z-index: 1000;
}
`
})

export class LoginPageComponent {
  private authService = inject(AuthService);

  async onLoginSubmit(result: LoginResult) {
    var status = await this.authService.registerSession(result.username, result.credential, result.adminMode);
    this.authService.redirectAfterLogin(status, result.username);
  }
}