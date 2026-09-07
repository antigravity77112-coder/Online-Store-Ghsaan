import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { useAuth } from '../context/AuthContext';",
  "import { useAuth } from '../context/AuthContext';\nimport useSWR from 'swr';"
);

// 2. State & Hooks logic replacement
const stateLogicOld = `
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Products
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Categories
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', iconUrl: '' });

  // Exchange Rates
  const [rates, setRates] = useState({ USD_to_YER_Sanaa: 0, USD_to_YER_Aden: 0 });
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesSaving, setRatesSaving] = useState(false);

  // ─── Store Info ───
  const [storeInfo, setStoreInfo] = useState({
    aboutUsText: '', contactEmail: '', contactPhone: '',
    facebookUrl: '', twitterUrl: '', whatsappUrl: '', instagramUrl: ''
  });
  const [storeInfoLoading, setStoreInfoLoading] = useState(false);
  const [storeInfoSaving, setStoreInfoSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/auth', { replace: true });
      return;
    }
    loadDashboard();
  }, [isAuthenticated, isAdmin]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ─── Dashboard ───
  async function loadDashboard() {
    setStatsLoading(true);
    try {
      const data = await api.getAdminDashboard();
      setStats(data);
    } catch (err) {
      setError('تعذر تحميل الإحصائيات: ' + (err.message || ''));
    }
    setStatsLoading(false);
  }

  // ─── Users ───
  async function loadUsers() {
    setUsersLoading(true);
    try {
      const data = await api.getAdminUsers();
      setUsers(data || []);
    } catch (err) {
      setError('تعذر تحميل المستخدمين: ' + (err.message || ''));
    }
    setUsersLoading(false);
  }
`;

const newLogic1 = `
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // SWR Conditional Fetching
  const isAuth = isAuthenticated && isAdmin;
  const { data: stats, isLoading: statsLoading, mutate: mutateStats } = useSWR(isAuth && activeTab === 'dashboard' ? 'adminDashboard' : null, api.getAdminDashboard);
  const { data: usersData, isLoading: usersLoading, mutate: mutateUsers } = useSWR(isAuth && activeTab === 'users' ? 'adminUsers' : null, api.getAdminUsers);
  const users = usersData || [];
  
  const { data: productsData, isLoading: productsLoading, mutate: mutateProducts } = useSWR(isAuth && activeTab === 'products' ? 'adminProducts' : null, api.getAdminProducts);
  const products = productsData || [];
  
  const { data: categoriesData, isLoading: categoriesLoading, mutate: mutateCategories } = useSWR(isAuth && activeTab === 'categories' ? 'adminCategories' : null, api.getCategories);
  const categories = categoriesData || [];

  const { data: ratesData, isLoading: ratesLoading, mutate: mutateRates } = useSWR(isAuth && activeTab === 'rates' ? 'adminRates' : null, api.getExchangeRates);
  const [rates, setRates] = useState({ USD_to_YER_Sanaa: 0, USD_to_YER_Aden: 0 });
  const [ratesSaving, setRatesSaving] = useState(false);

  useEffect(() => {
    if (ratesData) setRates({
      USD_to_YER_Sanaa: ratesData.usD_to_YER_Sanaa ?? ratesData.USD_to_YER_Sanaa ?? 0,
      USD_to_YER_Aden: ratesData.usD_to_YER_Aden ?? ratesData.USD_to_YER_Aden ?? 0
    });
  }, [ratesData]);

  const { data: storeInfoData, isLoading: storeInfoLoading, mutate: mutateStoreInfo } = useSWR(isAuth && activeTab === 'storeInfo' ? 'adminStoreInfo' : null, api.getStoreInfo);
  const [storeInfo, setStoreInfo] = useState({
    aboutUsText: '', contactEmail: '', contactPhone: '',
    facebookUrl: '', twitterUrl: '', whatsappUrl: '', instagramUrl: ''
  });
  const [storeInfoSaving, setStoreInfoSaving] = useState(false);

  useEffect(() => {
    if (storeInfoData) setStoreInfo({
      aboutUsText: storeInfoData.aboutUsText || '',
      contactEmail: storeInfoData.contactEmail || '',
      contactPhone: storeInfoData.contactPhone || '',
      facebookUrl: storeInfoData.facebookUrl || '',
      twitterUrl: storeInfoData.twitterUrl || '',
      whatsappUrl: storeInfoData.whatsappUrl || '',
      instagramUrl: storeInfoData.instagramUrl || '',
    });
  }, [storeInfoData]);

  // Modals & Forms local state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', iconUrl: '' });

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/auth', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };
`;
// Note: We use string split and replaces to target exactly the components
content = content.replace(stateLogicOld, newLogic1);

// 3. User Mutate Updates
content = content.replace(/setUsers\(prev => prev.map\(u => u\.id === id \? \{ \.\.\.u, isBlocked: \!u\.isBlocked \} : u\)\);/g, "mutateUsers();");
content = content.replace(/setUsers\(prev => prev.map\(u => u\.id === id \? \{ \.\.\.u, role: newRole \} : u\)\);/g, "mutateUsers();");
content = content.replace(/setUsers\(prev => prev.filter\(u => u\.id !== id\)\);/g, "mutateUsers();");

// 4. Products Mutate Updates
const loadProductsLogic = `
  // ─── Products ───
  async function loadProducts() {
    setProductsLoading(true);
    try {
      const data = await api.getAdminProducts();
      setProducts(data || []);
    } catch (err) {
      setError('تعذر تحميل المنتجات: ' + (err.message || ''));
    }
    setProductsLoading(false);
  }
`;
content = content.replace(loadProductsLogic, `  // ─── Products ───\n`);

content = content.replace(/setProducts\(prev => prev.filter\(p => p\.id !== id\)\);/g, "mutateProducts();");
content = content.replace(/loadProducts\(\);/g, "mutateProducts();");

// 5. Categories Mutate Updates
const loadCategoriesLogic = `
  // ─── Categories ───
  async function loadCategories() {
    setCategoriesLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data || []);
    } catch (err) {
      setError('تعذر تحميل التصنيفات: ' + (err.message || ''));
    }
    setCategoriesLoading(false);
  }
`;
content = content.replace(loadCategoriesLogic, `  // ─── Categories ───\n`);

content = content.replace(/setCategories\(prev => prev.map\(c =>/g, "// SWR replaces this");
content = content.replace(/c\.id === editingCategory\.id \? \{ \.\.\.c, name: categoryForm\.name, iconUrl: categoryForm\.iconUrl \} : c/g, "");
content = content.replace(/\)\);\n        showSuccess/g, "mutateCategories();\n        showSuccess");

content = content.replace(/setCategories\(prev => \[\.\.\.prev, \{ id: newId, name: categoryForm\.name, iconUrl: categoryForm\.iconUrl \}\]\);/g, "mutateCategories();");
content = content.replace(/setCategories\(prev => prev.filter\(c => c\.id !== id\)\);/g, "mutateCategories();");

// 6. Rates & StoreInfo Updates
const loadRatesLogic = `
  // ─── Exchange Rates ───
  async function loadRates() {
    setRatesLoading(true);
    try {
      const data = await api.getExchangeRates();
      setRates({
        USD_to_YER_Sanaa: data.usD_to_YER_Sanaa ?? data.USD_to_YER_Sanaa ?? 0,
        USD_to_YER_Aden: data.usD_to_YER_Aden ?? data.USD_to_YER_Aden ?? 0,
      });
    } catch (err) {
      setError('تعذر تحميل أسعار الصرف: ' + (err.message || ''));
    }
    setRatesLoading(false);
  }
`;
content = content.replace(loadRatesLogic, `  // ─── Exchange Rates ───\n`);

const loadStoreInfoLogic = `
  // ─── Store Info ───
  async function loadStoreInfo() {
    setStoreInfoLoading(true);
    try {
      const data = await api.getStoreInfo();
      setStoreInfo({
        aboutUsText: data.aboutUsText || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        facebookUrl: data.facebookUrl || '',
        twitterUrl: data.twitterUrl || '',
        whatsappUrl: data.whatsappUrl || '',
        instagramUrl: data.instagramUrl || '',
      });
    } catch (err) {
      setError('تعذر تحميل معلومات المتجر: ' + (err.message || ''));
    }
    setStoreInfoLoading(false);
  }
`;
content = content.replace(loadStoreInfoLogic, `  // ─── Store Info ───\n`);

const handleTabChangeLogic = `
  // ─── Tab Change ───
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'users' && users.length === 0) loadUsers();
    if (tab === 'products' && products.length === 0) loadProducts();
    if (tab === 'categories' && categories.length === 0) loadCategories();
    if (tab === 'rates') loadRates();
    if (tab === 'storeInfo' && !storeInfo.aboutUsText) loadStoreInfo();
  };
`;
content = content.replace(handleTabChangeLogic, `
  // ─── Tab Change ───
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // SWR handles fetching automatically based on activeTab
  };
`);

// 7. Dark Mode & Mobile CSS Fixes
// Fix white backgrounds without dark mode
content = content.replace(/'bg-white rounded-2xl border p-4 sm:p-5 /g, "'bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-4 sm:p-5 ");
content = content.replace(/'bg-indigo-50 text-indigo-600 border-indigo-100'/g, "'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50'");
content = content.replace(/'bg-emerald-50 text-emerald-600 border-emerald-100'/g, "'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50'");
content = content.replace(/'bg-amber-50 text-amber-600 border-amber-100'/g, "'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50'");
content = content.replace(/'bg-blue-50 text-blue-600 border-blue-100'/g, "'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/50'");
content = content.replace(/'bg-rose-50 text-rose-600 border-rose-100'/g, "'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/50'");
content = content.replace(/'bg-purple-50 text-purple-600 border-purple-100'/g, "'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800/50'");

// Fix Category Cards
content = content.replace(/className="bg-white rounded-2xl border border-slate-200 p-5/g, 'className="bg-white dark:bg-slate-900 dark:border-slate-800 rounded-2xl border border-slate-200 p-5');

// Fix text colors for titles (إدارة المستخدمين, etc)
content = content.replace(/text-slate-900 mb-6/g, "text-slate-900 dark:text-white mb-6");

// Fix Empty states
content = content.replace(/bg-white rounded-2xl border border-dashed border-slate-300/g, "bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700");
content = content.replace(/text-slate-800 mb-2/g, "text-slate-800 dark:text-slate-200 mb-2");

// Fix modals background
content = content.replace(/shadow-2xl"/g, 'shadow-2xl dark:border dark:border-slate-700"');
content = content.replace(/border-b border-slate-100"/g, 'border-b border-slate-100 dark:border-slate-700"');

// Fix Product image container padding/bg
content = content.replace(/bg-slate-100 flex-shrink-0 border border-slate-200/g, "bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700");

// Fix Alerts (Exchange Rate alert)
content = content.replace(/bg-amber-50 border border-amber-200 /g, "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 ");
content = content.replace(/text-amber-800 text-sm/g, "text-amber-800 dark:text-amber-400 text-sm");
content = content.replace(/text-amber-600 mt-0\.5/g, "text-amber-600 dark:text-amber-500 mt-0.5");

// Mobile layout fixes (flex-row to flex-col on small screens)
content = content.replace(/flex flex-col sm:flex-row gap-3 sm:items-center/g, "flex flex-col md:flex-row gap-4 md:items-center");
content = content.replace(/ flex gap-4 items-center /g, " flex flex-col sm:flex-row gap-4 sm:items-center ");
content = content.replace(/flex flex-wrap items-center gap-2 mt-1\.5/g, "flex flex-wrap items-center gap-2 mt-2");
content = content.replace(/flex gap-1/g, "flex flex-wrap gap-1");
// Update Category item inner flex to wrap
content = content.replace(/flex items-center justify-between/g, "flex flex-col sm:flex-row gap-3 sm:items-center justify-between");
// Make users/products action buttons wrap
content = content.replace(/flex items-center gap-1 flex-shrink-0/g, "flex items-center gap-1 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start border-t sm:border-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0 mt-2 sm:mt-0");

// Fix Tabs Scroll UI
content = content.replace(/flex gap-1 bg-slate-100/g, "flex gap-1 bg-slate-100 hide-scrollbar");

// Save back
fs.writeFileSync('src/pages/AdminDashboard.jsx', content, 'utf8');

console.log('AdminDashboard.jsx refactored successfully!');
