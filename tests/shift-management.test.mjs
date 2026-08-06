import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!inlineScript) throw new Error('Inline script not found');

// Event wiring and page initialization need a browser. The shift model and actions
// are defined before this marker and can be tested independently with Node.
const testableSource = inlineScript.split('    // Навигация')[0];
const context = vm.createContext({
  assert,
  console,
  confirm: () => true,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
});

vm.runInContext(testableSource, context);
vm.runInContext(
  `
    const testCategories = [{
      id: 'cat',
      name: 'Категория',
      products: [{ id: 'product', name: 'Товар', price: 100 }],
    }];

    const legacy = normalizeDataShape({
      categories: testCategories,
      sales: {},
      salesLog: [{
        id: 'legacy-sale',
        productId: 'product',
        productName: 'Товар',
        categoryName: 'Категория',
        price: 100,
        quantity: 1,
        method: 'cash',
        ts: 1000,
      }],
      meta: {},
    });
    assert.equal(legacy.shifts.length, 1);
    assert.equal(legacy.salesLog[0].shiftId, legacy.currentShiftId);

    data = normalizeDataShape({
      categories: testCategories,
      sales: {},
      shifts: [
        { id: 'old', startedAt: 1000, endedAt: 2000 },
        { id: 'current', startedAt: 2000, endedAt: null },
      ],
      currentShiftId: 'current',
      salesLog: [
        {
          id: 'old-sale', productId: 'product', productName: 'Товар', categoryName: 'Категория',
          price: 100, quantity: 2, method: 'cash', ts: 1500, shiftId: 'old',
        },
        {
          id: 'current-sale', productId: 'product', productName: 'Товар', categoryName: 'Категория',
          price: 100, quantity: 3, method: 'qr', ts: 2500, shiftId: 'current',
        },
      ],
      meta: { lastWriteTs: 2500, deletedSaleIds: [], deletedShiftIds: [] },
    });
    assert.equal(computeReport().grandTotal, 300);
    assert.equal(computeReport('old').grandTotal, 200);

    saveData = () => {};
    renderReport = () => {};
    renderSales = () => {};
    renderOperations = () => {};
    showToast = () => {};
    currentCart = [{ productId: 'product' }];
    startNewShift();
    assert.equal(data.shifts.length, 3);
    assert.equal(data.salesLog.length, 2);
    assert.equal(currentCart.length, 0);
    assert.notEqual(data.currentShiftId, 'current');
    assert.ok(findShift('current').endedAt);
    assert.equal(computeReport().grandTotal, 0);

    selectedReportShiftId = 'old';
    deleteSelectedShift();
    assert.equal(findShift('old'), null);
    assert.equal(data.salesLog.some((entry) => entry.shiftId === 'old'), false);
    assert.equal(data.meta.deletedShiftIds.includes('old'), true);
    assert.equal(data.meta.deletedSaleIds.includes('old-sale'), true);

    const preferred = normalizeDataShape(data);
    const backup = normalizeDataShape({
      categories: testCategories,
      sales: {},
      shifts: [{ id: 'old', startedAt: 1000, endedAt: 2000 }, ...data.shifts],
      currentShiftId: data.currentShiftId,
      salesLog: [{
        id: 'old-sale', productId: 'product', productName: 'Товар', categoryName: 'Категория',
        price: 100, quantity: 2, method: 'cash', ts: 1500, shiftId: 'old',
      }],
      meta: { lastWriteTs: 2000, deletedSaleIds: [], deletedShiftIds: [] },
    });
    const merged = mergeDataVariants(preferred, [backup]);
    assert.equal(merged.shifts.some((shift) => shift.id === 'old'), false);
    assert.equal(merged.salesLog.some((entry) => entry.shiftId === 'old'), false);
  `,
  context
);

console.log('shift-management tests passed');
