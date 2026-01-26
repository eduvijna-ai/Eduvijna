/**
 * Web Deep Link Handler Component
 * Detects /assessment/:id routes and attempts silent redirection to mobile app
 * Falls back to web experience if app is not installed
 */

import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface WebDeepLinkHandlerProps {
  children: React.ReactNode;
  onAssessmentDetected?: (assessmentId: string, params: URLSearchParams) => void;
}

export function WebDeepLinkHandler({ children, onAssessmentDetected }: WebDeepLinkHandlerProps) {
  const [attemptedRedirect, setAttemptedRedirect] = useState(false);

  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web' || attemptedRedirect) return;

    const handleWebDeepLink = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      
      // Match /openquiz pattern
      if (path.includes('/openquiz') && search.includes('session_id')) {
        const urlParams = new URLSearchParams(search);
        const sessionId = urlParams.get('session_id');
        
        console.log('🌐 Web openquiz route detected:', sessionId);
        
        // Notify parent component if callback provided
        if (onAssessmentDetected && sessionId) {
          onAssessmentDetected(sessionId, urlParams);
        }
        
        // Build deep link URL for mobile app
        const deepLinkUrl = `eduvijna://openquiz${search}`;
        
        // Create invisible iframe to attempt app launch without navigation
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = deepLinkUrl;
        document.body.appendChild(iframe);
        
        // Clean up iframe after attempt
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
        
        // Alternative: Try direct window.location (commented out to avoid disruptive behavior)
        // This approach is more aggressive but can be jarring if app isn't installed
        /*
        let appOpened = false;
        
        const attemptAppOpen = setTimeout(() => {
          if (!appOpened) {
            // App not installed - could redirect to store here if desired
            console.log('📱 App not detected, continuing with web experience');
          }
        }, 2500);
        
        window.addEventListener('blur', () => {
          appOpened = true;
          clearTimeout(attemptAppOpen);
          console.log('📱 App opened successfully');
        }, { once: true });
        
        // Attempt to open app
        window.location.href = deepLinkUrl;
        */
        
        setAttemptedRedirect(true);
      }
    };

    handleWebDeepLink();
  }, [attemptedRedirect, onAssessmentDetected]);

  return <>{children}</>;
}

/**
 * Hook for programmatic deep link creation
 */
export function useDeepLink() {
  const createAssessmentLink = (params: {
    sessionId: string;
    classroomId?: string;
    quizId?: string;
  }): string => {
    const baseUrl = Platform.OS === 'web' 
      ? window.location.origin 
      : 'https://ui.eduvijna.com';
    
    const queryParams = new URLSearchParams();
    
    queryParams.append('session_id', params.sessionId);
    if (params.classroomId) queryParams.append('classroom_id', params.classroomId);
    if (params.quizId) queryParams.append('quiz_id', params.quizId);
    
    return `${baseUrl}/openquiz?${queryParams.toString()}`;
  };

  const getAppStoreUrl = (platform: 'ios' | 'android'): string => {
    return platform === 'ios'
      ? 'https://apps.apple.com/app/eduvijna/id123456789' // Replace with actual App Store ID
      : 'https://play.google.com/store/apps/details?id=com.eduvijna.app';
  };

  const openInApp = (sessionId: string, additionalParams?: Record<string, string>) => {
    const params = new URLSearchParams(additionalParams);
    params.set('session_id', sessionId);
    const deepLinkUrl = `eduvijna://openquiz?${params.toString()}`;
    
    if (Platform.OS === 'web') {
      window.location.href = deepLinkUrl;
    }
  };

  return {
    createAssessmentLink,
    getAppStoreUrl,
    openInApp,
  };
}
