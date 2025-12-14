// server/index.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Create the HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow the frontend to connect
    methods: ["GET", "POST"]
  }
});

// ---------------------------------------------------------
// STOCK ENGINE LOGIC
// ---------------------------------------------------------

// The 5 supported stocks as per requirements 
const SUPPORTED_STOCKS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA'];

// Initialize prices (starting at a base value, e.g., 100)
let stockPrices = {};
SUPPORTED_STOCKS.forEach(stock => {
  stockPrices[stock] = 100.00; 
});

// Function to generate random price updates
function updateStockPrices() {
  SUPPORTED_STOCKS.forEach(stock => {
    // Generate a random percentage change between -2% and +2%
    const changePercent = (Math.random() * 0.04) - 0.02; 
    const currentPrice = stockPrices[stock];
    
    // Calculate new price
    let newPrice = currentPrice + (currentPrice * changePercent);
    
    // Ensure price doesn't go below 0.01
    if (newPrice < 0.01) newPrice = 0.01;

    // Save the new price (fixed to 2 decimal places for currency)
    stockPrices[stock] = parseFloat(newPrice.toFixed(2));
  });
  
  // Log to console to verify it's working
  console.log("Updated Prices:", stockPrices);
}

// Run the update function every 1 second (1000ms) 
setInterval(updateStockPrices, 1000);

// ---------------------------------------------------------
// SERVER START
// ---------------------------------------------------------

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});