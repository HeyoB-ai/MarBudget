import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { TenantMember, Profile } from '../types';
import { Users, Shield, Copy, Check } from 'lucide-react';

interface MemberWithProfile extends TenantMember {
  profiles: Profile;
}

export const AdminDashboard = ({ onClose }: { onClose: () => void }) => {
  const { tenant } = useAuth();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tenant) fetchMembers();
  }, [tenant]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select(`role, user_id, profiles ( id, full_name, email )`)
        .eq('tenant_id', tenant?.id);
      
      if (error) throw error;
      setMembers(data as any);
    } catch (err) {
      console.error(err);
    }
  };

  const copyCode = () => {
    if (tenant?.id) {
      navigator.clipboard.writeText(tenant.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!tenant) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-primary" />
            Huishouden Instellingen
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-medium">Sluiten</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="text-blue-900 font-bold mb-2">Jouw Gezins Code</h3>
            <p className="text-sm text-blue-700 mb-3">
              Deel deze code met je partner of budgetcoach.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-white border border-blue-200 p-3 rounded-lg text-gray-600 font-mono text-center tracking-wider select-all">
                {tenant.id}
              </code>
              <button 
                onClick={copyCode}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg flex items-center transition-colors"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-gray-500" />
              Leden
            </h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
               <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-500 font-medium">
                   <tr>
                     <th className="p-3">Naam</th>
                     <th className="p-3">Rol</th>
                   </tr>
                 </thead>
                 <tbody>
                   {members.map((m) => (
                     <tr key={m.user_id} className="border-t border-gray-100 hover:bg-gray-50">
                       <td className="p-3">
                         <div className="font-medium text-gray-800">{m.profiles?.full_name || 'Onbekend'}</div>
                         <div className="text-xs text-gray-500">{m.profiles?.email}</div>
                       </td>
                       <td className="p-3">
                         <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                           {m.role === 'master_admin' ? 'Beheerder' : 'Gebruiker'}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};