import { and, eq, ilike } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth/current-user'
import { ROLE_SLUGS } from '@/lib/permissions/views'
import { db } from '@/lib/db'
import {
  categories,
  customers,
  employees,
  memberRoles,
  organizationMembers,
  organizations,
  products,
  roles,
  subcategories,
  suppliers,
} from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'

export interface OwnerOrgTarget {
  organizationId: string
  memberId: string
  slug: string
}

export interface SharedEntityRef {
  sharedKey: string | null
  name: string | null
  categorySharedKey: string | null
  categoryName: string | null
}

type CatalogTable =
  | 'categories'
  | 'subcategories'
  | 'suppliers'
  | 'customers'
  | 'employees'
  | 'products'

const CATALOG_REVALIDATE_PATHS: Record<CatalogTable, string[]> = {
  categories: ['/categorias', '/categorias/sub-categorias', '/productos'],
  subcategories: ['/categorias/sub-categorias', '/productos'],
  suppliers: ['/proveedores', '/productos'],
  customers: ['/clientes'],
  employees: ['/empleados'],
  products: ['/productos'],
}

/** Sucursales del propietario activo (+ la actual si no está en la lista). */
export async function getCreateFanOutTargets (
  currentOrganizationId: string
): Promise<OwnerOrgTarget[]> {
  const user = await getCurrentUser()
  if (!user) return []

  let rows: Array<{
    memberId: string
    organizationId: string
    orgSlug: string | null
    roleSlug: string | null
  }>

  try {
    rows = await db
      .select({
        memberId: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        orgSlug: organizations.slug,
        roleSlug: roles.slug,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .leftJoin(memberRoles, eq(organizationMembers.id, memberRoles.memberId))
      .leftJoin(roles, eq(memberRoles.roleId, roles.id))
      .where(
        and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.status, 'active')
        )
      )
  } catch (error) {
    console.error('getCreateFanOutTargets', error)
    return []
  }

  // Group flat join rows by organizationId to collect all role slugs per membership
  const memberMap = new Map<string, { memberId: string; orgSlug: string; roleSlugs: string[] }>()
  for (const row of rows) {
    if (!row.orgSlug) continue
    if (!memberMap.has(row.organizationId)) {
      memberMap.set(row.organizationId, {
        memberId: row.memberId,
        orgSlug: row.orgSlug,
        roleSlugs: [],
      })
    }
    const entry = memberMap.get(row.organizationId)!
    if (row.roleSlug) entry.roleSlugs.push(row.roleSlug)
  }

  const targets = new Map<string, OwnerOrgTarget>()

  for (const [orgId, entry] of memberMap.entries()) {
    const isPropietario = entry.roleSlugs.includes(ROLE_SLUGS.propietario)
    const isCurrent = orgId === currentOrganizationId

    if (!isPropietario && !isCurrent) continue

    targets.set(orgId, {
      organizationId: orgId,
      memberId: entry.memberId,
      slug: entry.orgSlug,
    })
  }

  if (!targets.has(currentOrganizationId)) {
    const [currentMember] = await db
      .select({
        id: organizationMembers.id,
        orgSlug: organizations.slug,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(
        and(
          eq(organizationMembers.organizationId, currentOrganizationId),
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.status, 'active')
        )
      )
      .limit(1)

    if (currentMember?.orgSlug) {
      targets.set(currentOrganizationId, {
        organizationId: currentOrganizationId,
        memberId: currentMember.id,
        slug: currentMember.orgSlug,
      })
    }
  }

  return Array.from(targets.values())
}

export function newOwnerSharedKey (): string {
  return crypto.randomUUID()
}

export async function getSharedEntityRef (
  table: 'categories' | 'suppliers',
  organizationId: string,
  entityId: string | null
): Promise<SharedEntityRef> {
  if (!entityId) {
    return { sharedKey: null, name: null, categorySharedKey: null, categoryName: null }
  }

  let ownerSharedKey: string | null = null
  let name: string | null = null

  if (table === 'categories') {
    const [row] = await db
      .select({ ownerSharedKey: categories.ownerSharedKey, name: categories.name })
      .from(categories)
      .where(
        and(
          eq(categories.id, entityId),
          eq(categories.organizationId, organizationId)
        )
      )
      .limit(1)
    ownerSharedKey = row?.ownerSharedKey ?? null
    name = row?.name ?? null
  } else {
    const [row] = await db
      .select({ ownerSharedKey: suppliers.ownerSharedKey, name: suppliers.name })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, entityId),
          eq(suppliers.organizationId, organizationId)
        )
      )
      .limit(1)
    ownerSharedKey = row?.ownerSharedKey ?? null
    name = row?.name ?? null
  }

  if (ownerSharedKey == null && name == null) {
    return { sharedKey: null, name: null, categorySharedKey: null, categoryName: null }
  }

  return { sharedKey: ownerSharedKey, name, categorySharedKey: null, categoryName: null }
}

export async function getSubCategorySharedRef (
  organizationId: string,
  subCategoryId: string | null
): Promise<SharedEntityRef> {
  if (!subCategoryId) {
    return { sharedKey: null, name: null, categorySharedKey: null, categoryName: null }
  }

  const [data] = await db
    .select({
      ownerSharedKey: subcategories.ownerSharedKey,
      name: subcategories.name,
      categoryOwnerSharedKey: categories.ownerSharedKey,
      categoryName: categories.name,
    })
    .from(subcategories)
    .leftJoin(categories, eq(subcategories.categoryId, categories.id))
    .where(
      and(
        eq(subcategories.id, subCategoryId),
        eq(subcategories.organizationId, organizationId)
      )
    )
    .limit(1)

  if (!data) {
    return { sharedKey: null, name: null, categorySharedKey: null, categoryName: null }
  }

  return {
    sharedKey: data.ownerSharedKey ?? null,
    name: data.name ?? null,
    categorySharedKey: data.categoryOwnerSharedKey ?? null,
    categoryName: data.categoryName ?? null,
  }
}

export async function resolveCategoryIdInOrg (
  organizationId: string,
  ref: SharedEntityRef
): Promise<string | null> {
  if (!ref.sharedKey && !ref.name) return null

  if (ref.sharedKey) {
    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, organizationId),
          eq(categories.ownerSharedKey, ref.sharedKey)
        )
      )
      .limit(1)
    if (row?.id) return row.id
  }

  if (ref.name) {
    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, organizationId),
          ilike(categories.name, ref.name)
        )
      )
      .limit(1)
    if (row?.id) return row.id
  }

  return null
}

/**
 * Asegura que la categoría exista en la sucursal destino (por shared key o nombre).
 * Si falta, la crea; si existe por nombre sin key, la enlaza.
 */
export async function ensureCategoryInOrg (
  targetOrganizationId: string,
  ref: SharedEntityRef,
  targetMemberId: string | null,
  source?: { organizationId: string; categoryId: string }
): Promise<string | null> {
  if (!ref.sharedKey && !ref.name) return null

  let sharedKey = ref.sharedKey

  if (!sharedKey && source?.categoryId) {
    sharedKey = newOwnerSharedKey()
    try {
      await db.update(categories)
        .set({ ownerSharedKey: sharedKey })
        .where(
          and(
            eq(categories.id, source.categoryId),
            eq(categories.organizationId, source.organizationId)
          )
        )
    } catch (sourceKeyError) {
      console.error('ensureCategoryInOrg source key', sourceKeyError)
      return null
    }
  }

  if (sharedKey) {
    const [byKey] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, targetOrganizationId),
          eq(categories.ownerSharedKey, sharedKey)
        )
      )
      .limit(1)
    if (byKey?.id) return byKey.id
  }

  if (ref.name) {
    const [byName] = await db
      .select({ id: categories.id, ownerSharedKey: categories.ownerSharedKey })
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, targetOrganizationId),
          ilike(categories.name, ref.name)
        )
      )
      .limit(1)

    if (byName?.id) {
      if (sharedKey && byName.ownerSharedKey !== sharedKey) {
        await db.update(categories)
          .set({ ownerSharedKey: sharedKey })
          .where(
            and(
              eq(categories.id, byName.id),
              eq(categories.organizationId, targetOrganizationId)
            )
          )
      }
      return byName.id
    }
  }

  if (!ref.name) return null

  try {
    const [inserted] = await db
      .insert(categories)
      .values({
        organizationId: targetOrganizationId,
        name: ref.name,
        ownerSharedKey: sharedKey,
        createdBy: targetMemberId,
      })
      .returning({ id: categories.id })

    if (!inserted?.id) {
      console.error('ensureCategoryInOrg insert: no id returned')
      return null
    }

    return inserted.id
  } catch (error) {
    console.error('ensureCategoryInOrg insert', error)
    return null
  }
}

export async function resolveSupplierIdInOrg (
  organizationId: string,
  ref: SharedEntityRef
): Promise<string | null> {
  if (!ref.sharedKey && !ref.name) return null

  if (ref.sharedKey) {
    const [row] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.organizationId, organizationId),
          eq(suppliers.ownerSharedKey, ref.sharedKey)
        )
      )
      .limit(1)
    if (row?.id) return row.id
  }

  if (ref.name) {
    const [row] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.organizationId, organizationId),
          ilike(suppliers.name, ref.name)
        )
      )
      .limit(1)
    if (row?.id) return row.id
  }

  return null
}

export async function resolveSubCategoryIdInOrg (
  organizationId: string,
  ref: SharedEntityRef,
  categoryId: string | null
): Promise<string | null> {
  if (!ref.sharedKey && !ref.name) return null

  if (ref.sharedKey) {
    const [row] = await db
      .select({ id: subcategories.id })
      .from(subcategories)
      .where(
        and(
          eq(subcategories.organizationId, organizationId),
          eq(subcategories.ownerSharedKey, ref.sharedKey)
        )
      )
      .limit(1)
    if (row?.id) return row.id
  }

  if (ref.name && categoryId) {
    const [row] = await db
      .select({ id: subcategories.id })
      .from(subcategories)
      .where(
        and(
          eq(subcategories.organizationId, organizationId),
          eq(subcategories.categoryId, categoryId),
          ilike(subcategories.name, ref.name)
        )
      )
      .limit(1)
    if (row?.id) return row.id
  }

  return null
}

export async function resolveRoleIdBySlugInOrg (
  organizationId: string,
  roleId: string | null,
  sourceOrganizationId: string
): Promise<string | null> {
  if (!roleId) return null

  const [sourceRole] = await db
    .select({ slug: roles.slug })
    .from(roles)
    .where(
      and(
        eq(roles.id, roleId),
        eq(roles.organizationId, sourceOrganizationId)
      )
    )
    .limit(1)

  if (!sourceRole?.slug) return null

  const [targetRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.organizationId, organizationId),
        eq(roles.slug, sourceRole.slug)
      )
    )
    .limit(1)

  return targetRole?.id ?? null
}

export async function findCategoryIdBySharedKey (
  organizationId: string,
  sharedKey: string
): Promise<string | null> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.organizationId, organizationId),
        eq(categories.ownerSharedKey, sharedKey)
      )
    )
    .limit(1)
  return row?.id ?? null
}

export async function findCategoryIdByName (
  organizationId: string,
  name: string
): Promise<string | null> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.organizationId, organizationId),
        ilike(categories.name, name)
      )
    )
    .limit(1)
  return row?.id ?? null
}

/** Revalida rutas del catálogo en todas las sucursales afectadas. */
export function revalidateCatalogPaths (
  targets: OwnerOrgTarget[],
  table: CatalogTable,
  currentSlug?: string
): void {
  const suffixes = CATALOG_REVALIDATE_PATHS[table]
  for (const target of targets) {
    for (const suffix of suffixes) {
      revalidatePath(`/${target.slug}${suffix}`)
    }
  }
  if (currentSlug && !targets.some((t) => t.slug === currentSlug)) {
    for (const suffix of suffixes) {
      revalidatePath(`/${currentSlug}${suffix}`)
    }
  }
}

/**
 * Copia el catálogo del propietario desde una sucursal fuente a una nueva.
 * Editar/eliminar en cada sucursal sigue siendo independiente.
 */
export async function cloneOwnerCatalogToOrganization (
  sourceOrganizationId: string,
  targetOrganizationId: string,
  targetMemberId: string | null
): Promise<void> {
  const categoryIdMap = new Map<string, string>()
  const subCategoryIdMap = new Map<string, string>()
  const supplierIdMap = new Map<string, string>()

  // ── Categories ──────────────────────────────────────────────────────────────
  const sourceCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      ownerSharedKey: categories.ownerSharedKey,
    })
    .from(categories)
    .where(eq(categories.organizationId, sourceOrganizationId))

  for (const category of sourceCategories) {
    const sharedKey = category.ownerSharedKey ?? crypto.randomUUID()

    if (!category.ownerSharedKey) {
      await db.update(categories)
        .set({ ownerSharedKey: sharedKey })
        .where(eq(categories.id, category.id))
    }

    const [existingByKey] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, targetOrganizationId),
          eq(categories.ownerSharedKey, sharedKey)
        )
      )
      .limit(1)

    if (existingByKey?.id) {
      categoryIdMap.set(category.id, existingByKey.id)
      continue
    }

    const [existingByName] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, targetOrganizationId),
          ilike(categories.name, category.name)
        )
      )
      .limit(1)

    if (existingByName?.id) {
      await db.update(categories)
        .set({ ownerSharedKey: sharedKey })
        .where(eq(categories.id, existingByName.id))
      categoryIdMap.set(category.id, existingByName.id)
      continue
    }

    const [inserted] = await db
      .insert(categories)
      .values({
        organizationId: targetOrganizationId,
        name: category.name,
        ownerSharedKey: sharedKey,
        createdBy: targetMemberId,
      })
      .returning({ id: categories.id })

    if (inserted?.id) {
      categoryIdMap.set(category.id, inserted.id)
    }
  }

  // ── Subcategories ────────────────────────────────────────────────────────────
  const sourceSubCategories = await db
    .select({
      id: subcategories.id,
      name: subcategories.name,
      categoryId: subcategories.categoryId,
      ownerSharedKey: subcategories.ownerSharedKey,
    })
    .from(subcategories)
    .where(eq(subcategories.organizationId, sourceOrganizationId))

  for (const sub of sourceSubCategories) {
    const targetCategoryId = categoryIdMap.get(sub.categoryId)
    if (!targetCategoryId) continue

    const sharedKey = sub.ownerSharedKey ?? crypto.randomUUID()

    if (!sub.ownerSharedKey) {
      await db.update(subcategories)
        .set({ ownerSharedKey: sharedKey })
        .where(eq(subcategories.id, sub.id))
    }

    const [existing] = await db
      .select({ id: subcategories.id })
      .from(subcategories)
      .where(
        and(
          eq(subcategories.organizationId, targetOrganizationId),
          eq(subcategories.ownerSharedKey, sharedKey)
        )
      )
      .limit(1)

    if (existing?.id) {
      subCategoryIdMap.set(sub.id, existing.id)
      continue
    }

    const [inserted] = await db
      .insert(subcategories)
      .values({
        organizationId: targetOrganizationId,
        categoryId: targetCategoryId,
        name: sub.name,
        ownerSharedKey: sharedKey,
        createdBy: targetMemberId,
      })
      .returning({ id: subcategories.id })

    if (inserted?.id) {
      subCategoryIdMap.set(sub.id, inserted.id)
    }
  }

  // ── Suppliers ────────────────────────────────────────────────────────────────
  const sourceSuppliers = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      phone: suppliers.phone,
      email: suppliers.email,
      notes: suppliers.notes,
      taxId: suppliers.taxId,
      ownerSharedKey: suppliers.ownerSharedKey,
    })
    .from(suppliers)
    .where(eq(suppliers.organizationId, sourceOrganizationId))

  for (const supplier of sourceSuppliers) {
    const sharedKey = supplier.ownerSharedKey ?? crypto.randomUUID()

    if (!supplier.ownerSharedKey) {
      await db.update(suppliers)
        .set({ ownerSharedKey: sharedKey })
        .where(eq(suppliers.id, supplier.id))
    }

    const [existing] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.organizationId, targetOrganizationId),
          eq(suppliers.ownerSharedKey, sharedKey)
        )
      )
      .limit(1)

    if (existing?.id) {
      supplierIdMap.set(supplier.id, existing.id)
      continue
    }

    const [inserted] = await db
      .insert(suppliers)
      .values({
        organizationId: targetOrganizationId,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        notes: supplier.notes,
        taxId: supplier.taxId,
        ownerSharedKey: sharedKey,
        createdBy: targetMemberId,
      })
      .returning({ id: suppliers.id })

    if (inserted?.id) {
      supplierIdMap.set(supplier.id, inserted.id)
    }
  }

  // ── Customers ────────────────────────────────────────────────────────────────
  const sourceCustomers = await db
    .select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
      email: customers.email,
      taxId: customers.taxId,
      creditLimit: customers.creditLimit,
      notes: customers.notes,
      ownerSharedKey: customers.ownerSharedKey,
    })
    .from(customers)
    .where(eq(customers.organizationId, sourceOrganizationId))

  for (const customer of sourceCustomers) {
    const sharedKey = customer.ownerSharedKey ?? crypto.randomUUID()

    if (!customer.ownerSharedKey) {
      await db.update(customers)
        .set({ ownerSharedKey: sharedKey })
        .where(eq(customers.id, customer.id))
    }

    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, targetOrganizationId),
          eq(customers.ownerSharedKey, sharedKey)
        )
      )
      .limit(1)

    if (existing?.id) continue

    await db.insert(customers).values({
      organizationId: targetOrganizationId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      taxId: customer.taxId,
      creditLimit: customer.creditLimit,
      notes: customer.notes,
      ownerSharedKey: sharedKey,
      createdBy: targetMemberId,
    })
  }

  // ── Roles mapping ────────────────────────────────────────────────────────────
  const sourceRoles = await db
    .select({ id: roles.id, slug: roles.slug })
    .from(roles)
    .where(eq(roles.organizationId, sourceOrganizationId))

  const targetRoles = await db
    .select({ id: roles.id, slug: roles.slug })
    .from(roles)
    .where(eq(roles.organizationId, targetOrganizationId))

  const roleIdBySlug = new Map(targetRoles.map((r) => [r.slug, r.id]))
  const sourceRoleSlug = new Map(sourceRoles.map((r) => [r.id, r.slug]))

  // ── Employees ────────────────────────────────────────────────────────────────
  const sourceEmployees = await db
    .select({
      id: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      phone: employees.phone,
      email: employees.email,
      status: employees.status,
      roleId: employees.roleId,
      userId: employees.userId,
      ownerSharedKey: employees.ownerSharedKey,
    })
    .from(employees)
    .where(eq(employees.organizationId, sourceOrganizationId))

  for (const employee of sourceEmployees) {
    const roleSlug = employee.roleId ? sourceRoleSlug.get(employee.roleId) : null
    if (roleSlug === ROLE_SLUGS.propietario) continue

    const sharedKey = employee.ownerSharedKey ?? crypto.randomUUID()

    if (!employee.ownerSharedKey) {
      await db.update(employees)
        .set({ ownerSharedKey: sharedKey })
        .where(eq(employees.id, employee.id))
    }

    const [existing] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.organizationId, targetOrganizationId),
          eq(employees.ownerSharedKey, sharedKey)
        )
      )
      .limit(1)

    if (existing?.id) continue

    const targetRoleId = roleSlug ? roleIdBySlug.get(roleSlug) ?? null : null

    await db.insert(employees).values({
      organizationId: targetOrganizationId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone,
      email: employee.email,
      status: employee.status,
      roleId: targetRoleId,
      userId: employee.userId,
      ownerSharedKey: sharedKey,
      createdBy: targetMemberId,
    })

    if (!employee.userId) continue

    const displayName = `${employee.firstName} ${employee.lastName}`.trim()
    const memberStatus = employee.status === 'active' ? 'active' : 'suspended'

    const [existingMember] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, targetOrganizationId),
          eq(organizationMembers.userId, employee.userId)
        )
      )
      .limit(1)

    let memberId = existingMember?.id ?? null

    if (!memberId) {
      const [createdMember] = await db
        .insert(organizationMembers)
        .values({
          organizationId: targetOrganizationId,
          userId: employee.userId,
          status: memberStatus,
          displayName: displayName || null,
        })
        .returning({ id: organizationMembers.id })
      memberId = createdMember?.id ?? null
    }

    if (memberId && targetRoleId) {
      await db.insert(memberRoles)
        .values({ memberId, roleId: targetRoleId })
        .onConflictDoNothing()
    }
  }

  // ── Products ─────────────────────────────────────────────────────────────────
  const sourceProducts = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      description: products.description,
      imageUrl: products.imageUrl,
      availableQuantity: products.availableQuantity,
      salePrice: products.salePrice,
      costPrice: products.costPrice,
      taxRate: products.taxRate,
      isActive: products.isActive,
      categoryId: products.categoryId,
      subCategoryId: products.subCategoryId,
      supplierId: products.supplierId,
      ownerSharedKey: products.ownerSharedKey,
    })
    .from(products)
    .where(eq(products.organizationId, sourceOrganizationId))

  for (const product of sourceProducts) {
    const sharedKey = product.ownerSharedKey ?? crypto.randomUUID()

    if (!product.ownerSharedKey) {
      await db.update(products)
        .set({ ownerSharedKey: sharedKey })
        .where(eq(products.id, product.id))
    }

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.organizationId, targetOrganizationId),
          eq(products.ownerSharedKey, sharedKey)
        )
      )
      .limit(1)

    if (existing?.id) continue

    await db.insert(products).values({
      organizationId: targetOrganizationId,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      imageUrl: product.imageUrl,
      availableQuantity: product.availableQuantity,
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      taxRate: product.taxRate,
      isActive: product.isActive,
      categoryId: product.categoryId != null ? categoryIdMap.get(product.categoryId) ?? null : null,
      subCategoryId: product.subCategoryId != null ? subCategoryIdMap.get(product.subCategoryId) ?? null : null,
      supplierId: product.supplierId != null ? supplierIdMap.get(product.supplierId) ?? null : null,
      ownerSharedKey: sharedKey,
      createdBy: targetMemberId,
    })
  }
}

/** Sucursal fuente del propietario para clonar catálogo a una nueva. */
export async function getOwnerCatalogSourceOrganizationId (
  excludeOrganizationId: string
): Promise<string | null> {
  const targets = await getCreateFanOutTargets(excludeOrganizationId)
  const source = targets.find((t) => t.organizationId !== excludeOrganizationId)
  return source?.organizationId ?? null
}
