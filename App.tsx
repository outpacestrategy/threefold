import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import { getUserProfile } from './src/lib/storage';
import { supabase } from './src/lib/supabase';
import { syncFromSupabase } from './src/lib/storage';

type AuthState = 'loading' | 'signIn' | 'signUp' | 'onboarding' | 'app';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    checkState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthState('signIn');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Check if user has completed onboarding locally (pre-auth)
        const profile = await getUserProfile();
        if (profile?.onboardingComplete) {
          // They onboarded but haven't signed up yet — show sign up
          setAuthState('signUp');
        } else {
          setAuthState('signIn');
        }
        return;
      }

      // User is authenticated — check onboarding
      const profile = await getUserProfile();
      if (profile?.onboardingComplete) {
        // Sync from Supabase on launch (cloud wins)
        try { await syncFromSupabase(); } catch {}
        setAuthState('app');
      } else {
        setAuthState('onboarding');
      }
    } catch {
      setAuthState('signIn');
    }
  };

  const handleAuthComplete = async () => {
    const profile = await getUserProfile();
    if (profile?.onboardingComplete) {
      try { await syncFromSupabase(); } catch {}
      setAuthState('app');
    } else {
      setAuthState('onboarding');
    }
  };

  const handleOnboardingComplete = () => {
    setAuthState('app');
  };

  const handleSignOut = () => {
    setAuthState('signIn');
  };

  if (authState === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF9F7' }}>
          <ActivityIndicator color="#1A1A1A" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (authState === 'signIn') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SignInScreen
          onSignIn={handleAuthComplete}
          onSwitchToSignUp={() => setAuthState('signUp')}
        />
      </SafeAreaProvider>
    );
  }

  if (authState === 'signUp') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SignUpScreen
          onSignUp={handleAuthComplete}
          onSwitchToSignIn={() => setAuthState('signIn')}
        />
      </SafeAreaProvider>
    );
  }

  if (authState === 'onboarding') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppNavigator onSignOut={handleSignOut} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
