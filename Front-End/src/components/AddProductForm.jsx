import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, ImagePlus, AlertCircle, Cloud, CheckCircle, Sparkles, Star, Search, ChevronDown } from 'lucide-react';
import * as api from '../services/api';
import { OptionPicker, BooleanPicker, parseAttrOptions, adminInputClass, adminSelectClass, AdminSwitch, AdminUploadProgress } from '../pages/admin/AdminUI';
import { formatNativePrice } from '../utils/currency';
import { ScentPicker } from './ScentPicker';
import {
  cartesianSelections,
  selectionKey,
  buildOptionGroups,
} from '../utils/variantOptions';

/** Searchable single-select for product categories */
function CategoryCombobox({ categories = [], value = '', onChange, required = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => categories.find((c) => c.id === value) || null,
    [categories, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.slug || '').toLowerCase().includes(q),
    );
  }, [categories, query]);

  useEffect(() => {
    const onOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const pick = (id) => {
    onChange?.(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
        التصنيف {required ? <span className="text-red-500">*</span> : null}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 text-right"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'font-semibold' : 'text-slate-400'}>
          {selected?.name || 'اختر التصنيف'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن تصنيف..."
                className="w-full pr-9 pl-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-slate-400 text-center">لا توجد نتائج</li>
            ) : (
              filtered.map((cat) => {
                const active = cat.id === value;
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(cat.id)}
                      className={`w-full text-right px-4 py-2.5 text-sm transition-colors ${
                        active
                          ? 'bg-gold-50 dark:bg-gold-900/30 text-gold-800 dark:text-gold-200 font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {cat.name}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function emptyVariantRow(defaults = {}) {
  return {
    sku: '',
    price: defaults.price || '',
    discountPrice: defaults.discountPrice || '',
    stockQuantity: 0,
    isActive: true,
    sortOrder: defaults.sortOrder || 0,
    imageUrl: '',
    attributes: {},
    ...defaults,
  };
}

function deriveGroupValuesFromVariants(variants = [], variantAttributes = []) {
  const map = {};
  for (const attr of variantAttributes) {
    map[attr.id] = [];
  }
  const groups = buildOptionGroups(
    (variants || []).map((v) => ({
      ...v,
      attributes: Object.entries(v.attributes || {}).map(([categoryAttributeId, value]) => {
        const meta = variantAttributes.find((a) => a.id === categoryAttributeId);
        return {
          categoryAttributeId,
          value,
          categoryAttribute: meta
            ? { id: meta.id, name: meta.name, slug: meta.slug, sortOrder: meta.sortOrder }
            : { id: categoryAttributeId },
        };
      }),
    })),
  );
  for (const g of groups) {
    map[g.id] = [...g.values];
  }
  // Prefer category SELECT options as starting set when no variants yet
  for (const attr of variantAttributes) {
    if ((map[attr.id] || []).length) continue;
    if (attr.type === 'SELECT' || attr.type === 'MULTI_SELECT') {
      map[attr.id] = parseAttrOptions(attr.options).map((o) => (typeof o === 'string' ? o : o.value || o.label)).filter(Boolean);
    }
  }
  return map;
}

const AddProductForm = ({ onSuccess, onCancel, editProduct, onDirtyChange }) => {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [scents, setScents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const dirtyNotifiedRef = useRef(false);

  const markDirty = () => {
    if (dirtyNotifiedRef.current) return;
    dirtyNotifiedRef.current = true;
    onDirtyChange?.(true);
  };

  // Duplicate opens the form with cloned fields but no id — must create, not update.
  const isEdit = Boolean(editProduct?.id);

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
  const [optionGroupValues, setOptionGroupValues] = useState({});
  const [newOptionDraft, setNewOptionDraft] = useState({});
  const [creatingAttr, setCreatingAttr] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrOptions, setNewAttrOptions] = useState('');
  const [creatingSpecAttr, setCreatingSpecAttr] = useState(false);
  const [newSpecAttrName, setNewSpecAttrName] = useState('');
  const [newSpecAttrOptions, setNewSpecAttrOptions] = useState('');

  const formRootRef = useRef(null);
  useEffect(() => {
    dirtyNotifiedRef.current = false;
    onDirtyChange?.(false);
  }, [editProduct?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset dirty when edit target changes

  useEffect(() => {
    const root = formRootRef.current;
    if (!root) return undefined;
    const onInteract = () => markDirty();
    root.addEventListener('input', onInteract, true);
    root.addEventListener('change', onInteract, true);
    root.addEventListener('click', onInteract, true);
    return () => {
      root.removeEventListener('input', onInteract, true);
      root.removeEventListener('change', onInteract, true);
      root.removeEventListener('click', onInteract, true);
    };
  }, []);

  // Fetch category attributes when category changes
  useEffect(() => {
    if (!form.categoryId) {
      setCategoryAttributes([]);
      setVariantAttributes([]);
      setOptionGroupValues({});
      return;
    }
    
    Promise.all([
      api.getCategoryAttributes(form.categoryId, 'PRODUCT,BOTH'),
      api.getCategoryAttributes(form.categoryId, 'VARIANT,BOTH')
    ])
      .then(([prodAttrs, varAttrs]) => {
        setCategoryAttributes(prodAttrs || []);
        setVariantAttributes(varAttrs || []);
        setOptionGroupValues(deriveGroupValuesFromVariants(form.variants, varAttrs || []));
      })
      .catch(err => console.error('Failed to load category attributes:', err));
  }, [form.categoryId]);

  // Re-hydrate option groups when edit product / category attrs are ready
  useEffect(() => {
    if (!variantAttributes.length) return;
    setOptionGroupValues(deriveGroupValuesFromVariants(form.variants, variantAttributes));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate from loaded attrs + current variants snapshot
  }, [editProduct?.id, variantAttributes]);

  const selectVariantAttrs = useMemo(
    () => variantAttributes.filter((a) => a.type === 'SELECT' || a.type === 'MULTI_SELECT' || a.type === 'TEXT'),
    [variantAttributes],
  );

  const toggleGroupValue = (attrId, value) => {
    setOptionGroupValues((prev) => {
      const current = prev[attrId] || [];
      const has = current.includes(value);
      return {
        ...prev,
        [attrId]: has ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const addCustomGroupValue = (attrId) => {
    const raw = (newOptionDraft[attrId] || '').trim();
    if (!raw) return;
    setOptionGroupValues((prev) => {
      const current = prev[attrId] || [];
      if (current.includes(raw)) return prev;
      return { ...prev, [attrId]: [...current, raw] };
    });
    setNewOptionDraft((prev) => ({ ...prev, [attrId]: '' }));
  };

  const generateCombinations = () => {
    const groups = selectVariantAttrs
      .map((attr) => ({
        id: attr.id,
        name: attr.name,
        values: optionGroupValues[attr.id] || [],
      }))
      .filter((g) => g.values.length > 0);

    if (!groups.length) {
      setError('حدد قيم الخيارات أولاً ثم أنشئ التركيبات');
      return;
    }

    const combos = cartesianSelections(groups);
    setForm((prev) => {
      const existingByKey = new Map();
      for (const v of prev.variants) {
        existingByKey.set(selectionKey(v.attributes || {}), v);
      }
      const nextVariants = combos.map((attrs, idx) => {
        const key = selectionKey(attrs);
        const existing = existingByKey.get(key);
        if (existing) {
          return { ...existing, attributes: attrs, sortOrder: idx };
        }
        const labelParts = groups.map((g) => attrs[g.id]).filter(Boolean);
        const skuHint = [prev.sku, ...labelParts].filter(Boolean).join('-').replace(/\s+/g, '').slice(0, 40);
        return emptyVariantRow({
          sku: skuHint,
          price: prev.price,
          discountPrice: prev.discountPrice,
          stockQuantity: 0,
          sortOrder: idx,
          attributes: attrs,
        });
      });
      return { ...prev, hasVariants: true, variants: nextVariants };
    });
    setError('');
  };

  const handleCreateVariantAttribute = async () => {
    if (!form.categoryId || !newAttrName.trim()) return;
    setCreatingAttr(true);
    try {
      const options = newAttrOptions
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await api.createCategoryAttribute(form.categoryId, {
        name: newAttrName.trim(),
        type: 'SELECT',
        scope: 'VARIANT',
        options,
        isRequired: false,
        isFilterable: true,
      });
      const varAttrs = await api.getCategoryAttributes(form.categoryId, 'VARIANT,BOTH');
      setVariantAttributes(varAttrs || []);
      setOptionGroupValues(deriveGroupValuesFromVariants(form.variants, varAttrs || []));
      setNewAttrName('');
      setNewAttrOptions('');
    } catch (err) {
      setError(err.message || 'فشل إنشاء خاصية المتغير');
    } finally {
      setCreatingAttr(false);
    }
  };

  const handleDeleteVariantAttribute = async (attr) => {
    if (!form.categoryId || !attr?.id) return;
    if (!window.confirm(`حذف الخاصية "${attr.name}"؟\nسيتم حذفها من التصنيف ومن كل المنتجات المرتبطة.`)) return;
    setCreatingAttr(true);
    try {
      await api.deleteCategoryAttribute(form.categoryId, attr.id);
      const varAttrs = await api.getCategoryAttributes(form.categoryId, 'VARIANT,BOTH');
      setVariantAttributes(varAttrs || []);
      setOptionGroupValues((prev) => {
        const next = { ...prev };
        delete next[attr.id];
        return next;
      });
      setForm((prev) => ({
        ...prev,
        variants: (prev.variants || []).map((v) => {
          const attributes = { ...(v.attributes || {}) };
          delete attributes[attr.id];
          return { ...v, attributes };
        }),
      }));
    } catch (err) {
      setError(err.message || 'فشل حذف الخاصية');
    } finally {
      setCreatingAttr(false);
    }
  };

  const handleCreateProductAttribute = async () => {
    if (!form.categoryId || !newSpecAttrName.trim()) return;
    setCreatingSpecAttr(true);
    try {
      const options = newSpecAttrOptions
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await api.createCategoryAttribute(form.categoryId, {
        name: newSpecAttrName.trim(),
        type: options.length > 0 ? 'SELECT' : 'TEXT',
        scope: 'PRODUCT',
        options,
        isRequired: false,
        isFilterable: true,
      });
      const prodAttrs = await api.getCategoryAttributes(form.categoryId, 'PRODUCT,BOTH');
      setCategoryAttributes(prodAttrs || []);
      setNewSpecAttrName('');
      setNewSpecAttrOptions('');
    } catch (err) {
      setError(err.message || 'فشل إنشاء مواصفة الوصف');
    } finally {
      setCreatingSpecAttr(false);
    }
  };

  const handleDeleteProductAttribute = async (attr) => {
    if (!form.categoryId || !attr?.id) return;
    if (!window.confirm(`حذف المواصفة "${attr.name}"؟\nسيتم حذفها من التصنيف ومن كل المنتجات المرتبطة.`)) return;
    setCreatingSpecAttr(true);
    try {
      await api.deleteCategoryAttribute(form.categoryId, attr.id);
      const prodAttrs = await api.getCategoryAttributes(form.categoryId, 'PRODUCT,BOTH');
      setCategoryAttributes(prodAttrs || []);
      setForm((prev) => {
        const attributes = { ...(prev.attributes || {}) };
        delete attributes[attr.id];
        return { ...prev, attributes };
      });
    } catch (err) {
      setError(err.message || 'فشل حذف المواصفة');
    } finally {
      setCreatingSpecAttr(false);
    }
  };

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

    if (!form.title?.trim() || form.title.trim().length < 3) {
      setError('عنوان المنتج يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (!form.description?.trim() || form.description.trim().length < 10) {
      setError('وصف المنتج يجب أن يكون 10 أحرف على الأقل');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setError('يرجى إدخال سعر صحيح');
      return;
    }
    if (!form.categoryId) {
      setError('يرجى اختيار القسم');
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

    const stockForSave = form.hasVariants
      ? form.variants.reduce((sum, v) => sum + (parseInt(v.stockQuantity, 10) || 0), 0)
      : (parseInt(form.stockQuantity, 10) || 0);

    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await api.updateProduct(editProduct.id, {
          title: form.title,
          description: form.description,
          price: parseFloat(form.price),
          currency: form.currency,
          stockQuantity: stockForSave,
          condition: parseInt(form.condition, 10) || 1,
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
          lowStockThreshold: parseInt(form.lowStockThreshold, 10) || 5,
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
          condition: parseInt(form.condition, 10) || 1,
          stockQuantity: stockForSave,
          categoryId: form.categoryId,
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
          lowStockThreshold: parseInt(form.lowStockThreshold, 10) || 5,
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
    <form ref={formRootRef} onSubmit={handleSubmit} noValidate className="p-5 sm:p-6 space-y-4">

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
      {form.price !== '' && form.price != null && Number(form.price) > 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
          المعاينة:{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatNativePrice(form.price, form.currency)}
          </span>
        </p>
      ) : null}

      {/* التصنيف — قبل المتغيرات لأن خصائص اللون/المقاس تعتمد عليه */}
      <CategoryCombobox
        categories={categories}
        value={form.categoryId}
        required
        onChange={(categoryId) => setForm((prev) => ({ ...prev, categoryId }))}
      />

      {/* ── إعدادات الظهور ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 bg-bone dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">حالة العرض (الظهور)</label>
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
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {form.categoryId ? 'تفعيل خيارات متعددة للمنتج' : 'اختر التصنيف أولاً'}
            </span>
          </div>
          <AdminSwitch
            checked={form.hasVariants}
            disabled={!form.categoryId}
            aria-label="يحتوي على متغيرات"
            onChange={(next) => setForm((prev) => ({ ...prev, hasVariants: next }))}
          />
        </div>
      </div>

      {/* ── إدارة المتغيرات (Variants Manager) ── */}
      {form.hasVariants && (
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-500" />
              متغيرات المنتج (خيارات متعددة)
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={generateCombinations}
                className="px-3 py-1.5 bg-stone-900 text-white font-bold rounded-lg text-xs hover:bg-stone-800 transition-colors"
              >
                توليد التركيبات
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    variants: [
                      ...prev.variants,
                      emptyVariantRow({
                        price: form.price,
                        discountPrice: form.discountPrice,
                        sortOrder: prev.variants.length,
                      }),
                    ]
                  }));
                }}
                className="px-3 py-1.5 bg-gold-50 text-gold-700 font-bold rounded-lg text-xs hover:bg-gold-100 transition-colors"
              >
                + إضافة صف
              </button>
            </div>
          </div>

          {/* Option groups */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/60 p-3 space-y-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">مجموعات الخيارات (مثل اللون ثم المقاس)</p>
            {!form.categoryId ? (
              <p className="text-xs text-slate-500">اختر التصنيف أولاً لتحميل خصائص المتغيرات.</p>
            ) : selectVariantAttrs.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-amber-700 dark:text-amber-300">لا توجد خصائص متغير لهذا التصنيف. أنشئ خاصية SELECT (لون / مقاس…).</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newAttrName}
                    onChange={(e) => setNewAttrName(e.target.value)}
                    placeholder="اسم الخاصية (مثال: اللون)"
                    className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={newAttrOptions}
                    onChange={(e) => setNewAttrOptions(e.target.value)}
                    placeholder="القيم مفصولة بفاصلة (أسود، أبيض)"
                    className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800 sm:col-span-1"
                  />
                  <button
                    type="button"
                    disabled={creatingAttr || !newAttrName.trim()}
                    onClick={handleCreateVariantAttribute}
                    className="px-3 py-1.5 bg-gold-500 text-white font-bold rounded-lg text-xs disabled:opacity-50"
                  >
                    {creatingAttr ? 'جاري الإنشاء…' : 'إنشاء خاصية'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {selectVariantAttrs.map((attr) => {
                  const catalogOpts = parseAttrOptions(attr.options)
                    .map((o) => (typeof o === 'string' ? o : o.value || o.label))
                    .filter(Boolean);
                  const selected = optionGroupValues[attr.id] || [];
                  const allValues = Array.from(new Set([...catalogOpts, ...selected]));
                  return (
                    <div key={attr.id}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{attr.name}</p>
                        <button
                          type="button"
                          disabled={creatingAttr}
                          onClick={() => handleDeleteVariantAttribute(attr)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                          title={`حذف خاصية ${attr.name}`}
                        >
                          <X className="w-3 h-3" />
                          حذف
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {allValues.map((value) => {
                          const on = selected.includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => toggleGroupValue(attr.id, value)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                                on
                                  ? 'bg-stone-900 text-white border-stone-900'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newOptionDraft[attr.id] || ''}
                          onChange={(e) => setNewOptionDraft((prev) => ({ ...prev, [attr.id]: e.target.value }))}
                          placeholder={`قيمة إضافية لـ ${attr.name}`}
                          className="flex-1 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomGroupValue(attr.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => addCustomGroupValue(attr.id)}
                          className="px-2 py-1 text-xs font-bold text-gold-700 bg-gold-50 rounded-lg"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newAttrName}
                    onChange={(e) => setNewAttrName(e.target.value)}
                    placeholder="خاصية جديدة (مثال: المقاس)"
                    className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={newAttrOptions}
                    onChange={(e) => setNewAttrOptions(e.target.value)}
                    placeholder="قيم مفصولة بفاصلة"
                    className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    disabled={creatingAttr || !newAttrName.trim()}
                    onClick={handleCreateVariantAttribute}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 font-bold rounded-lg text-xs disabled:opacity-50"
                  >
                    + خاصية للتصنيف
                  </button>
                </div>
              </div>
            )}
          </div>

          {form.variants.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500">
              لا توجد تركيبات بعد — حدّد قيم الخيارات ثم اضغط «توليد التركيبات».
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-slate-500">جدول التركيبات ({form.variants.length})</p>
              {form.variants.map((variant, index) => {
                const comboLabel = selectVariantAttrs
                  .map((attr) => variant.attributes?.[attr.id])
                  .filter(Boolean)
                  .join(' / ');
                return (
                <div key={variant.id || index} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl relative">
                  {comboLabel ? (
                    <div className="col-span-full text-[11px] font-bold text-stone-700 dark:text-stone-200 mb-0.5">
                      {comboLabel}
                    </div>
                  ) : null}
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
                        const extra = val && !opts.some((o) => (typeof o === 'string' ? o : o.value) === val)
                          ? [val]
                          : [];
                        inputElement = (
                          <OptionPicker
                            value={val}
                            onChange={handleAttrChange}
                            options={[...opts, ...extra]}
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
              );
              })}
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
          <AdminSwitch
            checked={form.isPromoted}
            aria-label="منتج مروج"
            onChange={(next) => setForm((prev) => ({ ...prev, isPromoted: next }))}
          />
        </div>

        {/* Toggle Switch for isTrending */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">تريند</label>
          <AdminSwitch
            checked={form.isTrending}
            aria-label="تريند"
            onChange={(next) => setForm((prev) => ({ ...prev, isTrending: next }))}
          />
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

      {/* الروائح / عائلات الروائح */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">الروائح (اختياري)</label>
        <ScentPicker
          scents={scents}
          value={form.scentIds}
          onChange={(scentIds) => setForm((prev) => ({ ...prev, scentIds }))}
        />
        <p className="text-[10px] text-slate-400 mt-1">يمكن اختيار أكثر من رائحة لنفس المنتج.</p>
      </div>

      {/* المواصفات تظهر في نافذة «الوصف» على صفحة المنتج */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-slate-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">مواصفات الوصف</h3>
            <p className="text-[11px] text-slate-500">تظهر للزبون عند الضغط على «الوصف» (المادة، الأبعاد…)</p>
          </div>
        </div>

        {!form.categoryId ? (
          <p className="text-xs text-slate-500">اختر التصنيف أولاً.</p>
        ) : categoryAttributes.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-amber-700 dark:text-amber-300">لا توجد مواصفات لهذا التصنيف. أنشئ حقولاً مثل المادة أو الأبعاد.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newSpecAttrName}
                onChange={(e) => setNewSpecAttrName(e.target.value)}
                placeholder="اسم المواصفة (مثال: المادة)"
                className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={newSpecAttrOptions}
                onChange={(e) => setNewSpecAttrOptions(e.target.value)}
                placeholder="قيم اختيارية بفاصلة (أو فارغ لنص حر)"
                className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
              />
              <button
                type="button"
                disabled={creatingSpecAttr || !newSpecAttrName.trim()}
                onClick={handleCreateProductAttribute}
                className="px-3 py-1.5 bg-gold-500 text-white font-bold rounded-lg text-xs disabled:opacity-50"
              >
                {creatingSpecAttr ? 'جاري الإنشاء…' : 'إنشاء مواصفة'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryAttributes.map(attr => {
                const val = form.attributes[attr.id] ?? '';
                const handleAttrChange = (nextVal) => {
                  setForm(prev => ({
                    ...prev,
                    attributes: { ...prev.attributes, [attr.id]: nextVal }
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
                      placeholder="أدخل القيمة"
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
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                        {attr.name} {attr.isRequired && <span className="text-red-500">*</span>}
                      </label>
                      <button
                        type="button"
                        disabled={creatingSpecAttr}
                        onClick={() => handleDeleteProductAttribute(attr)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                        title={`حذف مواصفة ${attr.name}`}
                      >
                        <X className="w-3 h-3" />
                        حذف
                      </button>
                    </div>
                    {inputElement}
                  </div>
                );
              })}
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newSpecAttrName}
                onChange={(e) => setNewSpecAttrName(e.target.value)}
                placeholder="مواصفة جديدة (مثال: الأبعاد)"
                className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={newSpecAttrOptions}
                onChange={(e) => setNewSpecAttrOptions(e.target.value)}
                placeholder="قيم SELECT بفاصلة (اختياري)"
                className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800"
              />
              <button
                type="button"
                disabled={creatingSpecAttr || !newSpecAttrName.trim()}
                onClick={handleCreateProductAttribute}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 font-bold rounded-lg text-xs disabled:opacity-50"
              >
                + مواصفة للتصنيف
              </button>
            </div>
          </>
        )}
      </div>

      {/* حالة القطعة، الكمية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">حالة القطعة (جديد / مستعمل)</label>
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
          {form.hasVariants ? (
            <div className="w-full px-4 py-3 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">
                {form.variants.reduce((sum, v) => sum + (parseInt(v.stockQuantity, 10) || 0), 0)}
              </span>
              <span className="text-xs text-slate-500 mr-2">
                {' '}مجموع كميات المتغيرات ({form.variants.length} متغير) — عدّل الكمية في صفوف المتغيرات أعلاه
              </span>
            </div>
          ) : (
            <input
              type="number"
              name="stockQuantity"
              value={form.stockQuantity}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
            />
          )}
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
              <div className="aspect-square rounded-xl border-2 border-dashed border-gold-300 bg-gold-50 dark:bg-gold-900/20 flex flex-col items-end justify-end overflow-hidden relative">
                <AdminUploadProgress active className="!static w-full" />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gold-600">رفع...</span>
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
                <div className="w-full max-w-[12rem] mb-2">
                  <AdminUploadProgress active className="!static rounded-full" />
                </div>
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
