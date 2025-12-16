import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Expense } from '../types';
import { UploadCloud, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LegacySync: React.FC<{ onSyncComplete: () => void }> = ({ onSyncComplete }) => {
  const { tenant, user } = useAuth();
  const [localExpenses, setLocalExpenses] = useState<Expense[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('marbudget_expenses');
    if (data) {
      setLocalExpenses(JSON.parse(data));
    }
  }, []);

  const handleSync = async () => {
    if (!tenant || !user || localExpenses.length === 0) return;

    setSyncing(true);
    try {
      // Prepare data for Supabase
      const payload = localExpenses.map(exp => ({
        tenant_id: tenant.id,
        user_id: user.id,
        amount: exp.amount,
        description: exp.description,
        category: exp.category,
        date: exp.date,
        receipt_image: exp.receiptImage 
      }));

      // Insert into DB
      const { error } = await supabase.from('expenses').insert(payload);

      if (error) throw error;

      // Clean up local storage logic
      // We rename it instead of delete, just to be safe for rollback
      localStorage.setItem('marbudget_expenses_backup_v1', JSON.stringify(localExpenses));
      localStorage.removeItem('marbudget_expenses');
      
      // Also migrate budget settings if needed
      // For now we assume budget settings are re-configured in the new DB logic, or we migrate them similarly
      
      setSynced(true);
      setTimeout(onSyncComplete, 2000); // Wait a bit then close

    } catch (err: any) {
      alert(`Fout bij syncen: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSkip = () => {
    // Just hide the prompt
    onSyncComplete();
  };

  if (localExpenses.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full text-center">
        <div className="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          {synced ? <CheckCircle className="text-green-500 w-8 h-8" /> : <UploadCloud className="text-primary w-8 h-8" />}
        </div>
        
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {synced ? 'Synchronisatie Voltooid!' : 'Lokale Gegevens Gevonden'}
        </h2>
        
        <p className="text-gray-600 mb-6 text-sm">
          {synced 
            ? 'Je oude bonnetjes staan nu veilig in de cloud.' 
            : `We hebben ${localExpenses.length} bonnetjes gevonden op dit apparaat. Wil je deze uploaden naar je nieuwe account?`}
        </p>

        {!synced && (
          <div className="space-y-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-secondary transition disabled:opacity-50"
            >
              {syncing ? 'Bezig met uploaden...' : 'Ja, synchroniseer nu'}
            </button>
            <button
              onClick={handleSkip}
              disabled={syncing}
              className="w-full text-gray-500 py-2 text-sm hover:text-gray-700"
            >
              Overslaan (Gegevens blijven lokaal)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};