// clerk.js - Clerk authentication
import { Clerk } from '@clerk/web';

export const clerk = {
  init: () => {
    Clerk.config({
      publishableKey: 'pk_test_YXNzdXJpbmctaGVkZ2Vob2ctOTQuY2xlcmsuYWNjb3VudHMuZGV2'
    });
  },

  login: async () => {
    try {
      await Clerk.signIn();
      window.location.href = '/';
    } catch (error) {
      console.error('Login error:', error);
    }
  },

  logout: () => {
    Clerk.signOut();
    window.location.href = '/';
  },

  isAuthed: () => Clerk.user !== null
};

// Initialize
if (typeof window !== 'undefined') {
  clerk.init();
}
