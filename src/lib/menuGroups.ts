import { Category, MenuItem } from '../types/restaurant';

/** Filter only data; the HTML still controls its own rendering and navigation. */
export function filterMenuGroup(categories: Category[], products: MenuItem[], groupId: string) {
  if (groupId === 'all') return { categories, products };
  const filteredCategories = categories.filter(category => category.id === 'all' || category.menuGroupId === groupId);
  const categoryIds = new Set(filteredCategories.filter(category => category.id !== 'all').map(category => category.id));
  return { categories: filteredCategories, products: products.filter(product => categoryIds.has(product.categoryId)) };
}
