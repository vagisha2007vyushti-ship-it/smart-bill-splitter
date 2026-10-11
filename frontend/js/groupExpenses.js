document.addEventListener('DOMContentLoaded', () => {
  // Escape user-provided text before injecting into HTML (prevents broken markup / XSS)
  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 1. Storage Helpers using ONLY the required keys
  function getStoredMembers() {
    const data = localStorage.getItem('bill_members');
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      // Handle both string arrays and object arrays robustly
      return parsed.map(m => {
        if (typeof m === 'object' && m !== null) {
          return m.name || m.username || String(m);
        }
        return String(m);
      }).filter(Boolean);
    } catch (e) {
      console.error('Error parsing bill_members:', e);
      return [];
    }
  }

  function getStoredExpenses() {
    const data = localStorage.getItem('bill_expenses');
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];

      // Make sure every expense has a unique id so Edit/Delete can find it.
      // (Older saved data may have no id, or duplicate ids.)
      const seen = new Set();
      let changed = false;
      const cleaned = parsed.filter(exp => exp && typeof exp === 'object').map((exp, i) => {
        let id = exp.id !== undefined && exp.id !== null && exp.id !== '' ? String(exp.id)
               : (exp._id !== undefined && exp._id !== null && exp._id !== '' ? String(exp._id) : '');
        if (!id || seen.has(id)) {
          id = Date.now().toString() + '-' + i + '-' + Math.random().toString(36).slice(2, 7);
          changed = true;
        }
        seen.add(id);
        if (exp.id !== id) {
          changed = true;
          return { ...exp, id: id };
        }
        return exp;
      });
      if (changed || cleaned.length !== parsed.length) {
        localStorage.setItem('bill_expenses', JSON.stringify(cleaned));
      }
      return cleaned;
    } catch (e) {
      console.error('Error parsing bill_expenses:', e);
      return [];
    }
  }

  function saveExpenses(expenses) {
    localStorage.setItem('bill_expenses', JSON.stringify(expenses));
  }

  // 2. Initialize Form Elements
  const members = getStoredMembers();
  const payerSelect = document.getElementById('expense-payer');
  const sharedContainer = document.getElementById('expense-shared-container');
  const addExpenseBtn = document.getElementById('add-expense-btn');

  // Populate Paid By dropdown
  if (payerSelect) {
    if (members.length === 0) {
      payerSelect.innerHTML = '<option value="">No members found (Add members first)</option>';
    } else {
      payerSelect.innerHTML = members.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
    }
  }

  // Populate Paid For checkboxes dynamically inside #expense-shared-container
  function renderCheckboxes(selectedValues = null) {
    if (!sharedContainer) return;
    if (members.length === 0) {
      sharedContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Please add members in the Members tab first.</span>';
      return;
    }

    // Default to all checked if no specific selection is provided (e.g. new expense)
    const defaults = selectedValues === null ? members : selectedValues;

    sharedContainer.innerHTML = members.map(m => {
      const isChecked = defaults.includes(m) ? 'checked' : '';
      return `
        <label>
          <input type="checkbox" name="shared-member" value="${esc(m)}" ${isChecked}>
          <span>${esc(m)}</span>
        </label>
      `;
    }).join('');
  }

  renderCheckboxes();

  let editingExpenseId = null;

  // 3. Add / Update Expense Logic
  if (addExpenseBtn) {
    addExpenseBtn.addEventListener('click', () => {
      const descInput = document.getElementById('expense-desc');
      const placeInput = document.getElementById('expense-place');
      const amountInput = document.getElementById('expense-amount');
      
      const desc = descInput ? descInput.value.trim() : '';
      const place = placeInput ? placeInput.value.trim() : '';
      const amount = amountInput ? parseFloat(amountInput.value) : NaN;
      const payer = payerSelect ? payerSelect.value : '';

      const checkedBoxes = sharedContainer ? sharedContainer.querySelectorAll('input[name="shared-member"]:checked') : [];
      const paidFor = Array.from(checkedBoxes).map(cb => cb.value);

      if (!desc) {
        alert('Please enter a description.');
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount in ₹.');
        return;
      }
      if (!payer) {
        alert('Please select who paid.');
        return;
      }
      if (paidFor.length === 0) {
        alert('Please select at least one person for Paid For.');
        return;
      }

      let expenses = getStoredExpenses();

      if (editingExpenseId) {
        // Update existing expense
        expenses = expenses.map(exp => {
          if (String(exp.id) === editingExpenseId || String(exp._id) === editingExpenseId) {
            return {
              ...exp,
              description: desc,
              place: place,
              amount: amount,
              payer: payer,
              paidFor: paidFor,
              sharedBy: paidFor // backward compatibility
            };
          }
          return exp;
        });
        editingExpenseId = null;
        addExpenseBtn.textContent = 'Add Expense';
      } else {
        // Create new expense
        const newExpense = {
          id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7),
          description: desc,
          place: place,
          amount: amount,
          payer: payer,
          paidFor: paidFor,
          sharedBy: paidFor
        };
        expenses.push(newExpense);
      }

      saveExpenses(expenses);

      // Reset Form fields
      if (descInput) descInput.value = '';
      if (placeInput) placeInput.value = '';
      if (amountInput) amountInput.value = '';
      if (payerSelect && members.length > 0) payerSelect.value = members[0];
      renderCheckboxes(members);

      renderExpenseTable();
    });
  }

  // 4. Render Expense History Table
  function renderExpenseTable() {
    const tableBody = document.getElementById('expense-table-body');
    if (!tableBody) return;

    const expenses = getStoredExpenses();
    if (expenses.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No expenses recorded yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = expenses.map((exp) => {
      const expId = exp.id || exp._id;
      const beneficiaries = exp.paidFor || exp.sharedBy || [];
      return `
        <tr>
          <td>
            <strong>${esc(exp.description)}</strong><br>
            <small style="color: var(--text-muted);">${esc(exp.place || 'N/A')}</small>
          </td>
          <td>₹${Number(exp.amount).toFixed(2)}</td>
          <td>${esc(exp.payer)}</td>
          <td>${esc(beneficiaries.join(', '))}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="secondary" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;" onclick="window.editExpense('${esc(expId)}')">Edit</button>
              <button class="danger" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;" onclick="window.deleteExpense('${esc(expId)}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 5. Global Edit & Delete Handlers
  window.editExpense = function(id) {
    const expenses = getStoredExpenses();
    const exp = expenses.find(e => (String(e.id) === id || String(e._id) === id));
    if (!exp) return;

    const descInput = document.getElementById('expense-desc');
    const placeInput = document.getElementById('expense-place');
    const amountInput = document.getElementById('expense-amount');

    if (descInput) descInput.value = exp.description || '';
    if (placeInput) placeInput.value = exp.place || '';
    if (amountInput) amountInput.value = exp.amount || '';
    if (payerSelect) payerSelect.value = exp.payer || '';

    const beneficiaries = exp.paidFor || exp.sharedBy || members;
    renderCheckboxes(beneficiaries);

    editingExpenseId = id;
    if (addExpenseBtn) {
      addExpenseBtn.textContent = 'Update Expense';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.deleteExpense = function(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    let expenses = getStoredExpenses();
    expenses = expenses.filter(e => (String(e.id) !== id && String(e._id) !== id));
    saveExpenses(expenses);
    if (editingExpenseId === id) {
      editingExpenseId = null;
      if (addExpenseBtn) addExpenseBtn.textContent = 'Add Expense';
    }
    renderExpenseTable();
  };

  renderExpenseTable();
});