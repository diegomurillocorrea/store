import { ROLE_SLUGS } from '@/lib/permissions/views'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      organization_id,
      organizations ( id, slug ),
      member_roles (
        roles ( slug )
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (error) {
    console.error('getCreateFanOutTargets', error)
    return []
  }

  type RawMembership = {
    id: string
    organization_id: string
    organizations:
      | { id: string; slug: string }
      | { id: string; slug: string }[]
      | null
    member_roles:
      | { roles: { slug: string } | { slug: string }[] | null }[]
      | null
  }

  const targets = new Map<string, OwnerOrgTarget>()

  for (const row of (memberships ?? []) as unknown as RawMembership[]) {
    const org = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations
    if (!org) continue

    const roleSlugs = (row.member_roles ?? []).flatMap((mr) => {
      const role = Array.isArray(mr.roles) ? mr.roles[0] : mr.roles
      return role?.slug ? [role.slug] : []
    })

    const isPropietario = roleSlugs.includes(ROLE_SLUGS.propietario)
    const isCurrent = row.organization_id === currentOrganizationId

    if (!isPropietario && !isCurrent) continue

    targets.set(row.organization_id, {
      organizationId: row.organization_id,
      memberId: row.id,
      slug: org.slug,
    })
  }

  if (!targets.has(currentOrganizationId)) {
    const { data: currentMember } = await supabase
      .from('organization_members')
      .select('id, organizations ( slug )')
      .eq('organization_id', currentOrganizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (currentMember) {
      const org = Array.isArray(currentMember.organizations)
        ? currentMember.organizations[0]
        : currentMember.organizations
      if (org?.slug) {
        targets.set(currentOrganizationId, {
          organizationId: currentOrganizationId,
          memberId: currentMember.id,
          slug: org.slug,
        })
      }
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

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from(table)
    .select('owner_shared_key, name')
    .eq('id', entityId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error || !data) {
    return { sharedKey: null, name: null, categorySharedKey: null, categoryName: null }
  }

  return {
    sharedKey: data.owner_shared_key ?? null,
    name: data.name ?? null,
    categorySharedKey: null,
    categoryName: null,
  }
}

export async function getSubCategorySharedRef (
  organizationId: string,
  subCategoryId: string | null
): Promise<SharedEntityRef> {
  if (!subCategoryId) {
    return { sharedKey: null, name: null, categorySharedKey: null, categoryName: null }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('subcategories')
    .select(`
      owner_shared_key,
      name,
      categories ( owner_shared_key, name )
    `)
    .eq('id', subCategoryId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error || !data) {
    return { sharedKey: null, name: null, categorySharedKey: null, categoryName: null }
  }

  const category = Array.isArray(data.categories) ? data.categories[0] : data.categories

  return {
    sharedKey: data.owner_shared_key ?? null,
    name: data.name ?? null,
    categorySharedKey: category?.owner_shared_key ?? null,
    categoryName: category?.name ?? null,
  }
}

export async function resolveCategoryIdInOrg (
  organizationId: string,
  ref: SharedEntityRef
): Promise<string | null> {
  if (!ref.sharedKey && !ref.name) return null

  const supabase = await createSupabaseServerClient()

  if (ref.sharedKey) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('owner_shared_key', ref.sharedKey)
      .maybeSingle()
    if (data?.id) return data.id
  }

  if (ref.name) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('name', ref.name)
      .limit(1)
      .maybeSingle()
    if (data?.id) return data.id
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

  const supabase = await createSupabaseServerClient()
  let sharedKey = ref.sharedKey

  if (!sharedKey && source?.categoryId) {
    sharedKey = newOwnerSharedKey()
    const { error: sourceKeyError } = await supabase
      .from('categories')
      .update({ owner_shared_key: sharedKey })
      .eq('id', source.categoryId)
      .eq('organization_id', source.organizationId)

    if (sourceKeyError) {
      console.error('ensureCategoryInOrg source key', sourceKeyError)
      return null
    }
  }

  if (sharedKey) {
    const { data: byKey } = await supabase
      .from('categories')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .eq('owner_shared_key', sharedKey)
      .maybeSingle()
    if (byKey?.id) return byKey.id
  }

  if (ref.name) {
    const { data: byName } = await supabase
      .from('categories')
      .select('id, owner_shared_key')
      .eq('organization_id', targetOrganizationId)
      .ilike('name', ref.name)
      .limit(1)
      .maybeSingle()

    if (byName?.id) {
      if (sharedKey && byName.owner_shared_key !== sharedKey) {
        await supabase
          .from('categories')
          .update({ owner_shared_key: sharedKey })
          .eq('id', byName.id)
          .eq('organization_id', targetOrganizationId)
      }
      return byName.id
    }
  }

  if (!ref.name) return null

  const { data: inserted, error } = await supabase
    .from('categories')
    .insert({
      organization_id: targetOrganizationId,
      name: ref.name,
      owner_shared_key: sharedKey,
      created_by: targetMemberId,
    })
    .select('id')
    .maybeSingle()

  if (error || !inserted?.id) {
    console.error('ensureCategoryInOrg insert', error)
    return null
  }

  return inserted.id
}

export async function resolveSupplierIdInOrg (
  organizationId: string,
  ref: SharedEntityRef
): Promise<string | null> {
  if (!ref.sharedKey && !ref.name) return null

  const supabase = await createSupabaseServerClient()

  if (ref.sharedKey) {
    const { data } = await supabase
      .from('suppliers')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('owner_shared_key', ref.sharedKey)
      .maybeSingle()
    if (data?.id) return data.id
  }

  if (ref.name) {
    const { data } = await supabase
      .from('suppliers')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('name', ref.name)
      .limit(1)
      .maybeSingle()
    if (data?.id) return data.id
  }

  return null
}

export async function resolveSubCategoryIdInOrg (
  organizationId: string,
  ref: SharedEntityRef,
  categoryId: string | null
): Promise<string | null> {
  if (!ref.sharedKey && !ref.name) return null

  const supabase = await createSupabaseServerClient()

  if (ref.sharedKey) {
    const { data } = await supabase
      .from('subcategories')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('owner_shared_key', ref.sharedKey)
      .maybeSingle()
    if (data?.id) return data.id
  }

  if (ref.name && categoryId) {
    const { data } = await supabase
      .from('subcategories')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('category_id', categoryId)
      .ilike('name', ref.name)
      .limit(1)
      .maybeSingle()
    if (data?.id) return data.id
  }

  return null
}

export async function resolveRoleIdBySlugInOrg (
  organizationId: string,
  roleId: string | null,
  sourceOrganizationId: string
): Promise<string | null> {
  if (!roleId) return null

  const supabase = await createSupabaseServerClient()
  const { data: sourceRole } = await supabase
    .from('roles')
    .select('slug')
    .eq('id', roleId)
    .eq('organization_id', sourceOrganizationId)
    .maybeSingle()

  if (!sourceRole?.slug) return null

  const { data: targetRole } = await supabase
    .from('roles')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', sourceRole.slug)
    .maybeSingle()

  return targetRole?.id ?? null
}

export async function findCategoryIdBySharedKey (
  organizationId: string,
  sharedKey: string
): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('owner_shared_key', sharedKey)
    .maybeSingle()
  return data?.id ?? null
}

export async function findCategoryIdByName (
  organizationId: string,
  name: string
): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('name', name)
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
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
  const supabase = await createSupabaseServerClient()

  const categoryIdMap = new Map<string, string>()
  const subCategoryIdMap = new Map<string, string>()
  const supplierIdMap = new Map<string, string>()

  const { data: sourceCategories } = await supabase
    .from('categories')
    .select('id, name, owner_shared_key')
    .eq('organization_id', sourceOrganizationId)

  for (const category of sourceCategories ?? []) {
    const sharedKey = category.owner_shared_key ?? crypto.randomUUID()

    if (!category.owner_shared_key) {
      await supabase
        .from('categories')
        .update({ owner_shared_key: sharedKey })
        .eq('id', category.id)
    }

    const { data: existingByKey } = await supabase
      .from('categories')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .eq('owner_shared_key', sharedKey)
      .maybeSingle()

    if (existingByKey?.id) {
      categoryIdMap.set(category.id, existingByKey.id)
      continue
    }

    const { data: existingByName } = await supabase
      .from('categories')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .ilike('name', category.name)
      .limit(1)
      .maybeSingle()

    if (existingByName?.id) {
      await supabase
        .from('categories')
        .update({ owner_shared_key: sharedKey })
        .eq('id', existingByName.id)
      categoryIdMap.set(category.id, existingByName.id)
      continue
    }

    const { data: inserted } = await supabase
      .from('categories')
      .insert({
        organization_id: targetOrganizationId,
        name: category.name,
        owner_shared_key: sharedKey,
        created_by: targetMemberId,
      })
      .select('id')
      .maybeSingle()

    if (inserted?.id) {
      categoryIdMap.set(category.id, inserted.id)
    }
  }

  const { data: sourceSubCategories } = await supabase
    .from('subcategories')
    .select('id, name, category_id, owner_shared_key')
    .eq('organization_id', sourceOrganizationId)

  for (const sub of sourceSubCategories ?? []) {
    const targetCategoryId = categoryIdMap.get(sub.category_id)
    if (!targetCategoryId) continue

    const sharedKey = sub.owner_shared_key ?? crypto.randomUUID()

    if (!sub.owner_shared_key) {
      await supabase
        .from('subcategories')
        .update({ owner_shared_key: sharedKey })
        .eq('id', sub.id)
    }

    const { data: existing } = await supabase
      .from('subcategories')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .eq('owner_shared_key', sharedKey)
      .maybeSingle()

    if (existing?.id) {
      subCategoryIdMap.set(sub.id, existing.id)
      continue
    }

    const { data: inserted } = await supabase
      .from('subcategories')
      .insert({
        organization_id: targetOrganizationId,
        category_id: targetCategoryId,
        name: sub.name,
        owner_shared_key: sharedKey,
        created_by: targetMemberId,
      })
      .select('id')
      .maybeSingle()

    if (inserted?.id) {
      subCategoryIdMap.set(sub.id, inserted.id)
    }
  }

  const { data: sourceSuppliers } = await supabase
    .from('suppliers')
    .select('id, name, phone, email, notes, tax_id, owner_shared_key')
    .eq('organization_id', sourceOrganizationId)

  for (const supplier of sourceSuppliers ?? []) {
    const sharedKey = supplier.owner_shared_key ?? crypto.randomUUID()

    if (!supplier.owner_shared_key) {
      await supabase
        .from('suppliers')
        .update({ owner_shared_key: sharedKey })
        .eq('id', supplier.id)
    }

    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .eq('owner_shared_key', sharedKey)
      .maybeSingle()

    if (existing?.id) {
      supplierIdMap.set(supplier.id, existing.id)
      continue
    }

    const { data: inserted } = await supabase
      .from('suppliers')
      .insert({
        organization_id: targetOrganizationId,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        notes: supplier.notes,
        tax_id: supplier.tax_id,
        owner_shared_key: sharedKey,
        created_by: targetMemberId,
      })
      .select('id')
      .maybeSingle()

    if (inserted?.id) {
      supplierIdMap.set(supplier.id, inserted.id)
    }
  }

  const { data: sourceCustomers } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone, email, tax_id, credit_limit, notes, owner_shared_key')
    .eq('organization_id', sourceOrganizationId)

  for (const customer of sourceCustomers ?? []) {
    const sharedKey = customer.owner_shared_key ?? crypto.randomUUID()

    if (!customer.owner_shared_key) {
      await supabase
        .from('customers')
        .update({ owner_shared_key: sharedKey })
        .eq('id', customer.id)
    }

    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .eq('owner_shared_key', sharedKey)
      .maybeSingle()

    if (existing?.id) continue

    await supabase.from('customers').insert({
      organization_id: targetOrganizationId,
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      email: customer.email,
      tax_id: customer.tax_id,
      credit_limit: customer.credit_limit,
      notes: customer.notes,
      owner_shared_key: sharedKey,
      created_by: targetMemberId,
    })
  }

  const { data: sourceRoles } = await supabase
    .from('roles')
    .select('id, slug')
    .eq('organization_id', sourceOrganizationId)

  const { data: targetRoles } = await supabase
    .from('roles')
    .select('id, slug')
    .eq('organization_id', targetOrganizationId)

  const roleIdBySlug = new Map((targetRoles ?? []).map((r) => [r.slug, r.id]))
  const sourceRoleSlug = new Map((sourceRoles ?? []).map((r) => [r.id, r.slug]))

  const { data: sourceEmployees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, phone, email, status, role_id, user_id, owner_shared_key')
    .eq('organization_id', sourceOrganizationId)

  for (const employee of sourceEmployees ?? []) {
    const roleSlug = employee.role_id ? sourceRoleSlug.get(employee.role_id) : null
    if (roleSlug === ROLE_SLUGS.propietario) continue

    const sharedKey = employee.owner_shared_key ?? crypto.randomUUID()

    if (!employee.owner_shared_key) {
      await supabase
        .from('employees')
        .update({ owner_shared_key: sharedKey })
        .eq('id', employee.id)
    }

    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .eq('owner_shared_key', sharedKey)
      .maybeSingle()

    if (existing?.id) continue

    const targetRoleId = roleSlug ? roleIdBySlug.get(roleSlug) ?? null : null

    await supabase.from('employees').insert({
      organization_id: targetOrganizationId,
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone: employee.phone,
      email: employee.email,
      status: employee.status,
      role_id: targetRoleId,
      user_id: employee.user_id,
      owner_shared_key: sharedKey,
      created_by: targetMemberId,
    })

    if (!employee.user_id) continue

    const displayName = `${employee.first_name} ${employee.last_name}`.trim()
    const memberStatus = employee.status === 'active' ? 'active' : 'suspended'

    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .eq('user_id', employee.user_id)
      .maybeSingle()

    let memberId = existingMember?.id ?? null

    if (!memberId) {
      const { data: createdMember } = await supabase
        .from('organization_members')
        .insert({
          organization_id: targetOrganizationId,
          user_id: employee.user_id,
          status: memberStatus,
          display_name: displayName || null,
        })
        .select('id')
        .single()

      memberId = createdMember?.id ?? null
    }

    if (memberId && targetRoleId) {
      await supabase.from('member_roles').upsert(
        { member_id: memberId, role_id: targetRoleId },
        { onConflict: 'member_id,role_id' }
      )
    }
  }

  const { data: sourceProducts } = await supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      barcode,
      description,
      image_url,
      available_quantity,
      sale_price,
      cost_price,
      tax_rate,
      is_active,
      category_id,
      sub_category_id,
      supplier_id,
      owner_shared_key
    `)
    .eq('organization_id', sourceOrganizationId)

  for (const product of sourceProducts ?? []) {
    const sharedKey = product.owner_shared_key ?? crypto.randomUUID()

    if (!product.owner_shared_key) {
      await supabase
        .from('products')
        .update({ owner_shared_key: sharedKey })
        .eq('id', product.id)
    }

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .eq('owner_shared_key', sharedKey)
      .maybeSingle()

    if (existing?.id) continue

    await supabase.from('products').insert({
      organization_id: targetOrganizationId,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      image_url: product.image_url,
      available_quantity: product.available_quantity,
      sale_price: product.sale_price,
      cost_price: product.cost_price,
      tax_rate: product.tax_rate,
      is_active: product.is_active,
      category_id: product.category_id
        ? categoryIdMap.get(product.category_id) ?? null
        : null,
      sub_category_id: product.sub_category_id
        ? subCategoryIdMap.get(product.sub_category_id) ?? null
        : null,
      supplier_id: product.supplier_id
        ? supplierIdMap.get(product.supplier_id) ?? null
        : null,
      owner_shared_key: sharedKey,
      created_by: targetMemberId,
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
