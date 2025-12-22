import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { TenantMember, Profile } from '../types';
import { Users, Shield, Copy, Check, ExternalLink, FileSpreadsheet, Info, UserCheck } from 'lucide-react';

interface MemberWithProfile extends TenantMember {
  profiles: Profile;
}

export const AdminDashboard = ({ onClose }: { onClose: () => void }) => {
  const { tenant, role } = useAuth();
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

  const isCoach = role === 'master_admin';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 animate-fade-in">
        
        {/* Header */}
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center">
              <Shield className="w-6 h-6 mr-3 text-primary" />
              Controlecentrum
            </h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Beheer van jouw MarBudget omgeving</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white shadow-sm border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-800 transition-all active:scale-95 font-bold text-xs uppercase tracking-widest">Sluiten</button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 flex-1">
          
          {/* Gezins/Coach Code Kaart */}
          <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em] mb-4">Unieke Koppeling Code</h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Deel deze code met cliënten of gezinsleden. Zodra zij zich aanmelden met deze code, verschijnen hun uitgaven automatisch in dit dashboard.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border-2 border-primary/10 p-4 rounded-2xl text-gray-700 font-mono text-center font-bold tracking-wider shadow-inner truncate">
                  {tenant.id}
                </div>
                <button 
                  onClick={copyCode}
                  className="bg-primary hover:bg-secondary text-white px-6 rounded-2xl flex items-center transition-all shadow-lg active:scale-95"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                  <span className="ml-2 font-bold text-xs uppercase tracking-widest hidden sm:inline">Kopieer</span>
                </button>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 text-primary/5 rotate-12">
              <Shield size={160} />
            </div>
          </div>

          {/* Coach Tools (alleen voor admin) */}
          {isCoach && (
            <div className="space-y-4">
              <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] ml-2">Coach Hulpmiddelen</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a 
                  href="https://docs.google.com/spreadsheets/d/1YourTemplateID/copy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-green-50 border border-green-100 p-6 rounded-[2rem] hover:bg-green-100 transition-all group"
                >
                  <FileSpreadsheet className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-gray-800 text-sm mb-1">Google Sheet Template</h4>
                  <p className="text-[10px] text-green-700 font-medium">Maak een kopie van de MarBudget export-sheet.</p>
                </a>
                <div className="bg-gray-50 border border-gray-100 p-6 rounded-[2rem]">
                  <Info className="w-8 h-8 text-gray-400 mb-3" />
                  <h4 className="font-bold text-gray-800 text-sm mb-1">Data Veiligheid</h4>
                  <p className="text-[10px] text-gray-500 font-medium">Alle data is versleuteld en alleen toegankelijk voor jouw team.</p>
                </div>
              </div>
            </div>
          )}

          {/* Leden Lijst */}
          <div className="space-y-4">
            <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] ml-2">Team & Cliënten</h3>
            <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-widest">
                     <tr>
                       <th className="p-5">Naam / Status</th>
                       <th className="p-5">Rol</th>
                       <th className="p-5 text-right">Actie</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {members.map((m) => (
                       <tr key={m.user_id} className="group hover:bg-gray-50/50 transition-colors">
                         <td className="p-5">
                           <div className="flex items-center">
                             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold mr-4 group-hover:bg-primary group-hover:text-white transition-all">
                               {m.profiles?.full_name?.charAt(0) || '?'}
                             </div>
                             <div>
                               <div className="font-bold text-gray-800 text-sm leading-tight">{m.profiles?.full_name || 'Onbekend'}</div>
                               <div className="text-[10px] text-gray-400 font-medium">{m.profiles?.email}</div>
                             </div>
                           </div>
                         </td>
                         <td className="p-5">
                           <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${m.role === 'master_admin' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                             {m.role === 'master_admin' ? 'Beheerder' : 'Cliënt'}
                           </span>
                         </td>
                         <td className="p-5 text-right">
                            <button className="text-gray-300 hover:text-primary transition-colors">
                              <UserCheck size={18} />
                            </button>
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
    </div>
  );
};