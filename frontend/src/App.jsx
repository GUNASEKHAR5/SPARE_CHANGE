import React, { useState, useEffect } from "react";
import { Route, Routes, BrowserRouter as Router } from "react-router-dom";
import Home from "./pages/Home";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import Investment from "./pages/Invest";
import DonationsPage from "./pages/Donation";
import Savings from "./pages/Savings";

const Wallet = () => <div style={{padding:20}}>Wallet page</div>;
const GetStarted = () => <div style={{padding:20}}>Get Started</div>;
const LearnMore = () => <div style={{padding:20}}>Learn More</div>;

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [walletBalances, setWalletBalances] = useState({
    donation_wallet: 0,
    investment_wallet: 0,
    savings_wallet: 0,
    total_spare_change: 0,
    donation_percentage: 40,
    investment_percentage: 40,
    savings_percentage: 20
  });

  // New logout handler to update state
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const fetchWalletData = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://localhost:5000/api/wallet/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setWalletBalances(data);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user]);

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <Home 
              user={user}
              walletBalances={walletBalances}
              onWalletUpdate={fetchWalletData}
              onLogout={handleLogout}
            />
          } 
        />
        <Route path="/Signup" element={<SignupPage />} />
        <Route path="/Login" element={<LoginPage setUser={setUser} />} />
        <Route 
          path="/Donation" 
          element={
            <DonationsPage 
              user={user}
              walletBalances={walletBalances}
              onWalletUpdate={fetchWalletData}
            />
          } 
        />
        <Route path="/wallet" element={<Wallet />} />
        <Route 
          path="/Invest" 
          element={
            <Investment 
              walletBalances={walletBalances} 
              onWalletUpdate={fetchWalletData} 
            />
          } 
        />
        <Route 
          path="/Saving" 
          element={
            <Savings 
              user={user} 
              walletBalances={walletBalances}
              onWalletUpdate={fetchWalletData}
            />
          } 
        />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/learn-more" element={<LearnMore />} />
      </Routes>
    </Router>
  );
}
