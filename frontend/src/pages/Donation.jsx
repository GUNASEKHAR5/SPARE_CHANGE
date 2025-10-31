import React, { useState, useEffect } from 'react';
import { Heart, TrendingUp, Users, MapPin, CheckCircle, Download, IndianRupee, Search, Filter, Brain, Star, ThumbsUp, ThumbsDown, RefreshCw, Zap, Target, Award } from 'lucide-react';
import './DonationsPage.css';

const DonationsPage = ({ user, walletBalances, onWalletUpdate }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationType, setDonationType] = useState('one-time');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshingRecommendations, setRefreshingRecommendations] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local state for this page's specific data
  const [stats, setStats] = useState({});
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  
  // New reusable data fetching function
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Check if the token exists before making the request
      if (!token) {
          throw new Error('User not authenticated');
      }

      const [statsRes, recsRes, orgsRes, historyRes] = await Promise.all([
        // UPDATED: Added a header with the user's JWT token for authentication
        fetch('http://localhost:5000/api/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }),
        fetch(`http://localhost:5000/api/recommendations/${user.id}`),
        fetch('http://localhost:5000/api/organizations'),
        fetch(`http://localhost:5000/api/donations/${user.id}`)
      ]);

      if (!statsRes.ok) {
          // Handle specific error codes if needed
          if (statsRes.status === 401 || statsRes.status === 403) {
              console.error('User not authorized. Redirecting to login.');
          }
          throw new Error('Failed to fetch stats');
      }
      if (!recsRes.ok) throw new Error('Failed to fetch recommendations');
      if (!orgsRes.ok) throw new Error('Failed to fetch organizations');
      if (!historyRes.ok) throw new Error('Failed to fetch donation history');

      const [statsData, recsData, orgsData, historyData] = await Promise.all([
        statsRes.json(),
        recsRes.json(),
        orgsRes.json(),
        historyRes.json()
      ]);

      // SORT AI RECOMMENDATIONS by matchScore in descending order
      const sortedRecs = recsData.sort((a, b) => b.matchScore - a.matchScore);

      setStats(statsData);
      setAiRecommendations(sortedRecs);
      setOrganizations(orgsData);
      setDonationHistory(historyData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch on component mount
  useEffect(() => {
    if (!user?.id) return;
    fetchData();
  }, [user]); // Re-run effect if user changes

  const filteredOrganizations = organizations.filter(org => {
    const matchesFilter = activeFilter === 'all' || org.type === activeFilter;
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (org.category && org.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // This is the correct place to sort the filtered list for display.
  const sortedFilteredOrganizations = filteredOrganizations.sort((a, b) => b.aiCompatibility - a.aiCompatibility);

  const refreshRecommendations = async () => {
    setRefreshingRecommendations(true);
    try {
      const response = await fetch(`http://localhost:5000/api/recommendations/${user.id}`);
      if (!response.ok) throw new Error('Failed to refresh recommendations');
      const data = await response.json();
      
      const sortedRecs = data.sort((a, b) => b.matchScore - a.matchScore);
      setAiRecommendations(sortedRecs);
    } catch (error) {
      console.error("Failed to refresh recommendations:", error);
      setError('Failed to refresh recommendations');
    }
    setRefreshingRecommendations(false);
  };
  
  const handleRecommendationClick = (recommendation) => {
    setSelectedOrg(recommendation);
    setShowModal(true);
  };

  const handleRecommendationFeedback = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setShowFeedbackModal(true);
  };

  const submitFeedback = (rating, feedback) => {
    console.log('Feedback submitted:', {
      recommendationId: selectedRecommendation.id,
      rating,
      feedback,
      userId: user.id
    });
    setShowFeedbackModal(false);
    setSelectedRecommendation(null);
  };

  const handleDonate = (org) => {
    setSelectedOrg(org);
    setShowModal(true);
  };
  
  const submitDonation = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert('Please enter a valid donation amount');
      return;
    }
    
    if (parseFloat(donationAmount) > parseFloat(walletBalances.donation_wallet)) {
        alert(`Insufficient funds in your Donation Wallet. You only have ₹${parseFloat(walletBalances.donation_wallet).toFixed(2)} available.`);
        return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id, 
          charityId: selectedOrg.id,
          organization: selectedOrg.name,
          amount: parseFloat(donationAmount),
          type: donationType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit donation');
      }

      const result = await response.json();
      console.log('Donation submitted successfully:', result);
      
      onWalletUpdate(); 
      
      await fetchData();

      setShowModal(false);
      setDonationAmount('');
      setSelectedOrg(null);
      alert('Donation submitted successfully!');
    } catch (error) {
      console.error('Error submitting donation:', error);
      alert(error.message);
    }
  };

  const getOrgIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'trust': return '🏛️';
      case 'child-home': return '👶';
      case 'old-age': return '👴';
      default: return '🏢';
    }
  };

  const getConfidenceBadgeColor = (confidence) => {
    if (confidence >= 90) return 'confidence-high';
    if (confidence >= 80) return 'confidence-medium';
    return 'confidence-low';
  };

  const handleLogout = () => {
    console.log('Logout functionality triggered');
  };

  const handleBackToHome = () => {
    console.log('Back to home functionality triggered');
  };

  if (loading) {
    return (
      <div className="donations-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="donations-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="donations-page">
      {/* <header className="donations-header"> */}
        {/* <div className="header-container">
          <div className="header-content">
            <div className="logo-section">
              <span className="logo" onClick={handleBackToHome} style={{ cursor: 'pointer' }}>$ SpareChange</span>
            </div>
            <nav className="nav-section">
              <a href="#how-it-works" className="nav-link">How It Works</a>
              <a href="#features" className="nav-link">Features</a>
              <a href="#use-cases" className="nav-link">Use Cases</a>
              <span className="username-display">Hello, {user.name}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header> */}

      <main className="main-content">
        <div className="page-title">
          <h1>AI-Powered Impact</h1>
          <p>Smart donations that maximize your social impact</p>
        </div>
        
        {stats && Object.keys(stats).length > 0 && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-blue">
                <IndianRupee className="icon" />
              </div>
              <h3>₹{parseFloat(stats.totalDonated).toLocaleString()}</h3>
              <p>Total Donated</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <TrendingUp className="icon" />
              </div>
              <h3>₹{parseFloat(stats.thisMonth).toLocaleString()}</h3>
              <p>This Month</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-red">
                <Heart className="icon" />
              </div>
              <h3>{stats.impactScore}%</h3>
              <p>Impact Score</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-purple">
                <Brain className="icon" />
              </div>
              <h3>{stats.recommendationsFollowed}%</h3>
              <p>AI Match Rate</p>
            </div>
          </div>
        )}

        <div className="ai-recommendations">
          <div className="ai-recommendations-header">
            <div className="ai-header-content">
              <Brain className="brain-icon" />
              <h2>AI-Powered Recommendations</h2>
            </div>
            <p>Personalized suggestions based on advanced machine learning analysis of your preferences</p>
            <button
              onClick={refreshRecommendations}
              disabled={refreshingRecommendations}
              className={`refresh-btn ${refreshingRecommendations ? 'refreshing' : ''}`}
            >
              <RefreshCw className={`refresh-icon ${refreshingRecommendations ? 'spinning' : ''}`} />
              {refreshingRecommendations ? 'Generating...' : 'Refresh Recommendations'}
            </button>
          </div>

          <div className="recommendations-grid">
            {aiRecommendations.map(rec => (
              <div key={rec.id} className="recommendation-card">
                <div className="rec-header">
                  <div className="rec-type-badge">
                    {rec.type || rec.category}
                  </div>
                  <div className={`confidence-badge ${getConfidenceBadgeColor(rec.confidenceLevel)}`}>
                    {rec.confidenceLevel}% Confidence
                  </div>
                </div>
                <h3 className="rec-title">{rec.name}</h3>
                <p className="rec-description">{rec.description}</p>
                <div className="match-score">
                  <div className="match-score-content">
                    <Target className="target-icon" />
                    <span className="match-percentage">{rec.matchScore}%</span>
                  </div>
                  <div className="match-label">AI Match Score</div>
                </div>
                <div className="ai-insights">
                  <div className="primary-reason">
                    <Zap className="zap-icon" />
                    {rec.primaryReason}
                  </div>
                  <div className="secondary-reasons">
                    {rec.secondaryReasons?.slice(0, 2).map((reason, idx) => (
                      <div key={idx} className="secondary-reason">
                        <span className="bullet"></span>
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="trust-metrics">
                  <div className="metric-value">{rec.trustScore}</div>
                  <div className="metric-label">Trust</div>
                  <div className="metric-value">{rec.transparencyScore}</div>
                  <div className="metric-label">Transparency</div>
                  <div className="metric-value">{rec.efficiencyScore}</div>
                  <div className="metric-label">Efficiency</div>
                </div>
                <div className="impact-statement">
                  <Award className="award-icon" />
                  <span>{rec.impact}</span>
                </div>
                <div className="action-buttons">
                  <button 
                    onClick={() => handleRecommendationClick(rec)}
                    className="donate-btn"
                  >
                    Donate Now
                  </button>
                  <button
                    onClick={() => handleRecommendationFeedback(rec)}
                    className="feedback-btn"
                    title="Rate Recommendation"
                  >
                    <Star className="star-icon" />
                  </button>
                </div>
                <details className="ml-details">
                  <summary>View AI Analysis Details</summary>
                  <div className="ml-info">
                    <div className="ml-info-item">
                      <span className="ml-label">Algorithm:</span> {rec.algorithmUsed}
                    </div>
                    <div className="ml-info-item">
                      <span className="ml-label">Model:</span> {rec.modelVersion}
                    </div>
                    <div className="ml-info-item">
                      <span className="ml-label">Type:</span> {rec.recommendationType}
                    </div>
                    {rec.featureWeights && (
                      <div className="feature-weights">
                        <span className="ml-label">Key Factors:</span>
                        <div className="weights-list">
                          {Object.entries(rec.featureWeights).map(([feature, weight]) => (
                            <div key={feature} className="weight-item">
                              <span className="feature-name">{feature.replace(/([A-Z])/g, ' $1')}</span>
                              <span className="weight-value">{Math.round(weight * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>

        <div className="search-filter-section">
          <div className="search-filter-header">
            <h2>Browse All Organizations</h2>
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          
          <div className="filter-buttons">
            {[
              { key: 'all', label: 'All Organizations' },
              { key: 'trust', label: 'Trusts' },
              { key: 'child-home', label: 'Child Homes' },
              { key: 'old-age', label: 'Old Age Homes' }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="organizations-grid">
          {sortedFilteredOrganizations.map(org => (
            <div key={org.id} className="org-card">
              <div className="org-header">
                <div className={`org-icon org-icon-${org.type}`}>
                  {getOrgIcon(org.type)}
                </div>
                <div className="org-badges">
                  {org.verified && (
                    <div className="verified-badge">
                      <CheckCircle className="check-icon" />
                      Verified
                    </div>
                  )}
                  <div className="ai-match-badge">
                    {org.aiCompatibility}% AI Match
                  </div>
                </div>
              </div>
              
              <h3 className="org-name">{org.name}</h3>
              <div className="org-location">
                <MapPin className="map-icon" />
                <span>{org.location}</span>
              </div>
              <p className="org-description">{org.description}</p>
              
              <div className="org-metrics">
                <div className="metric">
                  <div className="metric-value">{org.beneficiaries}</div>
                  <div className="metric-label">Beneficiaries</div>
                </div>
                <div className="metric">
                  <div className="metric-value">{org.projects}</div>
                  <div className="metric-label">Projects</div>
                </div>
              </div>

              <div className="trust-scores">
                <div className="score-item">
                  <div className="score-value">{org.trustScore}</div>
                  <div className="score-label">Trust</div>
                </div>
                <div className="score-item">
                  <div className="score-value">{org.transparencyScore}</div>
                  <div className="score-label">Transparency</div>
                </div>
                <div className="score-item">
                  <div className="score-value">{org.rating}</div>
                  <div className="score-label">Rating</div>
                </div>
              </div>
              
              <button 
                onClick={() => handleDonate(org)}
                className="org-donate-btn"
              >
                Donate Now
              </button>
            </div>
          ))}
        </div>

        <div className="donation-history">
          <div className="history-header">
            <h2>Donation History & AI Performance</h2>
            <button className="export-btn">
              <Download className="download-icon" />
              Export Report
            </button>
          </div>
          
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>AI Recommended</th>
                  <th>Status</th>
                  <th>Impact</th>
                  <th>Your Rating</th>
                </tr>
              </thead>
              <tbody>
                {donationHistory.map((donation, index) => (
                  <tr key={index}>
                    <td className="org-name-cell">{donation.charity_name || donation.organization}</td>
                    <td className="amount-cell">₹{parseFloat(donation.amount).toFixed(2)}</td>
                    <td>{new Date(donation.date || donation.donation_date).toLocaleDateString()}</td>
                    <td className="type-cell">{donation.type}</td>
                    <td className="ai-cell">
                      {donation.wasRecommended ? (
                        <div className="ai-recommended">
                          <Brain className="brain-icon-small" />
                          <span>{donation.recommendationScore}% match</span>
                        </div>
                      ) : (
                        <span className="manual-selection">Manual selection</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${donation.status}`}>
                        {donation.status}
                      </span>
                    </td>
                    <td className="impact-cell">{donation.impact}</td>
                    <td className="rating-cell">
                      {donation.userSatisfaction ? (
                        <div className="user-rating">
                          <Star className="star-icon-small" />
                          <span>{donation.userSatisfaction}/5</span>
                        </div>
                      ) : (
                        <span className="not-rated">Not rated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ai-performance">
            <h3 className="performance-title">
              <Brain className="brain-icon-small" />
              AI Recommendation Performance
            </h3>
            <div className="performance-grid">
              <div className="performance-item">
                <div className="performance-value">92%</div>
                <div className="performance-label">Recommendation Accuracy</div>
              </div>
              <div className="performance-item">
                <div className="performance-value">4.6/5</div>
                <div className="performance-label">Average Satisfaction</div>
              </div>
              <div className="performance-item">
                <div className="performance-value">78%</div>
                <div className="performance-label">Recommendations Followed</div>
              </div>
              <div className="performance-item">
                <div className="performance-value">15%</div>
                <div className="performance-label">Impact Improvement</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Make a Donation</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-org-info">
              <h4>{selectedOrg?.name}</h4>
              <p>{selectedOrg?.category || selectedOrg?.type}</p>
              {selectedOrg?.matchScore && (
                <div className="modal-ai-match">
                  <Brain className="brain-icon-small" />
                  <span>AI Match: {selectedOrg.matchScore}%</span>
                </div>
              )}
            </div>

            {selectedOrg?.primaryReason && (
              <div className="modal-ai-reason">
                <div className="reason-text">
                  <strong>Why this recommendation:</strong> {selectedOrg.primaryReason}
                </div>
                {selectedOrg.impact && (
                  <div className="impact-text">
                    <strong>Expected impact:</strong> {selectedOrg.impact}
                  </div>
                )}
              </div>
            )}
            
            <div className="modal-form">
              <div className="form-group">
                <label>Donation Amount</label>
                <div className="amount-input">
                  <IndianRupee className="rupee-icon" />
                  <input
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="amount-field"
                  />
                </div>
                <p className="available-balance">
                  Available in Donation Wallet: <strong>₹{parseFloat(walletBalances.donation_wallet).toFixed(2)}</strong>
                </p>
              </div>
              
              <div className="form-group">
                <label>Donation Type</label>
                <select
                  value={donationType}
                  onChange={(e) => setDonationType(e.target.value)}
                  className="type-select"
                >
                  <option value="one-time">One-time</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              {donationAmount && (
                <div className="impact-prediction">
                  <div className="prediction-header">
                    <Zap className="zap-icon" />
                    <span>Predicted Impact</span>
                  </div>
                  <div className="prediction-text">
                    Your ₹{donationAmount} donation could help feed {Math.floor(parseFloat(donationAmount) / 5)} children for a day
                  </div>
                </div>
              )}
              
              <button
                onClick={submitDonation}
                className="submit-donation-btn"
              >
                Confirm Donation
              </button>

              <div className="ai-improvement-note">
                This donation will help improve our AI recommendations for future suggestions
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
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="close-btn"
              >
                ✕
              </button>
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
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => {
                        submitFeedback(rating, 'Star rating provided');
                      }}
                      className="star-btn"
                    >
                      <Star className="star-icon-rating" />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="feedback-buttons">
                <button
                  onClick={() => submitFeedback(5, 'Positive feedback - thumbs up')}
                  className="feedback-btn-positive"
                >
                  <ThumbsUp className="thumb-icon" />
                  Helpful
                </button>
                <button
                  onClick={() => submitFeedback(1, 'Negative feedback - thumbs down')}
                  className="feedback-btn-negative"
                >
                  <ThumbsDown className="thumb-icon" />
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

export default DonationsPage;