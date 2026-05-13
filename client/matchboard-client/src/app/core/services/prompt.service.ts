import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable
} from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { PromptModalComponent } from '../components/prompt-modal/prompt-modal.component';

@Injectable({ providedIn: 'root' })
export class PromptService {
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly appRef = inject(ApplicationRef);

  alert(message: string, title = 'Message', okText = 'OK'): Promise<void> {
    return this.open({
      title,
      message,
      mode: 'alert',
      okText
    }).then(() => undefined);
  }

  confirm(
    message: string,
    title = 'Confirm',
    okText = 'Yes',
    cancelText = 'No'
  ): Promise<boolean> {
    return this.open({
      title,
      message,
      mode: 'confirm',
      okText,
      cancelText
    });
  }

  private async open(params: {
    title: string;
    message: string;
    mode: 'alert' | 'confirm';
    okText: string;
    cancelText?: string;
  }): Promise<boolean> {
    const result$ = new Subject<boolean>();
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 10000 !important;
      background: rgba(0, 0, 0, 0.55) !important;
      padding: 16px !important;
    `;
    document.body.appendChild(container);

    const ref: ComponentRef<PromptModalComponent> = createComponent(PromptModalComponent, {
      environmentInjector: this.environmentInjector
    });

    ref.setInput('title', params.title);
    ref.setInput('message', params.message);
    ref.setInput('mode', params.mode);
    ref.setInput('okText', params.okText);
    ref.setInput('cancelText', params.cancelText ?? 'No');

    const cleanup = (): void => {
      this.appRef.detachView(ref.hostView);
      ref.destroy();
      container.remove();
      result$.complete();
    };

    ref.instance.resolved.subscribe(result => {
      result$.next(result);
      cleanup();
    });

    this.appRef.attachView(ref.hostView);
    container.appendChild(ref.location.nativeElement);

    return firstValueFrom(result$);
  }
}
