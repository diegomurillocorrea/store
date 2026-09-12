import {
  boolean,
  date,
  doublePrecision,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const memberStatus = pgEnum('member_status', ['invited', 'active', 'suspended'])
export const saleStatus = pgEnum('sale_status', ['draft', 'completed', 'voided'])
export const paymentMethod = pgEnum('payment_method', ['cash', 'card', 'transfer', 'other', 'credit'])
export const cashSessionStatus = pgEnum('cash_session_status', ['open', 'closed'])
export const movementType = pgEnum('movement_type', ['purchase_receipt', 'sale', 'adjustment', 'transfer_out', 'transfer_in', 'return_customer', 'return_supplier', 'initial'])
export const receivableStatus = pgEnum('receivable_status', ['open', 'partial', 'paid', 'written_off'])
export const payableStatus = pgEnum('payable_status', ['open', 'partial', 'paid', 'void'])
export const employeeStatus = pgEnum('employee_status', ['active', 'inactive'])
export const financialMovementType = pgEnum('financial_movement_type', ['income', 'expense'])

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  timezone: text('timezone').default('America/El_Salvador').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const organizationSettings = pgTable('organization_settings', {
  organizationId: uuid('organization_id').notNull().primaryKey(),
  currencyCode: text('currency_code').default('MXN').notNull(),
  taxLabel: text('tax_label').default('IVA').notNull(),
  defaultTaxRate: numeric('default_tax_rate', { precision: 7, scale: 4 }).default('0.16').notNull(),
  allowNegativeStock: boolean('allow_negative_stock').default(false).notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#27272a').notNull(),
  accentColor: text('accent_color').default('#2563eb').notNull(),
  primaryColorLight: text('primary_color_light').default('#27272a').notNull(),
  primaryColorDark: text('primary_color_dark').default('#e4e4e7').notNull(),
  accentColorLight: text('accent_color_light').default('#2563eb').notNull(),
  accentColorDark: text('accent_color_dark').default('#60a5fa').notNull(),
  mutedColorLight: text('muted_color_light').default('#71717a').notNull(),
  mutedColorDark: text('muted_color_dark').default('#a3a3a3').notNull(),
  shellBackgroundLight: text('shell_background_light').default('#fffbf4').notNull(),
  shellBackgroundDark: text('shell_background_dark').default('#22180f').notNull(),
  shellSurfaceLight: text('shell_surface_light').default('#fffcf7').notNull(),
  shellSurfaceDark: text('shell_surface_dark').default('#2e261c').notNull(),
  panelWallpaperUrl: text('panel_wallpaper_url'),
  description: text('description'),
  locationAddress: text('location_address'),
  locationLat: doublePrecision('location_lat'),
  locationLng: doublePrecision('location_lng'),
  businessHours: jsonb('business_hours').$type<Record<string, unknown>>().default({}).notNull(),
  socialLinks: jsonb('social_links').$type<Record<string, unknown>>().default({}).notNull(),
})

export const permissions = pgTable('permissions', {
  code: text('code').notNull().primaryKey(),
  description: text('description').notNull(),
})

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull(),
  permissionCode: text('permission_code').notNull(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionCode] }),
])

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
  displayName: text('display_name'),
  status: memberStatus('status').default('active').notNull(),
  invitedEmail: text('invited_email'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const memberRoles = pgTable('member_roles', {
  memberId: uuid('member_id').notNull(),
  roleId: uuid('role_id').notNull(),
}, (table) => [
  primaryKey({ columns: [table.memberId, table.roleId] }),
])

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  ownerSharedKey: uuid('owner_shared_key'),
})

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  name: text('name').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  ownerSharedKey: uuid('owner_shared_key'),
})

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  email: text('email'),
  phone: text('phone'),
  taxId: text('tax_id'),
  creditLimit: numeric('credit_limit', { precision: 18, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').default('').notNull(),
  createdBy: uuid('created_by'),
  ownerSharedKey: uuid('owner_shared_key'),
})

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  taxId: text('tax_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  ownerSharedKey: uuid('owner_shared_key'),
})

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  categoryId: uuid('category_id'),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  barcode: text('barcode'),
  salePrice: numeric('sale_price', { precision: 18, scale: 4 }).default('0').notNull(),
  costPrice: numeric('cost_price', { precision: 18, scale: 4 }),
  taxRate: numeric('tax_rate', { precision: 7, scale: 4 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  supplierId: uuid('supplier_id'),
  availableQuantity: numeric('available_quantity', { precision: 18, scale: 4 }).default('0').notNull(),
  createdBy: uuid('created_by'),
  imageUrl: text('image_url'),
  ownerSharedKey: uuid('owner_shared_key'),
})

export const productTags = pgTable('product_tags', {
  productId: uuid('product_id').notNull(),
  tagId: uuid('tag_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
}, (table) => [
  primaryKey({ columns: [table.productId, table.tagId] }),
])

export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  productId: uuid('product_id').notNull(),
  sku: text('sku').notNull(),
  name: text('name'),
  attributes: jsonb('attributes').$type<Record<string, unknown>>().default({}).notNull(),
  salePrice: numeric('sale_price', { precision: 18, scale: 4 }),
  barcode: text('barcode'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const stockLevels = pgTable('stock_levels', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  productId: uuid('product_id').notNull(),
  variantId: uuid('variant_id'),
  locationId: uuid('location_id').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).default('0').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  productId: uuid('product_id').notNull(),
  variantId: uuid('variant_id'),
  locationId: uuid('location_id').notNull(),
  movementType: movementType('movement_type').notNull(),
  quantityDelta: numeric('quantity_delta', { precision: 18, scale: 4 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 18, scale: 4 }),
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
  notes: text('notes'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const cashRegisters = pgTable('cash_registers', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  locationId: uuid('location_id'),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const cashSessions = pgTable('cash_sessions', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  cashRegisterId: uuid('cash_register_id').notNull(),
  status: cashSessionStatus('status').default('open').notNull(),
  openingAmount: numeric('opening_amount', { precision: 18, scale: 2 }).default('0').notNull(),
  closingAmount: numeric('closing_amount', { precision: 18, scale: 2 }),
  difference: numeric('difference', { precision: 18, scale: 2 }),
  openedBy: uuid('opened_by').notNull(),
  closedBy: uuid('closed_by'),
  openedAt: timestamp('opened_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
  notes: text('notes'),
})

export const sales = pgTable('sales', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  customerId: uuid('customer_id'),
  cashSessionId: uuid('cash_session_id'),
  status: saleStatus('status').default('draft').notNull(),
  saleNumber: text('sale_number'),
  subtotal: numeric('subtotal', { precision: 18, scale: 2 }).default('0').notNull(),
  taxTotal: numeric('tax_total', { precision: 18, scale: 2 }).default('0').notNull(),
  discountTotal: numeric('discount_total', { precision: 18, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 18, scale: 2 }).default('0').notNull(),
  voidReason: text('void_reason'),
  voidedAt: timestamp('voided_at', { withTimezone: true, mode: 'string' }),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  discountPercent: numeric('discount_percent', { precision: 7, scale: 4 }).default('0').notNull(),
})

export const saleLines = pgTable('sale_lines', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  saleId: uuid('sale_id').notNull(),
  productId: uuid('product_id').notNull(),
  variantId: uuid('variant_id'),
  description: text('description'),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 18, scale: 4 }).notNull(),
  lineDiscount: numeric('line_discount', { precision: 18, scale: 2 }).default('0').notNull(),
  taxRate: numeric('tax_rate', { precision: 7, scale: 4 }),
  lineTax: numeric('line_tax', { precision: 18, scale: 2 }).default('0').notNull(),
  lineTotal: numeric('line_total', { precision: 18, scale: 2 }).notNull(),
})

export const salePayments = pgTable('sale_payments', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  saleId: uuid('sale_id').notNull(),
  method: paymentMethod('method').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  reference: text('reference'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  amountTendered: numeric('amount_tendered', { precision: 18, scale: 2 }),
  changeAmount: numeric('change_amount', { precision: 18, scale: 2 }).default('0').notNull(),
})

export const receivables = pgTable('receivables', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  customerId: uuid('customer_id').notNull(),
  saleId: uuid('sale_id'),
  documentNumber: text('document_number'),
  issuedAt: date('issued_at', { mode: 'string' }).notNull(),
  dueAt: date('due_at', { mode: 'string' }),
  total: numeric('total', { precision: 18, scale: 2 }).notNull(),
  balanceDue: numeric('balance_due', { precision: 18, scale: 2 }).notNull(),
  status: receivableStatus('status').default('open').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const receivablePayments = pgTable('receivable_payments', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  receivableId: uuid('receivable_id').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  method: paymentMethod('method').default('cash').notNull(),
  reference: text('reference'),
  recordedBy: uuid('recorded_by'),
})

export const payables = pgTable('payables', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  supplierId: uuid('supplier_id').notNull(),
  documentNumber: text('document_number'),
  issuedAt: date('issued_at', { mode: 'string' }).notNull(),
  dueAt: date('due_at', { mode: 'string' }),
  total: numeric('total', { precision: 18, scale: 2 }).notNull(),
  balanceDue: numeric('balance_due', { precision: 18, scale: 2 }).notNull(),
  status: payableStatus('status').default('open').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const payablePayments = pgTable('payable_payments', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  payableId: uuid('payable_id').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  method: paymentMethod('method').default('transfer').notNull(),
  reference: text('reference'),
  recordedBy: uuid('recorded_by'),
})

export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  supplierId: uuid('supplier_id').notNull(),
  reference: text('reference'),
  status: text('status').default('received').notNull(),
  total: numeric('total', { precision: 18, scale: 2 }).default('0').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const purchaseLines = pgTable('purchase_lines', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  purchaseId: uuid('purchase_id').notNull(),
  productId: uuid('product_id').notNull(),
  variantId: uuid('variant_id'),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 18, scale: 4 }).notNull(),
  lineTotal: numeric('line_total', { precision: 18, scale: 2 }).notNull(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id'),
  actorMemberId: uuid('actor_member_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').default('').notNull(),
  phone: text('phone'),
  email: text('email'),
  status: employeeStatus('status').default('active').notNull(),
  roleId: uuid('role_id'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  ownerSharedKey: uuid('owner_shared_key'),
  userId: uuid('user_id'),
})

export const financialMovements = pgTable('financial_movements', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  cashSessionId: uuid('cash_session_id'),
  movementType: financialMovementType('movement_type').notNull(),
  concept: text('concept').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  movementDate: date('movement_date', { mode: 'string' }).notNull(),
  paymentMethod: paymentMethod('payment_method'),
  reference: text('reference'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

