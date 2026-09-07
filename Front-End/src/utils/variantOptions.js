/**
 * SHEIN-style multi-option variant helpers.
 * Variants remain ProductVariant + VariantAttribute rows; these helpers
 * derive option groups and resolve / availability-check combinations.
 */

function attrId(attr) {
  return attr?.categoryAttributeId || attr?.categoryAttribute?.id || null;
}

function attrName(attr) {
  return attr?.categoryAttribute?.name || attr?.name || '';
}

function attrSlug(attr) {
  return attr?.categoryAttribute?.slug || attr?.slug || '';
}

function attrSort(attr) {
  const n = attr?.categoryAttribute?.sortOrder;
  return typeof n === 'number' ? n : 0;
}

function isVariantSelectable(variant, { requireInStock = false } = {}) {
  if (!variant) return false;
  if (variant.isActive === false) return false;
  if (requireInStock && Number(variant.stockQuantity) <= 0) return false;
  return true;
}

/**
 * Build option groups from a product's variants.
 * @returns {{ id: string, name: string, slug: string, sortOrder: number, values: string[] }[]}
 */
export function buildOptionGroups(variants = []) {
  const groupMap = new Map();

  for (const variant of variants) {
    const attrs = variant?.attributes || [];
    for (const attr of attrs) {
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
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ar'))
    .map(({ _valueSet, ...group }) => group);
}

/**
 * Map of categoryAttributeId -> value for a variant.
 */
export function getVariantSelectionMap(variant) {
  const map = {};
  for (const attr of variant?.attributes || []) {
    const id = attrId(attr);
    if (id && attr.value != null) map[id] = String(attr.value);
  }
  return map;
}

/**
 * Human-readable options object { Color: "Black", Size: "M" }.
 */
export function getVariantOptionsLabelMap(variant) {
  const map = {};
  for (const attr of variant?.attributes || []) {
    const name = attrName(attr);
    if (name && attr.value != null) map[name] = String(attr.value);
  }
  return map;
}

/**
 * Find the variant that exactly matches all selected option values.
 * @param {object[]} variants
 * @param {Record<string, string>} selections - { [categoryAttributeId]: value }
 */
export function findMatchingVariant(variants = [], selections = {}) {
  const entries = Object.entries(selections).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return null;

  return (
    variants.find((variant) => {
      if (variant.isActive === false) return false;
      const map = getVariantSelectionMap(variant);
      return entries.every(([id, value]) => map[id] === String(value));
    }) || null
  );
}

/**
 * Whether a value in a group is available given current selections
 * (other groups' picks). Used for SHEIN-style cascading disable.
 */
export function isValueAvailable(
  variants = [],
  selections = {},
  groupId,
  value,
  { requireInStock = true } = {},
) {
  const next = { ...selections, [groupId]: String(value) };

  return variants.some((variant) => {
    if (!isVariantSelectable(variant, { requireInStock: false })) return false;
    if (requireInStock && Number(variant.stockQuantity) <= 0) {
      // Still "exists" but OOS — treat as available for selection UI only when requireInStock=false
    }
    const map = getVariantSelectionMap(variant);
    const matches = Object.entries(next).every(([id, val]) => map[id] === String(val));
    if (!matches) return false;
    if (requireInStock) return Number(variant.stockQuantity) > 0;
    return true;
  });
}

/**
 * True when every option group has a selection.
 */
export function isSelectionComplete(optionGroups = [], selections = {}) {
  if (!optionGroups.length) return true;
  return optionGroups.every((g) => selections[g.id] != null && selections[g.id] !== '');
}

/**
 * Cartesian product of group values for admin combo generation.
 * @param {{ id: string, name?: string, values: string[] }[]} groups
 * @returns {Record<string, string>[]} selections maps
 */
export function cartesianSelections(groups = []) {
  const usable = groups.filter((g) => g.id && Array.isArray(g.values) && g.values.length > 0);
  if (!usable.length) return [];

  return usable.reduce(
    (acc, group) => {
      const next = [];
      for (const prev of acc) {
        for (const value of group.values) {
          next.push({ ...prev, [group.id]: String(value) });
        }
      }
      return next;
    },
    [{}],
  );
}

/**
 * Build a stable key for a selections map (sorted by attr id).
 */
export function selectionKey(selections = {}) {
  return Object.keys(selections)
    .sort()
    .map((id) => `${id}=${selections[id]}`)
    .join('|');
}

/**
 * Legacy flat label for WhatsApp / fallbacks.
 */
export function formatVariantLabel(variant) {
  const opts = getVariantOptionsLabelMap(variant);
  const parts = Object.values(opts);
  if (parts.length) return parts.join(' - ');
  return variant?.sku || 'متغير';
}

/**
 * Whether variants have structured attributes (multi-option capable).
 */
export function variantsHaveStructuredAttributes(variants = []) {
  return variants.some((v) => Array.isArray(v.attributes) && v.attributes.length > 0);
}
