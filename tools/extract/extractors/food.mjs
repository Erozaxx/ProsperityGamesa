import { makeMeta } from '../lib/provenance.mjs';

export function extractFood() {
  const items = [
    { id: 'bread', description: 'Baked, warm, and delicious goods', name: 'Bread', type: 'food' },
    { id: 'cheese', description: 'Who knew aging milk can have such delightful consequences?', name: 'Cheese', type: 'food' },
    { id: 'fish', description: 'Tasty fishies, kitties like', name: 'Fish', type: 'food' },
    { id: 'fruit', description: 'Tasty food from trees, vines, and bushes', name: 'Fruit', type: 'food' },
    { id: 'meat', description: 'Animals can be so tasty', name: 'Meat', type: 'food' },
    { id: 'vegetable', description: 'Nutritious, often tasty, but pretty important source of sustenance', name: 'Vegetable', type: 'food' },
  ];
  return {
    _meta: makeMeta('doc/original_source/modules/prosperity/lists/listfood.js', 'extracted'),
    food: items,
  };
}
