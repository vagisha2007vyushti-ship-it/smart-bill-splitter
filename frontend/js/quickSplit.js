document.addEventListener('DOMContentLoaded', () => {
  const calculateBtn = document.getElementById('calculate-quick-btn');
  if (!calculateBtn) return;

  calculateBtn.addEventListener('click', () => {
    const billAmount = parseFloat(document.getElementById('quick-bill').value) || 0;
    const numPeople = parseInt(document.getElementById('quick-people').value) || 1;
    const taxPercent = parseFloat(document.getElementById('quick-tax').value) || 0;
    const tipPercent = parseFloat(document.getElementById('quick-tip').value) || 0;

    if (billAmount <= 0 || numPeople <= 0) {
      alert('Please enter a valid bill amount and number of people.');
      return;
    }

    const taxAmount = (billAmount * taxPercent) / 100;
    const tipAmount = (billAmount * tipPercent) / 100;
    const totalAmount = billAmount + taxAmount + tipAmount;
    const perPerson = totalAmount / numPeople;

    document.getElementById('quick-result').innerHTML = `
      <p>Tax: ₹${taxAmount.toFixed(2)}</p>
      <p>Tip: ₹${tipAmount.toFixed(2)}</p>
      <p><strong>Total Bill: ₹${totalAmount.toFixed(2)}</strong></p>
      <p style="margin-top: 0.5rem; color: var(--primary);"><strong>Each Person Pays: ₹${perPerson.toFixed(2)}</strong></p>
    `;
  });
});