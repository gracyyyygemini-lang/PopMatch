import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../lib/supabase";

export const AppContext = createContext<any>({});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncProfile = async (user: any) => {
    if (!user) return;
    // Try to get or create the user row
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!data) {
      const { data: newUser } = await supabase
        .from("users")
        .upsert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || "Illini Student",
        })
        .select()
        .single();
      setUserProfile(newUser);
    } else {
      setUserProfile(data);
    }
  };

  useEffect(() => {
    // Initialize session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) syncProfile(session.user);
      setIsLoading(false);
    });

    // Listen for login/logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) syncProfile(session.user);
      else setUserProfile(null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ session, userProfile, isLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
