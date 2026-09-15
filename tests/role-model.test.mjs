import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, normalizeRole, roleProfile, roleCapabilities } from '../modules/role-model.js';

test('normalizes only supported roles', () => {
  assert.equal(normalizeRole('MANAGER'), ROLES.MANAGER);
  assert.equal(normalizeRole('installer'), ROLES.INSTALLER);
  assert.equal(normalizeRole(' store '), ROLES.STORE);
  assert.equal(normalizeRole('admin'), '');
  assert.equal(normalizeRole(''), '');
});

test('inactive or incomplete profile has no capabilities', () => {
  assert.deepEqual(roleProfile({ role: 'manager', active: false }), {
    uid: '', role: ROLES.MANAGER, active: false, storeId: '', valid: false,
  });
  assert.equal(roleProfile({ role: 'unknown', active: true }).valid, false);
  assert.equal(roleCapabilities({ role: 'manager', active: false }).canSeeAllJobs, false);
});

test('manager sees operational overview and all jobs', () => {
  assert.deepEqual(roleCapabilities({ role: 'manager', active: true }), {
    canSeeAllJobs: true,
    canSeeOwnJobs: true,
    canSeePlanning: true,
    canSeeMoney: true,
    canSeeOwnMoney: true,
    canSeeStoreRequests: true,
    canSeeInternalDetails: true,
  });
});

test('installer is limited to own operational work and own money', () => {
  const caps = roleCapabilities({ role: 'installer', active: true });
  assert.equal(caps.canSeeOwnJobs, true);
  assert.equal(caps.canSeeOwnMoney, true);
  assert.equal(caps.canSeeAllJobs, false);
  assert.equal(caps.canSeePlanning, false);
  assert.equal(caps.canSeeMoney, false);
  assert.equal(caps.canSeeInternalDetails, false);
});

test('store sees booking availability and own requests without internal details', () => {
  const caps = roleCapabilities({ role: 'store', active: true, storeId: 'store-1' });
  assert.equal(caps.canSeeStoreRequests, true);
  assert.equal(caps.canSeePlanning, true);
  assert.equal(caps.canSeeAllJobs, false);
  assert.equal(caps.canSeeMoney, false);
  assert.equal(caps.canSeeInternalDetails, false);
});
