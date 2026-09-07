const res = await fetch('http://localhost:3000/api/grade', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'test'
  },
  body: JSON.stringify({ images: ['data:image/jpeg;base64,123'], language: 'en' })
});
console.log(res.status);
console.log(await res.text());
