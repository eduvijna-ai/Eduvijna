/**
 * Admin Inventory Management — web InventoryTab school-wide parity.
 * Items · Purchase Orders · Stock Movements (CRUD + soft-deactivate).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  inventoryItemsApi,
  purchaseOrdersApi,
  stockMovementsApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export type AdminInventoryTab = 'items' | 'orders' | 'movements';

export type InventoryItemRow = {
  id: number;
  itemName: string;
  itemCode: string;
  category: string;
  unit: string;
  quantity: number;
  minStockLevel: number;
  unitPrice: number;
  location: string;
  supplier: string;
  description: string;
  isActive: boolean;
};

export type PurchaseOrderRow = {
  id: number;
  orderNumber: string;
  supplier: string;
  orderDate: string;
  expectedDate: string;
  totalAmount: number;
  items: unknown[];
  status: string;
  remarks: string;
  isActive: boolean;
};

export type StockMovementRow = {
  id: number;
  itemId: number;
  movementType: string;
  quantity: number;
  referenceType: string;
  remarks: string;
  movementDate: string;
  createdAt: string;
  isActive: boolean;
};

export type ItemForm = {
  itemName: string;
  category: string;
  unit: string;
  quantity: number;
  minStockLevel: number;
  unitPrice: number;
  location: string;
  supplier: string;
  description: string;
};

export type PurchaseOrderForm = {
  orderNumber: string;
  supplier: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  expectedDate: string;
  itemsText: string;
  remarks: string;
};

export type StockMovementForm = {
  itemId: string;
  movementType: string;
  quantity: number;
  referenceType: string;
  remarks: string;
};

const PER_PAGE = 25;

function mapItem(r: Record<string, unknown>): InventoryItemRow {
  return {
    id: pickNumber(r.id),
    itemName: pickString(r.item_name),
    itemCode: pickString(r.item_code),
    category: pickString(r.category, 'general'),
    unit: pickString(r.unit, 'piece'),
    quantity: pickNumber(r.quantity),
    minStockLevel: pickNumber(r.min_stock_level, 5),
    unitPrice: pickNumber(r.unit_price),
    location: pickString(r.location),
    supplier: pickString(r.supplier),
    description: pickString(r.description),
    isActive: r.is_active !== false,
  };
}

function mapPo(r: Record<string, unknown>): PurchaseOrderRow {
  return {
    id: pickNumber(r.id),
    orderNumber: pickString(r.order_number),
    supplier: pickString(r.supplier),
    orderDate: pickString(r.order_date),
    expectedDate: pickString(r.expected_date),
    totalAmount: pickNumber(r.total_amount),
    items: Array.isArray(r.items) ? r.items : [],
    status: pickString(r.status, 'draft'),
    remarks: pickString(r.remarks),
    isActive: r.is_active !== false,
  };
}

function mapMovement(r: Record<string, unknown>): StockMovementRow {
  return {
    id: pickNumber(r.id),
    itemId: pickNumber(r.item_id),
    movementType: pickString(r.movement_type, 'purchase'),
    quantity: pickNumber(r.quantity),
    referenceType: pickString(r.reference_type),
    remarks: pickString(r.remarks),
    movementDate: pickString(r.movement_date),
    createdAt: pickString(r.created_at),
    isActive: r.is_active !== false,
  };
}

function pickTotal(raw: unknown, fallback: number): number {
  if (raw && typeof raw === 'object' && 'total' in (raw as object)) {
    return pickNumber((raw as Record<string, unknown>).total, fallback);
  }
  return fallback;
}

export function useAdminInventoryData() {
  const { schoolId: sid } = useSchoolsSession();
  const schoolId = sid ?? undefined;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  /** Catalog for movement item picker (up to 200, matching web). */
  const [itemCatalog, setItemCatalog] = useState<InventoryItemRow[]>([]);

  const [itemTotal, setItemTotal] = useState(0);
  const [orderTotal, setOrderTotal] = useState(0);
  const [movementTotal, setMovementTotal] = useState(0);

  const [itemPage, setItemPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);

  const [itemQuery, setItemQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');

  const loadItems = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await inventoryItemsApi.list({
        q: itemQuery.trim() || undefined,
        category: categoryFilter || undefined,
        page: itemPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const list = safeList<Record<string, unknown>>(raw).map(mapItem);
      setItems(list);
      setItemTotal(pickTotal(raw, list.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load items'));
      setItems([]);
      setItemTotal(0);
    }
  }, [schoolId, itemPage, itemQuery, categoryFilter]);

  const loadOrders = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await purchaseOrdersApi.list({
        status: poStatusFilter || undefined,
        page: orderPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const list = safeList<Record<string, unknown>>(raw).map(mapPo);
      setOrders(list);
      setOrderTotal(pickTotal(raw, list.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load purchase orders'));
      setOrders([]);
      setOrderTotal(0);
    }
  }, [schoolId, orderPage, poStatusFilter]);

  const loadMovements = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await stockMovementsApi.list({
        movement_type: movementTypeFilter || undefined,
        page: movementPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const list = safeList<Record<string, unknown>>(raw).map(mapMovement);
      setMovements(list);
      setMovementTotal(pickTotal(raw, list.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load movements'));
      setMovements([]);
      setMovementTotal(0);
    }
  }, [schoolId, movementPage, movementTypeFilter]);

  const loadItemCatalog = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await inventoryItemsApi.list({
        per_page: 200,
        school_id: schoolId,
      });
      setItemCatalog(safeList<Record<string, unknown>>(raw).map(mapItem));
    } catch {
      setItemCatalog([]);
    }
  }, [schoolId]);

  const bootstrap = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    if (!schoolId) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      await Promise.all([loadItems(), loadOrders(), loadMovements(), loadItemCatalog()]);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
    // Intentionally only schoolId — page/filter reloads happen in dedicated effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadItems();
  }, [status, loadItems]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadOrders();
  }, [status, loadOrders]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadMovements();
  }, [status, loadMovements]);

  const setItemSearch = useCallback((q: string) => {
    setItemQuery(q);
    setItemPage(1);
  }, []);

  const setCategory = useCallback((c: string) => {
    setCategoryFilter(c);
    setItemPage(1);
  }, []);

  const setPoStatus = useCallback((s: string) => {
    setPoStatusFilter((prev) => (prev === s ? '' : s));
    setOrderPage(1);
  }, []);

  const setMovementType = useCallback((t: string) => {
    setMovementTypeFilter((prev) => (prev === t ? '' : t));
    setMovementPage(1);
  }, []);

  const itemName = useCallback(
    (id: number) => {
      const match = itemCatalog.find((i) => i.id === id) || items.find((i) => i.id === id);
      if (!match) return `#${id}`;
      return match.itemCode
        ? `${match.itemName} (${match.itemCode})`
        : match.itemName;
    },
    [itemCatalog, items],
  );

  /** Returns `null` on success, error message string on failure. */
  const saveItem = useCallback(
    async (form: ItemForm, editingId?: number): Promise<string | null> => {
      if (!form.itemName.trim()) {
        const msg = 'Name is required';
        setError(msg);
        return msg;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          item_name: form.itemName.trim(),
          category: form.category || 'general',
          unit: form.unit || 'piece',
          quantity: Number(form.quantity || 0),
          min_stock_level: Number(form.minStockLevel || 0),
          unit_price: Number(form.unitPrice || 0),
          location: form.location.trim() || undefined,
          supplier: form.supplier.trim() || undefined,
          description: form.description.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await inventoryItemsApi.update(editingId, upd, schoolId);
        } else {
          await inventoryItemsApi.create(payload);
        }
        setItemPage(1);
        await Promise.all([loadItems(), loadItemCatalog()]);
        return null;
      } catch (e) {
        const msg = extractErrorMessage(e, 'Save failed');
        setError(msg);
        return msg;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadItems, loadItemCatalog],
  );

  const removeItem = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await inventoryItemsApi.softDelete(id, schoolId);
        await Promise.all([loadItems(), loadItemCatalog()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadItems, loadItemCatalog],
  );

  /** Returns `null` on success, error message string on failure. */
  const saveOrder = useCallback(
    async (form: PurchaseOrderForm, editingId?: number): Promise<string | null> => {
      if (!form.orderNumber.trim()) {
        const msg = 'Order number is required';
        setError(msg);
        return msg;
      }
      if (!form.supplier.trim()) {
        const msg = 'Supplier is required';
        setError(msg);
        return msg;
      }
      let parsedItems: unknown[] = [];
      try {
        parsedItems = JSON.parse(form.itemsText || '[]');
        if (!Array.isArray(parsedItems)) throw new Error('not array');
      } catch {
        const msg = 'Invalid items JSON';
        setError(msg);
        return msg;
      }
      setBusy(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          order_number: form.orderNumber.trim(),
          supplier: form.supplier.trim(),
          status: form.status || 'draft',
          total_amount: Number(form.totalAmount || 0),
          order_date: form.orderDate.trim() || undefined,
          expected_date: form.expectedDate.trim() || undefined,
          items: parsedItems,
          remarks: form.remarks.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await purchaseOrdersApi.update(editingId, upd, schoolId);
        } else {
          await purchaseOrdersApi.create(payload);
        }
        setOrderPage(1);
        await loadOrders();
        return null;
      } catch (e) {
        const msg = extractErrorMessage(e, 'Save failed');
        setError(msg);
        return msg;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadOrders],
  );

  const removeOrder = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await purchaseOrdersApi.softDelete(id, schoolId);
        await loadOrders();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadOrders],
  );

  /** Returns `null` on success, error message string on failure. */
  const saveMovement = useCallback(
    async (form: StockMovementForm, editingId?: number): Promise<string | null> => {
      if (!form.itemId || !form.quantity) {
        const msg = 'Item and quantity are required';
        setError(msg);
        return msg;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          item_id: Number(form.itemId),
          movement_type: form.movementType || 'purchase',
          quantity: Number(form.quantity),
          reference_type: form.referenceType.trim() || undefined,
          remarks: form.remarks.trim() || undefined,
        };
        if (editingId) {
          // Web StockMovementUpdate omits item_id — keep item locked on edit.
          const { school_id: _s, item_id: _i, ...upd } = payload;
          await stockMovementsApi.update(editingId, upd, schoolId);
        } else {
          await stockMovementsApi.create(payload);
        }
        setMovementPage(1);
        await Promise.all([loadMovements(), loadItems(), loadItemCatalog()]);
        return null;
      } catch (e) {
        const msg = extractErrorMessage(e, 'Save failed');
        setError(msg);
        return msg;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadMovements, loadItems, loadItemCatalog],
  );

  const removeMovement = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await stockMovementsApi.softDelete(id, schoolId);
        await loadMovements();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadMovements],
  );

  const itemPages = Math.max(1, Math.ceil(itemTotal / PER_PAGE));
  const orderPages = Math.max(1, Math.ceil(orderTotal / PER_PAGE));
  const movementPages = Math.max(1, Math.ceil(movementTotal / PER_PAGE));

  return useMemo(
    () => ({
      status,
      error,
      busy,
      items,
      orders,
      movements,
      itemCatalog,
      itemTotal,
      orderTotal,
      movementTotal,
      itemPage,
      orderPage,
      movementPage,
      itemPages,
      orderPages,
      movementPages,
      itemQuery,
      categoryFilter,
      poStatusFilter,
      movementTypeFilter,
      setItemSearch,
      setCategory,
      setPoStatus,
      setMovementType,
      setItemPage,
      setOrderPage,
      setMovementPage,
      itemName,
      loadItems,
      loadOrders,
      loadMovements,
      saveItem,
      removeItem,
      saveOrder,
      removeOrder,
      saveMovement,
      removeMovement,
      refetch: bootstrap,
    }),
    [
      status,
      error,
      busy,
      items,
      orders,
      movements,
      itemCatalog,
      itemTotal,
      orderTotal,
      movementTotal,
      itemPage,
      orderPage,
      movementPage,
      itemPages,
      orderPages,
      movementPages,
      itemQuery,
      categoryFilter,
      poStatusFilter,
      movementTypeFilter,
      setItemSearch,
      setCategory,
      setPoStatus,
      setMovementType,
      itemName,
      loadItems,
      loadOrders,
      loadMovements,
      saveItem,
      removeItem,
      saveOrder,
      removeOrder,
      saveMovement,
      removeMovement,
      bootstrap,
    ],
  );
}
