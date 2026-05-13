import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { PromptService } from '../../core/services/prompt.service';

export interface DirtyComponent {
  isDirty: () => boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<DirtyComponent> = (component) => {
  if (typeof component.isDirty !== 'function') return true;

  if (!component.isDirty()) return true;

  return inject(PromptService).confirm(
    'You have unsaved changes. Leave anyway?',
    'Unsaved changes'
  );
};
