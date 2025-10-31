// backend/services/recommendationService.js

const allFunds = [
  { 
    id: 1, name: "UTI Nifty 50 Index Fund", type: "Index Fund", minInvestment: 100,
    risk: "Medium", category: "Index Fund", description: "Tracks India's top 50 companies for broad market exposure.",
    // AI-generated properties for the new UI
    confidenceLevel: 92, matchScore: 66, volatility: 15, analystRating: 4.5,
    primaryReason: "Your interest in diversified, stable growth aligns with this fund's objective.",
    projectedGrowth: "12-15% annually",
    aiCompatibility: 88, metric1_label: "AUM", metric1_value: "₹15,000 Cr", metric2_label: "Expense Ratio", metric2_value: "0.1%"
  },
  { 
    id: 2, name: "Reliance Industries Ltd.", type: "Stock", minInvestment: 2500,
    risk: "Medium", category: "Conglomerate", description: "India's largest company with diversified interests.",
    confidenceLevel: 89, matchScore: 77, volatility: 22, analystRating: 4.2,
    primaryReason: "A strong choice for participating in multiple core sectors of the Indian economy.",
    projectedGrowth: "14-18% annually",
    aiCompatibility: 85, metric1_label: "Market Cap", metric1_value: "₹20L Cr", metric2_label: "P/E Ratio", metric2_value: "28.5"
  },
  { 
    id: 3, name: "HDFC Bank Ltd.", type: "Stock", minInvestment: 1500,
    risk: "Medium", category: "Banking", description: "Leading private sector bank known for consistent performance.",
    confidenceLevel: 95, matchScore: 52, volatility: 18, analystRating: 4.8,
    primaryReason: "Based on market stability, this aligns with a balanced portfolio strategy.",
    projectedGrowth: "13-16% annually",
    aiCompatibility: 91, metric1_label: "Market Cap", metric1_value: "₹12L Cr", metric2_label: "NPA %", metric2_value: "1.2%"
  },
  { 
    id: 4, name: "Tata Consultancy Services (TCS)", type: "Stock", minInvestment: 3500,
    risk: "Medium", category: "IT", description: "A global IT services leader with strong international client base.",
    confidenceLevel: 85, matchScore: 82, volatility: 20, analystRating: 4.1,
    primaryReason: "Ideal for gaining exposure to the global technology and outsourcing boom.",
    projectedGrowth: "15-20% annually",
    aiCompatibility: 82, metric1_label: "Market Cap", metric1_value: "₹14L Cr", metric2_label: "Dividend Yield", metric2_value: "1.5%"
  },
  { 
    id: 5, name: "Parag Parikh Flexi Cap Fund", type: "Mutual Fund", minInvestment: 1000,
    risk: "High", category: "Flexi Cap", description: "Diversified fund with a mix of Indian and top global tech stocks.",
    confidenceLevel: 93, matchScore: 90, volatility: 25, analystRating: 4.7,
    primaryReason: "Matches your profile for high-growth potential and global diversification.",
    projectedGrowth: "16-20% annually",
    aiCompatibility: 90, metric1_label: "AUM", metric1_value: "₹65,000 Cr", metric2_label: "Global Equity", metric2_value: "30%"
  },
  { 
    id: 6, name: "ICICI Prudential Corporate Bond Fund", type: "Debt Fund", minInvestment: 1000,
    risk: "Low", category: "Debt", description: "Focuses on providing stable income with lower risk.",
    confidenceLevel: 59, matchScore: 95, volatility: 4, analystRating: 4.9,
    primaryReason: "Excellent for capital preservation and as a defensive part of your portfolio.",
    projectedGrowth: "7-9% annually",
    aiCompatibility: 95, metric1_label: "AUM", metric1_value: "₹25,000 Cr", metric2_label: "Avg. Maturity", metric2_value: "3.5 Yrs"
  }
];

// This function can now be used by multiple endpoints
const getAllOptions = () => allFunds;

const getRecommendationsForUser = (userProfile = {}) => {
  // A more advanced logic could use the userProfile
  // For now, we'll return a curated subset
  return allFunds.filter(fund => fund.matchScore > 80);
};

module.exports = {
  getAllOptions,
  getRecommendationsForUser,
};