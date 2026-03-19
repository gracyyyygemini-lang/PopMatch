import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ScrollView, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase'; // Bridge to your database
import { User } from '@supabase/supabase-js'; // Fixes the TypeScript error

// Mandatory for mobile authentication popups
WebBrowser.maybeCompleteAuthSession();

export default function HomeScreen() {
  // 1. STATE MANAGEMENT
  // Typing this as <User | null> fixes your TypeScript assignment error
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // --- "Way More Information" Fields ---
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [budget, setBudget] = useState('');
  const [gender, setGender] = useState('');
  const [habits, setHabits] = useState('');
  const [bio, setBio] = useState('');

  // 2. AUTHENTICATION: Session Sync
  useEffect(() => {
    // Check for existing session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for Login/Logout events
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 3. AUTHENTICATION: UIUC NetID Login (Azure)
  const handleLogin = async () => {
    try {
      setLoading(true);

      // This generates the address Supabase needs to use to "call" your phone
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'popmatch',
      });

      // Check your Replit console for this print-out!
      console.log("SENDING THIS REDIRECT TO SUPABASE:", redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure', // Your Illinois/Microsoft login
        options: { 
          redirectTo, // This MUST be in your Supabase Redirect list
          scopes: 'email profile',
          skipBrowserRedirect: true // Essential for mobile apps
        },
      });

      if (error) throw error;

      // Open the UIUC Login Page
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        const { params } = AuthSession.parseDeepLink(result.url);
        if (params.access_token) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
        }
      }
    } catch (err: any) {
      Alert.alert("NetID Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. USER DATA: The "Locker" (Saving Profile Info)
  const saveProfileData = async () => {
    if (!user) return;
    if (!major || !year) return Alert.alert("Required", "Please enter your Major and Year.");

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ 
        major, 
        graduation_year: year, 
        budget, 
        gender, 
        habits, 
        bio 
      })
      .eq('id', user.id);

    setLoading(false);
    if (error) {
      Alert.alert("Error Saving", error.message);
    } else {
      Alert.alert("Success!", "Your UIUC profile has been saved to the PopMatch database.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!user ? (
          // --- VIEW A: AUTHENTICATION (Login Screen) ---
          <View style={styles.center}>
            <Text style={styles.logo}>PopMatch</Text>
            <Text style={styles.tagline}>UIUC Student Matching</Text>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Sign in with NetID</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // --- VIEW B: USER DATA (Registration Screen) ---
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Complete Your Profile</Text>
            <Text style={styles.userEmail}>{user.email}</Text>

            <Text style={styles.label}>Major</Text>
            <TextInput style={styles.input} placeholder="e.g. CS + Stats" value={major} onChangeText={setMajor} />

            <Text style={styles.label}>Graduation Year</Text>
            <TextInput style={styles.input} placeholder="2027" value={year} onChangeText={setYear} keyboardType="numeric" />

            <Text style={styles.label}>Max Monthly Budget ($)</Text>
            <TextInput style={styles.input} placeholder="900" value={budget} onChangeText={setBudget} keyboardType="numeric" />

            <Text style={styles.label}>Gender</Text>
            <TextInput style={styles.input} placeholder="Female/Male/Non-binary" value={gender} onChangeText={setGender} />

            <Text style={styles.label}>Daily Habits</Text>
            <TextInput style={styles.input} placeholder="e.g. Early bird, quiet, no smoking" value={habits} onChangeText={setHabits} />

            <Text style={styles.label}>About You</Text>
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              placeholder="I'm looking for a sublease for Fall '26..." 
              value={bio} 
              onChangeText={setBio} 
              multiline 
            />

            <TouchableOpacity style={styles.saveButton} onPress={saveProfileData} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "Saving..." : "Save Profile"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{marginTop: 30}} onPress={() => supabase.auth.signOut()}>
              <Text style={styles.signOut}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' }, // Ponyo Off-white
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  center: { alignItems: 'center' },
  logo: { fontSize: 52, fontWeight: '900', color: '#FF7043' }, // Orange
  tagline: { fontSize: 16, color: '#0288D1', marginBottom: 40, fontWeight: '600' }, // Blue
  loginButton: { backgroundColor: '#FF7043', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 100, minWidth: 200, alignItems: 'center' },
  formCard: { backgroundColor: 'white', padding: 25, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  formTitle: { fontSize: 24, fontWeight: 'bold', color: '#FF7043' },
  userEmail: { fontSize: 14, color: '#666', marginBottom: 20 },
  label: { fontSize: 12, color: '#0288D1', fontWeight: 'bold', marginTop: 15, textTransform: 'uppercase' },
  input: { backgroundColor: '#F5F7FA', padding: 15, borderRadius: 15, marginTop: 5, fontSize: 16 },
  saveButton: { backgroundColor: '#FF7043', padding: 18, borderRadius: 100, alignItems: 'center', marginTop: 30 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  signOut: { textAlign: 'center', color: '#999', textDecorationLine: 'underline' }
});