import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell, Megaphone, Loader2, Send, ExternalLink, RefreshCw,
} from 'lucide-react';
import * as api from '../../services/api';
import {
  AdminToolbar,
  AdminCard,
  AdminEmptyState,
  AdminLoading,
  AdminPrimaryButton,
  AdminGhostButton,
  AdminFadeIn,
  adminSelectClass,
} from './AdminUI';

const CHANNEL_LABELS = {
  orders: 'طلبات',
  engagement: 'تفاعل',
  marketing: 'تسويق',
  system: 'نظام',
};

const AdminNotificationsTab = ({ showSuccess, setError, onOpenOrder }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('marketing');
  const [audience, setAudience] = useState('all_customers');
  const [sending, setSending] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, n] = await Promise.all([
        api.getAdminNotificationCampaigns({ pageSize: 15 }),
        api.getAdminNotifications({ pageSize: 40 }),
      ]);
      setCampaigns(c?.items || []);
      setRecent(n?.items || []);
    } catch (err) {
      setError(err.message || 'فشل تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('العنوان والنص مطلوبان');
      return;
    }
    setSending(true);
    try {
      const result = await api.sendAdminBroadcast({
        title: title.trim(),
        body: body.trim(),
        channel,
        audience,
      });
      showSuccess(`تم الإرسال إلى ${result?.sentCount ?? 0} مستلم ✅`);
      setTitle('');
      setBody('');
      await load();
    } catch (err) {
      setError(err.message || 'فشل إرسال الإشعار');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="الإشعارات"
        subtitle="بث وإدارة إشعارات التطبيق"
        icon={Bell}
        actions={
          <AdminGhostButton onClick={load}>
            <RefreshCw className="w-4 h-4" />
            تحديث
          </AdminGhostButton>
        }
      />

      <AdminCard className="!p-5">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-gold-500" />
          إرسال إشعار جماعي
        </h3>
        <form onSubmit={handleBroadcast} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="عنوان الإشعار"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="نص الإشعار"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none"
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className={`${adminSelectClass} sm:w-44`}
            >
              <option value="marketing">تسويق (opt-in)</option>
              <option value="engagement">تفاعل</option>
            </select>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className={`${adminSelectClass} sm:w-44`}
            >
              <option value="all_customers">العملاء (حسب التفضيل)</option>
              <option value="admins">المسؤولون فقط</option>
            </select>
            <AdminPrimaryButton type="submit" disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              إرسال
            </AdminPrimaryButton>
          </div>
        </form>
      </AdminCard>

      {loading ? (
        <AdminLoading label="جاري التحميل..." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 text-sm">الحملات الأخيرة</h3>
            {campaigns.length === 0 ? (
              <AdminEmptyState icon={Megaphone} title="لا توجد حملات" description="أرسل أول إشعار جماعي أعلاه" />
            ) : (
              <div className="space-y-3">
                {campaigns.map((c, i) => (
                  <AdminFadeIn key={c.id} delay={i * 0.02}>
                    <AdminCard className="!p-4">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{c.title}</div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.body}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-slate-400">
                        <span>{CHANNEL_LABELS[c.channel] || c.channel}</span>
                        <span>•</span>
                        <span>{c.audience === 'admins' ? 'مسؤولون' : 'عملاء'}</span>
                        <span>•</span>
                        <span>{c.sentCount} مستلم</span>
                        <span>•</span>
                        <span>{new Date(c.createdAt).toLocaleString('ar-EG')}</span>
                      </div>
                    </AdminCard>
                  </AdminFadeIn>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 text-sm">آخر الإشعارات المرسلة</h3>
            {recent.length === 0 ? (
              <AdminEmptyState icon={Bell} title="لا إشعارات بعد" description="ستظهر هنا بعد إرسال الإشعارات" />
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pe-1">
                {recent.map((n) => {
                  const orderId = n.data?.orderId;
                  return (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{n.title}</div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {n.user?.fullName || n.user?.email || 'مستخدم'} · {CHANNEL_LABELS[n.channel] || n.channel} · {n.type}
                          </div>
                        </div>
                        {orderId ? (
                          <button
                            type="button"
                            onClick={() => onOpenOrder?.(orderId)}
                            className="shrink-0 flex items-center gap-1 text-xs font-bold text-gold-600 hover:text-gold-500"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            الطلب
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationsTab;
