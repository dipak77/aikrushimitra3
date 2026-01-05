import express from 'express';
import { createServer } from 'vite';

const app = express();
const PORT = process.env.PORT || 8080;

async function startServer() {
  // Create Vite server in middleware mode. 
  // This allows us to serve the React app with HMR and on-the-fly compilation
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa', 
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();