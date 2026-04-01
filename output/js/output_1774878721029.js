// Import library express
const express = require('express');

// Buat instance express
const app = express();

// Buat port utk server
const port = 3000;

// Buat route untuk homepage
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Buat server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
