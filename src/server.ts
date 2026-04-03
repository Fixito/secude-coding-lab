import express from 'express';

const app = express();

app.get('/', (_req, res) => {
  res.send('Hello World!');
});

const PORT = process.env['PORT'] || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/`);
});
