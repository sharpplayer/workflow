import { Component, inject } from "@angular/core";
import { LoginComponent } from "../login/login.component";
import { DeviceService } from "../../../core/device.service";
import { Router } from "@angular/router";

@Component({
    selector: 'app-login-page',
    template: `
    <div class="full-screen-center">
      <app-login [users]="users" (loginSuccess)="onLogin($event)" />
    </div>
  `,
    imports: [LoginComponent]
})

export class LoginPageComponent {
    private deviceService = inject(DeviceService);
    private router = inject(Router);
    users = this.deviceService.getStatus().users;

    onLogin(user: string) {
        this.router.navigate(['/dashboard']);  // or wherever post-login goes
    }
}