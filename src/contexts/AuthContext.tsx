import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface MemberProfile {
  id: string;
  auth_user_id: string | null;
  google_email: string;
  suid: string;
  legal_first_name: string;
  legal_last_name: string;
  preferred_name: string | null;
  personal_email: string | null;
  graduation_year: number;
  major: string;
  phone: string | null;
  dorm_location: string | null;
  room: string | null;
  tshirt_size: string | null;
  instagram: string | null;
  snapchat: string | null;
  linkedin: string | null;
  venmo: string | null;
  parent_outreach_consent: boolean;
  status: 'active' | 'inactive' | 'suspended' | 'new_member' | 'alumni';
  college: string | null;
  membership_review_initiated: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  member: MemberProfile | null;
  roles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRoles = async (currentUser: User) => {
    try {
      // 1. Fetch member profile
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('auth_user_id', currentUser.id)
        .maybeSingle();

      if (memberError) {
        console.error('Error fetching member profile:', memberError);
        setMember(null);
        setRoles([]);
        return;
      }

      setMember(memberData);

      if (memberData) {
        // 2. Fetch roles using user_positions RPC
        const { data: rolesData, error: rolesError } = await supabase
          .rpc('user_positions');

        if (rolesError) {
          console.error('Error calling user_positions RPC:', rolesError);
          setRoles([]);
        } else {
          setRoles(rolesData || []);
        }
      } else {
        setRoles([]);
      }
    } catch (e) {
      console.error('Unexpected error loading auth profile:', e);
      setMember(null);
      setRoles([]);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfileAndRoles(session.user).finally(() => setLoading(false));
      } else {
        setUser(null);
        setMember(null);
        setRoles([]);
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        if (session?.user) {
          setUser(session.user);
          await fetchProfileAndRoles(session.user);
        } else {
          setUser(null);
          setMember(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error as Error | null };
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRoles(user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, member, roles, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
