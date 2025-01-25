const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store chat history in memory
const chatHistory = [];

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// WebSocket connection
wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send chat history to the newly connected client
    ws.send(JSON.stringify({ type: 'history', data: chatHistory }));

    // Listen for messages from the client
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'chat') {
            // Add timestamp, unique ID, and sender to the message
            const chatMessage = {
                id: Date.now().toString(), // Unique ID for the message
                username: data.username,
                message: data.message,
                timestamp: new Date().toLocaleTimeString(),
            };

            // Add the message to chat history
            chatHistory.push(chatMessage);

            // Broadcast the message to all connected clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'chat', data: chatMessage }));
                }
            });
        } else if (data.type === 'delete') {
            // Find the message in chat history
            const messageId = data.messageId;
            const message = chatHistory.find((msg) => msg.id === messageId);

            // Check if the user requesting deletion is the sender of the message
            if (message && message.username === data.username) {
                // Remove the message from chat history
                const messageIndex = chatHistory.findIndex((msg) => msg.id === messageId);
                chatHistory.splice(messageIndex, 1);

                // Broadcast the deletion to all connected clients
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'delete', messageId }));
                    }
                });
            } else {
                // Notify the client that they are not authorized to delete this message
                ws.send(JSON.stringify({ type: 'error', message: 'You are not authorized to delete this message.' }));
            }
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});