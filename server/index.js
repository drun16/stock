// server/index.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Initialize Socket.io with CORS enabled
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// ---------------------------------------------------------
// 1. DATA STATE
// ---------------------------------------------------------
const SUPPORTED_STOCKS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA'];

// Holds current prices
let stockPrices = {};

// Holds user subscriptions.
// Structure: { "socket_id": { email: "user@test.com", stocks: ["GOOG", "TSLA"] } }
let userSubscriptions = {}; 

// Initialize prices
SUPPORTED_STOCKS.forEach(stock => stockPrices[stock] = 100.00);

// ---------------------------------------------------------
// 2. SOCKET.IO EVENT HANDLING
// ---------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Initialize this user in our state
  userSubscriptions[socket.id] = { email: null, stocks: [] };

  // Event: User Logs in
  socket.on('login', (email) => {
    userSubscriptions[socket.id].email = email;
    console.log(`User ${socket.id} logged in as ${email}`);
  });

  // Event: User Subscribes to a stock
  socket.on('subscribe', (stockSymbol) => {
    if (SUPPORTED_STOCKS.includes(stockSymbol)) {
      const user = userSubscriptions[socket.id];
      if (!user.stocks.includes(stockSymbol)) {
        user.stocks.push(stockSymbol);
        console.log(`User ${user.email} subscribed to ${stockSymbol}`);
      }
    }
  });

  // Event: User Unsubscribes
  socket.on('unsubscribe', (stockSymbol) => {
    const user = userSubscriptions[socket.id];
    user.stocks = user.stocks.filter(s => s !== stockSymbol);
    console.log(`User ${user.email} unsubscribed from ${stockSymbol}`);
  });

  // Event: Disconnect
  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
    delete userSubscriptions[socket.id]; 
  });
});

// ---------------------------------------------------------
// 3. STOCK ENGINE (UPDATED)
// ---------------------------------------------------------
function updateStockPrices() {
  // 1. Update the prices
  SUPPORTED_STOCKS.forEach(stock => {
    const changePercent = (Math.random() * 0.04) - 0.02; 
    let newPrice = stockPrices[stock] + (stockPrices[stock] * changePercent);
    if (newPrice < 0.01) newPrice = 0.01;
    stockPrices[stock] = parseFloat(newPrice.toFixed(2));
  });

  // 2. PUSH updates to clients based on their subscriptions
  io.sockets.sockets.forEach((socket) => {
    const socketId = socket.id;
    const userData = userSubscriptions[socketId];

    if (userData && userData.stocks.length > 0) {
      
      // FIX: Removed space in variable name
      const userSpecificPrices = {};
      userData.stocks.forEach(stock => {
        userSpecificPrices[stock] = stockPrices[stock];
      });

      socket.emit('priceUpdate', userSpecificPrices);
    }
  });
}

setInterval(updateStockPrices, 1000);

// ---------------------------------------------------------
// SERVER START
// ---------------------------------------------------------
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});