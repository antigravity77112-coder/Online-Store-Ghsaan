/** Arabic confirm before hard-clearing an admin add/edit draft. */
export const CONFIRM_DISCARD_DRAFT = 'هل تريد إلغاء المسودة؟';

export function confirmDiscardDraft(isDirty) {
  if (!isDirty) return true;
  return window.confirm(CONFIRM_DISCARD_DRAFT);
}
