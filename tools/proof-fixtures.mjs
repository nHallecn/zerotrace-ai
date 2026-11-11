// Only bundled, trusted fixtures are executed in this first vertical slice.
// All functions are deterministic and have no network, disk, or dynamic-code access.

function vulnerableProfile({ actorId, profileId }) {
  const profiles = { alice: { ownerId: 'alice', secret: 'alice-private' }, bob: { ownerId: 'bob', secret: 'bob-private' } };
  // Missing ownership check (controlled intentional defect).
  return profiles[profileId] ?? null;
}
function fixedProfile({ actorId, profileId }) {
  const profiles = { alice: { ownerId: 'alice', secret: 'alice-private' }, bob: { ownerId: 'bob', secret: 'bob-private' } };
  const profile = profiles[profileId] ?? null;
  return profile && profile.ownerId === actorId ? profile : null;
}
function vulnerableRefund() {
  const refunded = new Set();
  let total = 0;
  const refund = (paymentId, amount) => {
    // Intentional defect: no check for previously refunded payment.
    refunded.add(paymentId);
    total += amount;
  };
  refund('p-123', 100);
  refund('p-123', 100);
  return total;
}
function fixedRefund() {
  const refunded = new Set();
  let total = 0;
  const refund = (paymentId, amount) => {
    if (refunded.has(paymentId)) return;
    refunded.add(paymentId);
    total += amount;
  };
  refund('p-123', 100);
  refund('p-123', 100);
  return total;
}

export const trustedCases = Object.freeze([
  {
    id: 'access-control-vulnerable',
    category: 'CWE-639',
    expectedViolation: true,
    run: () => {
      const result = vulnerableProfile({ actorId: 'alice', profileId: 'bob' });
      return { observed: result?.secret ?? null, violated: result !== null, oracle: 'non-owner must not read profile' };
    },
  },
  {
    id: 'access-control-fixed',
    category: 'CWE-639',
    expectedViolation: false,
    run: () => {
      const result = fixedProfile({ actorId: 'alice', profileId: 'bob' });
      return { observed: result?.secret ?? null, violated: result !== null, oracle: 'non-owner must not read profile' };
    },
  },
  {
    id: 'duplicate-refund-vulnerable',
    category: 'CWE-841',
    expectedViolation: true,
    run: () => {
      const actualTotal = vulnerableRefund();
      return { observed: actualTotal, violated: actualTotal > 100, oracle: 'one payment may be refunded no more than once' };
    },
  },
  {
    id: 'duplicate-refund-fixed',
    category: 'CWE-841',
    expectedViolation: false,
    run: () => {
      const actualTotal = fixedRefund();
      return { observed: actualTotal, violated: actualTotal > 100, oracle: 'one payment may be refunded no more than once' };
    },
  },
]);
