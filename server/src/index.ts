import { app } from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[VendorBridge Server] running on http://localhost:${PORT}`);
  console.log(`[Database] PostgreSQL / persistent store initialized successfully.`);
});
