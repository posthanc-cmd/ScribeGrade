const express = require('express');
const app = express();
app.get('/', (req, res) => res.json("some string"));
app.listen(3001, () => {
  fetch('http://localhost:3001/').then(r => {
    console.log(r.headers.get('content-type'));
    process.exit(0);
  });
});
