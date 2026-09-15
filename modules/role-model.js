export const ROLES = Object.freeze({
  MANAGER: 'manager',
  INSTALLER: 'installer',
  STORE: 'store',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.MANAGER]: 'Менеджер',
  [ROLES.INSTALLER]: 'Монтажник',
  [ROLES.STORE]: 'Магазин',
});

const ALL = Object.freeze(Object.values(ROLES));

export function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  return ALL.includes(value) ? value : '';
}

export function roleProfile(profile = {}) {
  const role = normalizeRole(profile.role);
  return {
    uid: String(profile.uid || ''),
    role,
    active: profile.active === true,
    storeId: String(profile.storeId || ''),
    valid: Boolean(role && profile.active === true),
  };
}

export function roleCapabilities(profile = {}) {
  const p = roleProfile(profile);
  if (!p.valid) {
    return {
      canSeeAllJobs: false,
      canSeeOwnJobs: false,
      canSeePlanning: false,
      canSeeMoney: false,
      canSeeOwnMoney: false,
      canSeeStoreRequests: false,
      canSeeInternalDetails: false,
    };
  }

  if (p.role === ROLES.MANAGER) {
    return {
      canSeeAllJobs: true,
      canSeeOwnJobs: true,
      canSeePlanning: true,
      canSeeMoney: true,
      canSeeOwnMoney: true,
      canSeeStoreRequests: true,
      canSeeInternalDetails: true,
    };
  }

  if (p.role === ROLES.INSTALLER) {
    return {
      canSeeAllJobs: false,
      canSeeOwnJobs: true,
      canSeePlanning: false,
      canSeeMoney: false,
      canSeeOwnMoney: true,
      canSeeStoreRequests: false,
      canSeeInternalDetails: false,
    };
  }

  return {
    canSeeAllJobs: false,
    canSeeOwnJobs: false,
    canSeePlanning: true,
    canSeeMoney: false,
    canSeeOwnMoney: false,
    canSeeStoreRequests: true,
    canSeeInternalDetails: false,
  };
}
