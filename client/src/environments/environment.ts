import { API_URL } from './api-url.generated';

export const environment = {
  // Prefilled into the sign-in form; exists only in the local dev environment
  localCredentials: {
    email: 'admin@sfl.local',
    password: 'admin',
  },
  apiUrl: API_URL,
};
