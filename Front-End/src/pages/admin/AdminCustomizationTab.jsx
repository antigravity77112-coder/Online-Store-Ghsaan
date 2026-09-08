import React, { useState, useRef } from 'react';
import {
  AdminToolbar, AdminCard, adminInputClass, AdminPrimaryButton,
} from './AdminUI';
import {
  Save, Loader2, Palette, Image, Globe, Phone, Share2, Search,
  Home, FileText, Info, Upload, RotateCcw,
} from 'lucide-react';
import * as api from '../../services/api';
import { DEFAULT_SITE_CONFIG } from '../../config/siteConfigDefaults';
import { THEME_COLOR_DETAILS } from '../../config/themeTokens';

const SECTIONS = [
  { id: 'general', label: 'عام', icon: Info },
  { id: 'branding', label: 'الهوية', icon: Image },
  { id: 'theme', label: 'الألوان', icon: Palette },
  { id: 'homepage', label: 'الرئيسية', icon: Home },
  { id: 'contact', label: 'التواصل', icon: Phone },
  { id: 'social', label: 'التواصل الاجتماعي', icon: Share2 },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'footer', label: 'التذييل', icon: FileText },
  { id: 'advanced', label: 'متقدم', icon: Globe },
];


function ThemeColorGuide() {
  return (
    <div className="mb-5 rounded-xl border border-site-border/70 dark:border-site-border-dark/70 overflow-hidden">
      <div className="px-3 py-2 bg-site-accent-soft dark:bg-site-accent-soft-dark border-b border-site-border/50 dark:border-site-border-dark/50">
        <p className="text-xs font-bold text-site-text">ماذا يغيّر كل لون؟</p>
        <p className="text-[10px] text-site-muted mt-0.5">دليل سريع — ما الذي يتأثر عند تغيير كل لون في الموقع</p>
      </div>
      <div className="divide-y divide-site-border/40 dark:divide-site-border-dark/40">
        {THEME_COLOR_DETAILS.map((item) => (
          <div key={item.key} className="grid grid-cols-[88px_1fr] sm:grid-cols-[100px_1fr] gap-2 px-3 py-2.5 text-xs">
            <span className="font-bold text-site-text">{item.label}</span>
            <span className="text-site-muted leading-relaxed">{item.appliesTo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorField({ label, detail, value, onChange }) {
  return (
    <div className="p-3 rounded-xl border border-site-border/60 dark:border-site-border-dark/60 bg-site-surface/40 dark:bg-site-surface-dark/40 space-y-2">
      <div className="flex items-start gap-2.5">
        <input
          type="color"
          value={value || '#EA0001'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border border-site-border flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-site-text">{label}</p>
          {detail && (
            <p className="text-[11px] text-site-muted leading-relaxed mt-1">{detail}</p>
          )}
        </div>
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`${adminInputClass} font-mono text-sm`}
        dir="ltr"
        placeholder="#EA0001"
      />
    </div>
  );
}

const WEB_ASSET_FIELDS = [
  { key: 'logoUrl', label: 'شعار الموقع (فاتح)', sizeHint: '192×192 أو 512×512 px — PNG شفاف' },
  { key: 'logoDarkUrl', label: 'شعار الموقع (داكن)', sizeHint: '192×192 أو 512×512 px — PNG شفاف' },
  { key: 'faviconUrl', label: 'أيقونة المفضلة', sizeHint: '32×32 أو 192×192 px — PNG/ICO' },
  { key: 'ogImageUrl', label: 'صورة OG', sizeHint: '1200×630 px — JPG/PNG' },
];

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function AssetUpload({ field, label, sizeHint, url, onUploaded, uploading, setUploading }) {
  const inputRef = useRef(null);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
    try {
      const res = await api.uploadConfigAsset(file, field);
      onUploaded(field, res.url);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
        {url ? <img src={url} alt="" className="w-full h-full object-contain" /> : <Image className="w-6 h-6 text-slate-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</p>
          {sizeHint && (
            <span className="text-[10px] text-slate-400 font-normal" dir="ltr">{sizeHint}</span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 truncate" dir="ltr">{url || 'لم يُرفع بعد'}</p>
      </div>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading === field} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 flex items-center gap-1">
        {uploading === field ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        رفع
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

const AdminCustomizationTab = ({ config, setConfig, onSave, saving }) => {
  const [section, setSection] = useState('general');
  const [uploading, setUploading] = useState(null);

  const set = (path, value) => {
    setConfig((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...cur[keys[i]] };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const setTheme = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      themeConfig: { ...(prev.themeConfig || DEFAULT_SITE_CONFIG.theme), [key]: value },
    }));
  };

  const setHomeSection = (key, field, value) => {
    setConfig((prev) => ({
      ...prev,
      homepageConfig: {
        ...(prev.homepageConfig || DEFAULT_SITE_CONFIG.homepage),
        sections: {
          ...(prev.homepageConfig?.sections || DEFAULT_SITE_CONFIG.homepage.sections),
          [key]: {
            ...(prev.homepageConfig?.sections?.[key] || DEFAULT_SITE_CONFIG.homepage.sections[key]),
            [field]: value,
          },
        },
      },
    }));
  };

  const resetTheme = () => {
    setConfig((prev) => ({ ...prev, themeConfig: { ...DEFAULT_SITE_CONFIG.theme } }));
  };

  const onAssetUploaded = (field, url) => {
    setConfig((prev) => ({ ...prev, [field]: url }));
  };

  const theme = config.themeConfig || DEFAULT_SITE_CONFIG.theme;
  const homepage = config.homepageConfig || DEFAULT_SITE_CONFIG.homepage;

  return (
    <div className="space-y-4 pb-24">
      <AdminToolbar title="تخصيص المتجر" subtitle="إدارة الهوية والألوان والمحتوى من مكان واحد" icon={Palette} />

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSection(s.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${section === s.id ? 'bg-gold-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {section === 'general' && (
        <AdminCard>
          <Field label="اسم الموقع"><input className={adminInputClass} value={config.siteName || ''} onChange={(e) => set('siteName', e.target.value)} /></Field>
          <Field label="الاسم المختصر"><input className={adminInputClass} value={config.siteShortName || ''} onChange={(e) => set('siteShortName', e.target.value)} /></Field>
          <Field label="اسم التطبيق"><input className={adminInputClass} value={config.appName || ''} onChange={(e) => set('appName', e.target.value)} /></Field>
          <Field label="الشعار (Tagline)"><input className={adminInputClass} value={config.tagline || ''} onChange={(e) => set('tagline', e.target.value)} /></Field>
          <Field label="وصف المتجر"><textarea className={`${adminInputClass} min-h-[80px]`} value={config.siteDescription || ''} onChange={(e) => set('siteDescription', e.target.value)} /></Field>
        </AdminCard>
      )}

      {section === 'branding' && (
        <AdminCard>
          <p className="text-xs text-slate-500 mb-4">
            شعارات وصور الموقع تظهر في الهيدر والتذييل وSEO. يُفضّل PNG شفاف للشعارات.
          </p>

          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> صور الموقع
          </p>
          <div className="space-y-3">
            {WEB_ASSET_FIELDS.map((a) => (
              <AssetUpload key={a.key} field={a.key} label={a.label} sizeHint={a.sizeHint} url={config[a.key]} onUploaded={onAssetUploaded} uploading={uploading} setUploading={setUploading} />
            ))}
          </div>
        </AdminCard>
      )}

      {section === 'theme' && (
        <AdminCard>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-bold">ألوان الهوية</p>
            <button type="button" onClick={resetTheme} className="text-xs font-bold text-slate-500 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> استعادة الافتراضي</button>
          </div>
          <ThemeColorGuide />
          <div className="grid gap-3 sm:grid-cols-2">
            {THEME_COLOR_DETAILS.map((f) => (
              <ColorField
                key={f.key}
                label={f.label}
                detail={f.appliesTo}
                value={theme[f.key]}
                onChange={(v) => setTheme(f.key, v)}
              />
            ))}
          </div>
        </AdminCard>
      )}

      {section === 'homepage' && (
        <AdminCard>
          <Field label="عرض شريط العروض">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={homepage.offerBeltVisible !== false} onChange={(e) => setConfig((p) => ({ ...p, homepageConfig: { ...homepage, offerBeltVisible: e.target.checked } }))} />
              إظهار شريط العروض
            </label>
          </Field>
          {Object.entries(homepage.sections || {}).map(([key, sec]) => (
            <div key={key} className="mb-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase text-slate-400">{key}</span>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={sec.visible !== false} onChange={(e) => setHomeSection(key, 'visible', e.target.checked)} />
                  ظاهر
                </label>
              </div>
              <input className={`${adminInputClass} mb-2`} placeholder="العنوان" value={sec.title || ''} onChange={(e) => setHomeSection(key, 'title', e.target.value)} />
              <input className={adminInputClass} placeholder="العنوان الفرعي" value={sec.subtitle || ''} onChange={(e) => setHomeSection(key, 'subtitle', e.target.value)} />
            </div>
          ))}
          <p className="text-xs text-slate-400 mt-2">لإدارة صور البانر والهيرو، استخدم تبويب «الإعلانات».</p>
        </AdminCard>
      )}

      {section === 'contact' && (
        <AdminCard>
          <Field label="الهاتف"><input className={adminInputClass} value={config.contactPhone || ''} onChange={(e) => set('contactPhone', e.target.value)} dir="ltr" /></Field>
          <Field label="واتساب (رابط)"><input className={adminInputClass} value={config.whatsappUrl || ''} onChange={(e) => set('whatsappUrl', e.target.value)} dir="ltr" placeholder="https://wa.me/967..." /></Field>
          <Field label="البريد"><input className={adminInputClass} value={config.contactEmail || ''} onChange={(e) => set('contactEmail', e.target.value)} dir="ltr" /></Field>
          <Field label="العنوان"><textarea className={`${adminInputClass} min-h-[60px]`} value={config.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="رابط الخريطة"><input className={adminInputClass} value={config.mapUrl || ''} onChange={(e) => set('mapUrl', e.target.value)} dir="ltr" /></Field>
        </AdminCard>
      )}

      {section === 'social' && (
        <AdminCard>
          <Field label="Facebook"><input className={adminInputClass} value={config.facebookUrl || ''} onChange={(e) => set('facebookUrl', e.target.value)} dir="ltr" /></Field>
          <Field label="Instagram"><input className={adminInputClass} value={config.instagramUrl || ''} onChange={(e) => set('instagramUrl', e.target.value)} dir="ltr" /></Field>
          <Field label="TikTok"><input className={adminInputClass} value={config.tiktokUrl || ''} onChange={(e) => set('tiktokUrl', e.target.value)} dir="ltr" /></Field>
          <Field label="Twitter / X"><input className={adminInputClass} value={config.twitterUrl || ''} onChange={(e) => set('twitterUrl', e.target.value)} dir="ltr" /></Field>
          <Field label="YouTube"><input className={adminInputClass} value={config.youtubeUrl || ''} onChange={(e) => set('youtubeUrl', e.target.value)} dir="ltr" /></Field>
        </AdminCard>
      )}

      {section === 'seo' && (
        <AdminCard>
          <Field label="عنوان SEO"><input className={adminInputClass} value={config.seoTitle || ''} onChange={(e) => set('seoTitle', e.target.value)} /></Field>
          <Field label="وصف SEO"><textarea className={`${adminInputClass} min-h-[80px]`} value={config.seoDescription || ''} onChange={(e) => set('seoDescription', e.target.value)} /></Field>
          <Field label="OG Title"><input className={adminInputClass} value={config.ogTitle || ''} onChange={(e) => set('ogTitle', e.target.value)} /></Field>
          <Field label="OG Description"><textarea className={`${adminInputClass} min-h-[60px]`} value={config.ogDescription || ''} onChange={(e) => set('ogDescription', e.target.value)} /></Field>
        </AdminCard>
      )}

      {section === 'footer' && (
        <AdminCard>
          <Field label="نص التذييل"><textarea className={`${adminInputClass} min-h-[80px]`} value={config.footerText || ''} onChange={(e) => set('footerText', e.target.value)} /></Field>
          <Field label="حقوق النشر"><input className={adminInputClass} value={config.copyrightText || ''} onChange={(e) => set('copyrightText', e.target.value)} /></Field>
          <Field label="نص «من نحن»"><textarea className={`${adminInputClass} min-h-[100px]`} value={config.aboutUsText || ''} onChange={(e) => set('aboutUsText', e.target.value)} /></Field>
          <Field label="نص العروض/الشحن"><input className={adminInputClass} value={config.shippingOfferText || ''} onChange={(e) => set('shippingOfferText', e.target.value)} /></Field>
        </AdminCard>
      )}

      {section === 'advanced' && (
        <AdminCard>
          <p className="text-sm text-site-muted">
            لتصدير أو استعادة قاعدة البيانات، استخدم تبويب <strong className="text-site-text">نسخ احتياطي</strong> من القائمة الجانبية.
          </p>
        </AdminCard>
      )}

      {section !== 'advanced' && (
        <div className="fixed bottom-6 left-6 z-40">
          <AdminPrimaryButton onClick={onSave} disabled={saving} className="shadow-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التخصيص
          </AdminPrimaryButton>
        </div>
      )}
    </div>
  );
};

export default AdminCustomizationTab;
