import { useUserStore } from '@/store/userStore';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up — accepts any details without calling Supabase auth.
 * Supabase is still used elsewhere in the app for data (courses, notes, etc.).
 */
export async function signUp({ email, name }: SignUpData) {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const displayName = name?.trim() || email.split('@')[0];
  useUserStore.setState({
    isAuthenticated: true,
    user: {
      name: displayName,
      email,
      xp: 0,
      level: 1,
      streak: 0,
    },
  });

  return { user: { email }, error: null };
}

/**
 * Sign in — accepts any email/password without calling Supabase auth.
 * Supabase is still used elsewhere in the app for data (courses, notes, etc.).
 */
export async function signIn({ email }: SignInData) {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const name = email.split('@')[0];
  useUserStore.setState({
    isAuthenticated: true,
    user: {
      name,
      email,
      xp: 0,
      level: 1,
      streak: 0,
    },
  });

  return { user: { email }, error: null };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  useUserStore.getState().logout();
  return { error: null };
}

/**
 * Get the current session — returns null since we bypass Supabase auth.
 * Zustand persist handles keeping the user logged in across refreshes.
 */
export async function getSession() {
  return { session: null, error: null };
}

/**
 * Initialize auth state on app load.
 * Zustand's persist middleware restores state from localStorage automatically.
 */
export async function initializeAuth() {
  // Nothing needed — persisted Zustand state is already restored.
}
