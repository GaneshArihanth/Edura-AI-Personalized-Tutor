import { useContext } from 'react';
import { TelemetryContext } from '@/contexts/TelemetryContext';

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  
  if (context === undefined) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  
  return context;
}
