import { ApplicationRef, ChangeDetectorRef, Component, createComponent, EnvironmentInjector, inject } from "@angular/core";
import { LoginComponent, LoginResult } from "../../login/login/login.component";
import { LoginResetComponent } from "../../login/reset/reset.component";
import { AuthService, ResetResult } from "../../../core/services/auth.service";

@Component({
  selector: 'job',
  standalone: true,
  templateUrl: './job.component.html',
  styleUrl: './job.component.css'
})


export class JobComponent {
  private environmentInjector = inject(EnvironmentInjector);
  private appRef = inject(ApplicationRef);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  jobCompleted = false

  openPinLogin(username: string, jobId: string): void {
    // Create a persistent container on the body
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

    const cleanup = () => {
      currentRef?.destroy();
      container.remove();
    };

    // Keep track of the current component ref so we can destroy it on swap
    let currentRef: any;

    const showLogin = () => {
      currentRef?.destroy();

      const ref = createComponent(LoginComponent, {
        environmentInjector: this.environmentInjector
      });

      ref.instance.username = username;
      ref.instance.mode = 'pin';

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

      this.appRef.attachView(ref.hostView);
      const domElem = (ref.hostView as any).rootNodes[0] as HTMLElement;
      container.appendChild(domElem);
      currentRef = ref;
    };

    const showReset = (username: string) => {
      currentRef?.destroy();

      const ref = createComponent(LoginResetComponent, {
        environmentInjector: this.environmentInjector
      });

      ref.instance.username = username;
      ref.instance.passwordReset.subscribe((resetResult: ResetResult) => {
        this.authService.resetPassword(resetResult);
        cleanup();
      });

      this.appRef.attachView(ref.hostView);
      const domElem = (ref.hostView as any).rootNodes[0] as HTMLElement;
      container.appendChild(domElem);
      currentRef = ref;
    };

    const showPinReset = (username: string) => {
      currentRef?.destroy();

      const ref = createComponent(LoginResetComponent, {
        environmentInjector: this.environmentInjector
      });

      ref.instance.username = username;
      ref.instance.mode = 'pin';
      ref.instance.passwordReset.subscribe((resetResult: ResetResult) => {
        this.authService.resetPassword(resetResult);
        cleanup();
      });

      //ref.instance.resetComplete.subscribe(() => cleanup());

      this.appRef.attachView(ref.hostView);
      const domElem = (ref.hostView as any).rootNodes[0] as HTMLElement;
      container.appendChild(domElem);
      currentRef = ref;
    };

    showLogin();
  }
}