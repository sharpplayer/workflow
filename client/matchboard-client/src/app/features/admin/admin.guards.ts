import { CanDeactivateFn } from '@angular/router';

export const unsavedChangesGuard: CanDeactivateFn<any> = (component) => {
  if (typeof component.isDirty !== 'function') return true;

  return !component.isDirty() || confirm('You have unsaved changes. Leave anyway?');
};