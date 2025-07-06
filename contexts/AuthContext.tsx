import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { supabase } from '../lib/supabase';

// Define user roles to match database constraints
type UserRole = 'user' | 'owner';

// Enhanced Profile type - matching database structure
type Profile = {
  user_id: string;  // Changed from 'id' to 'user_id' to match database
  username: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
};

// Complete AuthContext type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  error: Error | null;
  isOwner: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    role?: UserRole
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshSession: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isOwner = profile?.role === 'owner';

  const clearError = () => setError(null);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      setProfile(data);
    } catch (err) {
      setProfile(null);
      const error = err instanceof Error ? err : new Error('Failed to fetch profile');
      setError(error);
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const { data: { session: initialSession }, error: sessionError } = 
          await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Auth initialization failed');
        setError(error);
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (newSession?.access_token === session?.access_token) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
          if (event === 'SIGNED_IN') {
            router.replace('/');
          }
        } else {
          setProfile(null);
          if (event === 'SIGNED_OUT') {
            router.replace('/login');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Session expiry check
  useEffect(() => {
    const checkSessionExpiry = setInterval(() => {
      if (session?.expires_at && session.expires_at * 1000 < Date.now()) {
        refreshSession();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkSessionExpiry);
  }, [session]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    clearError();
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) throw authError;
    } catch (err) {
      let errorMessage = 'Login failed';
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        }
      }
      const error = err instanceof Error ? err : new Error(errorMessage);
      setError(error);
      Alert.alert('Login Error', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    role: UserRole = 'user'
  ) => {
    setLoading(true);
    clearError();
    try {
      // Validate username (only letters, numbers, underscores)
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }

      // Check if username already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingProfile) {
        throw new Error('Username already taken');
      }

      // Create auth user with metadata
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            username,
            role
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        // The trigger should create the profile automatically
        // But let's ensure it's created with the correct role
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger
        
        // Check if profile was created by trigger
        const { data: profileData, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (profileCheckError || !profileData) {
          // If trigger didn't work, create profile manually
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              user_id: data.user.id,
              username,
              role
            }]);

          if (profileError) throw profileError;
        } else if (profileData.role !== role) {
          // Update role if it was created with wrong role
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role })
            .eq('user_id', data.user.id);

          if (updateError) throw updateError;
        }
      }
    } catch (err) {
      let errorMessage = 'Signup failed';
      if (err instanceof Error) {
        if (err.message.includes('User already registered')) {
          errorMessage = 'Email already in use';
        } else if (err.message.includes('Password')) {
          errorMessage = 'Password must be at least 6 characters';
        } else if (err.message.includes('username')) {
          errorMessage = 'Username already taken';
        } else if (err.message.includes('duplicate key value')) {
          errorMessage = 'Username already taken';
        }
      }
      const error = err instanceof Error ? err : new Error(errorMessage);
      setError(error);
      Alert.alert('Signup Error', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    clearError();
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Logout failed');
      setError(error);
      Alert.alert('Logout Error', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      const error = new Error('Not authenticated');
      setError(error);
      throw error;
    }

    setProfileLoading(true);
    clearError();
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);
      Alert.alert('Success', 'Profile updated!');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Profile update failed');
      setError(error);
      Alert.alert('Update Error', error.message);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshSession = async () => {
    setLoading(true);
    clearError();
    try {
      const { data: { session: newSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError) throw refreshError;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Session refresh failed');
      setError(error);
      Alert.alert('Session Error', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    clearError();
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;
      Alert.alert('Success', 'Password reset link sent to your email');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Password reset failed');
      setError(error);
      Alert.alert('Error', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    error,
    isOwner,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshSession,
    resetPassword,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};