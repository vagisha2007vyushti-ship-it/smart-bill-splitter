const fs = require('fs');

function renderLayout(title, viewPath) {
  const viewContent = fs.readFileSync(viewPath, 'utf8');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Bill Splitter - ${title}</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav>
    <div class="logo">💰 Smart Bill Splitter</div>
    <ul>
      <li><a href="/" class="${title === 'Quick Split' ? 'active' : ''}">Quick Split</a></li>
      <li><a href="/group" class="${title === 'Group Expenses' ? 'active' : ''}">Group Expenses</a></li>
      <li><a href="/members" class="${title === 'Members & Balances' ? 'active' : ''}">Members & Balances</a></li>
    </ul>
  </nav>

  <main class="container">
    ${viewContent}
  </main>

  <script src="/js/quickSplit.js"></script>
  <script src="/js/groupExpenses.js"></script>
  <script src="/js/members.js"></script>
</body>
</html>
  `;
}

module.exports = { renderLayout };