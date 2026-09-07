import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
} from 'lucide-react';
import useSWR from 'swr';
import * as api from '../../services/api';
import CategoryAttributesPanel from '../../components/CategoryAttributesPanel';
import { AdminToolbar, AdminPrimaryButton, AdminGhostButton, AdminCard, AdminEmptyState, AdminLoading } from './AdminUI';

// Build a tree from a flat category list
function buildTree(categories) {
  const map = {};
  const roots = [];

  categories.forEach(cat => {
    map[cat.id] = { ...cat, _children: [] };
  });

  categories.forEach(cat => {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId]._children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  });

  // Sort each level by sortOrder
  const sortLevel = (nodes) => {
    nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    nodes.forEach(n => sortLevel(n._children));
    return nodes;
  };

  return sortLevel(roots);
}

// Recursive category tree row
const CategoryRow = ({ node, depth = 0, openCategoryForm, openAttributesPanel, onDelete, expandedIds, toggleExpanded }) => {
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
        {/* Indent spacer + expand toggle */}
        <div className="flex items-center flex-shrink-0" style={{ width: indent + 20 }}>
          {depth > 0 && (
            <span
              className="block w-4 border-l-2 border-b-2 border-slate-200 dark:border-slate-700 rounded-bl-md mr-2"
              style={{ height: 16, marginTop: -8, flexShrink: 0 }}
            />
          )}
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-gold-500 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors flex-shrink-0"
            >
              {isExpanded
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-6 flex-shrink-0" />
          )}
        </div>

        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-gold-50 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 flex items-center justify-center flex-shrink-0">
          {node.iconUrl
            ? <img src={node.iconUrl} alt={node.name} className="w-6 h-6 object-contain rounded" />
            : (hasChildren
              ? (isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />)
              : <Tag className="w-4 h-4" />)
          }
        </div>

        {/* Info */}
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

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => openAttributesPanel(node)}
            className="px-2 py-1.5 text-[11px] font-bold text-slate-500 hover:text-white hover:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors mr-1"
            title="إدارة الخصائص"
          >
            خصائص
          </button>
          <button
            onClick={() => openCategoryForm(node)}
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
            title="تعديل"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(node.id, node.name, hasChildren)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Children (collapsible) */}
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
            {node._children.map(child => (
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

const AdminCategoriesTab = ({ openCategoryForm }) => {
  const { data: categoriesRaw, isLoading, mutate } = useSWR(
    'allCategoriesAdmin',
    () => api.getCategories()
  );

  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedCategoryForAttrs, setSelectedCategoryForAttrs] = useState(null);

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!categoriesRaw) return;
    setExpandedIds(new Set(categoriesRaw.filter(c => c.parentId === null || !c.parentId).map(c => c.id)));
  };

  const collapseAll = () => setExpandedIds(new Set());

  const tree = useMemo(() => {
    if (!Array.isArray(categoriesRaw) || categoriesRaw.length === 0) return [];
    return buildTree(categoriesRaw);
  }, [categoriesRaw]);

  const handleDelete = async (id, name, hasChildren) => {
    if (hasChildren) {
      alert(`لا يمكن حذف تصنيف "${name}" لأنه يحتوي على أقسام فرعية. يرجى حذف أو نقل الأقسام الفرعية أولاً.`);
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف تصنيف "${name}"؟ سيتم حذف جميع منتجاته.`)) return;
    try {
      await api.deleteCategory(id);
      mutate();
      alert('تم حذف التصنيف');
    } catch (err) {
      alert('فشل حذف التصنيف: ' + (err.message || ''));
    }
  };

  return (
    <div>
      <AdminToolbar
        title="إدارة التصنيفات"
        subtitle={Array.isArray(categoriesRaw) ? `${categoriesRaw.length} تصنيف · ${tree.length} رئيسي` : undefined}
        icon={Tag}
        actions={
          <>
            {tree.length > 0 && (
              <>
                <AdminGhostButton onClick={expandAll}>توسيع الكل</AdminGhostButton>
                <AdminGhostButton onClick={collapseAll}>طي الكل</AdminGhostButton>
              </>
            )}
            <AdminPrimaryButton onClick={() => openCategoryForm(null)}>
              <Plus className="w-4 h-4" /> إضافة تصنيف
            </AdminPrimaryButton>
          </>
        }
      />

      {/* Tree */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <Tag className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">لا توجد تصنيفات</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">قم بإضافة أول تصنيف لترتيب منتجاتك</p>
          <button
            onClick={() => openCategoryForm(null)}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500 transition-colors shadow-lg shadow-gold-600/20"
          >
            <Plus className="w-5 h-5" /> إضافة تصنيف
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex-1">التصنيف / الرابط</span>
            <span className="w-16 text-left">المنتجات</span>
            <span className="w-16 text-left">الإجراءات</span>
          </div>
          {tree.map(rootNode => (
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

      {/* Attributes Panel */}
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
