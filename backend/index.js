
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, createTables } = require('./db');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const fetch = require('node-fetch');
const authMiddleware = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

app.use(cors());
app.use(express.json());

app.post('/api/signup', async (req, res) => {
    const { name, email, password, upiId, initialBalance } = req.body;
    try {
        const existingEmail = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        const upiExists = await query('SELECT * FROM users WHERE upi_id = $1', [upiId]);
        if (upiExists.rows.length > 0) {
            return res.status(400).json({ message: 'UPI ID already registered' });
        }

        const hash = await bcrypt.hash(password, 10);
        
        await query('BEGIN');

        const result = await query(
            `INSERT INTO users (full_name, email, password_hash, upi_id, initial_balance,
                                donation_wallet, investment_wallet, savings_wallet, 
                                total_spare_change, donation_percentage, investment_percentage, savings_percentage) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
            RETURNING id, full_name, email`,
            [name, email, hash, upiId, initialBalance, 0, 0, 0, 0, 40, 40, 20]
        );

        await query('COMMIT');

        res.status(201).json({ message: 'Signup successful', user: result.rows[0] });
    } catch (err) {
        await query('ROLLBACK');
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Signup failed' });
    }
});

// LOGIN (MODIFIED)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.full_name },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// ==================== SPARE CHANGE & PAYMENTS ====================

// Get user wallet balances (MODIFIED)
app.get('/api/wallet/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log('Fetching wallet for user:', userId);
  
  try {
    const result = await query(
      `SELECT initial_balance, donation_wallet, investment_wallet, savings_wallet, total_spare_change, 
              donation_percentage, investment_percentage, savings_percentage
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const walletData = result.rows[0];
    console.log('Wallet data:', walletData);
    res.json(walletData);
  } catch (err) {
    console.error('Error fetching wallet:', err);
    res.status(500).json({ error: 'Failed to fetch wallet data' });
  }
});

// Process payment with spare change logic (MODIFIED)
app.post('/api/payment', async (req, res) => {
  const { userId, recipientUPI, recipientPhone, recipientName, amount } = req.body;
  console.log('Processing payment:', { userId, recipientUPI, recipientPhone, recipientName, amount });
  
  try {
    const userResult = await query(
      'SELECT initial_balance, donation_percentage, investment_percentage, savings_percentage FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const originalAmount = parseFloat(amount);

    if (user.initial_balance < originalAmount) {
        return res.status(400).json({ error: 'Insufficient funds in your account' });
    }
    
    const roundedAmount = Math.ceil(originalAmount / 100) * 100;
    const spareChange = roundedAmount - originalAmount;
    
    const donationAmount = (spareChange * user.donation_percentage) / 100;
    const investmentAmount = (spareChange * user.investment_percentage) / 100;
    const savingsAmount = (spareChange * user.savings_percentage) / 100;
    
    console.log('Payment calculation:', {
      originalAmount,
      roundedAmount,
      spareChange,
      donationAmount,
      investmentAmount,
      savingsAmount
    });
    
    const paymentId = uuidv4();
    await query(
      `INSERT INTO payments (id, user_id, recipient_upi, recipient_phone, recipient_name, 
                           original_amount, rounded_amount, spare_change, donation_amount, 
                           investment_amount, savings_amount, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed')`,
      [paymentId, userId, recipientUPI, recipientPhone, recipientName, originalAmount, 
       roundedAmount, spareChange, donationAmount, investmentAmount, savingsAmount]
    );
    
    await query(
      'UPDATE users SET initial_balance = initial_balance - $1 WHERE id = $2',
      [roundedAmount, userId]
    );

    await query(
      `UPDATE users SET 
           donation_wallet = donation_wallet + $1,
           investment_wallet = investment_wallet + $2,
           savings_wallet = savings_wallet + $3,
           total_spare_change = total_spare_change + $4
         WHERE id = $5`,
      [donationAmount, investmentAmount, savingsAmount, spareChange, userId]
    );
    
    const transactions = [
      { type: 'earned', wallet: 'donation', amount: donationAmount },
      { type: 'earned', wallet: 'investment', amount: investmentAmount },
      { type: 'earned', wallet: 'savings', amount: savingsAmount }
    ];
    
    for (const transaction of transactions) {
      if (transaction.amount > 0) {
        await query(
          `INSERT INTO spare_change_transactions (user_id, payment_id, transaction_type, 
                                               wallet_type, amount, description) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, paymentId, transaction.type, transaction.wallet, transaction.amount, 
           `Spare change from payment to ${recipientName || recipientUPI || recipientPhone}`]
        );
      }
    }
    
    res.json({
      success: true,
      paymentId,
      originalAmount,
      roundedAmount,
      spareChange,
      allocation: {
        donation: donationAmount,
        investment: investmentAmount,
        savings: savingsAmount
      }
    });
    
  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Get payment history
app.get('/api/payments/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await query(
      `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Update allocation percentages
app.post('/api/allocation/:userId', async (req, res) => {
  const { userId } = req.params;
  const { donation, investment, savings } = req.body;
  
  if (donation + investment + savings !== 100) {
    return res.status(400).json({ error: 'Percentages must add up to 100' });
  }
  
  try {
    await query(
      `UPDATE users SET 
           donation_percentage = $1,
           investment_percentage = $2,
           savings_percentage = $3
         WHERE id = $4`,
      [donation, investment, savings, userId]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating allocation:', err);
    res.status(500).json({ error: 'Failed to update allocation' });
  }
});

// ==================== SAVINGS API ====================

// Helper functions for savings stats
async function getThisMonthSavings(userId) {
  try {
    const result = await query(
      `SELECT SUM(amount) as total FROM savings_goal_history sgh
       JOIN savings_goals sg ON sgh.goal_id = sg.id
       WHERE sg.user_id = $1 AND sgh.transaction_date >= date_trunc('month', CURRENT_DATE)`,
      [userId]
    );
    return parseFloat(result.rows[0].total) || 0;
  } catch (err) {
    console.error('Error calculating this month savings:', err);
    return 0;
  }
}

async function getAvgMonthlySavings(userId) {
  try {
    const result = await query(
      `SELECT AVG(monthly_total) as avg FROM (
         SELECT date_trunc('month', sgh.transaction_date) as month, SUM(sgh.amount) as monthly_total
         FROM savings_goal_history sgh
         JOIN savings_goals sg ON sgh.goal_id = sg.id
         WHERE sg.user_id = $1
         GROUP BY date_trunc('month', sgh.transaction_date)
       ) monthly_savings`,
      [userId]
    );
    return parseFloat(result.rows[0].avg) || 0;
  } catch (err) {
    console.error('Error calculating average monthly savings:', err);
    return 0;
  }
}

// Get all savings data for a user
app.get('/api/savings/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log('Fetching savings data for user:', userId);
    
    const userResult = await query(
      'SELECT savings_wallet, total_spare_change, savings_percentage FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    console.log('User data found:', user);
    
    const goalsResult = await query(
      `SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    console.log('Goals found:', goalsResult.rows.length);
    
    const achievedResult = await query(
      `SELECT * FROM savings_goals WHERE user_id = $1 AND status = 'Completed' ORDER BY completed_date DESC`,
      [userId]
    );
    console.log('Achieved goals found:', achievedResult.rows.length);
    
    const historyResult = await query(
      `SELECT sg.title as goal_title, sgh.amount, sgh.source, sgh.transaction_date as date, 
              sgh.transaction_type as type, sgh.id
       FROM savings_goal_history sgh
       JOIN savings_goals sg ON sgh.goal_id = sg.id
       WHERE sg.user_id = $1
       ORDER BY sgh.transaction_date DESC
       LIMIT 50`,
      [userId]
    );
    console.log('History records found:', historyResult.rows.length);
    
    const totalSaved = parseFloat(user.savings_wallet) || 0;
    const thisMonthSaved = await getThisMonthSavings(userId);
    const avgMonthlySaving = await getAvgMonthlySavings(userId);
    
    const responseData = {
      totalSpareChange: parseFloat(user.total_spare_change) || 0,
      savingsAllocation: user.savings_percentage || 20,
      totalSaved: totalSaved,
      savingsWallet: totalSaved,
      savingsGoals: goalsResult.rows,
      achievedGoals: achievedResult.rows,
      savingsHistory: historyResult.rows.map(row => ({
        id: row.id,
        goalTitle: row.goal_title,
        amount: parseFloat(row.amount),
        source: row.source,
        date: row.date,
        type: row.type
      })),
      thisMonthSaved: thisMonthSaved,
      avgMonthlySaving: avgMonthlySaving
    };
    
    console.log('Sending response:', responseData);
    res.json(responseData);
    
  } catch (err) {
    console.error('Error fetching savings data:', err);
    res.status(500).json({ error: 'Failed to fetch savings data', details: err.message });
  }
});

// Create new savings goal
app.post('/api/savings/goals', async (req, res) => {
  const { userId, title, description, targetAmount, targetDate, category, priority } = req.body;
  
  if (!userId || !title || !targetAmount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const goalId = uuidv4();
    
    await query(
      `INSERT INTO savings_goals (id, user_id, title, description, target_amount, target_date, category, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'In Progress')`,
      [goalId, userId, title, description, parseFloat(targetAmount), targetDate, category, priority]
    );
    
    res.status(201).json({ 
      message: 'Goal created successfully',
      goalId: goalId
    });
    
  } catch (err) {
    console.error('Error creating goal:', err);
    res.status(500).json({ error: 'Failed to create goal', details: err.message });
  }
});

// Delete savings goal
app.delete('/api/savings/goals/:goalId', async (req, res) => {
  const { goalId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    await query('DELETE FROM savings_goal_history WHERE goal_id = $1', [goalId]);
    const result = await query('DELETE FROM savings_goals WHERE id = $1 AND user_id = $2', [goalId, userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({ message: 'Goal deleted successfully' });
    
  } catch (err) {
    console.error('Error deleting goal:', err);
    res.status(500).json({ error: 'Failed to delete goal', details: err.message });
  }
});

// Add money to savings goal
app.post('/api/savings/goals/:goalId/add-money', async (req, res) => {
  const { goalId } = req.params;
  const { amount, userId, source } = req.body;
  
  if (!userId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const goalResult = await query('SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2', [goalId, userId]);
    
    if (goalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    const goal = goalResult.rows[0];
    
    const userResult = await query('SELECT savings_wallet FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    
    if (parseFloat(user.savings_wallet) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient funds in savings wallet' });
    }
    
    const newCurrentAmount = parseFloat(goal.current_amount) + parseFloat(amount);
    
    await query(
      'UPDATE savings_goals SET current_amount = $1 WHERE id = $2',
      [newCurrentAmount, goalId]
    );
    
    await query(
      'UPDATE users SET savings_wallet = savings_wallet - $1 WHERE id = $2',
      [amount, userId]
    );
    
    await query(
      `INSERT INTO savings_goal_history (id, goal_id, amount, source, transaction_type)
       VALUES ($1, $2, $3, $4, 'Manual Save')`,
      [uuidv4(), goalId, amount, source || 'Manual Transfer']
    );
    
    if (newCurrentAmount >= parseFloat(goal.target_amount)) {
      await query(
        `UPDATE savings_goals SET status = 'Completed', completed_date = CURRENT_TIMESTAMP, 
         achieved_amount = $1 WHERE id = $2`,
        [newCurrentAmount, goalId]
      );
    }
    
    res.json({ message: 'Money added successfully' });
    
  } catch (err) {
    console.error('Error adding money to goal:', err);
    res.status(500).json({ error: 'Failed to add money to goal', details: err.message });
  }
});

// ==================== HYBRID RECOMMENDATIONS (DONATIONS) ====================

// Updated endpoint to use the combined API
app.get('/api/recommendations/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const response = await fetch(`${ML_API_URL}/api/ml/donations/recommendations/${userId}`);
    if (!response.ok) {
      throw new Error(`ML API failed with status: ${response.status}`);
    }
    const recommendations = await response.json();
    res.json(recommendations);
  } catch (err) {
    console.error('Error fetching recommendations from ML API:', err);
    // Fallback to a simple popularity-based list if the ML API is down
    try {
      const allCharities = (await query('SELECT * FROM charities')).rows;
      const fallbackRecs = allCharities.slice(0, 3).map(charity => ({
          id: charity.id,
          name: charity.name,
          type: charity.type,
          category: charity.category,
          description: charity.description,
          location: charity.location,
          matchScore: 90 + Math.floor(Math.random() * 10),
          confidenceLevel: 90 + Math.floor(Math.random() * 10),
          recommendationType: 'Fallback - Popularity-Based',
          primaryReason: `A highly popular charity with a strong community backing.`,
          secondaryReasons: ['Proven track record', 'Excellent user ratings'],
          algorithmUsed: "Fallback Algorithm",
          modelVersion: "v1.0",
          trustScore: charity.trust_score,
          transparencyScore: charity.transparency_score,
          efficiencyScore: charity.efficiency_score,
          impact: charity.impact,
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          featureWeights: {
              popularity: 1.0,
          }
      }));
      res.json(fallbackRecs);
    } catch (fallbackError) {
      console.error('Failed to provide fallback recommendations:', fallbackError);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  }
});

app.get('/api/organizations', async (req, res) => {
  try {
    const result = await query('SELECT * FROM charities ORDER BY name');
    
    const organizations = result.rows.map(charity => ({
      id: charity.id,
      name: charity.name,
      type: charity.type,
      category: charity.category,
      location: charity.location,
      description: charity.description,
      verified: charity.verified,
      beneficiaries: charity.beneficiaries,
      projects: charity.projects,
      rating: charity.rating,
      trustScore: charity.trust_score,
      transparencyScore: charity.transparency_score,
      aiCompatibility: charity.ai_compatibility,
      impact: charity.impact,
      efficiencyScore: charity.efficiency_score
    }));
    
    res.json(organizations);
  } catch (err) {
    console.error('Error fetching organizations:', err);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

app.get('/api/donations/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await query(
      `SELECT d.id, d.amount, d.donation_date, d.charity_name, c.id AS charity_id, c.impact
       FROM donations d 
       LEFT JOIN charities c ON d.charity_id = c.id 
       WHERE d.user_id = $1 
       ORDER BY d.donation_date DESC`,
      [userId]
    );
    
    const donations = result.rows.map(donation => ({
      id: donation.id,
      amount: parseFloat(donation.amount),
      date: donation.donation_date,
      charity_name: donation.charity_name,
      charity_id: donation.charity_id,
      organization: donation.charity_name,
      donation_date: donation.donation_date,
      impact: donation.impact || 'Making a positive impact in the community',
      status: 'completed',
      type: 'one-time',
      wasRecommended: Math.random() > 0.3,
      recommendationScore: Math.floor(Math.random() * 15) + 80,
      userSatisfaction: 4 + Math.floor(Math.random() * 2)
    }));
    
    res.json(donations);
  } catch (err) {
    console.error('Error fetching donations:', err);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

app.post('/api/donations', async (req, res) => {
  const { userId, organization, amount, type, charityId } = req.body;
  
  try {
    let charity;
    if (charityId) {
      const charityResult = await query('SELECT * FROM charities WHERE id = $1', [charityId]);
      charity = charityResult.rows[0];
    } else if (organization) {
      const charityResult = await query('SELECT * FROM charities WHERE name = $1', [organization]);
      charity = charityResult.rows[0];
    }

    if (!charity) {
      return res.status(400).json({ error: 'Charity not found' });
    }

    const userResult = await query('SELECT donation_wallet FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    
    if (!user || user.donation_wallet < amount) {
      return res.status(400).json({ error: 'Insufficient funds in donation wallet' });
    }

    const donationId = uuidv4();
    
    await query(
      'INSERT INTO donations (id, user_id, charity_id, charity_name, amount, source) VALUES ($1, $2, $3, $4, $5, $6)',
      [donationId, userId, charity.id, charity.name, amount, 'donation_wallet']
    );
    
    await query(
      'UPDATE users SET donation_wallet = donation_wallet - $1 WHERE id = $2',
      [amount, userId]
    );
    
    res.status(201).json({ 
      message: 'Donation recorded successfully',
      donationId: donationId
    });
  } catch (err) {
    console.error('Error creating donation:', err);
    res.status(500).json({ error: 'Failed to create donation' });
  }
});

// ADDED authMiddleware to protect the route
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    // Get the user ID from the `req.user` object attached by the authMiddleware
    const userId = req.user.id;
    
    // Updated query to get total donations for the logged-in user
    const totalDonatedResult = await query(
      'SELECT SUM(amount) as total FROM donations WHERE user_id = $1',
      [userId]
    );
    const totalDonated = parseFloat(totalDonatedResult.rows[0].total) || 0;
    
    // Updated query to get this month's donations for the logged-in user
    const thisMonthDonatedResult = await query(
      `SELECT SUM(amount) as total FROM donations 
       WHERE user_id = $1 AND donation_date >= date_trunc('month', CURRENT_DATE)`,
      [userId]
    );
    const thisMonthDonated = parseFloat(thisMonthDonatedResult.rows[0].total) || 0;
    
    res.json({
      totalDonated: totalDonated,
      thisMonth: thisMonthDonated,
      // These are hardcoded for now, but in a real app, they would also be user-specific
      impactScore: 94,
      recommendationsFollowed: 78
    });
  } catch (err) {
    console.error('Error fetching user-specific stats:', err);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// ==================== INVESTMENT ROUTES ====================

const ML_MODEL_API_URL = 'http://localhost:5001';

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

function generateInvestmentRecommendations() {
  const recommendations = [];
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
      matchScore: Math.floor(Math.random() * 20) + 80,
      confidenceLevel: Math.floor(Math.random() * 15) + 85,
      primaryReason: `Based on your investment profile, this ${option.category.toLowerCase()} option shows strong potential for your portfolio.`,
      secondaryReasons: [`${option.risk} risk level`, "Strong analyst ratings"]
    });
  });
  
  return recommendations;
}

// Updated endpoint to use the combined API
app.post('/api/investments/recommendations', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const userProfile = { id: userId, name: req.user.name };
  try {
    const response = await fetch(`${ML_MODEL_API_URL}/api/ml/investments/recommendations`, {
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
    const fallbackRecs = generateInvestmentRecommendations();
    res.json(fallbackRecs);
  }
});

// GET /api/investments/stats
app.get('/api/investments/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching stats for user:', userId);

    const userResult = await query('SELECT investment_wallet FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentInvestmentWallet = parseFloat(userResult.rows[0].investment_wallet) || 0;

    const investmentResult = await query(
      'SELECT COALESCE(SUM(amount), 0) as total_invested FROM investments WHERE user_id = $1',
      [userId]
    );

    const actualInvested = parseFloat(investmentResult.rows[0]?.total_invested) || 0;
    const portfolioReturn = actualInvested > 0 ? (Math.random() * 8 + 3).toFixed(2) : '0.00';

    res.json({
      currentInvestmentWallet: currentInvestmentWallet,
      totalInvested: actualInvested,
      portfolioReturn: portfolioReturn,
      riskProfile: 'Moderate',
      strategyMatch: 85,
    });
  } catch (err) {
    console.error('Error fetching investment stats:', err);
    res.status(500).json({ error: 'Failed to fetch investment stats' });
  }
});

// GET /api/investments/options
app.get('/api/investments/options', async (req, res) => {
  try {
    res.json(investmentData);
  } catch (err) {
    console.error('Error fetching investment options:', err);
    res.status(500).json({ error: 'Failed to fetch investment options' });
  }
});

// GET /api/investments/history
app.get('/api/investments/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching investment history for user:', userId);
    
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
      wasRecommended: Math.random() > 0.5, 
      recommendationScore: Math.floor(Math.random() * 15) + 80,
      status: 'Completed',
    }));
    
    res.json(history);
  } catch (err) {
    console.error('Error fetching investment history:', err);
    res.status(500).json({ error: 'Failed to fetch investment history' });
  }
});

// POST /api/investments/invest
app.post('/api/investments/invest', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { investmentName, amount, type } = req.body;

  if (!userId || !investmentName || !amount || !type || amount <= 0) {
    return res.status(400).json({ error: 'Invalid investment data provided.' });
  }

  try {
    const userWalletResult = await query('SELECT investment_wallet FROM users WHERE id = $1', [userId]);
    
    if (userWalletResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    const currentInvestmentWallet = parseFloat(userWalletResult.rows[0].investment_wallet) || 0;

    if (currentInvestmentWallet < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient funds in investment wallet.' });
    }

    await query('BEGIN');

    const investmentId = uuidv4();
    const transactionId = uuidv4();
    
    await query(
      `INSERT INTO investments (id, user_id, transaction_id, investment_type, investment_name, amount) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [investmentId, userId, transactionId, type, investmentName, amount]
    );

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
    res.status(500).json({ error: 'Failed to process investment.' });
  }
});

// ==================== SERVER START ====================
(async () => {
  try {
    await createTables();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
})();