import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Profile, Tenant, UserRole } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  tenant: Tenant | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  tenant: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user);
      else setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setProfile(null);
        setTenant(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (currentUser: User) => {
    try {
      const userId = currentUser.id;
      
      // 1. Get Profile
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Als profiel ontbreekt, maken we het aan (bijv. na email bevestiging)
      if (!profileData && currentUser.user_metadata?.full_name) {
        const { data: newProfile } = await supabase.from('profiles').insert({
          id: userId,
          email: currentUser.email,
          full_name: currentUser.user_metadata.full_name
        }).select().single();
        profileData = newProfile;
      }
      setProfile(profileData);

      // 2. Get Member Role & Tenant ID
      let { data: memberData } = await supabase
        .from('tenant_members')
        .select('role, tenant_id')
        .eq('user_id', userId)
        .maybeSingle();

      // AUTO-SETUP ALS LID VAN TENANT ONTBREEKT
      if (!memberData && currentUser.user_metadata?.pending_role) {
        const pendingRole = currentUser.user_metadata.pending_role;
        const pendingCode = currentUser.user_metadata.pending_family_code;

        if (pendingRole === 'master_admin') {
          // Maak nieuw huishouden
          const { data: newTenant } = await supabase.from('tenants').insert({
            name: `Gezin ${currentUser.user_metadata.full_name.split(' ')[0]}`,
            subscription_tier: 'S',
            max_users: 5
          }).select().single();

          if (newTenant) {
            const { data: newMember } = await supabase.from('tenant_members').insert({
              tenant_id: newTenant.id,
              user_id: userId,
              role: 'master_admin'
            }).select().single();
            memberData = newMember;
          }
        } else if (pendingRole === 'sub_user' && pendingCode) {
          // Sluit aan bij bestaand huishouden
          const { data: targetTenant } = await supabase.from('tenants').select('id').eq('id', pendingCode).maybeSingle();
          if (targetTenant) {
            const { data: newMember } = await supabase.from('tenant_members').insert({
              tenant_id: targetTenant.id,
              user_id: userId,
              role: 'sub_user'
            }).select().single();
            memberData = newMember;
          }
        }
      }

      if (memberData) {
        setRole(memberData.role as UserRole);
        
        // 3. Get Tenant Details
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', memberData.tenant_id)
          .single();
        setTenant(tenantData as Tenant);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, tenant, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);