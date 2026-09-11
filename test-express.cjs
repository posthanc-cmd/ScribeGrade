const express = require('express');
const app = express();
app.get('/', (req, res) => res.json("some string"));
app.listen(3001, () => {
  fetch('http://localhost:3001/').then(r => {
    console.log("Status:", r.status);
    console.log("Content-Type:", r.headers.get('content-type'));
    process.exit(0);
  });
});
