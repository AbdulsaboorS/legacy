"use client";

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { createNativeClient } from '@/lib/supabase/native';

export function NativeAuthHandler() {
  useEffect(() => {
    // Dual check: official API + userAgent fallback (known server.url issue)
    const isNative = Capacitor.isNativePlatform() ||
      (typeof navigator !== 'undefined' && navigator.userAgent.includes('Capacitor'));

    console.log('[NativeAuthHandler] platform:', Capacitor.getPlatform(), 'isNative:', isNative);

    if (!isNative) return;

    const supabase = createNativeClient();

    let listenerHandle: { remove: () => void } | null = null;

    App.addListener('appUrlOpen', async (event) => {
      const url = event.url;
      console.log('[NativeAuthHandler] appUrlOpen:', url);

      if (!url.includes('access_token')) return;

      try {
        const fragment = url.split('#')[1] ?? '';
        const params = new URLSearchParams(fragment);
        const access_token = params.get('access_token') ?? '';
        const refresh_token = params.get('refresh_token') ?? '';

        if (!access_token) {
          console.warn('[NativeAuthHandler] No access_token in URL fragment');
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) {
          console.error('[NativeAuthHandler] setSession error:', sessionError);
          return;
        }

        // refreshSession fires onAuthStateChange listeners
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ refresh_token });
        if (refreshError || !refreshData.session) {
          console.error('[NativeAuthHandler] refreshSession error:', refreshError);
          return;
        }

        // Mirror src/app/auth/callback/route.ts routing logic:
        // query habits to determine if new user (→ onboarding) or returning user (→ dashboard)
        const userId = refreshData.session.user.id;
        const { data: habits } = await supabase
          .from('habits')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (habits && habits.length > 0) {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/onboarding';
        }
      } catch (err) {
        console.error('[NativeAuthHandler] Deep link handling error:', err);
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  return null;
}
