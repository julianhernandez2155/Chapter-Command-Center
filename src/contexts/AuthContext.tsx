import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Permission, getPermissionsForPositions, hasAnyPermission, hasPermission } from '../lib/permissions';
import { LivePosition, fetchCurrentMemberPositions } from '../lib/roster';

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
  school: string | null;
  major: string;
  phone: string | null;
  dorm_location: string | null;
  room: string | null;
  tshirt_size: string | null;
  instagram: string | null;
  snapchat: string | null;
  linkedin: string | null;
  venmo: string | null;
  avatar_url: string | null;
  pledge_class: string | null;
  member_since_term: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  bio: string | null;
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
  positions: LivePosition[];
  permissions: Permission[];
  loading: boolean;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_LOAD_TIMEOUT_MS = 8000;

const withTimeout = async <T,>(promise: Promise<T>, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), AUTH_LOAD_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const memberRef = useRef<MemberProfile | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    memberRef.current = member;
  }, [member]);

  const resetProfileState = () => {
    setMember(null);
    setRoles([]);
    setPositions([]);
  };

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
        resetProfileState();
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
          setPositions([]);
        } else {
          const roleSlugs = rolesData || [];
          setRoles(roleSlugs);

          try {
            setPositions(await fetchCurrentMemberPositions(roleSlugs));
          } catch (positionsError) {
            console.error('Error fetching active position records:', positionsError);
            setPositions([]);
          }
        }
      } else {
        resetProfileState();
      }
    } catch (e) {
      console.error('Unexpected error loading auth profile:', e);
      resetProfileState();
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialSession = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          'Timed out while loading Supabase auth session.'
        );

        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          await withTimeout(
            fetchProfileAndRoles(session.user),
            'Timed out while loading Supabase member profile.'
          );
        } else {
          setUser(null);
          resetProfileState();
        }
      } catch (err) {
        console.error('Error loading initial auth session:', err);
        if (isMounted) {
          setUser(null);
          resetProfileState();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          return;
        }

        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
          return;
        }

        const alreadyLoadedForUser = Boolean(
          session?.user
          && userRef.current?.id === session.user.id
          && memberRef.current
        );

        if (!alreadyLoadedForUser) {
          setLoading(true);
        }

        if (session?.user) {
          setUser(session.user);
          try {
            await withTimeout(
              fetchProfileAndRoles(session.user),
              'Timed out while loading Supabase member profile.'
            );
          } catch (err) {
            console.error('Error loading auth profile after state change:', err);
            resetProfileState();
          }
        } else {
          setUser(null);
          resetProfileState();
        }

        if (!alreadyLoadedForUser) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
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

  const permissions = useMemo(() => getPermissionsForPositions(roles), [roles]);
  const can = (permission: Permission) => hasPermission(permissions, permission);
  const canAny = (requiredPermissions: Permission[]) => hasAnyPermission(permissions, requiredPermissions);

  return (
    <AuthContext.Provider value={{ user, member, roles, positions, permissions, loading, can, canAny, signIn, signOut, refreshProfile }}>
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
