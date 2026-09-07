/**
 * Derive SHEIN-style optionGroups from ProductVariant + VariantAttribute rows.
 * Does not change storage — read-only presentation helper.
 */

function attrId(attr) {
  return attr?.categoryAttributeId || attr?.categoryAttribute?.id || null;
}

function attrName(attr) {
  return attr?.categoryAttribute?.name || '';
}

function attrSlug(attr) {
  return attr?.categoryAttribute?.slug || '';
}

function attrSort(attr) {
  const n = attr?.categoryAttribute?.sortOrder;
  return typeof n === 'number' ? n : 0;
}

/**
 * @param {Array} variants Prisma variants with nested attributes.categoryAttribute
 * @returns {Array<{ id: string, name: string, slug: string, values: string[] }>}
 */
function buildOptionGroups(variants = []) {
  const groupMap = new Map();

  for (const variant of variants) {
    for (const attr of variant?.attributes || []) {
      const id = attrId(attr);
      if (!id) continue;
      const value = attr.value != null ? String(attr.value) : '';
      if (!value) continue;

      if (!groupMap.has(id)) {
        groupMap.set(id, {
          id,
          name: attrName(attr) || 'خيار',
          slug: attrSlug(attr) || id,
          sortOrder: attrSort(attr),
          values: [],
          _valueSet: new Set(),
        });
      }
      const group = groupMap.get(id);
      if (!group._valueSet.has(value)) {
        group._valueSet.add(value);
        group.values.push(value);
      }
    }
  }

  return Array.from(groupMap.values())
    .sort((a, b) => a.sortOrder - b.sortOrder || String(a.name).localeCompare(String(b.name)))
    .map(({ _valueSet, sortOrder, ...group }) => group);
}

/**
 * Attach optionGroups onto a product object (mutates shallow copy).
 */
function withOptionGroups(product) {
  if (!product) return product;
  const variants = product.variants || [];
  return {
    ...product,
    optionGroups: buildOptionGroups(variants),
  };
}

module.exports = {
  buildOptionGroups,
  withOptionGroups,
};
