export const SKIP_CONFIRMATION_STORAGE_KEY = 'skip_confirmation_disabled';

export const shouldShowSkipConfirmation = (): boolean => {
  return localStorage.getItem(SKIP_CONFIRMATION_STORAGE_KEY) !== 'true';
};
