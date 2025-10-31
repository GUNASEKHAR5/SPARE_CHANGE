import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, DollarSign, PiggyBank, CheckCircle, Clock, ArrowRight, Plus, RefreshCw, Eye, EyeOff, Trophy, Edit2, Trash2, Save, History } from 'lucide-react';
import GoalsTab from './GoalsTab';

const Savings = ({ user, walletBalances, onWalletUpdate }) => {
  const [savingsStats, setSavingsStats] = useState({
    totalSaved: 0,
    thisMonthSaved: 0,
    avgMonthlySaving: 0,
    lastUpdated: new Date()
  });

  const [savingsGoals, setSavingsGoals] = useState([]);
  const [achievedGoals, setAchievedGoals] = useState([]);
  const [savingsHistory, setSavingsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    category: 'Personal',
    priority: 'Medium'
  });

  const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };
    
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error(`API Error (${endpoint}):`, err);
      throw err;
    }
  };

  const loadSavingsData = async () => {
    if (!user?.id) {
      setError('Please log in to view your savings data');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await apiRequest(`/api/savings/${user.id}`);
      
      setSavingsStats(prev => ({
        ...prev,
        totalSaved: data.totalSaved || 0,
        thisMonthSaved: data.thisMonthSaved || 0,
        avgMonthlySaving: data.avgMonthlySaving || 0,
        lastUpdated: new Date()
      }));
      
      // Update goals and history
      setSavingsGoals(data.savingsGoals || []);
      setAchievedGoals(data.achievedGoals || []);
      setSavingsHistory(data.savingsHistory || []);
      
      // Update wallet data if callback provided
      if (onWalletUpdate) {
        await onWalletUpdate();
      }
      
    } catch (err) {
      setError('Failed to load savings data. Please try again.');
      console.error('Load savings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!user?.id) {
      alert('Please log in to create a goal');
      return;
    }

    if (!newGoal.title || !newGoal.targetAmount) {
      alert('Please fill in required fields (Title and Target Amount)');
      return;
    }

    try {
      await apiRequest('/api/savings/goals', {
        method: 'POST',
        body: JSON.stringify({
          ...newGoal,
          userId: user.id
        })
      });

      setNewGoal({
        title: '',
        description: '',
        targetAmount: '',
        targetDate: '',
        category: 'Personal',
        priority: 'Medium'
      });
      setShowNewGoalForm(false);
      await loadSavingsData();
      
    } catch (err) {
      setError('Failed to create goal. Please try again.');
      console.error('Create goal error:', err);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!user?.id) {
      alert('Please log in to delete a goal');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    try {
      await apiRequest(`/api/savings/goals/${goalId}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: user.id })
      });
      
      await loadSavingsData();
      
    } catch (err) {
      setError('Failed to delete goal. Please try again.');
      console.error('Delete goal error:', err);
    }
  };

  const handleAddMoney = async (goalId, amount = null) => {
    if (!user?.id) {
      alert('Please log in to add money to a goal');
      return;
    }

    let finalAmount = amount;
    
    if (!finalAmount) {
      const amountStr = prompt('Enter amount to add (₹):');
      finalAmount = parseFloat(amountStr);
      
      if (isNaN(finalAmount) || finalAmount <= 0) {
        if (amountStr !== null) {
          alert('Please enter a valid amount.');
        }
        return;
      }
    }
    
    const currentSavingsWallet = walletBalances?.savings_wallet || 0;
    
    if (finalAmount > currentSavingsWallet) {
      alert(`Insufficient funds in savings wallet. Available: ₹${currentSavingsWallet.toLocaleString()}`);
      return;
    }
    
    try {
      await apiRequest(`/api/savings/goals/${goalId}/add-money`, {
        method: 'POST',
        body: JSON.stringify({ 
          amount: finalAmount, 
          userId: user.id,
          source: 'Savings Wallet Transfer' 
        })
      });
      
      await loadSavingsData();
      
    } catch (err) {
      setError('Failed to add money. Please try again.');
      console.error('Add money error:', err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadSavingsData();
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSavingsData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'No date set';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressPercentage = (current, target) => {
    if (!current || !target) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      'Emergency': '🛡',
      'Technology': '💻',
      'Travel': '✈',
      'Real Estate': '🏠',
      'Vehicle': '🚗',
      'Life Events': '❤',
      'Education': '📚',
      'Health': '🏥',
      'Personal': '🎯'
    };
    return iconMap[category] || '🎯';
  };

  // Show login message if no user
  if (!user) {
    return (
      <div className="savings-dashboard-container">
        <div className="login-message">
          <h2>Please Log In</h2>
          <p>You need to log in to access your savings dashboard.</p>
        </div>
        <style>{`
          .login-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            text-align: center;
            padding: 2rem;
          }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="savings-dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your savings data...</p>
        </div>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            gap: 1rem;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="savings-dashboard-container">
        <div className="error-container">
          <div className="error-message">
            <p>{error}</p>
            <button onClick={loadSavingsData} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
        <style>{`
          .error-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
          }
          .error-message {
            text-align: center;
            padding: 2rem;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 0.5rem;
            color: #991b1b;
          }
          .retry-button {
            background: #dc2626;
            color: white;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            margin-top: 1rem;
          }
        `}</style>
      </div>
    );
  }

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <h3>Total Saved</h3>
            <button onClick={() => setShowBalance(!showBalance)} className="toggle-button">
              {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <p className="stat-value">
            {showBalance ? formatCurrency(savingsStats.totalSaved) : '••••••'}
          </p>
        </div>

        <div className="stat-card">
          <h3>This Month</h3>
          <p className="stat-value text-green-600">
            {showBalance ? formatCurrency(savingsStats.thisMonthSaved) : '••••••'}
          </p>
        </div>

        <div className="stat-card">
          <h3>Monthly Average</h3>
          <p className="stat-value text-blue-600">
            {showBalance ? formatCurrency(savingsStats.avgMonthlySaving) : '••••••'}
          </p>
        </div>

        <div className="stat-card">
          <h3>Active Goals</h3>
          <p className="stat-value text-purple-600">
            {savingsGoals.filter(goal => goal.status === 'In Progress').length}
          </p>
        </div>
      </div>

      <div className="savings-wallet-section">
        <div className="savings-wallet-header">
          <h3>Savings Wallet</h3>
          <div className="wallet-balance">
            <p className="balance-label">Available Balance</p>
            <p className="balance-value">{formatCurrency(walletBalances?.savings_wallet || 0)}</p>
          </div>
        </div>
        <div className="wallet-info">
          <p className="wallet-description">
            This is the amount you can use to fund your savings goals. Money is automatically added here from your spare change based on your allocation percentage.
          </p>
          <div className="wallet-stats">
            <div className="wallet-stat">
              <span className="stat-label">Total Spare Change:</span>
              <span className="stat-value">{formatCurrency(walletBalances?.total_spare_change || 0)}</span>
            </div>
            <div className="wallet-stat">
              <span className="stat-label">Savings Allocation:</span>
              <span className="stat-value">{walletBalances?.savings_percentage || 20}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="goals-preview">
        <div className="goals-preview-header">
          <h3>Active Savings Goals</h3>
          <button
            onClick={() => setActiveTab('goals')}
            className="view-all-button"
          >
            View All <ArrowRight size={16} />
          </button>
        </div>
        <div className="goals-list">
          {savingsGoals.filter(goal => goal.status === 'In Progress').slice(0, 3).map((goal) => {
            const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
            return (
              <div key={goal.id} className="goal-item">
                <div className="goal-header">
                  <div className="goal-info">
                    <span className="category-icon">{getCategoryIcon(goal.category)}</span>
                    <div>
                      <h4 className="goal-title">{goal.title}</h4>
                      <p className="goal-description">{goal.description}</p>
                    </div>
                  </div>
                  <div className="goal-amount">
                    <p className="current-amount">{formatCurrency(goal.current_amount)}</p>
                    <p className="target-amount">of {formatCurrency(goal.target_amount)}</p>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="goal-footer">
                  <span>{progress.toFixed(1)}% completed</span>
                  <span>Target: {formatDate(goal.target_date)}</span>
                </div>
                <div className="goal-actions-inline">
                  <button 
                    onClick={() => handleAddMoney(goal.id)}
                    className="add-money-button"
                    disabled={(walletBalances?.savings_wallet || 0) <= 0}
                  >
                    <Plus size={14} />
                    Add Money
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const HistoryTab = () => (
    <div className="space-y-6">
      <div className="history-section">
        <div className="section-header">
          <h3>Savings History</h3>
          <p className="section-description">All your savings activity and transactions</p>
        </div>
        <div className="history-list">
          {savingsHistory.length === 0 ? (
            <div className="empty-state">
              <p>No transaction history yet. Start saving to see your progress!</p>
            </div>
          ) : (
            savingsHistory.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-left">
                  <div className={`transaction-icon ${
                    transaction.type === 'Auto Save' ? 'bg-blue-100' : 
                    transaction.type === 'Manual Save' ? 'bg-green-100' : 
                    transaction.type === 'Goal Completed' ? 'bg-yellow-100' :
                    'bg-gray-100'
                  }`}>
                    {transaction.type === 'Auto Save' ? <PiggyBank size={20} className="text-blue-600" /> :
                     transaction.type === 'Manual Save' ? <Plus size={20} className="text-green-600" /> :
                     transaction.type === 'Goal Completed' ? <Trophy size={20} className="text-yellow-600" /> :
                     <DollarSign size={20} className="text-gray-600" />}
                  </div>
                  <div>
                    <h4 className="transaction-title">{transaction.goalTitle}</h4>
                    <p className="transaction-details">{transaction.source} • {formatDate(transaction.date)}</p>
                  </div>
                </div>
                <div className="transaction-right">
                  <p className={`transaction-amount ${
                    transaction.type === 'Goal Completed' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    +{formatCurrency(transaction.amount)}
                  </p>
                  <p className="transaction-type">{transaction.type}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="savings-dashboard-container">
      <style>{`
        /* Custom CSS Variables */
        :root {
          --primary: #f59e0b;
          --primary-dark: #d97706;
          --secondary: #06b6d4;
          --accent: #8b5cf6;
          --success: #f59e0b;
          --warning: #f59e0b;
          --info: #3b82f6;
          --danger: #ef4444;
          --dark: #1f2937;
          --light: #f9fafb;
          --gradient-primary: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          --gradient-savings-banner: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .savings-dashboard-container {
          min-height: 100vh;
          background-color: #f9fafb;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--dark);
        }

        .space-y-6 > * + * { margin-top: 1.5rem; }

        /* Header */
        .savings-header {
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 1.5rem;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-content h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--dark);
          margin: 0;
        }

        .header-content p {
          color: #6b7280;
          font-size: 1rem;
          margin: 0.25rem 0 0 0;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: var(--primary);
          color: white;
          padding: 0.75rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 600;
          transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2);
        }

        .refresh-button:hover:not(:disabled) {
          background-color: var(--primary-dark);
          transform: translateY(-1px);
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .animate-spin { animation: spin 1s linear infinite; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Main content */
        .main-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        /* Quick stats banner */
        .quick-stats-banner {
          background: var(--gradient-savings-banner);
          color: white;
          padding: 2rem;
          border-radius: 1rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .quick-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          text-align: center;
        }

        .quick-stats-grid > div p:first-child {
          font-size: 0.875rem;
          opacity: 0.8;
          margin-bottom: 0.25rem;
        }

        .quick-stats-grid > div p:last-child {
          font-size: 1.875rem;
          font-weight: 700;
        }

        /* Tab navigation */
        .tab-container {
          background-color: white;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          margin-bottom: 2rem;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        }

        .tab-nav {
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          padding: 0 1.5rem;
          gap: 2rem;
        }

        .tab-button {
          padding: 1rem 0.5rem;
          border-bottom: 2px solid transparent;
          font-weight: 500;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          transition: all 0.2s ease-in-out;
          background: none;
          border-top: none;
          border-left: none;
          border-right: none;
          cursor: pointer;
        }

        .tab-button:hover {
          color: #374151;
          border-color: #d1d5db;
        }

        .tab-button.active {
          border-color: #f59e0b;
          color: #f59e0b;
        }

        .tab-content {
          padding: 1.5rem;
        }

        /* Stats grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background-color: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .stat-card h3 {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          margin: 0;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--dark);
          margin: 0;
        }

        .toggle-button {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
        }

        /* Utility colors */
        .text-green-600 { color: #f59e0b; }
        .text-blue-600 { color: #2563eb; }
        .text-purple-600 { color: #7c3aed; }
        .text-emerald-600 { color: #f59e0b; }
        .text-teal-600 { color: #0d9488; }
        .text-yellow-600 { color: #d97706; }
        .text-red-600 { color: #dc2626; }
        .text-gray-600 { color: #6b7280; }

        /* SAVINGS WALLET SECTION - MAIN FEATURE */
        .savings-wallet-section {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          padding: 2rem;
          border-radius: 1rem;
          border: 2px solid #f59e0b;
          box-shadow: 0 10px 25px rgba(245, 158, 11, 0.15);
          margin-bottom: 1.5rem;
        }

        .savings-wallet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .savings-wallet-header h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #d97706;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .wallet-balance {
          text-align: right;
        }

        .balance-label {
          font-size: 0.875rem;
          color: #d97706;
          margin: 0 0 0.25rem 0;
          opacity: 0.8;
        }

        .balance-value {
          font-size: 2.25rem;
          font-weight: 800;
          color: #d97706;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .wallet-info {
          background: rgba(255,255,255,0.7);
          padding: 1.5rem;
          border-radius: 0.75rem;
          backdrop-filter: blur(10px);
        }

        .wallet-description {
          color: #d97706;
          margin: 0 0 1rem 0;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .wallet-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .wallet-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 0.5rem;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .wallet-stat .stat-label {
          font-size: 0.875rem;
          color: #92400e;
          font-weight: 500;
        }

        .wallet-stat .stat-value {
          font-size: 1rem;
          color: #92400e;
          font-weight: 700;
        }

        /* Goals preview */
        .goals-preview {
          background-color: white;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        }

        .goals-preview-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .goals-preview-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--dark);
          margin: 0;
        }

        .view-all-button {
          color: #f59e0b;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s ease-in-out;
        }

        .view-all-button:hover {
          color: #d97706;
        }

        .goals-list {
          padding: 1.5rem;
        }

        .goals-list > * + * {
          margin-top: 1rem;
        }

        .goal-item {
          padding: 1rem;
          background-color: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .goal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .goal-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .category-icon {
          font-size: 1.5rem;
        }

        .goal-title {
          font-weight: 500;
          color: var(--dark);
          margin: 0 0 0.25rem 0;
        }

        .goal-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        .goal-amount {
          text-align: right;
        }

        .current-amount {
          font-weight: 600;
          color: var(--dark);
          margin: 0;
        }

        .target-amount {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        .progress-bar {
          width: 100%;
          background-color: #e5e7eb;
          border-radius: 9999px;
          height: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          background-color: #f59e0b;
          height: 0.5rem;
          border-radius: 9999px;
          transition: all 0.3s ease-in-out;
        }

        .goal-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
        }

        .goal-actions-inline {
          display: flex;
          justify-content: flex-end;
        }

        .add-money-button {
          background-color: #f59e0b;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out;
        }

        .add-money-button:hover:not(:disabled) {
          background-color: #d97706;
        }

        .add-money-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* History section */
        .history-section {
          background-color: white;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        }

        .section-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .section-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--dark);
          margin: 0;
        }

        .section-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0.25rem 0 0 0;
        }

        .history-list {
          padding: 1.5rem;
        }

        .history-list > * + * {
          margin-top: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .transaction-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }

        .transaction-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .transaction-icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bg-blue-100 { background-color: #dbeafe; }
        .bg-green-100 { background-color: #fef3c7; }
        .bg-yellow-100 { background-color: #fef3c7; }
        .bg-gray-100 { background-color: #f3f4f6; }

        .transaction-title {
          font-weight: 500;
          color: var(--dark);
          margin: 0 0 0.25rem 0;
        }

        .transaction-details {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        .transaction-right {
          text-align: right;
        }

        .transaction-amount {
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }

        .transaction-type {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .stats-grid,
          .wallet-stats,
          .quick-stats-grid {
            grid-template-columns: 1fr;
          }

          .goal-header,
          .transaction-item,
          .savings-wallet-header {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }

          .goal-amount,
          .transaction-right,
          .wallet-balance {
            width: 100%;
            text-align: left;
            margin-top: 0.75rem;
          }

          .tab-nav {
            overflow-x: auto;
            white-space: nowrap;
            padding-bottom: 0.5rem;
          }

          .tab-button {
            flex-shrink: 0;
          }
        }
      `}</style>

      {/* Header */}
      <div className="savings-header">
        <div className="header-content">
          <div>
            <h1>Savings Dashboard</h1>
            <p>Welcome back, {user?.name || 'User'}! Track your goals and build your future</p>
          </div>
          <button 
            onClick={handleRefresh}
            className="refresh-button"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="quick-stats-banner">
          <div className="quick-stats-grid">
            <div>
              <p>Total Saved</p>
              <p>{formatCurrency(savingsStats.totalSaved)}</p>
            </div>
            <div>
              <p>This Month</p>
              <p>{formatCurrency(savingsStats.thisMonthSaved)}</p>
            </div>
            <div>
              <p>Goals Achieved</p>
              <p>{achievedGoals.length}</p>
            </div>
            <div>
              <p>Active Goals</p>
              <p>{savingsGoals.filter(g => g.status === 'In Progress').length}</p>
            </div>
          </div>
        </div>

        <div className="tab-container">
          <div className="tab-nav">
            {[
              { id: 'overview', label: 'Overview', icon: PiggyBank },
              { id: 'goals', label: 'Savings Goals', icon: Target },
              { id: 'history', label: 'History', icon: History }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="tab-content">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'goals' && (
              <GoalsTab
                newGoal={newGoal}
                setNewGoal={setNewGoal}
                handleCreateGoal={handleCreateGoal}
                showNewGoalForm={showNewGoalForm}
                setShowNewGoalForm={setShowNewGoalForm}
                savingsGoals={savingsGoals}
                achievedGoals={achievedGoals}
                handleDeleteGoal={handleDeleteGoal}
                getProgressPercentage={getProgressPercentage}
                getCategoryIcon={getCategoryIcon}
                getPriorityColor={getPriorityColor}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                handleAddMoney={handleAddMoney}
                walletBalances={walletBalances}
              />
            )}
            {activeTab === 'history' && <HistoryTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Savings;