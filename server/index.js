// server/index.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// ---------------------------------------------------------
// 1. DATA STORAGE
// ---------------------------------------------------------
const SUPPORTED_STOCKS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA'];
let stockPrices = {};

// MOCK DATABASE: Stores history by EMAIL
// Structure: { "user@test.com": ["GOOG", "TSLA"] }
let userDatabase = {}; 

// ACTIVE SESSIONS: Maps socket ID to Email
// Structure: { "socket_id_123": "user@test.com" }
let activeConnections = {};

// Initialize prices
SUPPORTED_STOCKS.forEach(stock => stockPrices[stock] = 100.00);

// ---------------------------------------------------------
// 2. SOCKET EVENT HANDLING
// ---------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Event: User Logs in
  socket.on('login', (email) => {
    // 1. Map this socket to the email
    activeConnections[socket.id] = email;
    console.log(`Socket ${socket.id} mapped to user ${email}`);

    // 2. Check if user exists in "Database", if not, create them
    if (!userDatabase[email]) {
      userDatabase[email] = [];
    }

    // 3. Send their saved history back to the frontend immediately!
    const savedSubscriptions = userDatabase[email];
    socket.emit('loadSubscriptions', savedSubscriptions);
  });

  // Event: Subscribe
  socket.on('subscribe', (stockSymbol) => {
    const email = activeConnections[socket.id]; // Find who this socket is
    
    if (email && SUPPORTED_STOCKS.includes(stockSymbol)) {
      // Add to persistent database
      if (!userDatabase[email].includes(stockSymbol)) {
        userDatabase[email].push(stockSymbol);
        console.log(`Saved subscription: ${email} -> ${stockSymbol}`);
      }
    }
  });

  // Event: Unsubscribe
  socket.on('unsubscribe', (stockSymbol) => {
    const email = activeConnections[socket.id];
    
    if (email) {
      // Remove from persistent database
      userDatabase[email] = userDatabase[email].filter(s => s !== stockSymbol);
      console.log(`Removed subscription: ${email} -> ${stockSymbol}`);
    }
  });

  // Event: Disconnect
  socket.on('disconnect', () => {
    // We only remove the active connection map, NOT the database data!
    delete activeConnections[socket.id];
    console.log(`User Disconnected: ${socket.id}`);
  });
});

// ---------------------------------------------------------
// 3. STOCK ENGINE
// ---------------------------------------------------------
function updateStockPrices() {
  // Update prices logic
  SUPPORTED_STOCKS.forEach(stock => {
    const changePercent = (Math.random() * 0.04) - 0.02; 
    let newPrice = stockPrices[stock] + (stockPrices[stock] * changePercent);
    if (newPrice < 0.01) newPrice = 0.01;
    stockPrices[stock] = parseFloat(newPrice.toFixed(2));
  });

  // Push updates
  io.sockets.sockets.forEach((socket) => {
    const email = activeConnections[socket.id];
    
    // If this socket is logged in (has an email)
    if (email) {
      const userStocks = userDatabase[email];
      
      if (userStocks && userStocks.length > 0) {
        const userSpecificPrices = {};
        userStocks.forEach(stock => {
          userSpecificPrices[stock] = stockPrices[stock];
        });
        socket.emit('priceUpdate', userSpecificPrices);
      }
    }
  });
}

setInterval(updateStockPrices, 1000);

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});