import React, { useEffect, useState } from 'react';
import {
  Search,
  ClipboardList,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Download,
  Bell,
  X,
} from 'lucide-react';
import * as api from '../../services/api';
import { orderStatusClasses } from '../../config/themeTokens';
import {
  AdminToolbar,
  AdminSearch,
  AdminFilterChips,
  AdminCard,
  AdminEmptyState,
  AdminLoading,
  AdminGhostButton,
  AdminFadeIn,
  adminSelectClass,
} from './AdminUI';

const STATUS_FLOW = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const AdminOrdersTab = ({
  orders,
  ordersLoading,
  mutateOrders,
  showSuccess,
  setError,
  highlightOrderId,
  onHighlightConsumed,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [notifyingId, setNotifyingId] = useState(null);

  useEffect(() => {
    if (!highlightOrderId) return;
    setDetailOrderId(highlightOrderId);
    setExpandedOrderId(highlightOrderId);
    onHighlightConsumed?.();
  }, [highlightOrderId, onHighlightConsumed]);

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.updateAdminOrderStatus(orderId, newStatus);
      mutateOrders();
      showSuccess('تم تحديث حالة الطلب بنجاح ✅');
    } catch (err) {
      setError(err.message || 'فشل تحديث حالة الطلب');
    }
  };

  const handleResendNotify = async (orderId) => {
    setNotifyingId(orderId);
    try {
      const res = await api.resendAdminOrderNotification(orderId);
      showSuccess(res?.sent ? 'تم إعادة إرسال إشعار الحالة ✅' : 'لم يُرسل الإشعار (تحقق من التفضيلات/الجهاز)');
    } catch (err) {
      setError(err.message || 'فشل إرسال الإشعار');
    } finally {
      setNotifyingId(null);
    }
  };

  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (orderStatusFilter !== 'All' && o.status !== orderStatusFilter) return false;
      if (!searchQuery.trim()) return true;
      return o.buyer?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
        || o.id?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [orders, orderStatusFilter, searchQuery]);

  const detailOrder = React.useMemo(
    () => (orders || []).find((o) => o.id === detailOrderId) || null,
    [orders, detailOrderId],
  );

  const handleExportExcel = async () => {
    if (filteredOrders.length === 0) return;

    const XLSX = await import('xlsx');

    const exportData = filteredOrders.map((order) => ({
      'رقم الطلب': order.id,
      'تاريخ الطلب': new Date(order.orderDate).toLocaleDateString('ar-EG'),
      'اسم المشتري': order.buyer?.fullName || 'غير معروف',
      'رقم الهاتف': order.buyer?.phoneNumber || 'غير متوفر',
      'العنوان': order.shippingAddress,
      'طريقة الدفع': order.paymentMethod,
      'الإجمالي': order.totalAmount,
      'الحالة': order.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الطلبات');
    XLSX.writeFile(wb, `orders_export_${new Date().toLocaleDateString('en-US')}.xlsx`);
  };

  const orderStatusOptions = [
    { value: 'All', label: 'الكل' },
    { value: 'Pending', label: 'قيد الانتظار' },
    { value: 'Confirmed', label: 'مؤكد' },
    { value: 'Processing', label: 'جاري التجهيز' },
    { value: 'Shipped', label: 'تم الشحن' },
    { value: 'Delivered', label: 'تم التوصيل' },
    { value: 'Cancelled', label: 'ملغي' },
  ];

  const orderStatusBadge = (status) => {
    const cfg = {
      Pending: { label: 'قيد الانتظار', color: orderStatusClasses.Pending, Icon: Clock },
      Confirmed: { label: 'مؤكد', color: orderStatusClasses.Confirmed, Icon: CheckCircle },
      Processing: { label: 'جاري التجهيز', color: orderStatusClasses.Processing, Icon: Package },
      Shipped: { label: 'تم الشحن', color: orderStatusClasses.Shipped, Icon: Truck },
      Delivered: { label: 'تم التوصيل', color: orderStatusClasses.Delivered, Icon: CheckCircle },
      Cancelled: { label: 'ملغي', color: orderStatusClasses.Cancelled, Icon: XCircle },
    };
    const c = cfg[status] || cfg.Pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${c.color}`}>
        <c.Icon className="w-3.5 h-3.5" />
        {c.label}
      </span>
    );
  };

  const statusActions = (order) => {
    const next = {
      Pending: [
        { status: 'Confirmed', label: 'تأكيد', className: 'text-white bg-emerald-600 hover:bg-emerald-500' },
        { status: 'Cancelled', label: 'رفض', className: 'text-red-600 bg-red-50 border border-red-200' },
      ],
      Confirmed: [{ status: 'Processing', label: 'بدء التجهيز', className: 'text-white bg-sky-600 hover:bg-sky-500' }],
      Processing: [{ status: 'Shipped', label: 'تم الشحن', className: 'text-white bg-indigo-600 hover:bg-indigo-500' }],
      Shipped: [{ status: 'Delivered', label: 'تم التوصيل', className: 'text-white bg-emerald-600 hover:bg-emerald-500' }],
    };
    return next[order.status] || [];
  };

  return (
    <div>
      <AdminToolbar
        title="إدارة الطلبات"
        subtitle={`${filteredOrders.length} طلب`}
        icon={ClipboardList}
        actions={
          <AdminGhostButton onClick={handleExportExcel}>
            <Download className="w-4 h-4" />
            تصدير Excel
          </AdminGhostButton>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <AdminSearch
            className="flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو رقم الطلب..."
          />
          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            className={`${adminSelectClass} sm:w-44`}
          >
            {orderStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <AdminFilterChips
            items={orderStatusOptions.map((o) => ({ id: o.value, label: o.label }))}
            value={orderStatusFilter}
            onChange={setOrderStatusFilter}
          />
        </div>
      </AdminToolbar>

      {ordersLoading ? (
        <AdminLoading label="جاري تحميل الطلبات..." />
      ) : orders.length === 0 ? (
        <AdminEmptyState
          icon={ClipboardList}
          title="لا توجد طلبات"
          description="لم يتم استلام أي طلبات بعد أو لا توجد نتائج للبحث"
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => {
            const isExpanded = expandedOrderId === order.id;
            const orderItems = order.orderItems || [];
            const orderDate = new Date(order.orderDate).toLocaleDateString('ar-EG', {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            });
            const highlighted = detailOrderId === order.id;

            return (
              <AdminFadeIn key={order.id} delay={index * 0.03}>
                <AdminCard className={`!p-5 ${highlighted ? 'ring-2 ring-gold-400' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">طلب #{order.id?.slice(0, 8)?.toUpperCase()}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400">{orderDate}</span>
                          <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{order.buyer?.fullName}</span>
                        </div>
                      </div>
                    </div>
                    {orderStatusBadge(order.status)}
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <span className="flex items-center gap-1">📍 {order.shippingAddress}</span>
                    <span className="flex items-center gap-1">💳 {order.paymentMethod}</span>
                    <span className="font-bold text-gold-600 dark:text-gold-400">الإجمالي: {Number(order.totalAmount || 0).toLocaleString('en-US')} ريال</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-gold-600 bg-bone dark:bg-slate-800 hover:bg-gold-50 rounded-lg transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> {orderItems.length} منتج {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailOrderId(order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gold-700 bg-gold-50 hover:bg-gold-100 rounded-lg"
                    >
                      التفاصيل
                    </button>
                    <div className="flex-1" />
                    {statusActions(order).map((a) => (
                      <button
                        key={a.status}
                        type="button"
                        onClick={() => handleOrderStatusUpdate(order.id, a.status)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${a.className}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>

                  {isExpanded && orderItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                      <div className="grid gap-3">
                        {orderItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                            <img src={item.productImageUrl || item.product?.imageUrl || item.product?.mainImageUrl} alt={item.productTitle || item.product?.title} className="w-12 h-12 object-cover rounded-md" />
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.productTitle || item.product?.title}</h4>
                              <p className="text-xs text-slate-500">الكمية: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AdminCard>
              </AdminFadeIn>
            );
          })}
        </div>
      )}

      {detailOrder ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setDetailOrderId(null)}>
          <div
            className="w-full max-w-md h-full bg-white dark:bg-slate-950 shadow-2xl overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                طلب #{detailOrder.id?.slice(0, 8)?.toUpperCase()}
              </h3>
              <button type="button" onClick={() => setDetailOrderId(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>{orderStatusBadge(detailOrder.status)}</div>
              <p><span className="text-slate-400">المشتري:</span> {detailOrder.buyer?.fullName}</p>
              <p><span className="text-slate-400">الهاتف:</span> {detailOrder.buyer?.phoneNumber || '—'}</p>
              <p><span className="text-slate-400">العنوان:</span> {detailOrder.shippingAddress}</p>
              <p><span className="text-slate-400">الدفع:</span> {detailOrder.paymentMethod}</p>
              <p className="font-bold text-gold-600">الإجمالي: {Number(detailOrder.totalAmount || 0).toLocaleString('en-US')} ريال</p>
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold text-slate-500">تغيير الحالة</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.filter((s) => s !== detailOrder.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleOrderStatusUpdate(detailOrder.id, s)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:border-gold-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={notifyingId === detailOrder.id}
              onClick={() => handleResendNotify(detailOrder.id)}
              className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-gold-50 text-gold-700 border border-gold-200 hover:bg-gold-100 disabled:opacity-60"
            >
              <Bell className="w-4 h-4" />
              إعادة إرسال إشعار الحالة للمشتري
            </button>

            <div className="mt-6 space-y-2">
              <p className="text-xs font-bold text-slate-500">المنتجات</p>
              {(detailOrder.orderItems || []).map((item, i) => (
                <div key={i} className="flex gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <img src={item.productImageUrl || item.product?.imageUrl} alt="" className="w-12 h-12 rounded-md object-cover" />
                  <div>
                    <div className="text-sm font-bold">{item.productTitle || item.product?.title}</div>
                    <div className="text-xs text-slate-500">×{item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminOrdersTab;
