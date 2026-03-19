import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function AmbientTutor() {
  const navigate = useNavigate();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  
  // Track the last seen profile so we can diff changes
  const [lastProfileString, setLastProfileString] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setDndMode = useUserStore((state) => state.setDndMode);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    // 1. Initial Profile Fetch to establish a baseline
    const fetchInitialProfile = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('ai_persona_profile')
        .eq('id', userId);

      if (!error && data && data.length > 0 && data[0].ai_persona_profile) {
        setLastProfileString(JSON.stringify(data[0].ai_persona_profile));
      }
    };

    fetchInitialProfile();

    // 2. Subscribe to Realtime Profile Updates
    const channel = supabase
      .channel('ambient-tutor-brain')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newProfile = payload.new.ai_persona_profile;
          if (!newProfile) return;

          const newProfileString = JSON.stringify(newProfile);
          
          // Only trigger if the profile actually changed to avoid loop/thrashing
          if (newProfileString !== lastProfileString) {
            handleProfileUpdate(newProfile);
            setLastProfileString(newProfileString);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId, lastProfileString]);

  // 3. Intervention Logic
  const handleProfileUpdate = (profile: any) => {
    // If the Edge function explicitly generated an intervention action
    if (profile.intervention && profile.intervention.action) {
      toast('Ambient Tutor', {
        description: profile.intervention.message,
        duration: 15000, // Give them more time to read and click "Follow"
        action: {
          label: 'Follow',
          onClick: () => {
             const action = profile.intervention.action;
             switch(action.type) {
                case 'NAVIGATE':
                  navigate(action.payload?.path || '/');
                  break;
                case 'NAVIGATE_AND_START_FOCUS':
                  navigate(`/focus?autostart=true&duration=${action.payload?.duration || 5}`);
                  break;
                case 'ENABLE_DND':
                  setDndMode(true);
                  toast.success('Do Not Disturb enabled. Interface dimmed.');
                  break;
                default:
                  console.warn('Unknown intervention action type:', action.type);
             }
          },
        },
        cancel: {
          label: 'Continue',
          onClick: () => console.log('Intervention dismissed'),
        }
      });
      return;
    }

    // Heuristics based on state changes if exact intervention missing (fallback)
    if (profile.current_mood === 'frustrated') {
       toast.warning('Need a break?', {
        description: 'I noticed you might be getting frustrated. How about a 5-minute break in the Focus Room?',
        duration: 8000,
       });
    } else if (profile.current_mood === 'flow_state') {
       toast.success('You are on fire!', {
        description: 'You are in a great rhythm. Keep up the excellent focus!',
        duration: 5000,
       });
    }
  };

  // The component is headless/invisible. It just manages side effects (toasts).
  return null;
}
