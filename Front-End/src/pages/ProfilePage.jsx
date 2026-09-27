import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  User,
  Mail,
  MapPin,
  Loader2,
  Check,
  AlertCircle,
  Save,
  Lock,
  Key,
  Phone,
  Package,
  Heart,
  Sparkles,
  Shield,
  Settings,
  ChevronLeft,
  ExternalLink,
  Crown,
  Moon,
  Sun,
  Trash2,
} from 'lucide-react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { DISPLAY_CURRENCIES } from '../utils/currency';
import * as api from '../services/api';

const cities = ['صنعاء', 'عدن', 'تعز', 'إب', 'المكلا', 'الحديدة', 'ذمار', 'حجة', 'صعدة', 'مأرب'];

const roleConfig = {
  Admin: { labelKey: 'profile.roleAdmin', color: 'from-violet-500 to-purple-600', dot: 'bg-violet-400', icon: Crown },
  Buyer: { labelKey: 'profile.roleBuyer', color: 'from-emerald-500 to-teal-600', dot: 'bg-emerald-400', icon: User },
};

const inputClass =
  'w-full pr-12 pl-4 py-3.5 rounded-xl bg-bone/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 focus:bg-white dark:focus:bg-slate-800 transition-all';

function FancyCard({ children, className = '' }) {
  return (
    <div className={`relative rounded-3xl p-[1px] bg-gradient-to-br from-gold-400/40 via-gold-600/15 to-slate-300/30 dark:from-gold-400/50 dark:via-gold-600/20 dark:to-white/10 shadow-xl shadow-slate-900/5 dark:shadow-black/30 ${className}`}>
      <div className="rounded-[23px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-white/[0.06] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div className="mb-2">
      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{children}</label>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function ProfileInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative group">
      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
        <Icon className="w-5 h-5 text-slate-400 group-focus-within:text-gold-500 transition-colors" />
      </div>
      <input className={`${inputClass} ${className}`.trim()} {...props} />
    </div>
  );
}

function AlertBanner({ type, message }) {
  const styles =
    type === 'error'
      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
      : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-center gap-2 border text-sm font-medium px-4 py-3 rounded-xl ${styles}`}
    >
      {type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
      <span>{message}</span>
    </motion.div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ProfilePage = () => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLocale();
  const { preferredCurrency, setPreferredCurrency } = useCurrency();
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, loading: authLoading, checkAuthStatus, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('profile');
  const [form, setForm] = useState({ fullName: '', email: '', city: '', address: '', locationUrl: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const role = roleConfig[user?.role] || roleConfig.Buyer;
  const RoleIcon = role.icon;

  const sections = useMemo(() => ([
    { id: 'profile', label: t('profile.personalInfo'), icon: User },
    { id: 'settings', label: t('settings.title'), icon: Settings },
    { id: 'security', label: t('profile.security'), icon: Shield },
  ]), [t]);

  const handleLanguageChange = async (locale) => {
    await changeLanguage(locale, { persist: true, syncBackend: true });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/auth', { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const profile = await api.getProfile();
        if (mounted) {
          setForm({
            fullName: profile.fullName || '',
            email: profile.email || '',
            city: profile.city || '',
            address: profile.address || '',
            locationUrl: profile.locationUrl || '',
          });
        }
      } catch {
        if (mounted && user) {
          setForm({
            fullName: user.fullName || '',
            email: user.email || '',
            city: user.city || '',
            address: user.address || '',
            locationUrl: user.locationUrl || '',
          });
        }
      }
      if (mounted) setLoading(false);
    }
    if (isAuthenticated) loadProfile();
    return () => { mounted = false; };
  }, [isAuthenticated, user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSaved(false);
  };

  const handleCurrencyChange = (curr) => {
    setPreferredCurrency(curr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.updateProfile({
        userId: user?.id || '',
        fullName: form.fullName,
        email: form.email || '',
        city: form.city,
        address: form.address || '',
        locationUrl: form.locationUrl || null,
      });
      await checkAuthStatus();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  const handlePwdChange = (e) => {
    setPwdForm({ ...pwdForm, [e.target.name]: e.target.value });
    setPwdError('');
    setPwdSaved(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setPwdError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setPwdSaving(true);
    setPwdError('');
    setPwdSaved(false);
    try {
      await api.changePassword(pwdForm.currentPassword, pwdForm.newPassword);
      setPwdSaved(true);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwdSaved(false), 3000);
    } catch (err) {
      setPwdError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setPwdSaving(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    const confirmOk =
      deleteConfirmation === 'DELETE' || deleteConfirmation === 'حذف';
    if (!confirmOk) {
      setDeleteError(t('profile.deleteConfirmInvalid'));
      return;
    }
    if (!deletePassword) {
      setDeleteError(t('profile.deletePasswordRequired'));
      return;
    }
    setDeleteSaving(true);
    setDeleteError('');
    try {
      await deleteAccount(deletePassword, deleteConfirmation);
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err.message || t('profile.deleteFailed'));
    } finally {
      setDeleteSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <SEO title="الملف الشخصي" noIndex />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gold-500/20 blur-xl animate-pulse" />
            <Loader2 className="relative w-12 h-12 text-gold-500 animate-spin" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">جاري تحميل ملفك الشخصي...</p>
        </div>
      </Layout>
    );
  }

  const quickActions = [
    { to: '/my-orders', icon: Package, label: 'طلباتي', desc: 'تتبع مشترياتك', color: 'from-gold-500/20 to-amber-500/10 border-gold-500/30' },
    { to: '/favorites', icon: Heart, label: 'المفضلة', desc: 'منتجاتك المحفوظة', color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30' },
  ];

  return (
    <Layout>
      <SEO title="الملف الشخصي" noIndex />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-[#1a1408] via-[#0f0f0f] to-[#080808] dark:from-[#1a1408] dark:via-[#0d0d0d] dark:to-[#050505]" />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-gold-500/25 blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full bg-amber-700/20 blur-[90px]"
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-28 sm:pb-32">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 opacity-80 blur-sm" />
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-2xl shadow-gold-500/30">
                {getInitials(form.fullName || user?.fullName)}
              </div>
              <div className={`absolute -bottom-2 -left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-l ${role.color} text-white text-[10px] font-bold shadow-lg`}>
                <RoleIcon className="w-3 h-3" />
                {t(role.labelKey)}
              </div>
            </div>

            <div className="flex-1 min-w-0 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span className="text-xs font-bold text-gold-300">عضو Smart Shopper</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight truncate">
                {form.fullName || user?.fullName || 'حسابي'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-slate-400">
                {user?.phoneNumber && (
                  <span className="inline-flex items-center gap-1.5" dir="ltr">
                    <Phone className="w-4 h-4 text-gold-500/80" />
                    {user.phoneNumber}
                  </span>
                )}
                {form.city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gold-500/80" />
                    {form.city}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-20 pb-16 relative z-10">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          {quickActions.map(({ to, icon: Icon, label, desc, color }, i) => (
            <motion.div key={to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Link
                to={to}
                className={`group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${color} border backdrop-blur-sm bg-white dark:bg-slate-900/80 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-black/5`}
              >
                <div className="w-11 h-11 rounded-xl bg-white/80 dark:bg-slate-800/80 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <Icon className="w-5 h-5 text-gold-600 dark:text-gold-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">{desc}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 mr-auto shrink-0 group-hover:text-gold-500 transition-colors" />
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-6">
          {/* Sidebar nav */}
          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex flex-col gap-1.5 p-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-xl shadow-lg h-fit sticky top-24"
          >
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  activeSection === id ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {activeSection === id && (
                  <motion.div
                    layoutId="profileNav"
                    className="absolute inset-0 bg-gradient-to-l from-gold-400 to-gold-500 rounded-xl shadow-md shadow-gold-500/25"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={`relative z-10 w-4 h-4 ${activeSection === id ? 'text-slate-900' : ''}`} />
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </motion.nav>

          {/* Mobile tabs */}
          <div className="lg:hidden flex p-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 mb-5 overflow-x-auto">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`relative flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap ${
                  activeSection === id ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {activeSection === id && (
                  <motion.div
                    layoutId="profileNavMobile"
                    className="absolute inset-0 bg-gradient-to-l from-gold-400 to-gold-500 rounded-xl shadow-md shadow-gold-500/25"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 w-3.5 h-3.5" />
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>

          {/* Section content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {activeSection === 'profile' && (
                <FancyCard>
                  <form onSubmit={handleSubmit}>
                    <div className="px-6 sm:px-8 pt-7 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">البيانات الشخصية</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">حدّث معلوماتك لتسهيل التوصيل</p>
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                      <div>
                        <FieldLabel>الاسم الكامل</FieldLabel>
                        <ProfileInput icon={User} type="text" name="fullName" value={form.fullName} onChange={handleChange} required placeholder="أدخل اسمك الكامل" />
                      </div>

                      <div>
                        <FieldLabel hint="البريد الإلكتروني لا يمكن تغييره">البريد الإلكتروني</FieldLabel>
                        <ProfileInput icon={Mail} type="email" value={user?.email || ''} readOnly dir="ltr" className="cursor-not-allowed opacity-70 text-left" />
                      </div>

                      <div>
                        <FieldLabel>المدينة</FieldLabel>
                        <div className="relative group">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <MapPin className="w-5 h-5 text-slate-400 group-focus-within:text-gold-500 transition-colors" />
                          </div>
                          <select
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                            required
                            className={`${inputClass} appearance-none cursor-pointer`}
                          >
                            <option value="" disabled>اختر مدينتك</option>
                            {cities.map((city) => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <FieldLabel>العنوان التفصيلي</FieldLabel>
                        <div className="relative group">
                          <div className="absolute top-3.5 right-0 pr-4 pointer-events-none">
                            <MapPin className="w-5 h-5 text-slate-400 group-focus-within:text-gold-500 transition-colors" />
                          </div>
                          <textarea
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            rows={2}
                            className={`${inputClass} resize-none`}
                            placeholder="الحي، الشارع، أمام مدرسة ..."
                          />
                        </div>
                      </div>

                      <div>
                        <FieldLabel hint="اختياري — يساعد فريق التوصيل">رابط خريطة Google</FieldLabel>
                        <ProfileInput
                          icon={MapPin}
                          type="url"
                          name="locationUrl"
                          value={form.locationUrl}
                          onChange={handleChange}
                          dir="ltr"
                          placeholder="https://maps.google.com/..."
                          className="text-left"
                        />
                        {form.locationUrl && (
                          <a
                            href={form.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-gold-600 dark:text-gold-400 hover:text-gold-500 font-semibold mt-2 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            عرض الموقع على الخريطة
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="px-6 sm:px-8 pb-7 space-y-4">
                      <AnimatePresence>
                        {error && <AlertBanner type="error" message={error} />}
                        {saved && <AlertBanner type="success" message="تم حفظ التغييرات بنجاح" />}
                      </AnimatePresence>
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-base text-white bg-gradient-to-l from-gold-600 via-gold-500 to-gold-700 hover:from-gold-500 hover:via-gold-600 hover:to-gold-800 focus:outline-none focus:ring-4 focus:ring-gold-500/30 shadow-lg shadow-gold-600/20 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                      >
                        {saving ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> جاري الحفظ...</>
                        ) : (
                          <><Save className="w-5 h-5" /> حفظ التغييرات</>
                        )}
                      </button>
                    </div>
                  </form>
                </FancyCard>
              )}

              {activeSection === 'settings' && (
                <FancyCard>
                  <div className="px-6 sm:px-8 pt-7 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">{t('settings.title')}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('settings.subtitle')}</p>
                  </div>

                  <div className="p-6 sm:p-8 space-y-8">
                    <div>
                      <FieldLabel hint={t('settings.languageHint')}>{t('settings.language')}</FieldLabel>
                      <div className="grid grid-cols-2 gap-3" role="group" aria-label={t('settings.language')}>
                        {[
                          { id: 'ar', label: t('settings.languageArabic') },
                          { id: 'en', label: t('settings.languageEnglish') },
                        ].map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleLanguageChange(id)}
                            className={`relative flex flex-col items-center gap-2 py-5 rounded-2xl border-2 text-sm font-bold transition-all ${
                              language === id
                                ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/25 text-gold-700 dark:text-gold-300 shadow-md shadow-gold-500/10'
                                : 'border-slate-200 dark:border-slate-700 bg-bone/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-gold-300 dark:hover:border-gold-600/50'
                            }`}
                            aria-pressed={language === id}
                          >
                            {language === id && (
                              <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <FieldLabel>{t('settings.appearance')}</FieldLabel>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-bone/50 dark:bg-slate-800/50 hover:border-gold-300 dark:hover:border-gold-600/50 transition-all"
                        aria-pressed={isDark}
                      >
                        <span className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                          {isDark ? (
                            <Sun className="w-5 h-5 text-gold-500" aria-hidden="true" />
                          ) : (
                            <Moon className="w-5 h-5 text-slate-500" aria-hidden="true" />
                          )}
                          {t('settings.darkMode')}
                        </span>
                        <span
                          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                            isDark ? 'bg-gold-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                          aria-hidden="true"
                        >
                          <span
                            className={`absolute top-0.5 start-0.5 h-6 w-6 rounded-full bg-white shadow transition-[inset-inline-start] duration-200 ${
                              isDark ? 'start-[1.375rem]' : 'start-0.5'
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    <div>
                      <FieldLabel hint={t('settings.currencyHint')}>{t('settings.currency')}</FieldLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {DISPLAY_CURRENCIES.map(({ id, labelKey }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleCurrencyChange(id)}
                            className={`relative flex flex-col items-center gap-2 py-5 rounded-2xl border-2 text-sm font-bold transition-all ${
                              preferredCurrency === id
                                ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/25 text-gold-700 dark:text-gold-300 shadow-md shadow-gold-500/10'
                                : 'border-slate-200 dark:border-slate-700 bg-bone/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-gold-300 dark:hover:border-gold-600/50'
                            }`}
                            aria-pressed={preferredCurrency === id}
                          >
                            {preferredCurrency === id && (
                              <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {t(labelKey)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <FieldLabel>{t('settings.accountType')}</FieldLabel>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-bone/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center shadow-lg`}>
                          <RoleIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t(role.labelKey)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {user?.role === 'Admin' ? t('settings.adminDesc') : t('settings.buyerDesc')}
                          </p>
                        </div>
                        <span className={`mr-auto w-2.5 h-2.5 rounded-full ${role.dot} animate-pulse`} />
                      </div>
                    </div>
                  </div>
                </FancyCard>
              )}

              {activeSection === 'security' && (
                <FancyCard>
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="px-6 sm:px-8 pt-7 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">الأمان</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">غيّر كلمة المرور لحماية حسابك</p>
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                        <Shield className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          استخدم كلمة مرور قوية تحتوي على 6 أحرف على الأقل. لا تشارك كلمة المرور مع أي شخص.
                        </p>
                      </div>

                      <div>
                        <FieldLabel>كلمة المرور الحالية</FieldLabel>
                        <ProfileInput icon={Lock} type="password" name="currentPassword" value={pwdForm.currentPassword} onChange={handlePwdChange} required dir="ltr" placeholder="••••••••" className="text-left" />
                      </div>
                      <div>
                        <FieldLabel>كلمة المرور الجديدة</FieldLabel>
                        <ProfileInput icon={Key} type="password" name="newPassword" value={pwdForm.newPassword} onChange={handlePwdChange} required dir="ltr" placeholder="••••••••" className="text-left" />
                      </div>
                      <div>
                        <FieldLabel>تأكيد كلمة المرور الجديدة</FieldLabel>
                        <ProfileInput icon={Check} type="password" name="confirmPassword" value={pwdForm.confirmPassword} onChange={handlePwdChange} required dir="ltr" placeholder="••••••••" className="text-left" />
                      </div>
                    </div>

                    <div className="px-6 sm:px-8 pb-7 space-y-4">
                      <AnimatePresence>
                        {pwdError && <AlertBanner type="error" message={pwdError} />}
                        {pwdSaved && <AlertBanner type="success" message="تم تغيير كلمة المرور بنجاح" />}
                      </AnimatePresence>
                      <button
                        type="submit"
                        disabled={pwdSaving}
                        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-base text-white bg-gradient-to-l from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 hover:from-slate-700 hover:to-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-500/30 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                      >
                        {pwdSaving ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> جاري التحديث...</>
                        ) : (
                          <><Key className="w-5 h-5" /> تحديث كلمة المرور</>
                        )}
                      </button>
                    </div>
                  </form>

                  {user?.role !== 'Admin' && (
                    <div className="border-t border-red-200/80 dark:border-red-900/40 px-6 sm:px-8 py-7 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-red-700 dark:text-red-400">
                            {t('profile.deleteAccount')}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {t('profile.deleteAccountHint')}
                          </p>
                        </div>
                      </div>

                      {!showDeletePanel ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeletePanel(true);
                            setDeleteError('');
                            setDeletePassword('');
                            setDeleteConfirmation('');
                          }}
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t('profile.deleteAccountCta')}
                        </button>
                      ) : (
                        <form onSubmit={handleDeleteAccount} className="space-y-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 p-4">
                          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                            {t('profile.deleteAccountConfirmText')}
                          </p>
                          <div>
                            <FieldLabel>{t('profile.deleteConfirmLabel')}</FieldLabel>
                            <ProfileInput
                              icon={AlertCircle}
                              type="text"
                              value={deleteConfirmation}
                              onChange={(e) => {
                                setDeleteConfirmation(e.target.value);
                                setDeleteError('');
                              }}
                              placeholder="DELETE"
                              dir="ltr"
                              className="text-left"
                              autoComplete="off"
                              required
                            />
                          </div>
                          <div>
                            <FieldLabel>{t('profile.password')}</FieldLabel>
                            <ProfileInput
                              icon={Lock}
                              type="password"
                              value={deletePassword}
                              onChange={(e) => {
                                setDeletePassword(e.target.value);
                                setDeleteError('');
                              }}
                              placeholder="••••••••"
                              dir="ltr"
                              className="text-left"
                              autoComplete="current-password"
                              required
                            />
                          </div>
                          <AnimatePresence>
                            {deleteError && <AlertBanner type="error" message={deleteError} />}
                          </AnimatePresence>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              disabled={deleteSaving}
                              onClick={() => {
                                setShowDeletePanel(false);
                                setDeleteError('');
                                setDeletePassword('');
                                setDeleteConfirmation('');
                              }}
                              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                            >
                              {t('profile.cancel')}
                            </button>
                            <button
                              type="submit"
                              disabled={deleteSaving}
                              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-60 transition-colors"
                            >
                              {deleteSaving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> {t('profile.deleting')}</>
                              ) : (
                                <><Trash2 className="w-4 h-4" /> {t('profile.confirmDelete')}</>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </FancyCard>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
