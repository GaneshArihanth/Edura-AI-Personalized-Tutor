import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

/**
 * Update user XP and level
 */
export async function updateUserXP(userId: string, xpToAdd: number) {
  try {
    // Get current XP from database first
    const { data: currentUserData, error: fetchError } = await supabase
      .from('users')
      .select('xp, level')
      .eq('id', userId);

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    const currentXP = (currentUserData && currentUserData.length > 0) ? currentUserData[0].xp : 0;
    const newXP = currentXP + xpToAdd;
    const newLevel = Math.floor(newXP / 100) + 1;

    // Update in database
    const { error } = await supabase
      .from('users')
      .update({
        xp: newXP,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    // Update local store
    useUserStore.setState((state) => {
      if (state.user) {
        return {
          user: {
            ...state.user,
            xp: newXP,
            level: newLevel,
          },
        };
      }
      return state;
    });

    return { xp: newXP, level: newLevel, error: null };
  } catch (error: any) {
    console.error('Error updating XP:', error);
    return { xp: null, level: null, error: error.message };
  }
}

/**
 * Update user streak
 */
export async function updateUserStreak(userId: string, streak: number) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        streak,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    // Update local store
    useUserStore.setState((state) => {
      if (state.user) {
        return {
          user: {
            ...state.user,
            streak,
          },
        };
      }
      return state;
    });

    return { error: null };
  } catch (error: any) {
    console.error('Error updating streak:', error);
    return { error: error.message };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);

    if (error) {
      if (error.code === 'PGRST116' || (error as any).status === 406) {
        const state = useUserStore.getState();
        if (state.isAuthenticated && state.user) {
          return { profile: { ...state.user, id: userId }, error: null };
        }
      }
      throw error;
    }
    
    // Fallback to local store data if array is empty (due to RLS or missing record)
    if (!data || data.length === 0) {
      const state = useUserStore.getState();
      if (state.isAuthenticated && state.user) {
        return { profile: { ...state.user, id: userId }, error: null };
      }
      return { profile: null, error: 'User profile not found' };
    }

    return { profile: data[0], error: null };
  } catch (error: any) {
    console.warn('Error fetching user profile (Supabase):', error.message || error);

    // Fallback to local store data
    const state = useUserStore.getState();
    if (state.isAuthenticated && state.user) {
      return { profile: { ...state.user, id: userId }, error: null };
    }

    return { profile: null, error: error.message };
  }
}

