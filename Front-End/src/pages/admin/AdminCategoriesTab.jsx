import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
} from 'lucide-react';
import useSWR from 'swr';
import * as api from '../../services/api';
import CategoryAttributesPanel from '../../components/CategoryAttributesPanel';
import { matchesSearch } from '../../utils/arabicSearch';
import {
  AdminToolbar,
  AdminPrimaryButton,
  AdminGhostButton,
  AdminSearch,
  AdminFilterChips,
  AdminLoading,
} from './AdminUI';

/** Keep matching categories and every ancestor so the tree stays coherent. */
function filterCategoriesFlat(categories, searchQuery, statusFilter) {
  if (!Array.isArray(categories) || categories.length === 0) return [];

  const byStatus = categories.filter((c) => {
    if (statusFilter === 'active') return c.isActive !== false;
    if (statusFilter === 'hidden') return c.isActive === false;
    return true;
  });

  const q = searchQuery.trim();
  if (!q) return byStatus;

  const byId = new Map(categories.map((c) => [c.id, c]));
  const keep = new Set();

  for (const cat of byStatus) {
    if (!matchesSearch(q, cat.name, cat.slug)) continue;
    keep.add(cat.id);
    let parentId = cat.parentId;
    while (parentId && byId.has(parentId)) {
      keep.add(parentId);
      parentId = byId.get(parentId).parentId;
    }
  }

  return categories.filter((c) => keep.has(c.id));
}

function buildTree(categories) {
  const map = {};
  const roots = [];

  categories.forEach((cat) => {
    map[cat.id] = { ...cat, _children: [] };
  });

  categories.forEach((cat) => {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId]._children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  });

  const sortLevel = (nodes) => {
    nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    nodes.forEach((n) => sortLevel(n._children));
    return nodes;
  };

  return sortLevel(roots);
}

const CategoryRow = ({
  node,
  depth = 0,
  openCategoryForm,
  openAttributesPanel,
  onDelete,
  expandedIds,
  toggleExpanded,
}) => {
  const hasChildren = node._children && node._children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const indent = depth * 24;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-3 px-4 py-3 group hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
      >
        <div className="flex items-center flex-shrink-0" style={{ width: indent + 20 }}>
          {depth > 0 && (
            <span
              className="block w-4 border-l-2 border-b-2 border-slate-200 dark:border-slate-700 rounded-bl-md mr-2"
              style={{ height: 16, marginTop: -8, flexShrink: 0 }}
            />
          )}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpanded(node.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-gold-500 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              {isExpanded
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-6 flex-shrink-0" />
          )}
        </div>

        <div className="w-9 h-9 rounded-xl bg-gold-50 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 flex items-center justify-center flex-shrink-0">
          {node.iconUrl
            ? <img src={node.iconUrl} alt={node.name} className="w-6 h-6 object-contain rounded" />
            : (hasChildren
              ? (isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />)
              : <Tag className="w-4 h-4" />)
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{node.name}</span>
            {node.isActive === false && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">مخفي</span>
            )}
            {hasChildren && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gold-50 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 rounded-md">
                {node._children.length} فرعي
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
              /{node.slug || '—'}
            </span>
            <span className="text-[11px] text-slate-400">{node.productsCount ?? 0} منتج</span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => openAttributesPanel(node)}
            className="px-2 py-1.5 min-h-[36px] text-[11px] font-bold text-slate-500 hover:text-white hover:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors mr-1"
            title="إدارة الخصائص"
          >
            خصائص
          </button>
          <button
            type="button"
            onClick={() => openCategoryForm(node)}
            className="p-2 min-w-[36px] min-h-[36px] text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
            title="تعديل"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id, node.name, hasChildren)}
            className="p-2 min-w-[36px] min-h-[36px] text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            key={`children-${node.id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node._children.map((child) => (
              <CategoryRow
                key={child.id}
                node={child}
                depth={depth + 1}
                openCategoryForm={openCategoryForm}
                openAttributesPanel={openAttributesPanel}
                onDelete={onDelete}
                expandedIds={expandedIds}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const AdminCategoriesTab = ({ openCategoryForm, addDisabled = false }) => {
  const { data: categoriesRaw, isLoading, mutate } = useSWR(
    'allCategoriesAdmin',
    () => api.getCategories(),
  );

  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedCategoryForAttrs, setSelectedCategoryForAttrs] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!categoriesRaw) return;
    setExpandedIds(new Set(
      categoriesRaw.filter((c) => c.parentId === null || !c.parentId).map((c) => c.id),
    ));
  };

  const collapseAll = () => setExpandedIds(new Set());

  const stats = useMemo(() => {
    const list = Array.isArray(categoriesRaw) ? categoriesRaw : [];
    const active = list.filter((c) => c.isActive !== false).length;
    return { total: list.length, active, hidden: list.length - active };
  }, [categoriesRaw]);

  const filteredFlat = useMemo(
    () => filterCategoriesFlat(categoriesRaw || [], searchQuery, statusFilter),
    [categoriesRaw, searchQuery, statusFilter],
  );

  const tree = useMemo(() => {
    if (filteredFlat.length === 0) return [];
    return buildTree(filteredFlat);
  }, [filteredFlat]);

  // Auto-expand when searching so matches under collapsed parents are visible
  React.useEffect(() => {
    if (!searchQuery.trim() || filteredFlat.length === 0) return;
    setExpandedIds(new Set(filteredFlat.map((c) => c.id)));
  }, [searchQuery, filteredFlat]);

  const handleDelete = async (id, name, hasChildren) => {
    if (hasChildren) {
      alert(`لا يمكن حذف قسم "${name}" لأنه يحتوي على أقسام فرعية. يرجى حذف أو نقل الأقسام الفرعية أولاً.`);
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف قسم "${name}"؟ سيتم حذف جميع منتجاته.`)) return;
    try {
      await api.deleteCategory(id);
      mutate();
      alert('تم حذف القسم');
    } catch (err) {
      alert('فشل حذف القسم: ' + (err.message || ''));
    }
  };

  const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== 'all';

  return (
    <div>
      <AdminToolbar
        title="إدارة الأقسام"
        subtitle={Array.isArray(categoriesRaw) ? `${stats.total} قسم · ${stats.active} نشط` : undefined}
        icon={Tag}
        actions={
          <>
            {tree.length > 0 && (
              <>
                <AdminGhostButton onClick={expandAll}>توسيع الكل</AdminGhostButton>
                <AdminGhostButton onClick={collapseAll}>طي الكل</AdminGhostButton>
              </>
            )}
            <AdminPrimaryButton onClick={() => openCategoryForm(null)} disabled={addDisabled}>
              <Plus className="w-4 h-4" /> إضافة قسم
            </AdminPrimaryButton>
          </>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <AdminSearch
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن قسم بالاسم أو الرابط..."
            className="flex-1"
          />
          <AdminFilterChips
            value={statusFilter}
            onChange={setStatusFilter}
            items={[
              { value: 'all', label: `الكل (${stats.total})` },
              { value: 'active', label: `نشطة (${stats.active})` },
              { value: 'hidden', label: `مخفية (${stats.hidden})` },
            ]}
          />
        </div>
      </AdminToolbar>

      {isLoading ? (
        <AdminLoading label="جاري تحميل الأقسام..." />
      ) : tree.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <Tag className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {hasFilters ? 'لا توجد نتائج' : 'لا توجد أقسام'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {hasFilters
              ? 'جرّب تغيير البحث أو الفلتر'
              : 'قم بإضافة أول قسم لترتيب منتجاتك'}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="px-5 py-2.5 min-h-[44px] text-sm font-bold text-gold-700 dark:text-gold-300 hover:bg-gold-50 dark:hover:bg-gold-900/20 rounded-xl transition-colors"
            >
              مسح الفلاتر
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openCategoryForm(null)}
              disabled={addDisabled}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500 transition-colors shadow-lg shadow-gold-600/20 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" /> إضافة قسم
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex-1">القسم / الرابط</span>
            <span className="w-16 text-left">المنتجات</span>
            <span className="w-16 text-left">الإجراءات</span>
          </div>
          {tree.map((rootNode) => (
            <CategoryRow
              key={rootNode.id}
              node={rootNode}
              depth={0}
              openCategoryForm={openCategoryForm}
              openAttributesPanel={setSelectedCategoryForAttrs}
              onDelete={handleDelete}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedCategoryForAttrs && (
          <CategoryAttributesPanel
            category={selectedCategoryForAttrs}
            onClose={() => setSelectedCategoryForAttrs(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCategoriesTab;
