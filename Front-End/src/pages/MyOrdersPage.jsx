import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Loader2, Calendar, MapPin, CreditCard, ShoppingBag, ArrowRight, AlertCircle, Clock, CheckCircle, XCircle, Truck, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import Layout from '../components/Layout';
import * as api from '../services/api';
import { orderStatusClasses, themeStatusError } from '../config/themeTokens';

function resolveOrderCurrency(order) {
  const itemCurrency = order?.orderItems?.[0]?.product?.currency;
  if (order?.currency && order.currency !== 'YER_Sanaa') return order.currency;
  return itemCurrency || order?.currency;
}

const statusConfig = {
  Pending: { label: 'قيد الانتظار', color: orderStatusClasses.Pending, icon: Clock },
  Confirmed: { label: 'تم التأكيد', color: orderStatusClasses.Confirmed, icon: ShieldCheck },
  Processing: { label: 'جاري التجهيز', color: orderStatusClasses.Processing, icon: Package },
  Shipped: { label: 'تم الشحن', color: orderStatusClasses.Shipped, icon: Truck },
  Delivered: { label: 'تم التوصيل', color: orderStatusClasses.Delivered, icon: CheckCircle },
  Cancelled: { label: 'ملغي', color: orderStatusClasses.Cancelled, icon: XCircle },
};

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadOrders() {
      try {
        const data = await api.getMyOrders();
        if (mounted) setOrders(data || []);
      } catch (err) {
        if (mounted) setError(err.message || 'حدث خطأ في تحميل الطلبات');
      }
      if (mounted) setLoading(false);
    }

    loadOrders();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">جاري تحميل الطلبات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-gold-600 dark:text-gold-400" />
            طلباتي
          </h1>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            متابعة التسوق
          </Link>
        </div>

        {error && (
          <div className={`mb-6 flex items-center gap-2 ${themeStatusError} text-sm font-medium px-4 py-3 rounded-xl`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {orders.length === 0 && !error ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
              <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mb-2">لا توجد طلبات</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">لم تقم بإنشاء أي طلبات بعد. ابدأ بتصفح المنتجات!</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500"
            >
              تصفح المنتجات
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const status = statusConfig[order.status] || statusConfig.Pending;
              const StatusIcon = status.icon;
              const orderDate = new Date(order.orderDate).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
              const isExpanded = expandedOrder === order.id;
              const orderItems = order.orderItems || [];
              const displayCurrency = resolveOrderCurrency(order);

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 rounded-xl flex items-center justify-center">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">طلب #{order.id?.slice(0, 8)?.toUpperCase()}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {orderDate}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${status.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </div>

                    {/* Order Details */}
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                      {order.shippingAddress && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          {order.shippingAddress}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        {order.paymentMethod === 'COD' || order.paymentMethod === 'CashOnDelivery' ? 'الدفع عند الاستلام' : order.paymentMethod === 'BankTransfer' ? 'تحويل بنكي' : order.paymentMethod || 'الدفع عند الاستلام'}
                      </span>
                    </div>

                    {/* Items Count and Total */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        className="flex items-center gap-1.5 text-sm text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 font-semibold transition-colors"
                      >
                        {orderItems.length} منتج
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div className="text-left">
                        <span className="text-xs text-slate-400">الإجمالي</span>
                        <div className="text-lg font-extrabold text-gold-600 dark:text-gold-400">
                          {Number(order.totalAmount || 0).toLocaleString('en-US')} {api.getCurrencySymbol(displayCurrency) || 'ريال'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Items */}
                  <AnimatePresence>
                    {isExpanded && orderItems.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 sm:px-6 pb-5 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                          {orderItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-bone dark:bg-slate-900/50 rounded-xl p-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border border-slate-200 dark:border-slate-600">
                                <img
                                  src={item.productImageUrl || item.product?.imageUrl || item.product?.mainImageUrl || 'https://images.unsplash.com/photo-1560472355-536de3962603?w=100&q=60'}
                                  alt={item.productTitle || item.product?.title || 'منتج'}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.productTitle || item.product?.title || 'منتج'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  الكمية: {item.quantity} × {Number(item.unitPrice || 0).toLocaleString('en-US')}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-gold-600 dark:text-gold-400 flex-shrink-0">
                                {(item.quantity * Number(item.unitPrice || 0)).toLocaleString('en-US')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyOrdersPage;
