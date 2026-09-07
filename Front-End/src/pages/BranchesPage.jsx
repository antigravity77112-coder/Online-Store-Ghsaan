import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, ExternalLink, MessageCircle, Building2, Navigation } from 'lucide-react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import * as api from '../services/api';

const BranchCard = ({ branch, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
  >
    {/* Card Header */}
    <div className="bg-gradient-to-br from-gold-50 to-amber-50 dark:from-gold-900/20 dark:to-amber-900/10 px-5 py-4 border-b border-gold-100 dark:border-gold-900/30 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-gold-500/30">
        <Building2 className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-extrabold text-slate-800 dark:text-white truncate">{branch.name}</h2>
        <p className="text-xs text-gold-600 dark:text-gold-400 font-semibold">{branch.city}</p>
      </div>
    </div>

    {/* Card Body */}
    <div className="px-5 py-4 space-y-3">
      {/* Address */}
      <div className="flex items-start gap-2.5">
        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{branch.address}</p>
      </div>

      {/* Working Hours */}
      {branch.workingHours && (
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-400">{branch.workingHours}</p>
        </div>
      )}

      {/* Phone */}
      {branch.phone && (
        <div className="flex items-center gap-2.5">
          <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <a
            href={`tel:${branch.phone}`}
            className="text-sm text-gold-600 dark:text-gold-400 font-semibold hover:underline dir-ltr"
          >
            {branch.phone}
          </a>
        </div>
      )}
    </div>

    {/* Card Footer - Actions */}
    <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
      {branch.mapUrl && (
        <a
          href={branch.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-gold-100 dark:hover:bg-gold-900/30 text-slate-700 dark:text-slate-300 hover:text-gold-700 dark:hover:text-gold-400 text-xs font-bold rounded-xl transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          الخريطة
        </a>
      )}
      {branch.whatsapp && (
        <a
          href={`https://wa.me/${branch.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          واتساب
        </a>
      )}
      {branch.phone && (
        <a
          href={`tel:${branch.phone}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-xl transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          اتصل
        </a>
      )}
    </div>
  </motion.div>
);

const BranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getBranches()
      .then(data => setBranches(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <SEO
        title="فروعنا ومواقعنا"
        description="تعرف على مواقع فروع متجر قصة — العناوين، أوقات العمل، وأرقام التواصل."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 mb-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-100 dark:bg-gold-900/30 mb-4">
            <MapPin className="w-7 h-7 text-gold-600 dark:text-gold-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            فروعنا ومواقعنا
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base max-w-md mx-auto">
            {branches.length > 0
              ? `${branches.length} ${branches.length === 1 ? 'فرع' : 'فروع'} في خدمتكم`
              : 'تفضلوا بزيارتنا في أي من فروعنا'}
          </p>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-pulse">
                <div className="h-16 bg-slate-100 dark:bg-slate-800" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-3/4" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/2" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-16">
            <p className="text-slate-500 dark:text-slate-400">{error}</p>
          </div>
        )}

        {/* Branches Grid */}
        {!loading && !error && branches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((branch, i) => (
              <BranchCard key={branch.id} branch={branch} index={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && branches.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-300 dark:border-slate-700"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
              <Building2 className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">لا توجد فروع حالياً</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              سيتم إضافة معلومات الفروع قريباً.
            </p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default BranchesPage;
