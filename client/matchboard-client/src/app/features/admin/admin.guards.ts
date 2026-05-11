import { CanDeactivateFn } from '@angular/router';

export interface DirtyComponent {
  isDirty: () => boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<DirtyComponent> = (component) => {
  if (typeof component.isDirty !== 'function') return true;

  return !component.isDirty() || confirm('You have unsaved changes. Leave anyway?');
};