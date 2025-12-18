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
  dbError: string | null;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  tenant: null,
  role: null,
  loading: true,
  dbError: null,
  signOut: async () => {},
  refreshUserData: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    setDbError(null);
    try {
      const userId = currentUser.id;
      
      // 1. Get Profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        setDbError(`Database toegang geweigerd (Profiles): ${profileError.message}`);
        console.error("Profile Fetch Error:", profileError);
      }

      // Probeer profiel aan te maken als het ontbreekt
      if (!profileData && currentUser.user_metadata?.full_name) {
        const { data: newProfile, error: insertError } = await supabase.from('profiles').insert({
          id: userId,
          email: currentUser.email,
          full_name: currentUser.user_metadata.full_name
        }).select().maybeSingle();
        
        if (insertError) {
          console.error("Profile Insert Error:", insertError);
          setDbError("Kon profiel niet aanmaken. Check je RLS Policies in Supabase.");
        } else {
          profileData = newProfile;
        }
      }
      setProfile(profileData);

      // 2. Get Member Role & Tenant ID
      let { data: memberData, error: memberError } = await supabase
        .from('tenant_members')
        .select('role, tenant_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError) console.error("Member Fetch Error:", memberError);

      // AUTO-SETUP ALS LID ONTBREEKT
      if (!memberData && currentUser.user_metadata?.pending_role) {
        const pendingRole = currentUser.user_metadata.pending_role;
        const pendingCode = currentUser.user_metadata.pending_family_code;

        if (pendingRole === 'master_admin') {
          // Maak nieuw huishouden
          const { data: newTenant, error: tenantError } = await supabase.from('tenants').insert({
            name: `Gezin ${currentUser.user_metadata.full_name.split(' ')[0]}`,
            subscription_tier: 'S',
            max_users: 5
          }).select().maybeSingle();

          if (tenantError) {
            console.error("Tenant Creation Error:", tenantError);
            setDbError("Database blokkeert aanmaken van een nieuw huishouden (Tenants RLS).");
          } else if (newTenant) {
            const { data: newMember, error: memberInsertError } = await supabase.from('tenant_members').insert({
              tenant_id: newTenant.id,
              user_id: userId,
              role: 'master_admin'
            }).select().maybeSingle();
            
            if (memberInsertError) console.error("Member Insert Error:", memberInsertError);
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
            }).select().maybeSingle();
            memberData = newMember;
          }
        }
      }

      if (memberData) {
        setRole(memberData.role as UserRole);
        const { data: tenantData } = await supabase.from('tenants').select('*').eq('id', memberData.tenant_id).single();
        setTenant(tenantData as Tenant);
      }
    } catch (error) {
      console.error('Algemene fout in AuthContext:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      setLoading(true);
      await fetchUserData(user);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, tenant, role, loading, dbError, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);