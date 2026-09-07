import React, { useState } from 'react';
import { AdminToolbar, AdminCard } from './AdminUI';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { downloadDatabaseBackup, restoreDatabaseBackup } from '../../services/api';

const AdminStoreInfoTab = () => {
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [backupError, setBackupError] = useState('');

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [restoreConfirmationText, setRestoreConfirmationText] = useState('');
  const [restoreFile, setRestoreFile] = useState(null);

  const handleBackup = async () => {
    setIsDownloadingBackup(true);
    setBackupError('');
    try {
      const blob = await downloadDatabaseBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gisaah_backup_${new Date().toISOString().split('T')[0]}.json.gz`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setShowBackupModal(false);
    } catch (err) {
      setBackupError(err.message || 'فشل تحميل النسخة الاحتياطية');
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreFile(file);
    setShowRestoreModal(true);
    setRestoreConfirmationText('');
    setRestoreError('');
    setRestoreSuccess('');
    e.target.value = null;
  };

  const handleRestore = async () => {
    if (restoreConfirmationText !== 'RESTORE DATABASE') return;
    if (!restoreFile) return;

    setIsRestoring(true);
    setRestoreError('');
    setRestoreSuccess('');

    try {
      const res = await restoreDatabaseBackup(restoreFile);
      setRestoreSuccess(res.message || 'تم استعادة قاعدة البيانات بنجاح');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setRestoreError(err.message || 'حدث خطأ أثناء الاستعادة');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <AdminToolbar
        title="نسخ احتياطي"
        subtitle="تصدير واستعادة بيانات المتجر. الملف مضغوط وليس مشفراً. لكارثة حذف قاعدة البيانات استخدم أيضاً pg_dump."
        icon={Database}
      />

      <AdminCard>
        <div className="p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">تحميل نسخة احتياطية محلية</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                تصدير كامل لبيانات المتجر (كتالوج، طلبات، مستخدمين، أسعار الصرف) كملف مضغوط .json.gz — ليس مشفراً. احفظه خارج المتصفح (سحابة/حاسوب). لاستعادة قاعدة محذوفة بالكامل يُفضّل أيضاً pg_dump (راجع backend/docs/BACKUP_AND_RESTORE.md).
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowBackupModal(true)}
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              تنزيل
            </button>
            <div className="relative w-full sm:w-auto">
              <input
                type="file"
                accept=".json.gz,.gz"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="استعادة نسخة احتياطية"
              />
              <button
                type="button"
                className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-all shadow-sm border border-red-200 dark:border-red-800/30"
              >
                <Upload className="w-4 h-4" />
                استعادة
              </button>
            </div>
          </div>
        </div>
      </AdminCard>

      <AnimatePresence>
        {showBackupModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !isDownloadingBackup && setShowBackupModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/30">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">تأكيد التنزيل</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  سيتم تحميل نسخة احتياطية كاملة لجميع بيانات المتجر. هذه العملية تسجل في السجلات الأمنية لضمان الخصوصية.
                  <br /><br />
                  هل أنت متأكد من رغبتك في تحميل النسخة الاحتياطية؟
                </p>
                {backupError && (
                  <div className="mt-4 text-sm text-red-600 bg-red-100 px-3 py-2 rounded-lg w-full">
                    {backupError}
                  </div>
                )}
              </div>
              <div className="p-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={isDownloadingBackup}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDownloadingBackup ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  تأكيد التحميل
                </button>
                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  disabled={isDownloadingBackup}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRestoreModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !isRestoring && setShowRestoreModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-red-200 dark:border-red-900">
              <div className="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900/30">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">تحذير: مسح واستعادة البيانات</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  سيتم مسح <strong>جميع البيانات الحالية</strong> واستبدالها ببيانات الملف المرفوع:
                  <br /><span className="font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded text-red-600 dark:text-red-400 mt-2 inline-block border border-red-100 dark:border-red-900/50">{restoreFile?.name}</span>
                </p>
                <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs p-3 rounded-lg text-right w-full">
                  <ul className="list-disc list-inside space-y-1">
                    <li>يتم عمل نسخة احتياطية تلقائية قبل البدء.</li>
                    <li>تتم الاستعادة داخل معاملة واحدة (إما أن تنجح بالكامل أو تتراجع بالكامل).</li>
                    <li>سيتم الحفاظ على سجلات النشاطات الأمنية.</li>
                  </ul>
                </div>
              </div>
              <div className="p-6">
                {!restoreSuccess ? (
                  <>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      لتأكيد الاستعادة، يرجى كتابة <span className="text-red-600 dark:text-red-400 font-mono select-all">RESTORE DATABASE</span> أدناه:
                    </label>
                    <input
                      type="text"
                      value={restoreConfirmationText}
                      onChange={(e) => setRestoreConfirmationText(e.target.value)}
                      placeholder="RESTORE DATABASE"
                      dir="ltr"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/50 text-slate-900 dark:text-white text-center font-mono font-bold uppercase mb-4"
                      disabled={isRestoring}
                    />

                    {restoreError && (
                      <div className="mb-4 text-sm text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800">
                        {restoreError}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleRestore}
                        disabled={isRestoring || restoreConfirmationText !== 'RESTORE DATABASE'}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRestoring ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> جاري الاستعادة...</>
                        ) : (
                          <><Upload className="w-5 h-5" /> تأكيد الاستعادة</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRestoreModal(false)}
                        disabled={isRestoring}
                        className="py-3 px-6 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                      >
                        إلغاء
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{restoreSuccess}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">سيتم إعادة تحميل الصفحة لتطبيق التغييرات...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminStoreInfoTab;
