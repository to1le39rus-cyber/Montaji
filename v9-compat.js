// v9 compatibility guard: the legacy DOM builder occasionally passes the parent itself as insertBefore reference.
// Only v9 cards are affected; other application DOM operations remain untouched.
(() => {
  const original = Element.prototype.insertBefore;
  Element.prototype.insertBefore = function(node, reference) {
    if (reference === this && node && (node.id === 'v9TodayExpenses' || node.id === 'v9Notes')) {
      return this.appendChild(node);
    }
    return original.call(this, node, reference);
  };
})();
