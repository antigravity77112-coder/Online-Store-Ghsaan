import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, ImagePlus, AlertCircle, Cloud, CheckCircle, Sparkles, Star } from 'lucide-react';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { OptionPicker, BooleanPicker, parseAttrOptions, adminInputClass, adminSelectClass } from '../pages/admin/AdminUI';
import { ScentPicker } from './ScentPicker';

const AddProductForm = ({ onSuccess, onCancel, editProduct }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [scents, setScents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  const isEdit = !!editProduct;

  const getInitialCondition = (cond) => {
    if (cond === 'New') return 1;
    if (cond === 'Used') return 2;
    if (cond === 'Refurbished') return 3;
    return typeof cond === 'number' ? cond : (parseInt(cond) || 1);
  };

  const extractImageUrls = (product) => {
    if (!product) return [];
    const fromImages = (product.images || []).map((img) => img.url).filter(Boolean);
    if (fromImages.length > 0) return fromImages;
    if (product.imageUrl) return [product.imageUrl];
    return [];
  };

  const extractImageAltTexts = (product) => (
    (product?.images || []).reduce((acc, img) => {
      if (img.url) acc[img.url] = img.altText || '';
      return acc;
    }, {})
  );

  const [form, setForm] = useState({
    title: editProduct?.title || '',
    description: editProduct?.description || '',
    price: editProduct?.price?.toString() || '',
    currency: editProduct?.currency || 'USD',
    condition: getInitialCondition(editProduct?.condition),
    stockQuantity: editProduct?.stockQuantity || 1,
    categoryId: editProduct?.categoryId || '',
    imageUrls: extractImageUrls(editProduct),
    isPromoted: editProduct?.isPromoted || false,
    isTrending: editProduct?.isTrending || false,
    status: editProduct?.status || 'Active', // Replaced isHidden with status
    discountPrice: editProduct?.discountPrice?.toString() || '',
    promotionLabel: editProduct?.promotionLabel || '',
    sku: editProduct?.sku || '',
    hasVariants: editProduct?.hasVariants || false,
    lowStockThreshold: editProduct?.lowStockThreshold || 5,
    metaTitle: editProduct?.metaTitle || '',
    metaDescription: editProduct?.metaDescription || '',
    brandId: editProduct?.brandId || '',
    scentIds: (editProduct?.scents || []).map((s) => s.id),
    variants: editProduct?.variants?.map(v => ({
      ...v,
      imageUrl: v.imageUrl || '',
      attributes: v.attributes?.reduce((acc, attr) => {
        acc[attr.categoryAttribute?.id || attr.categoryAttributeId] = attr.value;
        return acc;
      }, {}) || {}
    })) || [],
    imageAltTexts: extractImageAltTexts(editProduct),
    attributes: editProduct?.attributes?.reduce((acc, attr) => {
      acc[attr.categoryAttribute?.id || attr.categoryAttributeId] = attr.value;
      return acc;
    }, {}) || {},
  });

  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [variantAttributes, setVariantAttributes] = useState([]);

  // Fetch category attributes when category changes
  useEffect(() => {
    if (!form.categoryId) {
      setCategoryAttributes([]);
      setVariantAttributes([]);
      return;
    }
    
    Promise.all([
      api.getCategoryAttributes(form.categoryId, 'PRODUCT,BOTH'),
      api.getCategoryAttributes(form.categoryId, 'VARIANT,BOTH')
    ])
      .then(([prodAttrs, varAttrs]) => {
        setCategoryAttributes(prodAttrs || []);
        setVariantAttributes(varAttrs || []);
      })
      .catch(err => console.error('Failed to load category attributes:', err));
  }, [form.categoryId]);

  useEffect(() => {
    async function loadData() {
      try {
        const [catsData, brandsData, scentsData] = await Promise.all([
          api.getCategories(),
          api.getBrands().catch(() => []),
          api.getScents({ includeInactive: true }).catch(() => []),
        ]);
        setCategories(catsData || []);
        setBrands(brandsData || []);
        setScents(scentsData || []);
      } catch {
        setCategories([
          { id: 'cat1', name: 'الطاقة الشمسية' },
          { id: 'cat2', name: 'لابتوبات' },
        ]);
        setBrands([]);
        setScents([]);
      }
    }
    loadData();
  }, []);

  // Keep form in sync when the full product is loaded for editing
  useEffect(() => {
    if (!editProduct?.id) return;
    setForm((prev) => ({
      ...prev,
      title: editProduct.title || prev.title,
      description: editProduct.description || prev.description,
      price: editProduct.price != null ? String(editProduct.price) : prev.price,
      currency: editProduct.currency || prev.currency,
      condition: getInitialCondition(editProduct.condition),
      stockQuantity: editProduct.stockQuantity ?? prev.stockQuantity,
      categoryId: editProduct.categoryId || prev.categoryId,
      imageUrls: extractImageUrls(editProduct),
      imageAltTexts: extractImageAltTexts(editProduct),
      isPromoted: editProduct.isPromoted || false,
      isTrending: editProduct.isTrending || false,
      status: editProduct.status || prev.status,
      discountPrice: editProduct.discountPrice != null ? String(editProduct.discountPrice) : '',
      promotionLabel: editProduct.promotionLabel || '',
      sku: editProduct.sku || '',
      hasVariants: editProduct.hasVariants || (editProduct.variants || []).length > 0,
      lowStockThreshold: editProduct.lowStockThreshold ?? prev.lowStockThreshold,
      metaTitle: editProduct.metaTitle || '',
      metaDescription: editProduct.metaDescription || '',
      brandId: editProduct.brandId || '',
      scentIds: (editProduct.scents || []).map((s) => s.id),
      variants: editProduct.variants?.map(v => ({
        ...v,
        imageUrl: v.imageUrl || '',
        attributes: v.attributes?.reduce((acc, attr) => {
          acc[attr.categoryAttribute?.id || attr.categoryAttributeId] = attr.value;
          return acc;
        }, {}) || {}
      })) || [],
      attributes: editProduct.attributes?.reduce((acc, attr) => {
        acc[attr.categoryAttribute?.id || attr.categoryAttributeId] = attr.value;
        return acc;
      }, {}) || {},
    }));
  }, [editProduct?.id, editProduct?.images?.length, editProduct?.variants?.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const MAX_IMAGES = 5;

  const handleImageUpload = async (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    if (validFiles.length === 0) {
      setError('يرجى اختيار ملفات صور صالحة (بحجم أقل من 5 ميجابايت)');
      return;
    }
    const currentCount = form.imageUrls.length;
    const availableSlots = MAX_IMAGES - currentCount;
    if (availableSlots <= 0) {
      setError(`الحد الأقصى ${MAX_IMAGES} صور لكل منتج`);
      return;
    }
    const toUpload = validFiles.slice(0, availableSlots);

    setUploading(true);
    setError('');
    try {
      const uploaded = [];
      for (let i = 0; i < toUpload.length; i++) {
        setUploadingIndex(currentCount + i);
        const url = await api.uploadImageToCloudinary(toUpload[i]);
        uploaded.push(url);
      }
      setForm(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...uploaded] }));
    } catch (err) {
      setError(err.message || 'فشل رفع الصورة');
    }
    setUploading(false);
    setUploadingIndex(null);
  };

  const handleRemoveImage = (index) => {
    setForm(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index) }));
  };

  const handleSetPrimary = (index) => {
    setForm(prev => {
      const newUrls = [...prev.imageUrls];
      const [primary] = newUrls.splice(index, 1);
      return { ...prev, imageUrls: [primary, ...newUrls] };
    });
  };

  const handleVariantImageUpload = async (index, file) => {
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('يرجى اختيار صورة صالحة (أقل من 5 ميجابايت)');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const url = await api.uploadImageToCloudinary(file);
      setForm((prev) => {
        const variants = [...prev.variants];
        variants[index] = { ...variants[index], imageUrl: url };
        return { ...prev, variants };
      });
    } catch (err) {
      setError(err.message || 'فشل رفع صورة المتغير');
    }
    setUploading(false);
  };

  const mapVariantsPayload = (variants) => variants.map((v) => ({
    sku: v.sku,
    price: parseFloat(v.price),
    discountPrice: v.discountPrice ? parseFloat(v.discountPrice) : null,
    stockQuantity: parseInt(v.stockQuantity, 10) || 0,
    isActive: v.isActive !== false,
    sortOrder: v.sortOrder ?? 0,
    imageUrl: v.imageUrl?.trim() || null,
    attributes: Object.entries(v.attributes || {})
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([categoryAttributeId, value]) => ({ categoryAttributeId, value })),
  }));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title?.trim() || !form.price || (!isEdit && !form.categoryId) || !form.description?.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة للتأكيد');
      return;
    }

    // Validate discount price
    if (form.discountPrice && parseFloat(form.discountPrice) >= parseFloat(form.price)) {
      setError('سعر الخصم يجب أن يكون أقل من السعر الأصلي');
      return;
    }

    if (form.hasVariants) {
      if (!form.variants?.length) {
        setError('أضف متغيراً واحداً على الأقل أو عطّل المتغيرات');
        return;
      }
      const invalid = form.variants.find((v) => !v.sku?.trim() || !v.price || v.stockQuantity === '' || v.stockQuantity == null);
      if (invalid) {
        setError('كل متغير يحتاج SKU وسعراً وكمية');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await api.updateProduct(editProduct.id, {
          title: form.title,
          description: form.description,
          price: parseFloat(form.price),
          currency: form.currency,
          stockQuantity: parseInt(form.stockQuantity),
          condition: parseInt(form.condition),
          categoryId: form.categoryId || editProduct.categoryId,
          images: form.imageUrls.map(url => ({ url, altText: form.imageAltTexts[url] || null })),
          isPromoted: form.isPromoted,
          isTrending: form.isTrending,
          status: form.status,
          discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
          promotionLabel: form.promotionLabel || null,
          sku: form.sku || null,
          hasVariants: form.hasVariants,
          variants: form.hasVariants ? mapVariantsPayload(form.variants) : [],
          brandId: form.brandId || null,
          scentIds: form.scentIds || [],
          lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          attributes: Object.entries(form.attributes)
            .filter(([_, value]) => value !== undefined && value !== '')
            .map(([categoryAttributeId, value]) => ({ categoryAttributeId, value })),
        });
      } else {
        await api.createProduct({
          title: form.title,
          description: form.description,
          price: parseFloat(form.price),
          currency: form.currency,
          condition: parseInt(form.condition),
          stockQuantity: parseInt(form.stockQuantity),
          categoryId: form.categoryId,
          sellerId: user?.id,
          images: form.imageUrls.map(url => ({ url, altText: form.imageAltTexts[url] || null })),
          isPromoted: form.isPromoted,
          isTrending: form.isTrending,
          status: form.status,
          discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
          promotionLabel: form.promotionLabel || null,
          sku: form.sku || null,
          hasVariants: form.hasVariants,
          variants: form.hasVariants ? mapVariantsPayload(form.variants) : [],
          brandId: form.brandId || null,
          scentIds: form.scentIds || [],
          lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          attributes: Object.entries(form.attributes)
            .filter(([_, value]) => value !== undefined && value !== '')
            .map(([categoryAttributeId, value]) => ({ categoryAttributeId, value })),
        });
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء حفظ المنتج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-6 space-y-4">

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* العنوان و SKU */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">عنوان المنتج <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder="مثال: آيفون 15 برو ماكس 256 جيجا"
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">رقم الصنف (SKU)</label>
          <input
            type="text"
            name="sku"
            value={form.sku}
            onChange={handleChange}
            placeholder="مثال: IPH15-PRO-256"
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
          />
        </div>
      </div>

      {/* السعر + العملة */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">السعر</label>
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            required
            min="1"
            placeholder="0"
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">العملة</label>
          <select
            name="currency"
            value={form.currency}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 appearance-none cursor-pointer bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="USD">دولار ($)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="YER_Sanaa">ريال (صنعاء)</option>
            <option value="YER_Aden">ريال (عدن)</option>
          </select>
        </div>
      </div>

      {/* ── إعدادات الظهور ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 bg-bone dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">حالة المنتج</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="Active">نشط (يظهر للعملاء)</option>
            <option value="Draft">مسودة (قيد التجهيز)</option>
            <option value="OutOfStock">نفذت الكمية</option>
            <option value="Archived">مؤرشف (مخفي)</option>
          </select>
        </div>
        <div className="flex items-center justify-between p-4 bg-bone dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">يحتوي على متغيرات (أحجام/ألوان)</label>
            <span className="text-xs text-slate-500 dark:text-slate-400">تفعيل خيارات متعددة للمنتج</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.hasVariants}
            onClick={() => setForm(prev => ({ ...prev, hasVariants: !prev.hasVariants }))}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${form.hasVariants ? 'bg-gold-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${form.hasVariants ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* ── إدارة المتغيرات (Variants Manager) ── */}
      {form.hasVariants && (
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-500" />
              متغيرات المنتج
            </h4>
            <button
              type="button"
              onClick={() => {
                setForm(prev => ({
                  ...prev,
                  variants: [
                    ...prev.variants,
                    { sku: '', price: form.price, discountPrice: form.discountPrice, stockQuantity: 0, isActive: true, sortOrder: prev.variants.length, imageUrl: '' }
                  ]
                }));
              }}
              className="px-3 py-1.5 bg-gold-50 text-gold-700 font-bold rounded-lg text-xs hover:bg-gold-100 transition-colors"
            >
              + إضافة متغير
            </button>
          </div>

          {form.variants.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500">لا يوجد أي متغيرات مضافة حتى الآن.</div>
          ) : (
            <div className="space-y-3">
              {form.variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl relative">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">SKU المتغير</label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => {
                        const newVariants = [...form.variants];
                        newVariants[index].sku = e.target.value;
                        setForm(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                      placeholder="مثال: BLK-50ML"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">السعر</label>
                    <input
                      type="number"
                      value={variant.price}
                      onChange={(e) => {
                        const newVariants = [...form.variants];
                        newVariants[index].price = e.target.value;
                        setForm(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">سعر الخصم</label>
                    <input
                      type="number"
                      value={variant.discountPrice || ''}
                      onChange={(e) => {
                        const newVariants = [...form.variants];
                        newVariants[index].discountPrice = e.target.value;
                        setForm(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الكمية</label>
                    <input
                      type="number"
                      value={variant.stockQuantity}
                      onChange={(e) => {
                        const newVariants = [...form.variants];
                        newVariants[index].stockQuantity = e.target.value;
                        setForm(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex items-end pb-0.5 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          variants: prev.variants.filter((_, i) => i !== index)
                        }));
                      }}
                      className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                      title="حذف المتغير"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="col-span-full flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-600 pt-3">
                    <div className="w-14 h-14 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {variant.imageUrl ? (
                        <img src={variant.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 bg-gold-50 text-gold-700 font-bold rounded-lg text-xs hover:bg-gold-100 transition-colors cursor-pointer">
                        {variant.imageUrl ? 'تغيير الصورة' : 'رفع صورة المتغير'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVariantImageUpload(index, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {variant.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            const newVariants = [...form.variants];
                            newVariants[index] = { ...newVariants[index], imageUrl: '' };
                            setForm((prev) => ({ ...prev, variants: newVariants }));
                          }}
                          className="px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-colors"
                        >
                          إزالة الصورة
                        </button>
                      ) : null}
                      <input
                        type="url"
                        value={variant.imageUrl || ''}
                        onChange={(e) => {
                          const newVariants = [...form.variants];
                          newVariants[index] = { ...newVariants[index], imageUrl: e.target.value };
                          setForm((prev) => ({ ...prev, variants: newVariants }));
                        }}
                        placeholder="أو الصق رابط صورة"
                        className="min-w-[200px] flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div className="col-span-full border-t border-slate-100 dark:border-slate-600 my-2 pt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {variantAttributes.map(attr => {
                      const val = variant.attributes?.[attr.id] ?? '';
                      const handleAttrChange = (newVal) => {
                        const newVariants = [...form.variants];
                        newVariants[index] = {
                          ...newVariants[index],
                          attributes: { ...newVariants[index].attributes, [attr.id]: newVal }
                        };
                        setForm(prev => ({ ...prev, variants: newVariants }));
                      };

                      let inputElement = null;
                      if (attr.type === 'TEXT' || attr.type === 'NUMBER') {
                        inputElement = (
                          <input
                            type={attr.type === 'NUMBER' ? 'number' : 'text'}
                            value={val}
                            onChange={e => handleAttrChange(e.target.value)}
                            required={attr.isRequired}
                            placeholder={attr.name}
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                          />
                        );
                      } else if (attr.type === 'BOOLEAN') {
                        inputElement = (
                          <BooleanPicker
                            value={val}
                            onChange={handleAttrChange}
                            required={attr.isRequired}
                            size="sm"
                          />
                        );
                      } else if (attr.type === 'SELECT') {
                        const opts = parseAttrOptions(attr.options);
                        inputElement = (
                          <OptionPicker
                            value={val}
                            onChange={handleAttrChange}
                            options={opts}
                            required={attr.isRequired}
                            size="sm"
                          />
                        );
                      } else if (attr.type === 'MULTI_SELECT') {
                        const opts = parseAttrOptions(attr.options);
                        inputElement = (
                          <OptionPicker
                            value={val}
                            onChange={handleAttrChange}
                            options={opts}
                            multiple
                            required={attr.isRequired}
                            size="sm"
                          />
                        );
                      }

                      return (
                        <div key={attr.id}>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            {attr.name} {attr.isRequired && <span className="text-red-500">*</span>}
                          </label>
                          {inputElement}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ترويج المنتج / Promotion Section ── */}
      <div className="bg-gradient-to-br from-gold-50/50 via-purple-50/30 to-pink-50/30 dark:from-gold-900/20 dark:via-purple-900/10 dark:to-pink-900/10 rounded-2xl border border-gold-100 dark:border-gold-800/40 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-gold-500" />
          <span className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-wider">إعدادات الترويج</span>
        </div>

        {/* Toggle Switch for isPromoted */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">منتج مُروّج (عرض / مميز)</label>
          <button
            type="button"
            role="switch"
            aria-checked={form.isPromoted}
            onClick={() => setForm(prev => ({ ...prev, isPromoted: !prev.isPromoted }))}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gold-500/40 ${
              form.isPromoted
                ? 'bg-gradient-to-r from-gold-500 to-purple-500 shadow-lg shadow-gold-500/25'
                : 'bg-slate-200 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                form.isPromoted ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Toggle Switch for isTrending */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">الأكثر رواجاً (ترند)</label>
          <button
            type="button"
            role="switch"
            aria-checked={form.isTrending}
            onClick={() => setForm(prev => ({ ...prev, isTrending: !prev.isTrending }))}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-stone-500/40 ${
              form.isTrending
                ? 'bg-stone-900 dark:bg-stone-100 shadow-lg'
                : 'bg-slate-200 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-stone-900 shadow-md transition-transform duration-300 ${
                form.isTrending ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Discount Price */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">سعر الخصم (اختياري)</label>
          <input
            type="number"
            name="discountPrice"
            value={form.discountPrice}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="أقل من السعر الأصلي"
            className={`w-full px-4 py-3 border rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 ${
              form.discountPrice && form.price && parseFloat(form.discountPrice) >= parseFloat(form.price)
                ? 'border-red-400 dark:border-red-500 ring-2 ring-red-400/30'
                : 'border-slate-200 dark:border-slate-600'
            }`}
          />
          {form.discountPrice && form.price && parseFloat(form.discountPrice) >= parseFloat(form.price) && (
            <p className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              سعر الخصم يجب أن يكون أقل من السعر الأصلي
            </p>
          )}
          {form.discountPrice && form.price && parseFloat(form.discountPrice) < parseFloat(form.price) && (
            <p className="mt-1 text-xs text-emerald-500 font-medium">
              خصم {Math.round(((parseFloat(form.price) - parseFloat(form.discountPrice)) / parseFloat(form.price)) * 100)}%
            </p>
          )}
        </div>

        {/* Promotion Label */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">نص الترويج (اختياري)</label>
          <input
            type="text"
            name="promotionLabel"
            value={form.promotionLabel}
            onChange={handleChange}
            placeholder='مثال: "عرض محدود" أو "الأكثر مبيعاً"'
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
          />
        </div>
      </div>

      {/* القسم */}
      {!isEdit && (
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">القسم</label>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 appearance-none cursor-pointer bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="" disabled>اختر القسم</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* العلامة التجارية */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">العلامة التجارية (اختياري)</label>
        <select
          name="brandId"
          value={form.brandId}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 appearance-none cursor-pointer bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
        >
          <option value="">-- بدون علامة تجارية --</option>
          {brands.map(brand => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
      </div>

      {/* الروائح / عائلات العطور */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">الروائح (اختياري)</label>
        <ScentPicker
          scents={scents}
          value={form.scentIds}
          onChange={(scentIds) => setForm((prev) => ({ ...prev, scentIds }))}
        />
        <p className="text-[10px] text-slate-400 mt-1">يمكن اختيار أكثر من رائحة لنفس المنتج.</p>
      </div>

      {/* المواصفات (الخصائص الديناميكية) */}
      {categoryAttributes.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">مواصفات المنتج</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryAttributes.map(attr => {
              const val = form.attributes[attr.id] ?? '';
              const handleAttrChange = (val) => {
                setForm(prev => ({
                  ...prev,
                  attributes: { ...prev.attributes, [attr.id]: val }
                }));
              };

              let inputElement = null;

              if (attr.type === 'TEXT') {
                inputElement = (
                  <input
                    type="text"
                    value={val}
                    onChange={e => handleAttrChange(e.target.value)}
                    required={attr.isRequired}
                    placeholder="مثال: شرقي، خشبي..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 focus:ring-2 focus:ring-gold-500/40 text-slate-900 dark:text-white"
                  />
                );
              } else if (attr.type === 'NUMBER') {
                inputElement = (
                  <input
                    type="number"
                    value={val}
                    onChange={e => handleAttrChange(e.target.value)}
                    required={attr.isRequired}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 focus:ring-2 focus:ring-gold-500/40 text-slate-900 dark:text-white"
                  />
                );
              } else if (attr.type === 'BOOLEAN') {
                inputElement = (
                  <BooleanPicker
                    value={val}
                    onChange={handleAttrChange}
                    required={attr.isRequired}
                    trueLabel="نعم / يستخدم"
                    falseLabel="لا / لا يستخدم"
                  />
                );
              } else if (attr.type === 'SELECT') {
                const opts = parseAttrOptions(attr.options);
                inputElement = (
                  <OptionPicker
                    value={val}
                    onChange={handleAttrChange}
                    options={opts}
                    required={attr.isRequired}
                  />
                );
              } else if (attr.type === 'MULTI_SELECT') {
                const opts = parseAttrOptions(attr.options);
                inputElement = (
                  <OptionPicker
                    value={val}
                    onChange={handleAttrChange}
                    options={opts}
                    multiple
                    required={attr.isRequired}
                  />
                );
              }

              return (
                <div key={attr.id} className={attr.type === 'MULTI_SELECT' ? 'md:col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    {attr.name} {attr.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  {inputElement}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* حالة المنتج، الحالة، الكمية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">حالة العرض (الظهور)</label>
          <select
            name="status"
            value={form.status || 'Draft'}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 appearance-none cursor-pointer bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="Draft">مسودة (Draft)</option>
            <option value="Active">نشط (Active)</option>
            <option value="OutOfStock">نفدت الكمية (Out Of Stock)</option>
            <option value="Archived">مؤرشف (Archived)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">حالة المنتج</label>
          <div className="flex gap-2">
            {[
              { val: 1, label: 'جديد' },
              { val: 2, label: 'مستعمل' },
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, condition: opt.val }))}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  parseInt(form.condition) === opt.val
                    ? 'bg-gold-50 dark:bg-gold-900/30 border-gold-300 dark:border-gold-600 text-gold-700 dark:text-gold-300'
                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">الكمية بالمخزون</label>
          <input
            type="number"
            name="stockQuantity"
            value={form.stockQuantity}
            onChange={handleChange}
            min="0"
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">تنبيه المخزون المنخفض</label>
          <input
            type="number"
            name="lowStockThreshold"
            value={form.lowStockThreshold}
            onChange={handleChange}
            min="0"
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
          />
        </div>
      </div>

      {/* رفع الصور — Multi-Image Gallery */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">صور المنتج</label>
          <span className="text-[10px] text-slate-400">{form.imageUrls.length} / {MAX_IMAGES}</span>
        </div>

        {/* Thumbnail Grid */}
        {form.imageUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
            {form.imageUrls.map((url, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="relative group aspect-square rounded-xl overflow-hidden border-2 bg-slate-100 dark:bg-slate-800 flex-shrink-0"
                  style={{ borderColor: idx === 0 ? 'rgb(234 179 8)' : 'transparent' }}
                >
                  <img src={url} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                  {/* Overlay buttons */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                    {idx !== 0 && (
                      <button type="button" onClick={() => handleSetPrimary(idx)}
                        className="flex items-center gap-1 px-2 py-1 bg-gold-500 text-white text-[10px] font-bold rounded-lg w-full justify-center"
                        title="تعيين كصورة رئيسية"
                      >
                        <Star className="w-3 h-3" /> رئيسية
                      </button>
                    )}
                    <button type="button" onClick={() => handleRemoveImage(idx)}
                      className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg w-full justify-center"
                      title="حذف الصورة"
                    >
                      <X className="w-3 h-3" /> حذف
                    </button>
                  </div>
                  {/* Primary badge */}
                  {idx === 0 && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-gold-500 text-white text-[9px] font-bold rounded-md shadow">
                      رئيسية
                    </div>
                  )}
                </div>
                <input 
                  type="text" 
                  placeholder="وصف الصورة (Alt)" 
                  value={form.imageAltTexts[url] || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, imageAltTexts: { ...prev.imageAltTexts, [url]: e.target.value } }))}
                  className="w-full text-[10px] px-2 py-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>
            ))}
            {/* Loading placeholder */}
            {uploading && (
              <div className="aspect-square rounded-xl border-2 border-dashed border-gold-300 bg-gold-50 dark:bg-gold-900/20 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Drop Zone — only shown when under limit */}
        {form.imageUrls.length < MAX_IMAGES && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              dragActive
                ? 'border-gold-400 bg-gold-50 dark:bg-gold-900/20'
                : 'border-slate-200 dark:border-slate-600 bg-bone dark:bg-slate-700 hover:border-gold-300 hover:bg-gold-50/50 dark:hover:bg-gold-900/20'
            }`}
          >
            {uploading && form.imageUrls.length === 0 ? (
              <>
                <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
                <span className="text-sm font-medium text-gold-600">جاري رفع الصور...</span>
              </>
            ) : (
              <>
                <div className="p-3 bg-gold-100 dark:bg-gold-900/40 rounded-xl">
                  <ImagePlus className="w-6 h-6 text-gold-500" />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  {form.imageUrls.length === 0 ? 'اسحب الصور هنا أو اضغط للاختيار' : 'إضافة المزيد من الصور'}
                </span>
                <span className="text-[10px] text-slate-400">PNG, JPG — حد أقصى 5 ميجابايت لكل صورة — حتى {MAX_IMAGES} صور</span>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleImageUpload(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Manual URL input */}
        <div className="mt-2">
          <details className="text-xs">
            <summary className="text-slate-400 cursor-pointer hover:text-gold-500 transition-colors">أو أدخل رابط صورة يدوياً</summary>
            <div className="flex gap-2 mt-2">
              <input
                type="url"
                id="manual-image-url"
                placeholder="https://example.com/image.jpg"
                dir="ltr"
                className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 text-left"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('manual-image-url');
                  const url = input?.value?.trim();
                  if (url && form.imageUrls.length < MAX_IMAGES) {
                    setForm(prev => ({ ...prev, imageUrls: [...prev.imageUrls, url] }));
                    if (input) input.value = '';
                  }
                }}
                className="px-3 py-2 bg-gold-100 dark:bg-gold-900/40 text-gold-700 dark:text-gold-300 font-bold text-sm rounded-xl hover:bg-gold-200 transition-colors"
              >
                إضافة
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* الوصف */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">وصف المنتج</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          rows={4}
          placeholder="اكتب وصفاً تفصيلياً للمنتج..."
          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 resize-none"
        />
      </div>

      {/* SEO اختياري — خاص بهذا المنتج فقط */}
      <details className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-4">
        <summary className="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:text-gold-500 transition-colors list-none">
          SEO للمنتج (اختياري)
        </summary>
        <p className="text-[11px] text-slate-400 mt-2 mb-3 leading-relaxed">
          إعدادات SEO العامة للموقع (العنوان، الوصف، OG) من تبويب «تخصيص المتجر». هنا يمكنك تخصيص عنوان ووصف صفحة هذا المنتج فقط في نتائج البحث.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">عنوان Meta للمنتج</label>
            <input
              type="text"
              name="metaTitle"
              value={form.metaTitle}
              onChange={handleChange}
              placeholder="يُستخدم عنوان المنتج إذا تُرك فارغاً"
              className={adminInputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">وصف Meta للمنتج</label>
            <textarea
              name="metaDescription"
              value={form.metaDescription}
              onChange={handleChange}
              rows={2}
              placeholder="يُستخدم وصف المنتج إذا تُرك فارغاً"
              className={`${adminInputClass} resize-none min-h-[72px]`}
            />
          </div>
        </div>
      </details>

      {/* الأزرار */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3.5 bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500 transition-all shadow-lg shadow-gold-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isEdit ? 'جاري الحفظ...' : 'جاري النشر...'}
            </>
          ) : (
            isEdit ? 'حفظ التغييرات' : 'نشر المنتج'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
};

export default AddProductForm;
