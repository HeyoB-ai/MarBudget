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
  isCloudReady: boolean;
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
  isCloudReady: false,
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
  const [isCloudReady, setIsCloudReady] = useState(false);

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
        setIsCloudReady(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (currentUser: User) => {
    try {
      // 1. Profiel ophalen/maken
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      let currentProfile = profileData;
      if (!currentProfile) {
        const { data: newP } = await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.user_metadata?.full_name || 'Gebruiker'
        }).select().maybeSingle();
        currentProfile = newP;
      }
      setProfile(currentProfile);

      // 2. Lidmaatschap checken
      let { data: memberData } = await supabase
        .from('tenant_members')
        .select('role, tenant_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      // 3. SaaS Onboarding: Als er geen tenant is, maak deze aan (voor Coaches) of koppel (voor Cliënten)
      if (!memberData) {
        const pendingRole = currentUser.user_metadata?.pending_role || 'master_admin';
        const pendingCode = currentUser.user_metadata?.pending_family_code;

        if (pendingRole === 'master_admin' || !pendingCode) {
          // Coach flow: Nieuwe omgeving maken
          const { data: newTenant } = await supabase.from('tenants').insert({
            name: `Praktijk ${currentProfile?.full_name?.split(' ')[0] || 'Budget'}`,
            subscription_tier: 'S',
            max_users: 5
          }).select().maybeSingle();

          if (newTenant) {
            const { data: newM } = await supabase.from('tenant_members').insert({
              tenant_id: newTenant.id,
              user_id: currentUser.id,
              role: 'master_admin'
            }).select().maybeSingle();
            memberData = newM;
          }
        } else if (pendingCode) {
          // Cliënt flow: Koppelen aan coach via code
          const { data: targetTenant } = await supabase.from('tenants').select('id').eq('id', pendingCode).maybeSingle();
          if (targetTenant) {
            const { data: newM } = await supabase.from('tenant_members').insert({
              tenant_id: targetTenant.id,
              user_id: currentUser.id,
              role: 'sub_user'
            }).select().maybeSingle();
            memberData = newM;
          }
        }
      }

      if (memberData) {
        setRole(memberData.role as UserRole);
        const { data: tData } = await supabase.from('tenants').select('*').eq('id', memberData.tenant_id).maybeSingle();
        if (tData) {
          setTenant(tData as Tenant);
          setIsCloudReady(true);
        }
      }
    } catch (error) {
      console.warn("Verbinding met cloud beperkt. Schakelen naar veilige lokale modus.");
      setIsCloudReady(false);
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
    <AuthContext.Provider value={{ session, user, profile, tenant, role, loading, isCloudReady, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);