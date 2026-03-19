import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface TelemetryEventData {
  [key: string]: any;
}

interface TelemetryContextType {
  trackEvent: (eventType: string, eventData?: TelemetryEventData) => Promise<void>;
}

export const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  // Keep track of the current authenticated user
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

  const trackEvent = async (eventType: string, eventData: TelemetryEventData = {}) => {
    if (!userId) {
      // Don't track if not logged in, or log anonymously if desired
      return;
    }

    try {
      const { error } = await supabase.from('user_telemetry_events').insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
      });

      if (error) {
        console.error('Failed to log telemetry:', error);
      } else {
        console.log(`[Telemetry] Logged ${eventType}`);
      }
    } catch (err) {
      console.error('Telemetry exception:', err);
    }
  };

  return (
    <TelemetryContext.Provider value={{ trackEvent }}>
      {children}
    </TelemetryContext.Provider>
  );
}
