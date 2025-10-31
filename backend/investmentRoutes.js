// investmentRoutes.js

const ML_MODEL_API_URL = 'http://localhost:5001';
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { query } = require('./db');
const authMiddleware = require('./authMiddleware'); // This must match your auth file
const { v4: uuidv4 } = require('uuid');

const investmentData = [
  {
    "id": "00815374-5d2d-487b-bfcf-d1e2667b3287",
    "name": "Tech Innovators Fund",
    "type": "mutual-fund",
    "category": "Technology",
    "risk": "High",
    "volatility": 15,
    "analystRating": 4.5,
    "projectedGrowth": "18-25%",
    "description": "Invests in high-growth technology companies.",
    "aiCompatibility": 92,
    "metric1_value": "₹2,45,000 Cr",
    "metric1_label": "AUM",
    "metric2_value": "1.2%",
    "metric2_label": "Expense Ratio"
  },
  {
    "id": "908b91d7-f57b-421a-83f9-b6ec3503ce59",
    "name": "Global Green Energy ETF",
    "type": "etf",
    "category": "Renewables",
    "risk": "Medium",
    "volatility": 12,
    "analystRating": 4.0,
    "projectedGrowth": "10-15%",
    "description": "Tracks leading companies in the renewable energy sector.",
    "aiCompatibility": 88,
    "metric1_value": "₹85,000 Cr",
    "metric1_label": "AUM",
    "metric2_value": "0.5%",
    "metric2_label": "Expense Ratio"
  },
  {
    "id": "fc0a6916-e2d5-4205-9281-19caad730390",
    "name": "Blue Chip Stock Portfolio",
    "type": "stock",
    "category": "Diversified",
    "risk": "Low",
    "volatility": 8,
    "analystRating": 4.8,
    "projectedGrowth": "5-8%",
    "description": "A collection of stable, well-established companies.",
    "aiCompatibility": 95,
    "metric1_value": "₹3,20,000 Cr",
    "metric1_label": "Market Cap",
    "metric2_value": "12.5%",
    "metric2_label": "P/E Ratio"
  },
  {
    "id": "67274cb5-d9c4-401b-8838-df85f44a74a9",
    "name": "Emerging Markets Bond Fund",
    "type": "mutual-fund",
    "category": "Bonds",
    "risk": "Medium",
    "volatility": 10,
    "analystRating": 3.5,
    "projectedGrowth": "7-10%",
    "description": "Fixed-income investments in developing economies.",
    "aiCompatibility": 75,
    "metric1_value": "₹1,15,000 Cr",
    "metric1_label": "AUM",
    "metric2_value": "1.8%",
    "metric2_label": "Expense Ratio"
  }
];

// Generate AI recommendations
function generateRecommendations() {
  const recommendations = [];
  
  // Select top 3 random options and format as recommendations
  const shuffled = [...investmentData].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);
  
  selected.forEach(option => {
    recommendations.push({
      id: option.id,
      name: option.name,
      type: option.type,
      category: option.category,
      description: option.description,
      risk: option.risk,
      volatility: option.volatility,
      analystRating: option.analystRating,
      projectedGrowth: option.projectedGrowth,
      matchScore: Math.floor(Math.random() * 20) + 80, // 80-100
      confidenceLevel: Math.floor(Math.random() * 15) + 85, // 85-100
      primaryReason: `Based on your investment profile, this ${option.category.toLowerCase()} option shows strong potential for your portfolio.`,
      secondaryReasons: [`${option.risk} risk level`, "Strong analyst ratings"]
    });
  });
  
  return recommendations;
}

// ==================== POST /recommendations ====================
// [FIX] Added authMiddleware, removed userId from body
router.post('/recommendations', authMiddleware, async (req, res) => {
  const userId = req.user.id; // <-- Get user ID from middleware
  const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);

  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = userResult.rows[0];
  const userProfile = {
    id: user.id,
    name: user.full_name,
    // Add other user profile data needed for the ML model, e.g., risk_profile, preferred_causes
  };

  try {
    const response = await fetch(`${ML_MODEL_API_URL}/api/investments/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recommendations from ML API: ${response.statusText}`);
    }

    const recommendations = await response.json();
    res.json(recommendations);
  } catch (err) {
    console.error('Error fetching recommendations from ML API:', err);
    // FALLBACK: Use the simple generator if ML API fails
    const fallbackRecs = generateRecommendations();
    res.json(fallbackRecs);
  }
});


// ==================== GET /stats ====================
// [FIX] Added authMiddleware, changed route from /stats/:userId to /stats
// ==================== GET /stats ====================
// [FIX] This is the correct code for this route
// ==================== GET /stats ====================
// This is the only version that should be in your file
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from middleware
    console.log('Fetching stats for user:', userId);

    const userResult = await query('SELECT investment_wallet FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalInvested = parseFloat(userResult.rows[0].investment_wallet) || 0;

    const investmentResult = await query(
      'SELECT COALESCE(SUM(amount), 0) as total_invested FROM investments WHERE user_id = $1',
      [userId]
    );

    const actualInvested = parseFloat(investmentResult.rows[0]?.total_invested) || 0;
    const portfolioReturn = actualInvested > 0 ? (Math.random() * 8 + 3).toFixed(2) : '0.00';

    // This is the correct object your frontend is expecting
    res.json({
      totalInvested: totalInvested,
      portfolioReturn: portfolioReturn,
      riskProfile: 'Moderate',
      strategyMatch: 85,
    });
  } catch (err) {
    console.error('Error fetching investment stats:', err);
    res.status(500).json({ error: 'Failed to fetch investment stats' });
  }
});

// ==================== GET /options ====================
router.get('/options', async (req, res) => {
  try {
    res.json(investmentData);
  } catch (err) {
    console.error('Error fetching investment options:', err);
    res.status(500).json({ error: 'Failed to fetch investment options' });
  }
});

// ==================== GET /history ====================
// [FIX] Added authMiddleware, changed route from /history/:userId to /history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // <-- Get user ID from middleware
    console.log('Fetching investment history for user:', userId);
    
    // Query based on your actual schema
    const result = await query(
      `SELECT id, investment_date, investment_name, amount, investment_type 
       FROM investments WHERE user_id = $1 ORDER BY investment_date DESC`,
      [userId]
    );

    const history = result.rows.map(tx => ({
      id: tx.id,
      investment_name: tx.investment_name,
      amount: parseFloat(tx.amount),
      investment_date: tx.investment_date,
      type: tx.investment_type,
      wasRecommended: Math.random() > 0.5, // Random for demo
      recommendationScore: Math.floor(Math.random() * 15) + 80,
      status: 'Completed',
    }));
    
    res.json(history);
  } catch (err) {
    console.error('Error fetching investment history:', err);
    res.status(500).json({ error: 'Failed to fetch investment history' });
  }
});

// ==================== POST /invest ====================
// [FIX] Added authMiddleware, removed userId from body
router.post('/invest', authMiddleware, async (req, res) => {
  const userId = req.user.id; // <-- Get user ID from middleware
  const { investmentName, amount, type } = req.body; // <-- Removed userId from here

  if (!userId || !investmentName || !amount || !type || amount <= 0) {
    return res.status(400).json({ error: 'Invalid investment data provided.' });
  }

  try {
    // Check user's investment wallet balance
    const userWalletResult = await query('SELECT investment_wallet FROM users WHERE id = $1', [userId]);
    
    
    if (userWalletResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    const currentInvestmentWallet = parseFloat(userWalletResult.rows[0].investment_wallet) || 0;

    if (currentInvestmentWallet < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient funds in investment wallet.' });
    }

    await query('BEGIN');

    // Insert investment using your schema (with transaction_id)
    const investmentId = uuidv4();
    const transactionId = uuidv4();
    
    await query(
      `INSERT INTO investments (id, user_id, transaction_id, investment_type, investment_name, amount) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [investmentId, userId, transactionId, type, investmentName, amount]
    );

    // Update user's investment wallet
    await query(
      `UPDATE users SET investment_wallet = investment_wallet - $1 WHERE id = $2`,
      [amount, userId]
    );

    await query('COMMIT');

    res.status(201).json({
      message: 'Investment created successfully',
      investmentId: investmentId
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error creating investment:', err);
    res.status(5.00).json({ error: 'Failed to process investment.' });
  }
});

module.exports = router;