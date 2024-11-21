import WebSocket from 'ws';
import { Server } from 'http';
import { config } from '../config/env';

// Define the WebSocket server type
interface WebSocketServer extends WebSocket.Server {
  clients: Set<WebSocket>;
}

export function setupWebSocketProxy(server: Server) {
  const wss = new WebSocket.Server({ server }) as WebSocketServer;

  wss.on('connection', (clientWs: WebSocket) => {
    console.log('Client connected to proxy');

    // Connect to OpenAI's Realtime API
    const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime/assistants', {
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    openAiWs.on('open', () => {
      console.log('Connected to OpenAI WebSocket');
      
      // Forward messages from client to OpenAI
      clientWs.on('message', (message: WebSocket.RawData) => {
        if (openAiWs.readyState === WebSocket.OPEN) {
          openAiWs.send(message.toString());
        }
      });

      // Forward messages from OpenAI to client
      openAiWs.on('message', (message: WebSocket.RawData) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(message.toString());
        }
      });
    });

    // Handle errors and closures
    const cleanup = () => {
      openAiWs.close();
      clientWs.close();
    };

    clientWs.on('close', cleanup);
    openAiWs.on('close', cleanup);
    clientWs.on('error', cleanup);
    openAiWs.on('error', cleanup);
  });

  return wss;
} 