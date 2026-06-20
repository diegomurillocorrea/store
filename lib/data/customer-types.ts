export interface CustomerRow {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  createdAt: string
  createdBy: string | null
  createdByName: string | null
}

export function getCustomerFullName(
  customer: Pick<CustomerRow, 'firstName' | 'lastName'>
): string {
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim()
}
