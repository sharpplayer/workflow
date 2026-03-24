import { Component, inject } from "@angular/core";
import { AuthService, ResetResult } from "../../../core/services/auth.service";
import { LoginResetComponent } from "../reset/reset.component";
import { StatusLine } from "../../../core/components/status-line/status-line.component";

@Component({
  selector: 'app-reset-page',
  standalone: true,
  template: `
    <header class="app-header">
      <h1>Matchboard</h1>
    </header>
    <div class="full-screen-center">
      <app-password-reset 
        (passwordReset)="onPasswordReset($event)">
      </app-password-reset>
    </div>
    <footer class="status-bar">
      <status-line />
    </footer>

  `,
  imports: [LoginResetComponent,StatusLine],
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

export class ResetPageComponent {
  private authService = inject(AuthService);

  async onPasswordReset(result: ResetResult) {
    var status = await this.authService.resetPassword(result);
   
    this.authService.redirectAfterLogin(status);
  }
}