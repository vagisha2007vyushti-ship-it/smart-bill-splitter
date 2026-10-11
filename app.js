const express = require('express');
const path = require('path');
const { renderLayout } = require('./src/layout');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve CSS and JavaScript files
app.use(express.static(path.join(__dirname, 'frontend')));

// Home / Quick Split page
app.get('/', (req, res) => {
    const viewPath = path.join(__dirname, 'src', 'views', 'index.html');
    res.send(renderLayout('Quick Split', viewPath));
});

// Group Expenses page
app.get('/group', (req, res) => {
    const viewPath = path.join(__dirname, 'src', 'views', 'group.html');
    res.send(renderLayout('Group Expenses', viewPath));
});

// Members & Balances page
app.get('/members', (req, res) => {
    const viewPath = path.join(__dirname, 'src', 'views', 'members.html');
    res.send(renderLayout('Members & Balances', viewPath));
});

// Start server
app.listen(PORT, () => {
    console.log(`Smart Bill Splitter is running at http://localhost:${PORT}`);
});