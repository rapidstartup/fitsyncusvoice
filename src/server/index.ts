import express from 'express';
import { createServer } from 'http';
import { setupWebSocketProxy } from './websocketProxy';

const app = express();
const server = createServer(app);

// Setup WebSocket proxy
setupWebSocketProxy(server);

// Your other Express routes and middleware here

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 