import express from 'express';
import cors from 'cors';

const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

const port = process.env.AUTH_SERVICE_PORT || 6001;
const server = app.listen(port, () => {
  console.log(`Auth service is running at http://localhost:${port}/api`);
});

server.on('error', (err) => {
  console.error('Failed to start auth service:', err);
});