import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

// Using your corrected "g" URL and your publishable key
const supabaseUrl = "https://mbcibjbwxtuonjfsgzaa.supabase.co";
const supabaseAnonKey = "sb_publishable_SOQw2OP0Br29KXeMxm_uCw_fAFI-ZX8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
