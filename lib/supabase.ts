import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mbcibjbwxtuonjfsgzaa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iY2liamJ3eHR1b25qZnNnemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjA5MTUsImV4cCI6MjA4OTQzNjkxNX0.CSXY1GUPmDNmkQT5krkeaIPI38-Tpod14JiiCGfORYI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});