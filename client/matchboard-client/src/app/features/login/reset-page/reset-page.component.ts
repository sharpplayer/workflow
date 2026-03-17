import { Component, inject } from "@angular/core";
import { AuthService, ResetResult } from "../../../core/services/auth.service";
import { LoginResetComponent } from "../reset/reset.component";

@Component({
  selector: 'app-reset-page',
  standalone: true,
  template: `
    <div class="full-screen-center">
      <app-password-reset 
        (passwordReset)="onPasswordReset($event)">
      </app-password-reset>
    </div>
  `,
  imports: [LoginResetComponent]
})

export class ResetPageComponent {
  private authService = inject(AuthService);

  async onPasswordReset(result: ResetResult) {
    var status = await this.authService.resetPassword(result);
   
    this.authService.redirectAfterLogin(status);
  }
}