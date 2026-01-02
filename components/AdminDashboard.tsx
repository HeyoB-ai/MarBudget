
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { TenantMember, Profile, Expense } from '../types';
import { Users, Shield, Copy, Check, ExternalLink, FileSpreadsheet, Info, UserCheck, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../constants';
import { translations } from '../App';

interface MemberWithProfile extends TenantMember {
  profiles: Profile;
  stats?: {
    totalSpent: number;
    totalBudget: number;
    percent: number;
  };
}

export const AdminDashboard = ({ lang, onClose }: { lang: 'nl' | 'es', onClose: () => void }) => {
  const { tenant, role } = useAuth();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const t = translations[lang].admin;

  useEffect(() => {
    if (tenant) fetchMembersAndStats();
  }, [tenant]);

  const fetchMembersAndStats = async () => {
    setLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('tenant_members')
        .select(`role, user_id, profiles ( id, full_name, email )`)
        .eq('tenant_id', tenant?.id);
      
      if (memberError) throw memberError;

      const { data: budgetData } = await supabase.from('budgets').select('limit_amount').eq('tenant_id', tenant?.id);
      const totalBudget = budgetData?.reduce((sum, b) => sum + Number(b.limit_amount), 0) || 0;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      const { data: expenseData } = await supabase
        .from('expenses')
        .select('user_id, amount')
        .eq('tenant_id', tenant?.id)
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      const enrichedMembers = (memberData as any).map((m: any) => {
        const userExpenses = expenseData?.filter(e => e.user_id === m.user_id) || [];
        const spent = userExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        return {
          ...m,
          stats: {
            totalSpent: spent,
            totalBudget: totalBudget,
            percent: totalBudget > 0 ? (spent / totalBudget) * 100 : 0
          }
        };
      });

      setMembers(enrichedMembers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center">
              <Users className="w-6 h-6 mr-3 text-primary" />
              {t.title}
            </h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">{t.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white shadow-sm border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-800 transition-all active:scale-95 font-bold text-xs uppercase tracking-widest">{t.close}</button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 flex-1">
          
          <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 relative overflow-hidden shadow-inner">
            <div className="relative z-10">
              <h3 className="text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-4">{t.codeTitle}</h3>
              <p className="text-xs text-gray-600 mb-6 leading-relaxed font-medium">
                {t.codeDesc}
              </p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border border-primary/10 p-4 rounded-2xl text-gray-700 font-mono text-center font-bold tracking-wider shadow-sm truncate">
                  {tenant.id}
                </div>
                <button 
                  onClick={copyCode}
                  className="bg-primary hover:bg-secondary text-white px-6 rounded-2xl flex items-center transition-all shadow-lg active:scale-95"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  <span className="ml-2 font-black text-[10px] uppercase tracking-widest hidden sm:inline">{copied ? t.copied : t.copy}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">{t.currentClients}</h3>
              <button 
                onClick={fetchMembersAndStats} 
                className="text-primary p-2 hover:bg-primary/5 rounded-full transition-all"
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            
            <div className="grid gap-4">
              {members.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">{t.noClients}</div>
              ) : members.map((m) => (
                <div key={m.user_id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black text-lg mr-4 border border-primary/5">
                        {m.profiles?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-base leading-tight">{m.profiles?.full_name || '...'}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{m.profiles?.email}</div>
                      </div>
                    </div>
                    {m.role === 'master_admin' && (
                      <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Coach</span>
                    )}
                  </div>

                  {m.stats && (
                    <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      <div className="flex justify-between text-[11px] font-bold text-gray-600">
                        <span>{t.spentMonth}</span>
                        <span className={m.stats.percent > 90 ? 'text-red-500' : 'text-gray-900'}>
                          {formatCurrency(m.stats.totalSpent, lang)}
                        </span>
                      </div>
                      
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${m.stats.percent > 100 ? 'bg-red-500' : m.stats.percent > 85 ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min(m.stats.percent, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-400">
                        <span>{Math.round(m.stats.percent)}% {t.ofBudget}</span>
                        {m.stats.percent > 100 && (
                          <div className="flex items-center text-red-500">
                            <AlertTriangle size={10} className="mr-1" /> {t.overLimit}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isCoach && (
            <div className="space-y-4 mt-4">
              <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] ml-2">{t.tools}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50/50 border border-green-100 p-5 rounded-[2rem] hover:bg-green-50 transition-all flex flex-col items-center text-center">
                  <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                  <h4 className="font-bold text-gray-800 text-[10px] uppercase tracking-widest mb-1">{t.sheetOverview}</h4>
                  <p className="text-[9px] text-green-700 font-medium">{t.sheetSub}</p>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-[2rem] flex flex-col items-center text-center">
                  <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="font-bold text-gray-800 text-[10px] uppercase tracking-widest mb-1">{t.analysis}</h4>
                  <p className="text-[9px] text-blue-700 font-medium">{t.analysisSub}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
