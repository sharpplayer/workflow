import { CanDeactivateFn } from '@angular/router';

export interface DirtyComponent {
  canSubmit(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<DirtyComponent> = (component) => {
  return !component.canSubmit() || confirm('You have unsaved changes. Leave anyway?');
};