import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

// Connect to the backend
const socket = io('http://localhost:4000');

const SUPPORTED_STOCKS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA'];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribedStocks, setSubscribedStocks] = useState([]);
  const [stockPrices, setStockPrices] = useState({});

  // 1. SETUP SOCKET LISTENERS
  useEffect(() => {
    // Listen for price updates from the server
    socket.on('priceUpdate', (prices) => {
      console.log("Price update received:", prices);
      setStockPrices((prevPrices) => ({ ...prevPrices, ...prices }));
    });

    // Cleanup listener when app closes
    return () => {
      socket.off('priceUpdate');
    };
  }, []);

  // 2. HANDLERS
  const handleLogin = (e) => {
    e.preventDefault();
    if (email) {
      socket.emit('login', email); // Tell server who we are
      setIsLoggedIn(true);
    }
  };

  const handleSubscribe = (stock) => {
    if (!subscribedStocks.includes(stock)) {
      socket.emit('subscribe', stock); // Tell server we want this stock
      setSubscribedStocks([...subscribedStocks, stock]);
    }
  };

  const handleUnsubscribe = (stock) => {
    socket.emit('unsubscribe', stock); // Tell server stop sending this
    setSubscribedStocks(subscribedStocks.filter((s) => s !== stock));
    
    // Remove price from local state to clean up UI
    const newPrices = { ...stockPrices };
    delete newPrices[stock];
    setStockPrices(newPrices);
  };

  // 3. RENDER
  return (
    <div className="App">
      <header className="App-header">
        <h1>Stock Broker Client</h1>
      </header>

      <main>
        {!isLoggedIn ? (
          // --- LOGIN VIEW ---
          <div className="login-container">
            <h2>Welcome</h2>
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit">Login</button>
            </form>
          </div>
        ) : (
          // --- DASHBOARD VIEW ---
          <div className="dashboard-container">
            <div className="user-info">
              <p>Logged in as: <strong>{email}</strong></p>
            </div>

            <div className="stock-sections">
              {/* LEFT: Available Stocks */}
              <div className="panel available-stocks">
                <h3>Available Stocks</h3>
                <ul>
                  {SUPPORTED_STOCKS.map((stock) => (
                    <li key={stock} className="stock-item">
                      <span>{stock}</span>
                      <button 
                        onClick={() => handleSubscribe(stock)}
                        disabled={subscribedStocks.includes(stock)}
                      >
                        {subscribedStocks.includes(stock) ? 'Subscribed' : 'Subscribe'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* RIGHT: Live Feed */}
              <div className="panel live-feed">
                <h3>My Live Feed</h3>
                {subscribedStocks.length === 0 ? (
                  <p className="empty-msg">Subscribe to a stock to see live prices.</p>
                ) : (
                  <div className="price-grid">
                    {subscribedStocks.map((stock) => (
                      <div key={stock} className="price-card">
                        <h4>{stock}</h4>
                        <div className="price">
                          {stockPrices[stock] 
                            ? `₹${stockPrices[stock].toFixed(2)}` 
                            : 'Waiting...'}
                        </div>
                        <button 
                          className="unsubscribe-btn"
                          onClick={() => handleUnsubscribe(stock)}
                        >
                          Unsubscribe
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;