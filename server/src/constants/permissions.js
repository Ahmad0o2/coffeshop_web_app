export const PERMISSIONS = [
  'manageOrders',
  'manageProducts',
  'manageEvents',
  'manageRewards',
  'manageBrand',
  'manageStaff',
]

export const STAFF_PERMISSIONS = PERMISSIONS.filter(
  (permission) => permission !== 'manageStaff'
)
