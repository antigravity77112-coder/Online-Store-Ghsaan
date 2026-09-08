import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Package,
  ShoppingCart,
  UserCog,
  TrendingUp,
  UserPlus,
  Loader2,
  Sparkles,
  ArrowLeft,
  ClipboardList,
  Megaphone,
  Plus,
  Store,
  Zap,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import * as api from '../../services/api';
import { orderStatusClasses } from '../../config/themeTokens';

const STATUS_LABELS = {
  Pending: { label: 'قيد الانتظار', color: orderStatusClasses.Pending },
  Confirmed: { label: 'مؤكد', color: orderStatusClasses.Confirmed },
  Processing: { label: 'جاري التجهيز', color: orderStatusClasses.Processing },
  Shipped: { label: 'تم الشحن', color: orderStatusClasses.Shipped },
  Delivered: { label: 'تم التوصيل', color: orderStatusClasses.Delivered },
  Cancelled: { label: 'ملغي', color: orderStatusClasses.Cancelled },
};

function formatCurrency(value) {
  const num = Number(value) || 0;
  const symbol = api.CurrencySymbol?.SAR || 'ريال';
  return `${num.toLocaleString('en-US')} ${symbol}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'مساء الخير';
  return 'مساء النور';
}

const StatCard = ({ stat, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, duration: 0.45, ease: 'easeOut' }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 sm:p-5 shadow-sm hover:shadow-xl hover:shadow-gold-500/10 transition-shadow"
  >
    <div className={`absolute -top-10 -left-10 w-28 h-28 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity ${stat.glow}`} />
    <div className="relative flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
        <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
        {stat.hint && (
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5">{stat.hint}</p>
        )}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${stat.iconBg}`}>
        <stat.icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </motion.div>
);

const QuickAction = ({ action, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-3.5 text-right hover:border-gold-400/50 hover:shadow-lg hover:shadow-gold-500/10 transition-all"
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.bg}`}>
      <action.icon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-900 dark:text-white">{action.label}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{action.desc}</p>
    </div>
    <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-gold-500 group-hover:-translate-x-0.5 transition-all" />
  </button>
);

const AdminDashboardTab = ({ stats, statsLoading, orders, onNavigateTab, userName }) => {
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d,
        name: d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
        revenue: 0,
        orders: 0,
      };
    });

    (orders || []).forEach((order) => {
      if (order.status === 'Cancelled') return;
      const orderDate = new Date(order.orderDate);
      const bucket = last7Days.find((d) => d.date.toDateString() === orderDate.toDateString());
      if (!bucket) return;
      bucket.orders += 1;
      bucket.revenue += Number(order.totalAmount) || 0;
    });

    return last7Days.map(({ name, revenue, orders: orderCount }) => ({
      name,
      revenue,
      orders: orderCount,
    }));
  }, [orders]);

  const recentOrders = useMemo(() => {
    return [...(orders || [])]
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .slice(0, 5);
  }, [orders]);

  const totalRevenue = useMemo(
    () => (orders || []).reduce((sum, o) => (o.status === 'Cancelled' ? sum : sum + (Number(o.totalAmount) || 0)), 0),
    [orders]
  );

  if (statsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 animate-pulse" />
          <Loader2 className="w-8 h-8 text-white absolute inset-0 m-auto animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-500">جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-24 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
        <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">لا توجد بيانات متاحة حالياً</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'إجمالي المنتجات',
      value: stats.totalProducts,
      hint: 'في الكتالوج',
      icon: Package,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      glow: 'bg-emerald-400',
    },
    {
      label: 'إجمالي المستخدمين',
      value: stats.totalUsers,
      hint: `${stats.todayNewUsers || 0} جديد اليوم`,
      icon: Users,
      iconBg: 'bg-gradient-to-br from-gold-500 to-amber-600',
      glow: 'bg-gold-400',
    },
    {
      label: 'إجمالي الطلبات',
      value: stats.totalOrders,
      hint: `${stats.todayOrders || 0} طلب اليوم`,
      icon: ShoppingCart,
      iconBg: 'bg-gradient-to-br from-orange-500 to-rose-500',
      glow: 'bg-orange-400',
    },
    {
      label: 'عدد البائعين',
      value: stats.totalSellers,
      hint: 'حسابات البائعين',
      icon: UserCog,
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      glow: 'bg-blue-400',
    },
    {
      label: 'طلبات اليوم',
      value: stats.todayOrders,
      hint: 'منذ منتصف الليل',
      icon: TrendingUp,
      iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600',
      glow: 'bg-rose-400',
    },
    {
      label: 'مستخدمين جدد',
      value: stats.todayNewUsers,
      hint: 'تسجيلات اليوم',
      icon: UserPlus,
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
      glow: 'bg-violet-400',
    },
  ];

  const quickActions = [
    { id: 'orders', label: 'إدارة الطلبات', desc: 'متابعة وتحديث حالات الطلبات', icon: ClipboardList, bg: 'bg-gradient-to-br from-gold-500 to-amber-600' },
    { id: 'products', label: 'إدارة المحتوى', desc: 'المنتجات والعروض', icon: Package, bg: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
    { id: 'banners', label: 'الإعلانات', desc: 'بانرات الهيرو والعروض', icon: Megaphone, bg: 'bg-gradient-to-br from-orange-500 to-rose-500' },
    { id: 'storeInfo', label: 'معلومات المتجر', desc: 'التواصل والإعدادات', icon: Store, bg: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Hero welcome */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-gold-500/20 bg-gradient-to-br from-[#1a1208] via-[#2a1f0a] to-[#120f09] p-6 sm:p-8 shadow-2xl shadow-gold-900/20"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(218,165,32,0.18),_transparent_55%)]" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/15 border border-gold-500/30 px-3 py-1 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span className="text-xs font-bold text-gold-300">لوحة تحكم Smart Shopper</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
              {getGreeting()}، {userName || 'مسؤول'} ✨
            </h2>
            <p className="text-sm text-slate-300/90 max-w-lg">
              نظرة سريعة على أداء متجرك — المنتجات، الطلبات، والعملاء في مكان واحد.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 px-4 py-3 min-w-[120px]">
              <p className="text-[10px] text-gold-300/80 font-semibold mb-0.5">إجمالي الإيرادات</p>
              <p className="text-lg font-black text-white">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 px-4 py-3 min-w-[100px]">
              <p className="text-[10px] text-gold-300/80 font-semibold mb-0.5">الطلبات النشطة</p>
              <p className="text-lg font-black text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-gold-400" />
                {stats.totalOrders}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold-500" />
          إجراءات سريعة
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <QuickAction
              key={action.id}
              action={action}
              onClick={() => onNavigateTab?.(action.id)}
            />
          ))}
        </div>
      </div>

      {/* Charts + recent orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6">
        <div className="xl:col-span-2 space-y-5 lg:space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">إيرادات آخر 7 أيام</h3>
                <p className="text-xs text-slate-500 mt-0.5">تتبع أداء المبيعات اليومي</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gold-500/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-gold-600 dark:text-gold-400" />
              </div>
            </div>
            <div className="h-[260px] w-full" dir="ltr">
              {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA0001" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#EA0001" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickMargin={8} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(218,165,32,0.3)', borderRadius: '12px', color: '#fff' }}
                    formatter={(value) => [formatCurrency(value), 'الإيرادات']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#EA0001" strokeWidth={2.5} fill="url(#adminRevenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">عدد الطلبات اليومي</h3>
                <p className="text-xs text-slate-500 mt-0.5">حجم الطلبات خلال الأسبوع</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="h-[220px] w-full" dir="ltr">
              {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickMargin={8} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(218, 165, 32, 0.08)' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', color: '#fff' }}
                    formatter={(value) => [value, 'طلبات']}
                  />
                  <Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">أحدث الطلبات</h3>
              <p className="text-xs text-slate-500 mt-0.5">آخر 5 طلبات واردة</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab?.('orders')}
              className="text-xs font-bold text-gold-600 dark:text-gold-400 hover:underline"
            >
              عرض الكل
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <ShoppingCart className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">لا توجد طلبات بعد</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">ستظهر الطلبات الجديدة هنا فور وصولها</p>
              <button
                type="button"
                onClick={() => onNavigateTab?.('products')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gold-600 hover:bg-gold-500 px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                أضف منتجات
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {recentOrders.map((order, i) => {
                const status = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-slate-500/15 text-slate-600' };
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3 hover:border-gold-300/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {order.buyer?.fullName || 'عميل'}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.orderDate).toLocaleDateString('ar-EG')}
                      </span>
                      <span className="font-bold text-gold-600 dark:text-gold-400">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardTab;
