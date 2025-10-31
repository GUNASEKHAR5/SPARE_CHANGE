import React, { useState } from 'react';
import { DollarSign, Eye, EyeOff, Mail, Lock, User, ArrowLeft, CreditCard } from 'lucide-react';
import { Link, useNavigate } from "react-router-dom";

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    upiId: '',
    initialBalance: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.upiId) {
        newErrors.upiId = 'UPI ID is required';
    } else if (!/\S+@\S+/.test(formData.upiId)) {
      newErrors.upiId = 'Please enter a valid UPI ID (e.g., yourname@bank)';
    }

    if (!formData.initialBalance || isNaN(parseFloat(formData.initialBalance)) || parseFloat(formData.initialBalance) < 0) {
        newErrors.initialBalance = 'Please enter a valid initial balance';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          upiId: formData.upiId,
          initialBalance: parseFloat(formData.initialBalance) // Send initial balance
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Signup failed. Try again.');
        setIsLoading(false);
        return;
      }

      const loginRes = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const loginData = await loginRes.json();

      if (loginRes.ok) {
        localStorage.setItem('token', loginData.token);
        localStorage.setItem('user', JSON.stringify(loginData.user));
        alert('Signup successful!');
        navigate('/login');
      } else {
        alert(loginData.message || 'Login after signup failed.');
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Signup/Login error:", error);
      alert("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.6;
          color: #333;
        }

        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .login-container {
          background: white;
          padding: 3rem;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 450px;
          position: relative;
        }

        .back-button {
          position: absolute;
          top: 1.5rem;
          left: 1.5rem;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .back-button:hover {
          color: #2563eb;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.8rem;
          font-weight: 700;
          color: #2563eb;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .login-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .login-subtitle {
          color: #64748b;
          font-size: 1rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }

        .input-container {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 1rem;
          padding-left: 3rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          background: #f8fafc;
        }

        .form-input:focus {
          outline: none;
          border-color: #2563eb;
          background: white;
        }

        .form-input.error {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
        }

        .password-toggle:hover {
          color: #2563eb;
        }

        .error-message {
          color: #ef4444;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .forgot-password {
          text-align: right;
          margin-top: -0.5rem;
        }

        .forgot-password a {
          color: #2563eb;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .forgot-password a:hover {
          text-decoration: underline;
        }

        .login-button {
          background: #2563eb;
          color: white;
          padding: 1rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1.1rem;
          cursor: pointer;
          margin-top: 1rem;
        }

        .login-button:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .login-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 2rem 0;
          color: #9ca3af;
          font-size: 0.9rem;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .divider span {
          padding: 0 1rem;
        }

        .social-login {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .social-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #374151;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
        }

        .social-button:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .signup-link {
          text-align: center;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
        }

        .signup-link a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }

        .signup-link a:hover {
          text-decoration: underline;
        }

        .security-note {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1.5rem;
          font-size: 0.9rem;
          color: #0369a1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Loading spinner */
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #ffffff40;
          border-top: 2px solid #ffffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 0.5rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .login-page {
            padding: 1rem;
          }

          .login-container {
            padding: 2rem 1.5rem;
          }

          .login-title {
            font-size: 1.5rem;
          }

          .back-button {
            top: 1rem;
            left: 1rem;
          }
        }
      `}</style>

      <div className="login-container">
        <button className="back-button" onClick={() => navigate("/")}>
          <ArrowLeft size={16} />
          Back to Home
        </button>
        <div className="login-header">
          <div className="logo">
            <DollarSign size={28}/>SpareChange
          </div>
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">
            Join us to start managing your spare change impact
          </p>
        </div>
        <div className="login-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-container">
              <User className="input-icon" size={18} />
              <input
                type="text"
                name="name"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            {errors.name && <div className="error-message">{errors.name}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-container">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                name="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            {errors.email && <div className="error-message">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-container">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <div className="error-message">{errors.password}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-container">
              <Lock className="input-icon" size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">UPI ID</label>
            <div className="input-container">
              <CreditCard className="input-icon" size={18} />
              <input
                type="text"
                name="upiId"
                className={`form-input ${errors.upiId ? 'error' : ''}`}
                placeholder="Enter your UPI ID (e.g., yourname@bank)"
                value={formData.upiId}
                onChange={handleInputChange}
              />
            </div>
            {errors.upiId && <div className="error-message">{errors.upiId}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Initial Balance (in INR)</label>
            <div className="input-container">
              <DollarSign className="input-icon" size={18} />
              <input
                type="number"
                name="initialBalance"
                className={`form-input ${errors.initialBalance ? 'error' : ''}`}
                placeholder="Enter your starting balance"
                value={formData.initialBalance}
                onChange={handleInputChange}
              />
            </div>
            {errors.initialBalance && <div className="error-message">{errors.initialBalance}</div>}
          </div>
          <button
            type="button"
            className="login-button"
            disabled={isLoading}
            onClick={handleSubmit}
          >
            {isLoading && <div className="spinner"></div>}
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>
        <div className="divider">
          <span>or sign up with</span>
        </div>
        <div className="social-login">
          <a href="/auth/google" className="social-button">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>
          <a href="/auth/facebook" className="social-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </a>
        </div>
        <div className="signup-link">
            Already have an account? <Link to="/Login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;