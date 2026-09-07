import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// 1. Add Search Icon
if (!content.includes('Search,')) {
    content = content.replace('LayoutDashboard', 'LayoutDashboard, Search');
}

// 2. Add Search Query State
const stateLogicOld1 = `const [activeTab, setActiveTab] = useState('dashboard');`;
content = content.replace(stateLogicOld1, `const [activeTab, setActiveTab] = useState('dashboard');\n  const [searchQuery, setSearchQuery] = useState('');`);

// 3. Clear Search on Tab Change
const handleTabChangeLogic = `const handleTabChange = (tab) => {
    setActiveTab(tab);
    // SWR handles fetching automatically based on activeTab
  };`;
const handleTabChangeLogicNew = `const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    // SWR handles fetching automatically based on activeTab
  };`;
content = content.replace(handleTabChangeLogic, handleTabChangeLogicNew);

// 4. Add Filter logic to Users
const usersTabHeaderOld = `            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">إدارة المستخدمين</h2>`;
const usersTabHeaderNew = `            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">إدارة المستخدمين</h2>
              <div className="relative w-full sm:w-72">
                <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث عن مستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white transition-all"
                />
              </div>
            </div>`;
content = content.replace(usersTabHeaderOld, usersTabHeaderNew);

const usersMapOld = `{users.map(u => (`;
const usersMapNew = `{users.filter(u => 
                  u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  u.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(u => (`;
content = content.replace(usersMapOld, usersMapNew);

// 5. Add Filter logic to Products
const productsTabHeaderOld = `            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">إدارة المنتجات</h2>
              <button`;
const productsTabHeaderNew = `            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">إدارة المنتجات</h2>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث في المنتجات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white transition-all"
                  />
                </div>
                <button`;
content = content.replace(productsTabHeaderOld, productsTabHeaderNew);

const productsMapOld = `{products.map(product => (`;
const productsMapNew = `{products.filter(p => 
                  p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  p.sellerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(product => (`;
content = content.replace(productsMapOld, productsMapNew);

// 6. Add Filter logic to Categories
const categoriesTabHeaderOld = `            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">إدارة التصنيفات</h2>
              <button`;
const categoriesTabHeaderNew = `            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">إدارة التصنيفات</h2>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث في التصنيفات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white transition-all"
                  />
                </div>
                <button`;
content = content.replace(categoriesTabHeaderOld, categoriesTabHeaderNew);

const categoriesMapOld = `{categories.map(cat => (`;
const categoriesMapNew = `{categories.filter(cat => 
                  cat.name?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(cat => (`;
content = content.replace(categoriesMapOld, categoriesMapNew);

content = content.replace(/className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-red-50 border border-red-200 text-red-600/g, 'className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400');
content = content.replace(/className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-green-50 border border-green-200 text-green-600/g, 'className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50 text-green-600 dark:text-green-400');

// Ensure Store Info tab is in the array definitively
if (!content.includes("{ id: 'storeInfo'")) {
    const ratesTabEntry = "{ id: 'rates', label: 'أسعار الصرف', icon: DollarSign },";
    content = content.replace(ratesTabEntry, ratesTabEntry + "\n    { id: 'storeInfo', label: 'معلومات المتجر', icon: Info },");
}

fs.writeFileSync('src/pages/AdminDashboard.jsx', content, 'utf8');
console.log('Filters and fixes applied to AdminDashboard.jsx!');
