// Small production UX fixes for numeric fields on iPhone/Safari.
// Expense and income amounts must accept arbitrary ruble amounts such as 180 ₽,
// not only multiples of 100 ₽. The previous step=100 made Safari reject 180
// and return focus to the amount field instead of submitting the form.
const fixMoneyInputs = () => {
  document.querySelectorAll('#qeAmount, #qiAmount, #jobPrice').forEach(input => {
    input.step = '1';
    input.min = '0';
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'off');
  });
};

fixMoneyInputs();
new MutationObserver(fixMoneyInputs).observe(document.body, { childList: true, subtree: true });
