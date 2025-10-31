import React, { useState, useEffect } from 'react';
import { DollarSign, Heart, TrendingUp, PiggyBank, Menu, X, ArrowRight, Shield, Users, BarChart3, Target, Zap, Globe, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { Link } from "react-router-dom";
import './SpareChangeHomepage.css';

const SpareChangeHomepage = ({ user, walletBalances, onWalletUpdate }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showAllocationModal, setShowAllocationModal] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [paymentData, setPaymentData] = useState({
        recipientUPI: '',
        recipientPhone: '',
        recipientName: '',
        amount: ''
    });
    
    const [allocation, setAllocation] = useState({
        donation: walletBalances?.donation_percentage || 0,
        investment: walletBalances?.investment_percentage || 0,
        savings: walletBalances?.savings_percentage || 0
    });

    const [loading, setLoading] = useState(false);
    const [lastPayment, setLastPayment] = useState(null);

    // Update local allocation state if parent state changes
    useEffect(() => {
        if (walletBalances) {
            setAllocation({
                donation: walletBalances.donation_percentage,
                investment: walletBalances.investment_percentage,
                savings: walletBalances.savings_percentage
            });
        }
    }, [walletBalances]);

    const scrollToSection = (sectionId) => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        window.location.href = '/';
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        const amountToPay = parseFloat(paymentData.amount);
        const userBalance = parseFloat(walletBalances.initial_balance);

        if (amountToPay > userBalance) {
            alert("Payment failed: Insufficient balance. Please add funds to your account.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    ...paymentData,
                    amount: parseFloat(paymentData.amount)
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment failed');
            }

            const result = await response.json();
            setLastPayment(result);
            setShowPaymentModal(false);
            setPaymentData({
                recipientUPI: '',
                recipientPhone: '',
                recipientName: '',
                amount: ''
            });
            
            onWalletUpdate();
            
            alert(`Payment successful! ₹${result.spareChange.toFixed(2)} added to your impact wallets.`);
        } catch (error) {
            console.error('Payment error:', error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateAllocation = async () => {
        if (allocation.donation + allocation.investment + allocation.savings !== 100) {
            alert('Percentages must add up to 100%');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/allocation/${user.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(allocation),
            });

            if (!response.ok) throw new Error('Failed to update allocation');

            setShowAllocationModal(false);
            onWalletUpdate();
            alert('Allocation updated successfully!');
        } catch (error) {
            console.error('Allocation update error:', error);
            alert('Failed to update allocation. Please try again.');
        }
    };

    return (
        <div className="homepage">
            {/* Header */}
            <header className="header">
                <nav className="nav-container">
                    <Link to="/" className="logo">
                        <DollarSign size={24}/>SpareChange
                    </Link>
                    
                    <ul className="nav-links">
                        <li><a onClick={() => scrollToSection('how-it-works')}>How It Works</a></li>
                        <li><a onClick={() => scrollToSection('features')}>Features</a></li>
                        <li><a onClick={() => scrollToSection('use-cases')}>Use Cases</a></li>
                        {user ? (
                            <>
                                <li style={{ fontWeight: '600', color: '#2563eb' }}>Hello, {user.name.split(" ")[0]}</li>
                                <li><button onClick={handleLogout} className="cta-button">Logout</button></li>
                            </>
                        ) : (
                            <>
                                <li><a href="/login">Login</a></li>
                                <li><a href="/signup">Sign Up</a></li>
                            </>
                        )}
                    </ul>

                    <button 
                        className="mobile-menu-btn"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
                        <ul className="mobile-nav-links">
                            <li><a onClick={() => scrollToSection('how-it-works')}>How It Works</a></li>
                            <li><a onClick={() => scrollToSection('features')}>Features</a></li>
                            <li><a onClick={() => scrollToSection('use-cases')}>Use Cases</a></li>
                            {user ? (
                                <>
                                    <li style={{ fontWeight: '600', color: '#2563eb' }}>Hello, {user.name}</li>
                                    <li><button onClick={handleLogout}>Logout</button></li>
                                </>
                            ) : (
                                <>
                                    <li><a href="/login">Login</a></li>
                                    <li><a href="/signup">Sign Up</a></li>
                                </>
                            )}
                        </ul>
                    </div>
                </nav>
            </header>

            {/* Hero Section with Payment */}
            <section className="hero">
                <div className="hero-content">
                    <h1>Turn Your Spare Change Into Impact</h1>
                    <p>
                        Make payments and automatically transform your spare change into donations, 
                        investments, or savings. Every transaction creates positive impact.
                    </p>
                    
                    {user && (
                        <>
                            <div className="wallet-display">
                                {/* New: Available Balance Card */}
                                <div className="wallet-card">
                                    <h4>💰 Available Balance</h4>
                                    <div className="wallet-amount">
                                        ₹{parseFloat(walletBalances?.initial_balance).toFixed(2) || '0.00'}
                                    </div>
                                </div>
                                <div className="wallet-card">
                                    <h4>💝 Donation Wallet</h4>
                                    <div className="wallet-amount">
                                        ₹{parseFloat(walletBalances?.donation_wallet).toFixed(2) || '0.00'}
                                    </div>
                                </div>
                                <div className="wallet-card">
                                    <h4>📈 Investment Wallet</h4>
                                    <div className="wallet-amount">
                                        ₹{parseFloat(walletBalances?.investment_wallet).toFixed(2) || '0.00'}
                                    </div>
                                </div>
                                <div className="wallet-card">
                                    <h4>🏦 Savings Wallet</h4>
                                    <div className="wallet-amount">
                                        ₹{parseFloat(walletBalances?.savings_wallet).toFixed(2) || '0.00'}
                                    </div>
                                </div>
                            </div>

                            <div className="payment-section">
                                <h3>Make a Payment & Generate Spare Change</h3>
                                <p>Pay anyone via UPI or phone number. We'll round up your payment and split the spare change according to your preferences.</p>
                                
                                <div className="payment-buttons">
                                    <button onClick={() => setShowPaymentModal(true)} className="pay-btn">
                                        <CreditCard size={20} />
                                        Make Payment
                                    </button>
                                    <button onClick={() => setShowWalletModal(true)} className="wallet-btn">
                                        <Wallet size={20} />
                                        View Wallets
                                    </button>
                                    <button onClick={() => setShowAllocationModal(true)} className="wallet-btn">
                                        <BarChart3 size={20} />
                                        Manage Split
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Link to="/donation" className="cta-button">
                                    Manage Donations
                                </Link>
                                <Link to="/invest" className="cta-button" style={{ background: '#10b981' }}>
                                    Manage Investments
                                </Link>
                            </div>
                        </>
                    )}

                    {!user && (
                        <div className="hero-buttons">
                            <a href="/signup" className="btn-primary">Start Saving Today</a>
                            <a onClick={() => scrollToSection('how-it-works')} className="btn-secondary">
                                Learn More
                            </a>
                        </div>
                    )}
                </div>
            </section>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Make a Payment</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="close-btn">
                                ✕
                            </button>
                        </div>
                        
                        <form onSubmit={handlePayment}>
                            <div className="form-group">
                                <label>Recipient UPI ID</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="example@paytm"
                                    value={paymentData.recipientUPI}
                                    onChange={(e) => setPaymentData({...paymentData, recipientUPI: e.target.value})}
                                />
                            </div>
                            
                            <div style={{ textAlign: 'center', margin: '1rem 0', color: '#64748b' }}>OR</div>
                            
                            <div className="form-group">
                                <label>Recipient Phone Number</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="+91 9876543210"
                                    value={paymentData.recipientPhone}
                                    onChange={(e) => setPaymentData({...paymentData, recipientPhone: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>Recipient Name (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="John Doe"
                                    value={paymentData.recipientName}
                                    onChange={(e) => setPaymentData({...paymentData, recipientName: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>Amount</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="Enter amount"
                                    step="0.01"
                                    min="1"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                                    required
                                />
                            </div>

                            {paymentData.amount && (
                                <div className="spare-change-preview">
                                    <h4>Spare Change Preview</h4>
                                    <div className="preview-calculation">
                                        <span>Original Amount:</span>
                                        <span>₹{parseFloat(paymentData.amount).toFixed(2)}</span>
                                    </div>
                                    <div className="preview-calculation">
                                        <span>Rounded Amount:</span>
                                        <span>₹{(Math.ceil(parseFloat(paymentData.amount) / 100) * 100).toFixed(2)}</span>
                                    </div>
                                    <div className="preview-calculation preview-total">
                                        <span>Spare Change:</span>
                                        <span>₹{(Math.ceil(parseFloat(paymentData.amount) / 100) * 100 - parseFloat(paymentData.amount)).toFixed(2)}</span>
                                    </div>
                                    
                                    <div style={{ marginTop: '1rem' }}>
                                        <small>Split: {allocation.donation}% Donation | {allocation.investment}% Investment | {allocation.savings}% Savings</small>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={loading || !paymentData.amount || (!paymentData.recipientUPI && !paymentData.recipientPhone)}
                            >
                                {loading ? 'Processing...' : 'Send Payment'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Wallet Modal */}
            {showWalletModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Your Impact Wallets</h3>
                            <button onClick={() => setShowWalletModal(false)} className="close-btn">
                                ✕
                            </button>
                        </div>
                        
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div className="allocation-item" style={{ background: '#e0e7ff', borderLeft: '4px solid #4f46e5' }}>
                                <div>
                                    <div style={{ fontWeight: '600', color: '#4f46e5' }}>Available Balance</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                                        ₹{parseFloat(walletBalances?.initial_balance).toFixed(2) || '0.00'}
                                    </div>
                                </div>
                                <Wallet size={24} color="#4f46e5" />
                            </div>
                            <div className="allocation-item">
                                <div>
                                    <div style={{ fontWeight: '600', color: '#ef4444' }}>Donation Wallet</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                                        ₹{parseFloat(walletBalances?.donation_wallet).toFixed(2) || '0.00'}
                                    </div>
                                </div>
                                <Heart size={24} color="#ef4444" />
                            </div>
                            
                            <div className="allocation-item">
                                <div>
                                    <div style={{ fontWeight: '600', color: '#10b981' }}>Investment Wallet</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                                        ₹{parseFloat(walletBalances?.investment_wallet).toFixed(2) || '0.00'}
                                    </div>
                                </div>
                                <TrendingUp size={24} color="#10b981" />
                            </div>
                            
                            <div className="allocation-item">
                                <div>
                                    <div style={{ fontWeight: '600', color: '#f59e0b' }}>Savings Wallet</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                                        ₹{parseFloat(walletBalances?.savings_wallet).toFixed(2) || '0.00'}
                                    </div>
                                </div>
                                <PiggyBank size={24} color="#f59e0b" />
                            </div>
                            
                            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1rem', textAlign: 'center' }}>
                                <div style={{ fontWeight: '600', color: '#1e293b' }}>Total Spare Change Generated</div>
                                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#2563eb' }}>
                                    ₹{parseFloat(walletBalances?.total_spare_change).toFixed(2) || '0.00'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Allocation Modal */}
            {showAllocationModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Manage Spare Change Allocation</h3>
                            <button onClick={() => setShowAllocationModal(false)} className="close-btn">
                                ✕
                            </button>
                        </div>
                        
                        <div className="allocation-controls">
                            <div className="allocation-item">
                                <div>
                                    <div style={{ fontWeight: '600', color: '#ef4444' }}>Donations</div>
                                    <div>{allocation.donation}%</div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={allocation.donation}
                                    onChange={(e) => {
                                        const newValue = parseInt(e.target.value);
                                        const remaining = 100 - newValue;
                                        const investmentRatio = allocation.investment / (allocation.investment + allocation.savings) || 0.5;
                                        setAllocation({
                                            donation: newValue,
                                            investment: Math.round(remaining * investmentRatio),
                                            savings: Math.round(remaining * (1 - investmentRatio))
                                        });
                                    }}
                                />
                            </div>
                            
                            <div className="allocation-item">
                                <div>
                                    <div style={{ fontWeight: '600', color: '#10b981' }}>Investments</div>
                                    <div>{allocation.investment}%</div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={allocation.investment}
                                    onChange={(e) => {
                                        const newValue = parseInt(e.target.value);
                                        const remaining = 100 - newValue;
                                        const donationRatio = allocation.donation / (allocation.donation + allocation.savings) || 0.5;
                                        setAllocation({
                                            investment: newValue,
                                            donation: Math.round(remaining * donationRatio),
                                            savings: Math.round(remaining * (1 - donationRatio))
                                        });
                                    }}
                                />
                            </div>
                            
                            <div className="allocation-item">
                                <div>
                                    <div style={{ fontWeight: '600', color: '#f59e0b' }}>Savings</div>
                                    <div>{allocation.savings}%</div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={allocation.savings}
                                    onChange={(e) => {
                                        const newValue = parseInt(e.target.value);
                                        const remaining = 100 - newValue;
                                        const donationRatio = allocation.donation / (allocation.donation + allocation.investment) || 0.5;
                                        setAllocation({
                                            savings: newValue,
                                            donation: Math.round(remaining * donationRatio),
                                            investment: Math.round(remaining * (1 - donationRatio))
                                        });
                                    }}
                                />
                            </div>
                            
                            <div style={{  
                                textAlign: 'center', 
                                padding: '1rem', 
                                background: allocation.donation + allocation.investment + allocation.savings === 100 ? '#dcfce7' : '#fef2f2',
                                borderRadius: '8px',
                                color: allocation.donation + allocation.investment + allocation.savings === 100 ? '#166534' : '#dc2626'
                            }}>
                                Total: {allocation.donation + allocation.investment + allocation.savings}%
                                {allocation.donation + allocation.investment + allocation.savings !== 100 && (
                                    <div>Must equal 100%</div>
                                )}
                            </div>
                        </div>
                        
                        <button onClick={updateAllocation} className="submit-btn" style={{ marginTop: '1rem' }}>
                            Update Allocation
                        </button>
                    </div>
                </div>
            )}

            {/* Rest of the homepage sections remain the same */}
            {/* Three Pillars Section */}
            <section id="pillars" className="three-pillars">
                <div className="container">
                    <h2 className="section-title">Three Ways to Make Impact</h2>
                    <p className="section-subtitle">
                        Your spare change, your choice. Donate to causes you care about, 
                        invest for your future, or save for your goals.
                    </p>
                    
                    <div className="pillars-grid">
                        <div className="pillar-card donate">
                            <div className="pillar-icon">
                                <Heart size={32} />
                            </div>
                            <h3>Donate to Charity</h3>
                            <p>
                                Support verified NGOs and causes you care about. From education to 
                                environment, make a difference with your spare change.
                            </p>
                            <ul className="pillar-features">
                                <li>Verified NGO profiles with impact tracking</li>
                                <li>AI-powered charity recommendations</li>
                                <li>Real-time impact reports</li>
                            </ul>
                            <div style={{ marginTop: '1.5rem' }}>
                                <Link 
                                    to="/donation" 
                                    className="btn-primary" 
                                    style={{ 
                                        background: '#ef4444', 
                                        color: 'white', 
                                        padding: '0.75rem 1.5rem', 
                                        borderRadius: '8px', 
                                        textDecoration: 'none', 
                                        display: 'inline-block',
                                        fontWeight: '600'
                                    }}
                                >
                                    <span>Explore Donations</span>
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>

                        <div className="pillar-card invest">
                            <div className="pillar-icon">
                                <TrendingUp size={32} />
                            </div>
                            <h3>Micro-Investment</h3>
                            <p>
                                Invest your spare change in diversified portfolios, mutual funds, 
                                and ETFs. Build wealth gradually with minimal risk.
                            </p>
                            <ul className="pillar-features">
                                <li>Low-risk mutual funds and ETFs</li>
                                <li>Robo-advisor portfolio suggestions</li>
                                <li>Risk assessment and management</li>
                                <li>Real-time returns tracking</li>
                            </ul>
                            <div style={{ marginTop: '1.5rem' }}>
                                <Link 
                                    to="/invest" 
                                    className="btn-primary" 
                                    style={{ 
                                        background: '#10b981', 
                                        color: 'white', 
                                        padding: '0.75rem 1.5rem', 
                                        borderRadius: '8px', 
                                        textDecoration: 'none', 
                                        display: 'inline-block',
                                        fontWeight: '600'
                                    }}
                                >
                                    Try Investment Dashboard →
                                </Link>
                            </div>
                        </div>

                        <div className="pillar-card save">
                            <div className="pillar-icon">
                                <PiggyBank size={32} />
                            </div>
                            <h3>Smart Savings</h3>
                            <p>
                                Build your emergency fund or save for specific goals. 
                                Set targets and watch your spare change add up.
                            </p>
                            <ul className="pillar-features">
                                <li>Goal-based saving plans</li>
                                <li>Instant withdrawal anytime</li>
                                <li>Saving streak gamification</li>
                                <li>Automated milestone rewards</li>
                            </ul>
                            <div style={{ marginTop: '1.5rem' }}>
                                <Link 
                                    to="/saving" 
                                    className="btn-primary" 
                                    style={{ 
                                        background: '#f59e0b', 
                                        color: 'white', 
                                        padding: '0.75rem 1.5rem', 
                                        borderRadius: '8px', 
                                        textDecoration: 'none', 
                                        display: 'inline-block',
                                        fontWeight: '600'
                                    }}
                                >
                                    Try Savings Dashboard →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="how-it-works">
                <div className="container">
                    <h2 className="section-title">How SpareChange Works</h2>
                    <p className="section-subtitle">
                        Simple, automatic, and secure. Start building impact with every transaction.
                    </p>
                    
                    <div className="process-flow">
                        <div className="process-step">
                            <div className="step-number">1</div>
                            <h3>Make a Payment</h3>
                            <p>Pay anyone using UPI or phone number through our secure payment gateway.</p>
                            <div className="transaction-example">
                                Send: ₹1,847<br/>
                                Via: UPI / Phone Number
                            </div>
                        </div>

                        <div className="process-step">
                            <div className="step-number">2</div>
                            <h3>Automatic Roundup</h3>
                            <p>We automatically round up your payment to the nearest ₹100 and calculate spare change.</p>
                            <div className="transaction-example">
                                Payment: ₹1,847<br/>
                                Rounded: ₹1,900<br/>
                                Spare: ₹53
                            </div>
                        </div>

                        <div className="process-step">
                            <div className="step-number">3</div>
                            <h3>Smart Allocation</h3>
                            <p>Spare change is automatically split based on your preferences across three impact categories.</p>
                            <div className="transaction-example">
                                Spare Change: ₹53<br/>
                                40% Donate | 40% Invest | 20% Save
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features">
                <div className="container">
                    <h2 className="section-title">Smart Features for Maximum Impact</h2>
                    <p className="section-subtitle">
                        Powered by machine learning and designed for simplicity
                    </p>
                    
                    <div className="features-grid">
                        <div className="feature-card">
                            <h3>
                                <BarChart3 size={20} />
                                AI-Powered Recommendations
                            </h3>
                            <p>
                                Our ML algorithms suggest charities and investment portfolios based on 
                                your transaction patterns, interests, and financial goals.
                            </p>
                        </div>

                        <div className="feature-card">
                            <h3>
                                <Shield size={20} />
                                Bank-Level Security
                            </h3>
                            <p>
                                Your financial data is protected with the same security standards used by 
                                major banks. We never store your banking credentials.
                            </p>
                        </div>

                        <div className="feature-card">
                            <h3>
                                <Target size={20} />
                                Goal-Based Planning
                            </h3>
                            <p>
                                Set specific savings targets, donation goals, or investment milestones. 
                                Track your progress and celebrate achievements.
                            </p>
                        </div>

                        <div className="feature-card">
                            <h3>
                                <Zap size={20} />
                                Real-Time Tracking
                            </h3>
                            <p>
                                Monitor your spare change contributions, investment returns, and donation 
                                impact with live updates and detailed analytics.
                            </p>
                        </div>

                        <div className="feature-card">
                            <h3>
                                <Users size={20} />
                                Verified NGO Network
                            </h3>
                            <p>
                                All charity partners are thoroughly vetted. See real impact reports and 
                                track how your donations are making a difference.
                            </p>
                        </div>

                        <div className="feature-card">
                            <h3>
                                <Globe size={20} />
                                Tax Benefits
                            </h3>
                            <p>
                                Automatic tax deduction certificates for donations under 80G. 
                                Maximize your impact while minimizing your tax burden.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Use Cases Section */}
            <section id="use-cases" className="use-cases">
                <div className="container">
                    <h2 className="section-title">Real User Stories</h2>
                    <p className="section-subtitle">
                        See how SpareChange users are making impact and building wealth
                    </p>
                    
                    <div className="use-cases-grid">
                        <div className="use-case-card">
                            <h4>The Conscious Consumer - Priya, Mumbai</h4>
                            <div className="use-case-scenario">
                                <strong>Goal:</strong> Support education NGOs<br/>
                                <strong>Strategy:</strong> 60% Donate, 30% Save, 10% Invest<br/>
                                <strong>Result:</strong> Donated ₹12,000 to rural education in 8 months
                            </div>
                            <p>
                                "I wanted to give back but never had a systematic way. SpareChange made 
                                it effortless - I'm supporting 3 education NGOs just from my daily expenses."
                            </p>
                        </div>

                        <div className="use-case-card">
                            <h4>The Future Investor - Rahul, Bangalore</h4>
                            <div className="use-case-scenario">
                                <strong>Goal:</strong> Build investment portfolio<br/>
                                <strong>Strategy:</strong> 70% Invest, 20% Save, 10% Donate<br/>
                                <strong>Result:</strong> ₹25,000 portfolio with 12% returns in 1 year
                            </div>
                            <p>
                                "As a software engineer, I wanted to start investing but kept procrastinating. 
                                SpareChange got me started with zero effort - now I have a growing portfolio!"
                            </p>
                        </div>

                        <div className="use-case-card">
                            <h4>The Balanced Saver - Anita, Delhi</h4>
                            <div className="use-case-scenario">
                                <strong>Goal:</strong> Emergency fund + social impact<br/>
                                <strong>Strategy:</strong> 40% Save, 35% Donate, 25% Invest<br/>
                                <strong>Result:</strong> ₹18,000 emergency fund + ₹8,000 donated
                            </div>
                            <p>
                                "I love that I can balance my personal financial goals with helping others. 
                                The app makes it so easy to manage both priorities simultaneously."
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-content">
                        <h2>Start Your SpareChange Journey Today</h2>
                        <p>
                            Join thousands of users who are already making impact with their spare change. 
                            Set up takes less than 5 minutes.
                        </p>
                        
                        <div className="cta-features">
                            <div className="cta-feature">
                                <Shield size={16} />
                                <span>100% Secure</span>
                            </div>
                            <div className="cta-feature">
                                <Zap size={16} />
                                <span>Instant Setup</span>
                            </div>
                            <div className="cta-feature">
                                <Users size={16} />
                                <span>No Hidden Fees</span>
                            </div>
                        </div>

                        <a href="/signup" className="btn-primary">Create Free Account</a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-section">
                            <h4>SpareChange</h4>
                            <p>Transforming spare change into meaningful impact through donations, investments, and smart savings.</p>
                            <div style={{ marginTop: '1rem' }}>
                                <a href="/" className="logo" style={{ color: '#60a5fa', fontSize: '1.2rem' }}>
                                    <DollarSign size={20} />
                                    SpareChange
                                </a>
                            </div>
                        </div>
                        
                        <div className="footer-section">
                            <h4>Product</h4>
                            <ul>
                                <li><a href="/features">Features</a></li>
                                <li><a href="/security">Security</a></li>
                                <li><a href="/integrations">Payment Integrations</a></li>
                                <li><a href="/api">API Documentation</a></li>
                                <li><a href="/pricing">Pricing</a></li>
                            </ul>
                        </div>
                        
                        <div className="footer-section">
                            <h4>Impact</h4>
                            <ul>
                                <li><a href="/charities">Partner NGOs</a></li>
                                <li><a href="/investments">Investment Options</a></li>
                                <li><a href="/impact-reports">Impact Reports</a></li>
                                <li><a href="/success-stories">Success Stories</a></li>
                                <li><a href="/transparency">Transparency</a></li>
                            </ul>
                        </div>
                        
                        <div className="footer-section">
                            <h4>Support</h4>
                            <ul>
                                <li><a href="/help">Help Center</a></li>
                                <li><a href="/contact">Contact Us</a></li>
                                <li><a href="/privacy">Privacy Policy</a></li>
                                <li><a href="/terms">Terms of Service</a></li>
                                <li><a href="/regulatory">Regulatory Info</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="footer-bottom">
                        <p>&copy; 2025 SpareChange. All rights reserved. | SEBI Registered Investment Advisor | ISO 27001 Certified</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default SpareChangeHomepage;