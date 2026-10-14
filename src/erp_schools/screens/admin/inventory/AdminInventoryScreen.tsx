/**
 * Admin Inventory Management hub — web InventoryTab parity.
 * Tabs: Items | Purchase Orders | Stock Movements
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  Badge,
  EmptyState,
  PrimaryButton,
  FormField,
  TextField,
  SelectField,
  SearchBar,
  FilterChips,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useAdminInventoryData,
  type AdminInventoryTab,
  type InventoryItemRow,
  type PurchaseOrderRow,
  type StockMovementRow,
} from '../../../hooks/useAdminInventoryData';
import {
  ITEM_CATEGORIES,
  ITEM_UNITS,
  PO_STATUSES,
  MOVEMENT_TYPES,
  categoryLabel,
  currencyInr,
  poStatusAccent,
  movementTypeAccent,
  movementDateLabel,
} from '../../../utils/inventoryMeta';

const INVENTORY_TABS: Array<{
  key: AdminInventoryTab;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'items',
    title: 'Items',
    subtitle: 'Stock catalog, levels, and pricing.',
  },
  {
    key: 'orders',
    title: 'Purchase Orders',
    subtitle: 'Supplier orders and approval workflow.',
  },
  {
    key: 'movements',
    title: 'Stock Movements',
    subtitle: 'Issue, return, and adjustment history.',
  },
];

function CompactBtn({
  label,
  onPress,
  outline,
  icon,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTeacherTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.compactBtn,
        {
          backgroundColor: outline ? theme.colors.surface : theme.colors.primary,
          borderColor: theme.colors.primary,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={outline ? theme.colors.primary : theme.colors.textInverse}
        />
      ) : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: outline ? theme.colors.primary : theme.colors.textInverse,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PaginationRow({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTeacherTheme();
  if (totalPages <= 1) return null;
  return (
    <View style={styles.row}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>
        Page {page} of {totalPages} · {total} total
      </Text>
      <CompactBtn label="Prev" outline onPress={onPrev} icon="chevron-back" />
      <CompactBtn label="Next" outline onPress={onNext} icon="chevron-forward" />
    </View>
  );
}

export default function AdminInventoryScreen() {
  const theme = useTeacherTheme();
  const insets = useSafeAreaInsets();
  const inv = useAdminInventoryData();
  const [tab, setTab] = useState<AdminInventoryTab>('items');

  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemRow | null>(null);
  const [itemForm, setItemForm] = useState({
    itemName: '',
    category: 'general',
    unit: 'piece',
    quantity: '0',
    minStockLevel: '5',
    unitPrice: '0',
    location: '',
    supplier: '',
    description: '',
  });

  const [poModal, setPoModal] = useState(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrderRow | null>(null);
  const [poForm, setPoForm] = useState({
    orderNumber: '',
    supplier: '',
    status: 'draft',
    totalAmount: '0',
    orderDate: '',
    expectedDate: '',
    itemsText: '[]',
    remarks: '',
  });

  const [moveModal, setMoveModal] = useState(false);
  const [editingMove, setEditingMove] = useState<StockMovementRow | null>(null);
  const [moveForm, setMoveForm] = useState({
    itemId: '',
    movementType: 'purchase',
    quantity: '1',
    referenceType: '',
    remarks: '',
  });

  const categoryOpts = useMemo(
    () => [
      { label: 'All Categories', value: '' },
      ...ITEM_CATEGORIES.map((c) => ({ label: categoryLabel(c), value: c })),
    ],
    [],
  );

  const poStatusOpts = useMemo(
    () => PO_STATUSES.map((s) => ({ label: s, value: s })),
    [],
  );

  const moveTypeOpts = useMemo(
    () => MOVEMENT_TYPES.map((t) => ({ label: t, value: t })),
    [],
  );

  const poStatusChips: ChipOption[] = useMemo(
    () => PO_STATUSES.map((s) => ({ key: s, label: s })),
    [],
  );

  const moveTypeChips: ChipOption[] = useMemo(
    () => MOVEMENT_TYPES.map((t) => ({ key: t, label: t })),
    [],
  );

  const itemSelectOpts = useMemo(() => {
    const opts = [
      { label: 'Select item…', value: '' },
      ...inv.itemCatalog.map((i) => ({
        label: `${i.itemName}${i.itemCode ? ` (${i.itemCode})` : ''} — ${i.quantity} ${i.unit} in stock`,
        value: String(i.id),
      })),
    ];
    // Keep currently edited item visible even if missing from catalog page.
    if (
      editingMove &&
      moveForm.itemId &&
      !opts.some((o) => o.value === moveForm.itemId)
    ) {
      opts.push({
        label: inv.itemName(Number(moveForm.itemId)),
        value: moveForm.itemId,
      });
    }
    return opts;
  }, [inv.itemCatalog, inv.itemName, editingMove, moveForm.itemId]);

  const itemCategoryFormOpts = useMemo(() => {
    const opts = ITEM_CATEGORIES.map((c) => ({
      label: categoryLabel(c),
      value: c,
    }));
    if (
      itemForm.category &&
      !opts.some((o) => o.value === itemForm.category)
    ) {
      opts.push({
        label: categoryLabel(itemForm.category),
        value: itemForm.category,
      });
    }
    return opts;
  }, [itemForm.category]);

  const unitFormOpts = useMemo(() => {
    const opts = ITEM_UNITS.map((u) => ({ label: u, value: u }));
    if (itemForm.unit && !opts.some((o) => o.value === itemForm.unit)) {
      opts.push({ label: itemForm.unit, value: itemForm.unit });
    }
    return opts;
  }, [itemForm.unit]);

  const openItemCreate = () => {
    setEditingItem(null);
    setItemForm({
      itemName: '',
      category: 'general',
      unit: 'piece',
      quantity: '0',
      minStockLevel: '5',
      unitPrice: '0',
      location: '',
      supplier: '',
      description: '',
    });
    setItemModal(true);
  };

  const openPoCreate = () => {
    setEditingPo(null);
    setPoForm({
      orderNumber: '',
      supplier: '',
      status: 'draft',
      totalAmount: '0',
      orderDate: '',
      expectedDate: '',
      itemsText: '[]',
      remarks: '',
    });
    setPoModal(true);
  };

  const openMoveCreate = () => {
    setEditingMove(null);
    setMoveForm({
      itemId: '',
      movementType: 'purchase',
      quantity: '1',
      referenceType: '',
      remarks: '',
    });
    setMoveModal(true);
  };

  const confirmDeactivate = (label: string, onConfirm: () => void) => {
    Alert.alert('Deactivate?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onConfirm },
    ]);
  };

  return (
    <>
    <TeacherScreen
      header={
        <ScreenHeader
          title="Inventory Management"
          subtitle="Assets & Stock"
          trailingIcon="refresh-outline"
          onTrailingPress={() => void inv.refetch()}
        />
      }
      contentStyle={styles.content}
    >
      {inv.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
      ) : null}
      {inv.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{inv.error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {INVENTORY_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.88}
              style={[
                styles.tabCard,
                theme.shadow.light,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabTitle,
                  { color: active ? theme.colors.textInverse : theme.colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {t.title}
              </Text>
              <Text
                style={[
                  styles.tabSub,
                  {
                    color: active ? 'rgba(255,255,255,0.82)' : theme.colors.textSecondary,
                  },
                ]}
                numberOfLines={2}
              >
                {t.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Items */}
      {tab === 'items' ? (
        <View style={styles.section}>
          <SearchBar
            value={inv.itemQuery}
            onChangeText={inv.setItemSearch}
            placeholder="Search items…"
          />
          <SelectField
            value={inv.categoryFilter}
            onChange={inv.setCategory}
            options={categoryOpts}
            placeholder="All Categories"
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {inv.itemTotal} item{inv.itemTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn
              label="Refresh"
              outline
              icon="refresh"
              onPress={() => void inv.loadItems()}
            />
            <CompactBtn label="Add Item" icon="add" onPress={openItemCreate} />
          </View>
          {inv.items.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="No items"
              message="Add a stock item to get started."
            />
          ) : (
            inv.items.map((item) => {
              const low = item.quantity <= item.minStockLevel;
              return (
                <SurfaceCard key={item.id}>
                  <View style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                        {item.itemName}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        ID {item.id} · {item.unit} · Min {item.minStockLevel}
                      </Text>
                      <Text
                        style={{
                          color: low ? theme.colors.danger : '#16a34a',
                          fontSize: 13,
                          fontWeight: '700',
                          marginTop: 2,
                        }}
                      >
                        Stock {item.quantity} · {currencyInr(item.unitPrice)}
                      </Text>
                    </View>
                    <Badge label={categoryLabel(item.category)} accent="blue" />
                  </View>
                  <View style={styles.row}>
                    <CompactBtn
                      label="Edit"
                      outline
                      onPress={() => {
                        setEditingItem(item);
                        setItemForm({
                          itemName: item.itemName,
                          category: item.category || 'general',
                          unit: item.unit || 'piece',
                          quantity: String(item.quantity ?? 0),
                          minStockLevel: String(item.minStockLevel ?? 5),
                          unitPrice: String(item.unitPrice ?? 0),
                          location: item.location,
                          supplier: item.supplier,
                          description: item.description,
                        });
                        setItemModal(true);
                      }}
                    />
                    {item.isActive ? (
                      <CompactBtn
                        label="Deactivate"
                        outline
                        onPress={() =>
                          confirmDeactivate(item.itemName, () =>
                            void inv.removeItem(item.id),
                          )
                        }
                      />
                    ) : null}
                  </View>
                </SurfaceCard>
              );
            })
          )}
          <PaginationRow
            page={inv.itemPage}
            totalPages={inv.itemPages}
            total={inv.itemTotal}
            onPrev={() => inv.setItemPage(Math.max(1, inv.itemPage - 1))}
            onNext={() =>
              inv.setItemPage(Math.min(inv.itemPages, inv.itemPage + 1))
            }
          />
        </View>
      ) : null}

      {/* Purchase Orders */}
      {tab === 'orders' ? (
        <View style={styles.section}>
          <FilterChips
            options={poStatusChips}
            activeKey={inv.poStatusFilter}
            onChange={inv.setPoStatus}
            size="sm"
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {inv.orderTotal} order{inv.orderTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="New PO" icon="add" onPress={openPoCreate} />
          </View>
          {inv.orders.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No purchase orders"
              message="Create a purchase order to track supplier stock."
            />
          ) : (
            inv.orders.map((po) => (
              <SurfaceCard key={po.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {po.orderNumber || `PO #${po.id}`}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {po.id} · {po.supplier || '—'} · {po.orderDate || '—'}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: 13,
                        fontWeight: '700',
                        marginTop: 2,
                      }}
                    >
                      {currencyInr(po.totalAmount)}
                    </Text>
                  </View>
                  <Badge label={po.status} accent={poStatusAccent(po.status)} />
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingPo(po);
                      setPoForm({
                        orderNumber: po.orderNumber,
                        supplier: po.supplier,
                        status: po.status || 'draft',
                        totalAmount: String(po.totalAmount ?? 0),
                        orderDate: po.orderDate,
                        expectedDate: po.expectedDate,
                        itemsText: JSON.stringify(po.items || [], null, 2),
                        remarks: po.remarks,
                      });
                      setPoModal(true);
                    }}
                  />
                  {po.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(po.orderNumber || `PO #${po.id}`, () =>
                          void inv.removeOrder(po.id),
                        )
                      }
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={inv.orderPage}
            totalPages={inv.orderPages}
            total={inv.orderTotal}
            onPrev={() => inv.setOrderPage(Math.max(1, inv.orderPage - 1))}
            onNext={() =>
              inv.setOrderPage(Math.min(inv.orderPages, inv.orderPage + 1))
            }
          />
        </View>
      ) : null}

      {/* Stock Movements */}
      {tab === 'movements' ? (
        <View style={styles.section}>
          <FilterChips
            options={moveTypeChips}
            activeKey={inv.movementTypeFilter}
            onChange={inv.setMovementType}
            size="sm"
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {inv.movementTotal} movement{inv.movementTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Record Movement" icon="add" onPress={openMoveCreate} />
          </View>
          {inv.movements.length === 0 ? (
            <EmptyState
              icon="swap-horizontal-outline"
              title="No movements"
              message="Record a purchase, issue, return, or adjustment."
            />
          ) : (
            inv.movements.map((m) => (
              <SurfaceCard key={m.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {inv.itemName(m.itemId)}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {m.id} · Qty {m.quantity} · Ref {m.referenceType || '—'}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {movementDateLabel(m.movementDate, m.createdAt)}
                    </Text>
                  </View>
                  <Badge
                    label={m.movementType}
                    accent={movementTypeAccent(m.movementType)}
                  />
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingMove(m);
                      setMoveForm({
                        itemId: String(m.itemId),
                        movementType: m.movementType || 'purchase',
                        quantity: String(m.quantity ?? 1),
                        referenceType: m.referenceType,
                        remarks: m.remarks,
                      });
                      setMoveModal(true);
                    }}
                  />
                  {m.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(`Movement #${m.id}`, () =>
                          void inv.removeMovement(m.id),
                        )
                      }
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={inv.movementPage}
            totalPages={inv.movementPages}
            total={inv.movementTotal}
            onPrev={() => inv.setMovementPage(Math.max(1, inv.movementPage - 1))}
            onNext={() =>
              inv.setMovementPage(Math.min(inv.movementPages, inv.movementPage + 1))
            }
          />
        </View>
      ) : null}
    </TeacherScreen>

      {/* Add / Edit Item — outside TeacherScreen ScrollView for correct modal layering */}
      <Modal
        visible={itemModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setItemModal(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalRoot,
            {
              backgroundColor: theme.colors.background,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: insets.bottom,
            },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </Text>
            <TouchableOpacity onPress={() => setItemModal(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Name" required>
              <TextField
                value={itemForm.itemName}
                onChangeText={(t) => setItemForm((f) => ({ ...f, itemName: t }))}
              />
            </FormField>
            <FormField label="Category">
              <SelectField
                value={itemForm.category}
                onChange={(v) =>
                  setItemForm((f) => ({
                    ...f,
                    category: v as typeof f.category,
                  }))
                }
                options={itemCategoryFormOpts}
              />
            </FormField>
            <FormField label="Unit">
              <SelectField
                value={itemForm.unit}
                onChange={(v) =>
                  setItemForm((f) => ({
                    ...f,
                    unit: v as typeof f.unit,
                  }))
                }
                options={unitFormOpts}
              />
            </FormField>
            <FormField label="Current Stock">
              <TextField
                value={itemForm.quantity}
                onChangeText={(t) => setItemForm((f) => ({ ...f, quantity: t }))}
                keyboardType="number-pad"
              />
            </FormField>
            <FormField label="Minimum Stock">
              <TextField
                value={itemForm.minStockLevel}
                onChangeText={(t) => setItemForm((f) => ({ ...f, minStockLevel: t }))}
                keyboardType="number-pad"
              />
            </FormField>
            <FormField label="Unit Price">
              <TextField
                value={itemForm.unitPrice}
                onChangeText={(t) => setItemForm((f) => ({ ...f, unitPrice: t }))}
                keyboardType="decimal-pad"
              />
            </FormField>
            <FormField label="Location">
              <TextField
                value={itemForm.location}
                onChangeText={(t) => setItemForm((f) => ({ ...f, location: t }))}
              />
            </FormField>
            <FormField label="Supplier">
              <TextField
                value={itemForm.supplier}
                onChangeText={(t) => setItemForm((f) => ({ ...f, supplier: t }))}
              />
            </FormField>
            <FormField label="Description">
              <TextField
                value={itemForm.description}
                onChangeText={(t) => setItemForm((f) => ({ ...f, description: t }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={inv.busy ? 'Saving…' : 'Save'}
              disabled={inv.busy}
              onPress={() => {
                void (async () => {
                  const err = await inv.saveItem(
                    {
                      itemName: itemForm.itemName,
                      category: itemForm.category,
                      unit: itemForm.unit,
                      quantity: Number(itemForm.quantity) || 0,
                      minStockLevel: Number(itemForm.minStockLevel) || 0,
                      unitPrice: Number(itemForm.unitPrice) || 0,
                      location: itemForm.location,
                      supplier: itemForm.supplier,
                      description: itemForm.description,
                    },
                    editingItem?.id,
                  );
                  if (!err) setItemModal(false);
                  else Alert.alert('Save failed', err);
                })();
              }}
            />
            <TouchableOpacity
              onPress={() => setItemModal(false)}
              style={styles.cancelBtn}
            >
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* New / Edit PO */}
      <Modal
        visible={poModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPoModal(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalRoot,
            {
              backgroundColor: theme.colors.background,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: insets.bottom,
            },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingPo ? 'Edit Purchase Order' : 'New Purchase Order'}
            </Text>
            <TouchableOpacity onPress={() => setPoModal(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Order Number" required>
              <TextField
                value={poForm.orderNumber}
                onChangeText={(t) => setPoForm((f) => ({ ...f, orderNumber: t }))}
              />
            </FormField>
            <FormField label="Supplier" required>
              <TextField
                value={poForm.supplier}
                onChangeText={(t) => setPoForm((f) => ({ ...f, supplier: t }))}
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                value={poForm.status}
                onChange={(v) => setPoForm((f) => ({ ...f, status: v }))}
                options={poStatusOpts}
              />
            </FormField>
            <FormField label="Total Amount">
              <TextField
                value={poForm.totalAmount}
                onChangeText={(t) => setPoForm((f) => ({ ...f, totalAmount: t }))}
                keyboardType="decimal-pad"
              />
            </FormField>
            <FormField label="Order Date">
              <TextField
                value={poForm.orderDate}
                onChangeText={(t) => setPoForm((f) => ({ ...f, orderDate: t }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Expected Date">
              <TextField
                value={poForm.expectedDate}
                onChangeText={(t) => setPoForm((f) => ({ ...f, expectedDate: t }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Items (JSON)">
              <TextField
                value={poForm.itemsText}
                onChangeText={(t) => setPoForm((f) => ({ ...f, itemsText: t }))}
                multiline
              />
            </FormField>
            <FormField label="Remarks">
              <TextField
                value={poForm.remarks}
                onChangeText={(t) => setPoForm((f) => ({ ...f, remarks: t }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={inv.busy ? 'Saving…' : 'Save'}
              disabled={inv.busy}
              onPress={() => {
                void (async () => {
                  const err = await inv.saveOrder(
                    {
                      orderNumber: poForm.orderNumber,
                      supplier: poForm.supplier,
                      status: poForm.status,
                      totalAmount: Number(poForm.totalAmount) || 0,
                      orderDate: poForm.orderDate,
                      expectedDate: poForm.expectedDate,
                      itemsText: poForm.itemsText,
                      remarks: poForm.remarks,
                    },
                    editingPo?.id,
                  );
                  if (!err) setPoModal(false);
                  else Alert.alert('Save failed', err);
                })();
              }}
            />
            <TouchableOpacity
              onPress={() => setPoModal(false)}
              style={styles.cancelBtn}
            >
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Record / Edit Movement */}
      <Modal
        visible={moveModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMoveModal(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalRoot,
            {
              backgroundColor: theme.colors.background,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: insets.bottom,
            },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingMove ? 'Edit Movement' : 'Record Stock Movement'}
            </Text>
            <TouchableOpacity onPress={() => setMoveModal(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Item" required>
              <SelectField
                value={moveForm.itemId}
                onChange={(v) => setMoveForm((f) => ({ ...f, itemId: v }))}
                options={itemSelectOpts}
                placeholder="Select item…"
                disabled={editingMove != null}
              />
            </FormField>
            <FormField label="Type">
              <SelectField
                value={moveForm.movementType}
                onChange={(v) => setMoveForm((f) => ({ ...f, movementType: v }))}
                options={moveTypeOpts}
              />
            </FormField>
            <FormField label="Quantity" required>
              <TextField
                value={moveForm.quantity}
                onChangeText={(t) => setMoveForm((f) => ({ ...f, quantity: t }))}
                keyboardType="number-pad"
              />
            </FormField>
            <FormField label="Reference Type">
              <TextField
                value={moveForm.referenceType}
                onChangeText={(t) => setMoveForm((f) => ({ ...f, referenceType: t }))}
              />
            </FormField>
            <FormField label="Remarks">
              <TextField
                value={moveForm.remarks}
                onChangeText={(t) => setMoveForm((f) => ({ ...f, remarks: t }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={inv.busy ? 'Saving…' : 'Save'}
              disabled={inv.busy}
              onPress={() => {
                void (async () => {
                  const err = await inv.saveMovement(
                    {
                      itemId: moveForm.itemId,
                      movementType: moveForm.movementType,
                      quantity: Number(moveForm.quantity) || 0,
                      referenceType: moveForm.referenceType,
                      remarks: moveForm.remarks,
                    },
                    editingMove?.id,
                  );
                  if (!err) setMoveModal(false);
                  else Alert.alert('Save failed', err);
                })();
              }}
            />
            <TouchableOpacity
              onPress={() => setMoveModal(false)}
              style={styles.cancelBtn}
            >
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },
  tabRail: { gap: 10, paddingRight: 8, paddingVertical: 2 },
  tabCard: {
    width: 168,
    minHeight: 78,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  tabTitle: { fontSize: 14, fontWeight: '700' },
  tabSub: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  section: { gap: 12 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  listRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowName: { fontSize: 15, fontWeight: '700' },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});
