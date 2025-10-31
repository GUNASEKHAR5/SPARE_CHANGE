import React, { useState, useEffect, useCallback } from 'react';
import { IndianRupee, TrendingUp, PieChart, Brain, Target, Award, RefreshCw, Zap, Star, Search, Filter, ThumbsUp, ThumbsDown, Download, Plus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import './InvestPage.css';

const Investment = ({ walletBalances, onWalletUpdate }) => {
  const { loading, error, request } = useApi();
  const [activeFilter, setActiveFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshingRecommendations, setRefreshingRecommendations] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [stats, setStats] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [investmentOptions, setInvestmentOptions] = useState([]);
  const [investmentHistory, setInvestmentHistory] = useState([]);

  const currentInvestmentWallet = parseFloat(walletBalances?.investment_wallet || 0);

  const refreshInvestmentRecommendations = useCallback(async () => {
    setRefreshingRecommendations(true);
    try {
      const data = await request('/investments/recommendations', 'POST', {});
      setAiRecommendations(data);
    } catch (error) {
      console.error("Failed to refresh recommendations:", error);
      setAiRecommendations([
        {
          id: '1',
          name: 'Tech Growth Fund',
          category: 'Technology',
          description: 'High-growth technology companies with strong fundamentals',
          matchScore: 92,
          confidenceLevel: 88,
          primaryReason: 'Strong alignment with your growth-oriented investment preferences',
          risk: 'Medium',
          volatility: 12,
          analystRating: 4.5,
          projectedGrowth: '15-22%'
        }
      ]);
    }
    setRefreshingRecommendations(false);
  }, [request]);

  const fetchData = useCallback(async () => {
    try {
      try {
        const statsData = await request('/investments/stats');
        setStats(statsData);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        setStats({ portfolioReturn: 0, riskProfile: 'N/A', strategyMatch: 0 });
      }

      let optionsData;
      try {
        optionsData = await request('/investments/options');
      } catch (error) {
        console.error("Failed to fetch options:", error);
        optionsData = [
          {
            id: '1',
            name: 'Tech Innovators Fund',
            type: 'mutual-fund',
            category: 'Technology',
            risk: 'High',
            volatility: 15,
            analystRating: 4.5,
            projectedGrowth: '18-25%',
            description: 'Invests in high-growth technology companies.',
            aiCompatibility: 92,
            metric1_value: '₹2,45,000 Cr',
            metric1_label: 'AUM',
            metric2_value: '1.2%',
            metric2_label: 'Expense Ratio'
          },
          {
            id: '2',
            name: 'Blue Chip Portfolio',
            type: 'stock',
            category: 'Diversified',
            risk: 'Low',
            volatility: 8,
            analystRating: 4.8,
            projectedGrowth: '5-8%',
            description: 'Stable, well-established companies.',
            aiCompatibility: 95,
            metric1_value: '₹3,20,000 Cr',
            metric1_label: 'Market Cap',
            metric2_value: '12.5%',
            metric2_label: 'P/E Ratio'
          }
        ];
      }
      setInvestmentOptions(optionsData);

      let historyData;
      try {
        historyData = await request('/investments/history');
      } catch (error) {
        console.error("Failed to fetch history:", error);
        historyData = [];
      }
      setInvestmentHistory(historyData);
      
      refreshInvestmentRecommendations();
    } catch (error) {
      console.error("Failed to fetch investment data:", error);
    }
  }, [request, refreshInvestmentRecommendations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (walletBalances) {
      fetchData();
    }
  }, [walletBalances, fetchData]);

  const filteredOptions = investmentOptions.filter(opt => {
    const matchesFilter = activeFilter === 'all' || opt.type.toLowerCase() === activeFilter;
    const matchesSearch = opt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (opt.category && opt.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const submitInvestment = async () => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      alert('Please enter a valid investment amount');
      return;
    }
    
    const amountToInvest = parseFloat(investmentAmount);

    if (amountToInvest > currentInvestmentWallet) {
        alert(`Insufficient funds. You only have ₹${currentInvestmentWallet.toFixed(2)} available.`);
        return;
    }
    
    try {
      await request('/investments/invest', 'POST', {
          investmentName: selectedInvestment.name,
          amount: amountToInvest,
          type: selectedInvestment.type,
          wasRecommended: selectedInvestment.matchScore ? true : false,
          recommendationScore: selectedInvestment.matchScore
        });
      
      // FIX: Update wallet first, then refresh data
      if (onWalletUpdate) {
        await onWalletUpdate();
      }
      
      setShowModal(false);
      setInvestmentAmount('');
      setSelectedInvestment(null);
      alert('Investment successful!');
      
      await fetchData();
    } catch (error) {
      console.error('Error submitting investment:', error);
      alert(error.message || 'Investment failed');
    }
  };

  const handleRecommendationClick = (rec) => { 
    setSelectedInvestment({
      ...rec,
      type: rec.type || 'mutual-fund'
    }); 
    setShowModal(true); 
  };
  
  const handleRecommendationFeedback = (rec) => { 
    setSelectedRecommendation(rec); 
    setShowFeedbackModal(true); 
  };
  
  const submitFeedback = (rating, feedback) => { 
    console.log('Feedback:', { rating, feedback }); 
    setShowFeedbackModal(false); 
  };
  
  const handleInvest = (opt) => { 
    setSelectedInvestment(opt); 
    setShowModal(true); 
  };
  
  const getConfidenceBadgeColor = (c) => c >= 90 ? 'confidence-high' : c >= 80 ? 'confidence-medium' : 'confidence-low';
  const getRiskColor = (r) => r === 'High' ? 'risk-high' : r === 'Medium' ? 'risk-medium' : 'risk-low';

  if (loading && !stats) {
    return <div className="invest-page"><div className="centered-message">Loading your portfolio...</div></div>;
  }
  
  return (
    <div className="invest-page">
      <main className="main-content">
        <div className="page-title">
          <h1>AI-Powered Wealth Creation</h1>
          <p>Smart investments designed to grow your spare change effectively</p>
        </div>
        <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-blue"><PieChart className="icon"/></div>
              {/* FIX: Always use the prop for current wallet balance */}
              <h3>₹{currentInvestmentWallet.toLocaleString()}</h3>
              <p>Available to Invest</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-green"><TrendingUp className="icon"/></div>
              <h3>+{parseFloat(stats?.portfolioReturn || 0).toFixed(2)}%</h3>
              <p>Portfolio Return</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-red"><Zap className="icon"/></div>
              <h3>{stats?.riskProfile || 'Moderate'}</h3>
              <p>Your Risk Profile</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-purple"><Target className="icon"/></div>
              <h3>{stats?.strategyMatch || 0}%</h3>
              <p>AI Strategy Match</p>
            </div>
        </div>
        <div className="ai-recommendations">
            <div className="ai-recommendations-header">
                <div className="ai-header-content">
                  <Brain className="brain-icon"/>
                  <h2>AI-Powered Recommendations</h2>
                </div>
                <p>Personalized investment suggestions based on market analysis and your financial goals</p>
                <button 
                  onClick={refreshInvestmentRecommendations} 
                  disabled={refreshingRecommendations} 
                  className={`refresh-btn ${refreshingRecommendations ? 'refreshing' : ''}`}
                >
                  <RefreshCw className={`refresh-icon ${refreshingRecommendations ? 'spinning' : ''}`}/>
                  {refreshingRecommendations ? 'Analyzing...' : 'Refresh Recommendations'}
                </button>
            </div>
            <div className="recommendations-grid">
                {aiRecommendations.map(rec => (
                    <div key={rec.id} className="recommendation-card">
                        <div className="rec-header">
                          <div className="rec-type-badge">{rec.category}</div>
                          <div className={`confidence-badge ${getConfidenceBadgeColor(rec.confidenceLevel)}`}>
                            {rec.confidenceLevel}% Confidence
                          </div>
                        </div>
                        <h3 className="rec-title">{rec.name}</h3>
                        <p className="rec-description">{rec.description}</p>
                        <div className="match-score">
                          <div className="match-score-content">
                            <Target className="target-icon"/>
                            <span className="match-percentage">{rec.matchScore}%</span>
                          </div>
                          <div className="match-label">AI Match Score</div>
                        </div>
                        <div className="ai-insights">
                          <div className="primary-reason">
                            <Zap className="zap-icon"/>
                            {rec.primaryReason}
                          </div>
                        </div>
                        <div className="trust-metrics">
                          <div className={`metric-value ${getRiskColor(rec.risk)}`}>{rec.risk}</div>
                          <div className="metric-label">Risk</div>
                          <div className="metric-value">{rec.volatility}%</div>
                          <div className="metric-label">Volatility</div>
                          <div className="metric-value">{rec.analystRating}/5</div>
                          <div className="metric-label">Analyst Rating</div>
                        </div>
                        <div className="impact-statement">
                          <Award className="award-icon"/>
                          <span>Projected Growth: {rec.projectedGrowth}</span>
                        </div>
                        <div className="action-buttons">
                          <button onClick={() => handleRecommendationClick(rec)} className="invest-btn">
                            Invest Now
                          </button>
                          <button 
                            onClick={() => handleRecommendationFeedback(rec)} 
                            className="feedback-btn" 
                            title="Rate Recommendation"
                          >
                            <Star className="star-icon"/>
                          </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="search-filter-section">
            <div className="search-filter-header">
              <h2>Explore Investment Options</h2>
              <div className="search-container">
                <Search className="search-icon"/>
                <input 
                  type="text" 
                  placeholder="Search stocks, funds, ETFs..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="search-input"
                />
              </div>
            </div>
            <div className="filter-buttons">
                {[
                  {key:'all',label:'All Investments'},
                  {key:'stock',label:'Stocks'},
                  {key:'mutual-fund',label:'Mutual Funds'},
                  {key:'etf',label:'ETFs'}
                ].map(filter => (
                  <button 
                    key={filter.key} 
                    onClick={()=>setActiveFilter(filter.key)} 
                    className={`filter-btn ${activeFilter===filter.key?'active':''}`}
                  >
                    {filter.label}
                  </button>
                ))}
            </div>
        </div>
        <div className="organizations-grid">
            {filteredOptions.map(opt => (
                <div key={opt.id} className="org-card investment-card">
                    <div className="org-header">
                      <div className={`org-icon org-icon-${opt.type.toLowerCase()}`}>
                        {opt.type==='stock'?'📈':'📊'}
                      </div>
                      <div className="org-badges">
                        <div className={`risk-badge ${getRiskColor(opt.risk)}`}>{opt.risk} Risk</div>
                        <div className="ai-match-badge">{opt.aiCompatibility}% AI Match</div>
                      </div>
                    </div>
                    <h3 className="org-name">{opt.name}</h3>
                    <div className="org-location">
                      <span>{opt.category}</span>
                    </div>
                    <p className="org-description">{opt.description}</p>
                    <div className="org-metrics">
                      <div className="metric">
                        <div className="metric-value">{opt.metric1_value}</div>
                        <div className="metric-label">{opt.metric1_label}</div>
                      </div>
                      <div className="metric">
                        <div className="metric-value">{opt.metric2_value}</div>
                        <div className="metric-label">{opt.metric2_label}</div>
                      </div>
                    </div>
                    <button onClick={()=>handleInvest(opt)} className="org-donate-btn invest-btn">
                      Invest Now
                    </button>
                </div>
            ))}
        </div>
        <div className="donation-history investment-history">
            <div className="history-header">
              <h2>Investment History & Performance</h2>
              <button className="export-btn">
                <Download className="download-icon"/>
                Export Report
              </button>
            </div>
            <div className="history-table-container">
                <table className="history-table">
                    <thead>
                      <tr>
                        <th>Asset Name</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>AI Recommended</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                        {investmentHistory.map((tx) => (
                            <tr key={tx.id}>
                                <td className="org-name-cell">{tx.investment_name}</td>
                                <td className="amount-cell">₹{parseFloat(tx.amount).toFixed(2)}</td>
                                <td>{new Date(tx.investment_date).toLocaleDateString()}</td>
                                <td className="type-cell">{tx.type}</td>
                                <td className="ai-cell">
                                  {tx.wasRecommended ? 
                                    <div className="ai-recommended">
                                      <Brain className="brain-icon-small"/>
                                      <span>{tx.recommendationScore}% match</span>
                                    </div> : 
                                    <span className="manual-selection">Manual</span>
                                  }
                                </td>
                                <td>
                                  <span className={`status-badge status-${tx.status.toLowerCase()}`}>
                                    {tx.status}
                                  </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </main>
      {showModal && (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                  <h3>Make an Investment</h3>
                  <button onClick={() => setShowModal(false)} className="close-btn">✕</button>
                </div>
                <div className="modal-org-info">
                  <h4>{selectedInvestment?.name}</h4>
                  <p>{selectedInvestment?.category}</p>
                  {selectedInvestment?.matchScore && (
                    <div className="modal-ai-match">
                      <Brain className="brain-icon-small"/>
                      <span>AI Match: {selectedInvestment.matchScore}%</span>
                    </div>
                  )}
                </div>
                {selectedInvestment?.primaryReason && (
                  <div className="modal-ai-reason">
                    <div className="reason-text">
                      <strong>AI Insight:</strong> {selectedInvestment.primaryReason}
                    </div>
                  </div>
                )}
                <div className="modal-form">
                    <div className="form-group">
                      <label>Investment Amount</label>
                      <div className="amount-input">
                        <IndianRupee className="rupee-icon"/>
                        <input 
                          type="number" 
                          value={investmentAmount} 
                          onChange={(e) => setInvestmentAmount(e.target.value)} 
                          placeholder="Enter amount" 
                          className="amount-field"
                        />
                      </div>
                      {/* FIX: Use consistent balance display */}
                      <p className="available-balance">
                        Available in Investment Wallet: <strong>₹{currentInvestmentWallet.toLocaleString()}</strong>
                      </p>
                    </div>
                    {investmentAmount > 0 && (
                      <div className="impact-prediction">
                        <div className="prediction-header">
                          <TrendingUp className="zap-icon"/>
                          <span>Projected 1-Year Return</span>
                        </div>
                        <div className="prediction-text">
                          Your ₹{investmentAmount} investment has a potential to become ~₹{(parseFloat(investmentAmount) * 1.15).toFixed(2)} based on projections.
                        </div>
                      </div>
                    )}
                    <button onClick={submitInvestment} className="submit-donation-btn">
                      Confirm Investment
                    </button>
                    <div className="ai-improvement-note">
                      This transaction will help refine your future AI investment recommendations.
                    </div>
                </div>
            </div>
        </div>
      )}
      {showFeedbackModal && (
        <div className="modal-overlay">
            <div className="modal-content feedback-modal">
              <div className="modal-header">
                <h3>Rate This Recommendation</h3>
                <button onClick={()=>setShowFeedbackModal(false)} className="close-btn">✕</button>
              </div>
              {selectedRecommendation && (
                <div className="feedback-org-info">
                  <h4>{selectedRecommendation.name}</h4>
                  <p>Match Score: {selectedRecommendation.matchScore}%</p>
                  <p className="reason">{selectedRecommendation.primaryReason}</p>
                </div>
              )}
              <div className="feedback-form">
                <div className="form-group">
                  <label>How relevant was this recommendation?</label>
                  <div className="star-rating">
                    {[1,2,3,4,5].map(rating=>(
                      <button 
                        key={rating} 
                        onClick={()=>submitFeedback(rating,'Star rating provided')} 
                        className="star-btn"
                      >
                        <Star className="star-icon-rating"/>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="feedback-buttons">
                  <button 
                    onClick={()=>submitFeedback(5,'Positive feedback - thumbs up')} 
                    className="feedback-btn-positive"
                  >
                    <ThumbsUp className="thumb-icon"/>
                    Helpful
                  </button>
                  <button 
                    onClick={()=>submitFeedback(1,'Negative feedback - thumbs down')} 
                    className="feedback-btn-negative"
                  >
                    <ThumbsDown className="thumb-icon"/>
                    Not Helpful
                  </button>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Investment;