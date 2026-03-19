import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Handle the OAuth callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Successfully authenticated
        router.replace('/test');
      } else {
        router.replace('/test');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FF7043" />
      <Text style={{ marginTop: 20 }}>Completing authentication...</Text>
    </View>
  );
}