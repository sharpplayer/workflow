import {
  ApplicationRef,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  EnvironmentInjector,
  createComponent,
  inject
} from '@angular/core';
import { Router } from '@angular/router';
import { LoginComponent, LoginResult } from '../../login/login/login.component';
import { LoginResetComponent } from '../../login/reset/reset.component';
import { AuthService, ResetResult } from '../../../core/services/auth.service';

@Component({
  selector: 'job',
  standalone: true,
  templateUrl: './job.component.html',
  styleUrl: './job.component.css'
})
export class JobComponent {
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly appRef = inject(ApplicationRef);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  jobCompleted = false;

  openPinLogin(username: string, jobId: string): void {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 9999 !important;
      background: rgba(0,0,0,0.55) !important;
      margin: 0 !important;
      padding: 0 !important;
    `;
    document.body.appendChild(container);

    let currentRef: ComponentRef<LoginComponent | LoginResetComponent> | null = null;

    const destroyCurrent = (): void => {
      if (currentRef) {
        this.appRef.detachView(currentRef.hostView);
        currentRef.destroy();
        currentRef = null;
      }
    };

    const cleanup = (): void => {
      destroyCurrent();
      container.remove();
    };

    const mount = (ref: ComponentRef<LoginComponent | LoginResetComponent>): void => {
      this.appRef.attachView(ref.hostView);
      const domElem = ref.location.nativeElement as HTMLElement;
      container.appendChild(domElem);
      currentRef = ref;
    };

    const showLogin = (): void => {
      destroyCurrent();

      const ref = createComponent(LoginComponent, {
        environmentInjector: this.environmentInjector
      });

      ref.setInput('username', username);
      ref.setInput('mode', 'pin');

      ref.instance.loginSubmit.subscribe(async (loginResult: LoginResult) => {
        const success = await this.authService.completeJob(jobId, loginResult);

        if (success) {
          this.jobCompleted = true;
          this.cdr.detectChanges();
        }

        if (loginResult.passwordReset) {
          showReset(username);
        } else if (loginResult.pinReset) {
          showPinReset(username);
        } else {
          cleanup();
        }
      });

      ref.instance.cancelled.subscribe(() => cleanup());

      mount(ref);
    };

    const showReset = (username: string): void => {
      destroyCurrent();

      const ref = createComponent(LoginResetComponent, {
        environmentInjector: this.environmentInjector
      });

      ref.setInput('username', username);

      ref.instance.passwordReset.subscribe((resetResult: ResetResult) => {
        this.authService.resetPassword(resetResult);
        cleanup();
      });

      mount(ref);
    };

    const showPinReset = (username: string): void => {
      destroyCurrent();

      const ref = createComponent(LoginResetComponent, {
        environmentInjector: this.environmentInjector
      });

      ref.setInput('username', username);
      ref.setInput('mode', 'pin');

      ref.instance.passwordReset.subscribe((resetResult: ResetResult) => {
        this.authService.resetPassword(resetResult);
        cleanup();
      });

      mount(ref);
    };

    showLogin();
  }

  logout(): void {
    this.router.navigate(['/login']);
  }
}