import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { TenantMember, Profile } from '../types';
import { Users, Crown, Shield } from 'lucide-react';

interface MemberWithProfile extends TenantMember {
  profiles: Profile;
}

export const AdminDashboard = ({ onClose }: { onClose: () => void }) => {
  const { tenant, role } = useAuth();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant) fetchMembers();
  }, [tenant]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select(`
          role,
          user_id,
          profiles ( id, full_name, email )
        `)
        .eq('tenant_id', tenant?.id);
      
      if (error) throw error;
      setMembers(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (role !== 'master_admin') return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-primary" />
            Organisatie Beheer
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Sluiten</button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Subscription Info */}
          <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-semibold text-purple-900 flex items-center">
                 <Crown className="w-5 h-5 mr-2" />
                 Abonnement: Tier {tenant?.subscription_tier}
               </h3>
               <span className="text-xs bg-white px-2 py-1 rounded border border-purple-200 text-purple-700">
                 {members.length} / {tenant?.max_users} Gebruikers actief
               </span>
            </div>
            <div className="w-full bg-white rounded-full h-2 mb-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all" 
                style={{ width: `${(members.length / (tenant?.max_users || 1)) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-purple-700">
              Upgrade naar een hogere tier om meer cliënten of medewerkers toe te voegen.
            </p>
          </div>

          {/* Members List */}
          <h3 className="font-bold text-gray-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-500" />
            Team & Cliënten
          </h3>
          
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-gray-500 font-medium">
                 <tr>
                   <th className="p-3">Naam</th>
                   <th className="p-3">Email</th>
                   <th className="p-3">Rol</th>
                 </tr>
               </thead>
               <tbody>
                 {members.map((m) => (
                   <tr key={m.user_id} className="border-t border-gray-100 hover:bg-gray-50">
                     <td className="p-3 font-medium text-gray-800">{m.profiles.full_name || 'Geen naam'}</td>
                     <td className="p-3 text-gray-600">{m.profiles.email}</td>
                     <td className="p-3">
                       <span className={`px-2 py-1 rounded-full text-xs ${
                         m.role === 'master_admin' ? 'bg-blue-100 text-blue-700' :
                         m.role === 'sub_user' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                       }`}>
                         {m.role}
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">Gebruikers uitnodigen kan binnenkort via email invite.</p>
          </div>
        </div>
      </div>
    </div>
  );
};