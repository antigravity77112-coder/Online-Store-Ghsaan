import React, { useState, useRef } from 'react';
import useSWR from 'swr';
import {
  AdminToolbar,
  AdminSearch,
  AdminPrimaryButton,
  AdminLoading,
  AdminCard,
} from './AdminUI';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Search, AlertCircle, Loader2, 
  Image as ImageIcon, CheckCircle, Package, Crown 
} from 'lucide-react';
import * as api from '../../services/api';

const AdminBrandsTab = ({ onSuccessMsg }) => {
  const { data: brands, mutate, error: fetchError } = useSWR('adminBrands', api.getBrands);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    logoUrl: ''
  });

  const isLoading = !brands && !fetchError;
  const filteredBrands = brands?.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.slug && b.slug.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleOpenModal = (brand = null) => {
    setFormError('');
    if (brand) {
      setEditingBrand(brand);
      setForm({
        name: brand.name,
        slug: brand.slug || '',
        description: brand.description || '',
        logoUrl: brand.logoUrl || ''
      });
    } else {
      setEditingBrand(null);
      setForm({ name: '', slug: '', description: '', logoUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError('');
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('يرجى اختيار ملف صورة صالح');
      return;
    }

    setUploading(true);
    setFormError('');
    try {
      const url = await api.uploadBrandLogo(file);
      setForm({ ...form, logoUrl: url });
    } catch (err) {
      setFormError(err.message || 'فشل رفع الشعار');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('اسم العلامة التجارية مطلوب');
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      if (editingBrand) {
        await api.updateBrand(editingBrand.id, form);
        onSuccessMsg('تم تحديث العلامة التجارية بنجاح');
      } else {
        await api.createBrand(form);
        onSuccessMsg('تمت إضافة العلامة التجارية بنجاح');
      }
      mutate();
      handleCloseModal();
    } catch (err) {
      setFormError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف العلامة التجارية "${name}"؟\nلن يتم حذف المنتجات التابعة لها، بل ستصبح بدون علامة تجارية.`)) {
      return;
    }

    try {
      await api.deleteBrand(id);
      onSuccessMsg('تم الحذف بنجاح');
      mutate();
    } catch (err) {
      alert(err.message || 'حدث خطأ أثناء الحذف');
    }
  };

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="العلامات التجارية"
        subtitle="إدارة العلامات المعروضة في المتجر"
        icon={Crown}
        actions={
          <AdminPrimaryButton onClick={() => handleOpenModal()}>
            <Plus className="w-5 h-5" /> إضافة علامة
          </AdminPrimaryButton>
        }
      >
        <AdminSearch
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث عن علامة تجارية..."
        />
      </AdminToolbar>

      {/* States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-gold-500" />
          <p>جاري تحميل العلامات التجارية...</p>
        </div>
      ) : fetchError ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 flex flex-col items-center text-center">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-bold">حدث خطأ أثناء جلب البيانات</p>
          <p className="text-sm mt-1">{fetchError.message}</p>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <ImageIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد علامات تجارية</h3>
          <p className="text-sm text-slate-500 mt-1">لم يتم العثور على أي علامات تجارية تطابق بحثك.</p>
        </div>
      ) : (
        /* Brands Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative">
          {filteredBrands.map((brand) => (
            <div key={brand.id} className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:shadow-gold-500/5 hover:border-gold-500/30 transition-all">
              {/* Image Area */}
              <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center p-6 border-b border-slate-100 dark:border-slate-700 relative">
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={brand.name} className="max-w-full max-h-full object-contain filter group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="text-slate-300 dark:text-slate-600 flex flex-col items-center">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-xs font-bold uppercase tracking-wider">لا يوجد شعار</span>
                  </div>
                )}
                
                {/* Actions Overlay */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                  <button onClick={() => handleOpenModal(brand)} className="p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm hover:text-gold-500 transition-colors" title="تعديل">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(brand.id, brand.name)} className="p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm hover:text-red-500 transition-colors" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Info Area */}
              <div className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white truncate" title={brand.name}>
                  {brand.name}
                </h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500 font-mono truncate max-w-[120px]" title={brand.slug}>
                    /{brand.slug}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 rounded-md text-[10px] font-bold">
                    <Package className="w-3 h-3" />
                    {brand.productsCount || 0} منتج
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 z-10 flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {editingBrand ? 'تعديل العلامة التجارية' : 'إضافة علامة تجارية جديدة'}
                </h3>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {formError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form id="brandForm" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم العلامة التجارية <span className="text-red-500">*</span></label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-gold-500" placeholder="مثال: Dior" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الرابط الدائم (Slug) - اختياري</label>
                    <input type="text" name="slug" value={form.slug} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 font-mono text-left" dir="ltr" placeholder="يُترك فارغاً للتوليد التلقائي" />
                    <p className="text-[10px] text-slate-400 mt-1">يجب أن يكون فريداً وباللغة الإنجليزية بدون مسافات.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الشعار (Logo)</label>
                    <div className="flex items-center gap-4 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                      <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                        {uploading ? (
                          <Loader2 className="w-5 h-5 text-gold-500 animate-spin" />
                        ) : form.logoUrl ? (
                          <img src={form.logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                          اختيار صورة الشعار
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1">يفضل أن يكون الشعار بخلفية شفافة (PNG).</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الوصف (اختياري)</label>
                    <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 resize-none" placeholder="وصف موجز عن العلامة التجارية..." />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0 flex gap-3">
                <button type="submit" form="brandForm" disabled={loading} className="flex-1 py-3 bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  <span>{editingBrand ? 'حفظ التعديلات' : 'إضافة العلامة'}</span>
                </button>
                <button type="button" onClick={handleCloseModal} className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                  إلغاء
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBrandsTab;
