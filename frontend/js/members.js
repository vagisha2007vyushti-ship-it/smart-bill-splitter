document.addEventListener('DOMContentLoaded', () => {
  const memberList = document.getElementById('member-list');
  const balanceContainer = document.getElementById('balance-container');
  const addMemberBtn = document.getElementById('add-member-btn');
  const nameInput = document.getElementById('member-name');
  if (!memberList || !balanceContainer) return; // not on the Members page

  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Storage helpers (same keys and shapes as the Group Expenses page)
  function getMembers() {
    try {
      const parsed = JSON.parse(localStorage.getItem('bill_members') || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map(m => (typeof m === 'object' && m !== null) ? (m.name || m.username || String(m)) : String(m)).filter(Boolean);
    } catch (e) {
      return [];
    }
  }
  function saveMembers(members) {
    localStorage.setItem('bill_members', JSON.stringify(members));
  }
  function getExpenses() {
    try {
      const parsed = JSON.parse(localStorage.getItem('bill_expenses') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  // Members
  function renderMembers() {
    const members = getMembers();
    if (members.length === 0) {
      memberList.innerHTML = '<li style="color: var(--text-muted); justify-content: center;">No members added yet.</li>';
      return;
    }
    memberList.innerHTML = members.map((m, i) => `
      <li>
        <strong>${esc(m)}</strong>
        <button class="danger" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;" data-index="${i}">Remove</button>
      </li>
    `).join('');
  }

  function addMember() {
    const name = nameInput.value.trim();
    if (!name) {
      alert('Please enter a member name.');
      return;
    }
    const members = getMembers();
    if (members.some(m => m.toLowerCase() === name.toLowerCase())) {
      alert('This member already exists.');
      return;
    }
    members.push(name);
    saveMembers(members);
    nameInput.value = '';
    nameInput.focus();
    renderAll();
  }

  function removeMember(index) {
    const members = getMembers();
    const name = members[index];
    if (name === undefined) return;

    const inUse = getExpenses().some(e =>
      e.payer === name || (e.paidFor || e.sharedBy || []).includes(name)
    );
    if (inUse) {
      alert(name + ' is part of existing expenses. Delete those expenses first before removing this member.');
      return;
    }
    if (!confirm('Remove ' + name + ' from the group?')) return;
    members.splice(index, 1);
    saveMembers(members);
    renderAll();
  }

  // Balances (integer paise to avoid floating point drift)
  function renderBalances() {
    const members = getMembers();
    if (members.length === 0) {
      balanceContainer.innerHTML = '<p style="color: var(--text-muted);">Add members to see balances.</p>';
      return;
    }

    const net = {};
    members.forEach(m => { net[m] = 0; });

    getExpenses().forEach(e => {
      const total = Math.round(Number(e.amount) * 100);
      const beneficiaries = (e.paidFor || e.sharedBy || []).filter(b => b in net);
      if (!isFinite(total) || total <= 0 || beneficiaries.length === 0) return;

      const share = Math.floor(total / beneficiaries.length);
      let remainder = total - share * beneficiaries.length;
      beneficiaries.forEach(b => {
        net[b] -= share + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
      });
      if (e.payer in net) net[e.payer] += total;
    });

    const fmt = paise => '₹' + (Math.abs(paise) / 100).toFixed(2);

    const balanceRows = members.map(m => {
      const v = net[m];
      let text, color;
      if (v > 0) { text = 'gets back ' + fmt(v); color = 'var(--success-hover)'; }
      else if (v < 0) { text = 'owes ' + fmt(v); color = 'var(--danger)'; }
      else { text = 'settled up'; color = 'var(--text-muted)'; }
      return `<li><strong>${esc(m)}</strong><span style="color: ${color}; font-weight: 600;">${text}</span></li>`;
    }).join('');

    // Simplify debts: repeatedly match the biggest debtor with the biggest creditor
    const debtors = [], creditors = [];
    members.forEach(m => {
      if (net[m] < 0) debtors.push({ name: m, amt: -net[m] });
      else if (net[m] > 0) creditors.push({ name: m, amt: net[m] });
    });
    const settlements = [];
    while (debtors.length && creditors.length) {
      debtors.sort((a, b) => b.amt - a.amt);
      creditors.sort((a, b) => b.amt - a.amt);
      const d = debtors[0], c = creditors[0];
      const pay = Math.min(d.amt, c.amt);
      settlements.push(`<li><span><strong>${esc(d.name)}</strong> pays <strong>${esc(c.name)}</strong></span><span style="font-weight: 600;">${fmt(pay)}</span></li>`);
      d.amt -= pay;
      c.amt -= pay;
      if (d.amt === 0) debtors.shift();
      if (c.amt === 0) creditors.shift();
    }

    balanceContainer.innerHTML = `
      <h3>Individual Balances</h3>
      <ul class="list">${balanceRows}</ul>
      <h3 class="mt-lg">Who Owes Whom</h3>
      <ul class="list">
        ${settlements.length ? settlements.join('') : '<li style="color: var(--text-muted); justify-content: center;">Everyone is settled up.</li>'}
      </ul>
    `;
  }

  function renderAll() {
    renderMembers();
    renderBalances();
  }

  if (addMemberBtn) addMemberBtn.addEventListener('click', addMember);
  if (nameInput) {
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') addMember();
    });
  }
  memberList.addEventListener('click', e => {
    const btn = e.target.closest('button[data-index]');
    if (btn) removeMember(parseInt(btn.dataset.index, 10));
  });

  renderAll();
});
