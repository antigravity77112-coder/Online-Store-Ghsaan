import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Users,
  ShieldBan,
  ShieldCheck,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react';
import {
  AdminToolbar,
  AdminSearch,
  AdminCard,
  AdminEmptyState,
  AdminLoading,
  AdminGhostButton,
  AdminFadeIn,
  OptionPicker,
} from './AdminUI';

const AdminUsersTab = ({ users, usersLoading, handleBlockUser, handleChangeRole, handleDeleteUser }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    return users.filter(u => 
      !searchQuery.trim() || 
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.phoneNumber?.includes(searchQuery)
    );
  }, [users, searchQuery]);

  const handleExportExcel = async () => {
    if (filteredUsers.length === 0) return;

    const XLSX = await import('xlsx');
    
    const exportData = filteredUsers.map(user => ({
      'المعرف': user.id,
      'الاسم': user.fullName,
      'رقم الهاتف': user.phoneNumber,
      'البريد الإلكتروني': user.email,
      'المدينة': user.city || '',
      'العنوان التفصيلي': user.address || '',
      'رابط الخريطة': user.locationUrl || '',
      'الدور': user.role,
      'تاريخ التسجيل': new Date(user.createdAt).toLocaleDateString("ar-EG"),
      'الحالة': user.isBlocked ? 'محظور' : 'نشط',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المستخدمين");
    XLSX.writeFile(wb, `users_export_${new Date().toLocaleDateString("en-US")}.xlsx`);
  };

  const getRoleBadge = (role) => {
    const styles = {
      Admin: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
      Buyer: "bg-bone text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
    };
    const labels = { Admin: "مسؤول", Buyer: "مشتري" };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${styles[role] || styles.Buyer}`}>{labels[role] || role}</span>;
  };

  const roleOptions = ['Buyer', 'Admin'];
  const roleLabels = { Buyer: 'مشتري', Admin: 'مسؤول' };

  return (
    <div>
      <AdminToolbar
        title="إدارة المستخدمين"
        subtitle={`${filteredUsers.length} مستخدم`}
        icon={Users}
        actions={
          <AdminGhostButton onClick={handleExportExcel}>
            <Download className="w-4 h-4" />
            تصدير Excel
          </AdminGhostButton>
        }
      >
        <AdminSearch
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو رقم الهاتف..."
        />
      </AdminToolbar>

      {usersLoading ? (
        <AdminLoading label="جاري تحميل المستخدمين..." />
      ) : users.length === 0 ? (
        <AdminEmptyState icon={Users} title="لا يوجد مستخدمين" description="لم يتم تسجيل أي مستخدمين بعد." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map((u, i) => (
              <AdminFadeIn key={u.id} delay={i * 0.02}>
              <AdminCard className="!p-5 hover:shadow-lg hover:shadow-gold-500/5 transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center text-gold-600 font-bold text-lg dark:bg-gold-900/30 dark:text-gold-400">
                    {u.fullName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate dark:text-white">{u.fullName}</h3>
                    <p className="text-xs text-slate-500 truncate" dir="ltr">{u.phoneNumber}</p>
                  </div>
                  {getRoleBadge(u.role)}
                </div>
                
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">تغيير الدور</p>
                  <OptionPicker
                    value={roleLabels[u.role] || u.role}
                    onChange={(label) => {
                      const role = Object.entries(roleLabels).find(([, l]) => l === label)?.[0];
                      if (role) handleChangeRole(u.id, role);
                    }}
                    options={roleOptions.map((r) => roleLabels[r])}
                    required
                    size="sm"
                  />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleBlockUser(u.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${u.isBlocked ? 'text-emerald-600 bg-emerald-500/10' : 'text-orange-600 bg-orange-500/10'}`}>
                      {u.isBlocked ? <><ShieldCheck className="w-3.5 h-3.5" /> فك الحظر</> : <><ShieldBan className="w-3.5 h-3.5" /> حظر</>}
                    </button>
                    <button type="button" onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </AdminCard>
              </AdminFadeIn>
            ))}
        </div>
      )}
    </div>
  );
};

export default AdminUsersTab;
