import { supabase } from './supabase';
import { useUserStore } from '@/store/userStore';

/**
 * Derive a deterministic UUID-format string from an email address.
 * This looks like a real UUID so Supabase accepts the syntax,
 * but it won't match any real row (returns empty/null, not a 400 error).
 */
function emailToFakeUUID(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) {
    h = Math.imul(31, h) + email.charCodeAt(i) | 0;
  }
  const hex = ('00000000' + Math.abs(h).toString(16)).slice(-8);
  // Format: xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx (UUID v4-like)
  return `${hex}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(2, 5)}-${hex}${hex.slice(0, 4)}`;
}

/**
 * Get the current authenticated user ID.
 * Falls back to a UUID-format ID derived from the Zustand store user
 * when there is no real Supabase session (auth is bypassed).
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
  } catch (error) {
    console.error('Error getting current user ID:', error);
  }

  // Fallback: derive a stable UUID-format ID from the logged-in store user
  const state = useUserStore.getState();
  if (state.isAuthenticated && state.user?.email) {
    return emailToFakeUUID(state.user.email);
  }

  return null;
}

/**
 * Get the current authenticated user.
 * Falls back to Zustand store data when there is no real Supabase session.
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (error) {
    console.error('Error getting current user:', error);
  }

  // Fallback: return a mock user object from Zustand store
  const state = useUserStore.getState();
  if (state.isAuthenticated && state.user) {
    return {
      id: emailToFakeUUID(state.user.email),
      email: state.user.email,
    };
  }

  return null;
}
