import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function TestScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);

      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'popmatch',
        path: 'auth/callback'
      });

      console.log('Redirect URI:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo,
          scopes: 'email profile',
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        // Get the session after successful login
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        Alert.alert('Success', `Logged in as ${session?.user?.email}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {user ? (
        <>
          <Text style={{ fontSize: 18, marginBottom: 20 }}>Welcome {user.email}!</Text>
          <TouchableOpacity 
            onPress={() => supabase.auth.signOut().then(() => setUser(null))}
            style={{ backgroundColor: '#FF7043', padding: 15, borderRadius: 10 }}
          >
            <Text style={{ color: 'white' }}>Sign Out</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 24, marginBottom: 30 }}>PopMatch Test</Text>
          <TouchableOpacity 
            onPress={handleLogin}
            disabled={loading}
            style={{ backgroundColor: '#FF7043', padding: 15, borderRadius: 10 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white' }}>Login with UIUC NetID</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}