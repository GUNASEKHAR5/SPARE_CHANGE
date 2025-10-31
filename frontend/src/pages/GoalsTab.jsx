import { Plus, Save, Trash2, Trophy, CheckCircle } from 'lucide-react';

const GoalsTab = ({
  newGoal,
  setNewGoal,
  handleCreateGoal,
  showNewGoalForm,
  setShowNewGoalForm,
  savingsGoals,
  achievedGoals,
  handleDeleteGoal,
  handleAddMoney,
  getProgressPercentage,
  getCategoryIcon,
  getPriorityColor,
  formatCurrency,
  formatDate,
  walletBalances
}) => {
  
  const handleQuickAddMoney = (goalId, amount) => {
    const currentSavingsWallet = walletBalances?.savings_wallet || 0;
    
    if (amount > currentSavingsWallet) {
      alert(`Insufficient funds in savings wallet. Available: ₹${currentSavingsWallet.toLocaleString()}`);
      return;
    }
    
    handleAddMoney(goalId, amount);
  };

  return (
    <div className="space-y-6">
      <div className="goals-tab-header">
        <h2>Savings Goals</h2>
        <button
          onClick={() => setShowNewGoalForm(true)}
          className="new-goal-button"
        >
          <Plus size={16} />
          New Goal
        </button>
      </div>

      {showNewGoalForm && (
        <div className="new-goal-form">
          <h3>Create New Savings Goal</h3>
          <div className="form-grid">
            <div>
              <label className="form-label">Goal Title</label>
              <input
                type="text"
                value={newGoal.title || ""}
                onChange={(e) =>
                  setNewGoal((prev) => ({ ...prev, title: e.target.value }))
                }
                className="form-input"
                placeholder="e.g., Emergency Fund"
              />
            </div>
            <div>
              <label className="form-label">Target Amount</label>
              <input
                type="number"
                value={newGoal.targetAmount || ""}
                onChange={(e) =>
                  setNewGoal((prev) => ({
                    ...prev,
                    targetAmount: e.target.value,
                  }))
                }
                className="form-input"
                placeholder="50000"
              />
            </div>
            <div className="full-width">
              <label className="form-label">Description</label>
              <textarea
                value={newGoal.description || ""}
                onChange={(e) =>
                  setNewGoal((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="form-textarea"
                rows="2"
                placeholder="Brief description of your goal"
              />
            </div>
            <div>
              <label className="form-label">Target Date</label>
              <input
                type="date"
                value={newGoal.targetDate || ""}
                onChange={(e) =>
                  setNewGoal((prev) => ({
                    ...prev,
                    targetDate: e.target.value,
                  }))
                }
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select
                value={newGoal.category || "Personal"}
                onChange={(e) =>
                  setNewGoal((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="form-select"
              >
                <option value="Personal">Personal</option>
                <option value="Emergency">Emergency</option>
                <option value="Technology">Technology</option>
                <option value="Travel">Travel</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Education">Education</option>
                <option value="Health">Health</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select
                value={newGoal.priority || "Medium"}
                onChange={(e) =>
                  setNewGoal((prev) => ({
                    ...prev,
                    priority: e.target.value,
                  }))
                }
                className="form-select"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button onClick={handleCreateGoal} className="create-button">
              <Save size={16} />
              Create Goal
            </button>
            <button
              onClick={() => setShowNewGoalForm(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Savings Wallet Info */}
      <div className="wallet-info-card">
        <div className="wallet-info-header">
          <h3>💰 Available in Savings Wallet</h3>
          <p className="wallet-balance-large">{formatCurrency(walletBalances?.savings_wallet || 0)}</p>
        </div>
        <p className="wallet-info-text">
          This is the maximum amount you can add to your goals. Money is automatically added to your savings wallet from spare change.
        </p>
      </div>

      {/* Goals List */}
      <div className="goals-section">
        <div className="section-header">
          <h3>In Progress</h3>
        </div>
        <div className="goals-list">
          {savingsGoals.length === 0 ? (
            <div className="empty-goals-state">
              <p>No active goals yet. Create your first savings goal to get started!</p>
            </div>
          ) : (
            savingsGoals
              .filter((goal) => goal.status === "In Progress")
              .map((goal) => {
                const progress = getProgressPercentage(
                  goal.current_amount,
                  goal.target_amount
                );
                return (
                  <div key={goal.id} className="detailed-goal-item">
                    <div className="detailed-goal-header">
                      <div className="goal-info">
                        <span className="category-icon large">
                          {getCategoryIcon(goal.category)}
                        </span>
                        <div className="goal-details">
                          <div className="goal-title-row">
                            <h4 className="goal-title">{goal.title}</h4>
                            <span
                              className={`priority-tag ${getPriorityColor(
                                goal.priority
                              )}`}
                            >
                              {goal.priority}
                            </span>
                          </div>
                          <p className="goal-description">{goal.description}</p>
                        </div>
                      </div>
                      <div className="goal-actions">
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="delete-button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="goal-amounts">
                      <div>
                        <p className="amount-label">Current Progress</p>
                        <p className="amount-value">
                          {formatCurrency(goal.current_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="amount-label">Target Amount</p>
                        <p className="amount-value">
                          {formatCurrency(goal.target_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="detailed-progress-bar">
                      <div
                        className="detailed-progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="goal-footer">
                      <span className="progress-text">
                        {progress.toFixed(1)}% completed
                      </span>
                      <span className="target-date">
                        Target: {formatDate(goal.target_date)}
                      </span>
                    </div>
                    
                    {/* Add Money Section */}
                    <div className="goal-actions-section">
                      <button 
                        onClick={() => handleAddMoney(goal.id)}
                        className="add-money-button"
                        disabled={(walletBalances?.savings_wallet || 0) <= 0}
                      >
                        <Plus size={14} />
                        Add Money
                      </button>
                      
                      {/* Quick add buttons for common amounts */}
                      <div className="quick-add-buttons">
                        {[1000, 5000, 10000].map(amount => (
                          <button
                            key={amount}
                            onClick={() => handleQuickAddMoney(goal.id, amount)}
                            className="quick-add-button"
                            disabled={(walletBalances?.savings_wallet || 0) < amount}
                          >
                            +{formatCurrency(amount)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Completed Goals */}
      <div className="achieved-goals-section">
        <div className="section-header">
          <div className="header-with-icon">
            <Trophy size={20} className="text-yellow-600" />
            <h3>Completed Goals</h3>
          </div>
        </div>
        <div className="achieved-goals-grid">
          {achievedGoals.length === 0 ? (
            <div className="empty-achieved-state">
              <p>No completed goals yet. Keep saving to achieve your first goal!</p>
            </div>
          ) : (
            achievedGoals.map((goal) => (
              <div key={goal.id} className="achieved-goal-card">
                <div className="achieved-goal-header">
                  <span className="category-icon">
                    {getCategoryIcon(goal.category)}
                  </span>
                  <div>
                    <h4 className="goal-title">{goal.title}</h4>
                    <p className="completed-status">
                      <CheckCircle size={14} />
                      Completed
                    </p>
                  </div>
                </div>
                <div className="achieved-goal-amount">
                  <p className="achieved-amount">
                    {formatCurrency(goal.achieved_amount)}
                  </p>
                  <p className="completion-date">
                    Completed on {formatDate(goal.completed_date)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        /* Custom styles for GoalsTab */
        .space-y-6 > * + * {
          margin-top: 1.5rem;
        }

        .goals-tab-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .goals-tab-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .new-goal-button {
          background-color: #2563eb;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          transition: background-color 0.2s ease-in-out;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }

        .new-goal-button:hover {
          background-color: #1d4ed8;
        }

        /* Wallet Info Card */
        .wallet-info-card {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px solid #0ea5e9;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
        }

        .wallet-info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .wallet-info-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #0c4a6e;
          margin: 0;
        }

        .wallet-balance-large {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0c4a6e;
          margin: 0;
        }

        .wallet-info-text {
          color: #0c4a6e;
          font-size: 0.875rem;
          margin: 0;
          opacity: 0.8;
        }

        /* New goal form */
        .new-goal-form {
          background-color: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
        }

        .new-goal-form h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          box-sizing: border-box;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
        }

        .create-button {
          background-color: #059669;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          transition: background-color 0.2s ease-in-out;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }

        .create-button:hover {
          background-color: #047857;
        }

        .cancel-button {
          background-color: #6b7280;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          transition: background-color 0.2s ease-in-out;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }

        .cancel-button:hover {
          background-color: #4b5563;
        }

        /* Goals section */
        .goals-section {
          background-color: white;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
          margin-bottom: 1.5rem;
        }

        .section-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .section-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .header-with-icon {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .goals-list {
          padding: 1.5rem;
        }

        .empty-goals-state {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .detailed-goal-item {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .detailed-goal-item:last-child {
          margin-bottom: 0;
        }

        .detailed-goal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .goal-info {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          flex: 1;
        }

        .goal-details {
          flex: 1;
        }

        .category-icon {
          font-size: 1.5rem;
        }

        .category-icon.large {
          font-size: 1.875rem;
        }

        .goal-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .goal-title {
          font-weight: 500;
          color: #1f2937;
          margin: 0;
        }

        .goal-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        .priority-tag {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .goal-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .delete-button {
          color: #9ca3af;
          transition: color 0.2s ease-in-out;
          background: none;
          border: none;
          cursor: pointer;
        }

        .delete-button:hover {
          color: #dc2626;
        }

        .goal-amounts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .amount-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin: 0 0 0.25rem 0;
        }

        .amount-value {
          font-weight: 600;
          font-size: 1.125rem;
          margin: 0;
        }

        .detailed-progress-bar {
          width: 100%;
          background-color: #e5e7eb;
          border-radius: 9999px;
          height: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .detailed-progress-fill {
          background: linear-gradient(to right, #10b981 0%, #059669 100%);
          height: 0.75rem;
          border-radius: 9999px;
          transition: all 0.5s ease-in-out;
        }

        .goal-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .progress-text {
          color: #059669;
          font-weight: 500;
        }

        .target-date {
          color: #6b7280;
        }

        /* Goal actions section */
        .goal-actions-section {
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .add-money-button {
          background-color: #059669;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out;
          align-self: flex-start;
        }

        .add-money-button:hover:not(:disabled) {
          background-color: #047857;
        }

        .add-money-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .quick-add-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .quick-add-button {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .quick-add-button:hover:not(:disabled) {
          background-color: #e5e7eb;
          border-color: #9ca3af;
        }

        .quick-add-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background-color: #f9fafb;
        }

        /* Achieved goals */
        .achieved-goals-section {
          background-color: white;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        }

        .achieved-goals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          padding: 1.5rem;
        }

        .empty-achieved-state {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
          grid-column: 1 / -1;
        }

        .achieved-goal-card {
          padding: 1rem;
          background-color: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 0.5rem;
        }

        .achieved-goal-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .completed-status {
          font-size: 0.875rem;
          color: #059669;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin: 0;
        }

        .achieved-goal-amount {
          text-align: center;
        }

        .achieved-amount {
          font-size: 1.125rem;
          font-weight: 700;
          color: #059669;
          margin: 0 0 0.25rem 0;
        }

        .completion-date {
          font-size: 0.75rem;
          color: #6b7280;
          margin: 0;
        }

        /* Utility classes */
        .text-yellow-600 {
          color: #d97706;
        }

        .text-red-600 {
          color: #dc2626;
        }

        .text-green-600 {
          color: #059669;
        }

        .bg-red-100 {
          background-color: #fee2e2;
        }

        .bg-yellow-100 {
          background-color: #fef3c7;
        }

        .bg-green-100 {
          background-color: #dcfce7;
        }

        .bg-gray-100 {
          background-color: #f3f4f6;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .goals-tab-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .detailed-goal-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .goal-actions {
            margin-top: 0.5rem;
            align-self: flex-end;
          }

          .wallet-info-header {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }

          .wallet-balance-large {
            margin-top: 0.5rem;
          }

          .quick-add-buttons {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default GoalsTab;


