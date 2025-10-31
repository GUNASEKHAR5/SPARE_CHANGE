import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import uuid
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import random

app = Flask(__name__)
CORS(app) 

INVESTMENT_DATA_PATH = 'investment_data.json'

charities_data = pd.DataFrame([
    {
        "id": "charity1", "name": "Child Welfare Foundation", "type": "trust", "category": "Child-Care",
        "description": "Provides education and healthcare to underprivileged children.",
        "trust_score": 95, "transparency_score": 90, "efficiency_score": 88,
        "impact": "Helps 1,000+ children annually", "location": "Mumbai", "ai_compatibility": 90
    },
    {
        "id": "charity2", "name": "Age-Old Blessings", "type": "old-age", "category": "Elderly-Care",
        "description": "Supports and cares for abandoned senior citizens.",
        "trust_score": 92, "transparency_score": 85, "efficiency_score": 91,
        "impact": "Provides shelter to 200+ seniors", "location": "Chennai", "ai_compatibility": 85
    },
    {
        "id": "charity3", "name": "Green Earth Trust", "type": "trust", "category": "Environment",
        "description": "Working on reforestation and wildlife preservation.",
        "trust_score": 88, "transparency_score": 95, "efficiency_score": 80,
        "impact": "Planted 50,000 trees this year", "location": "Bengaluru", "ai_compatibility": 95
    },
    {
        "id": "charity4", "name": "Educate for India", "type": "trust", "category": "Education",
        "description": "Building schools and providing scholarships in rural areas.",
        "trust_score": 91, "transparency_score": 87, "efficiency_score": 93,
        "impact": "Empowers 500+ students per year", "location": "Delhi", "ai_compatibility": 92
    },
    {
        "id": "charity5", "name": "Hope for All Animals", "type": "trust", "category": "Animal Welfare",
        "description": "Rescues and rehabilitates stray and injured animals.",
        "trust_score": 85, "transparency_score": 88, "efficiency_score": 75,
        "impact": "Saved 300+ animals last month", "location": "Pune", "ai_compatibility": 80
    }
])

donations_data = pd.DataFrame([
    {"user_id": "user1", "charity_id": "charity1"},
    {"user_id": "user1", "charity_id": "charity4"},
    {"user_id": "user2", "charity_id": "charity2"},
    {"user_id": "user2", "charity_id": "charity3"},
    {"user_id": "user3", "charity_id": "charity1"},
    {"user_id": "user3", "charity_id": "charity3"}
])

users_data = pd.DataFrame([
    {"id": "user1", "name": "Alex", "preferred_causes": ["Child-Care", "Education"], "risk_profile": "low"},
    {"id": "user2", "name": "Priya", "preferred_causes": ["Elderly-Care", "Environment"], "risk_profile": "medium"},
    {"id": "user3", "name": "Rahul", "preferred_causes": ["Child-Care", "Environment"], "risk_profile": "high"}
])

def load_investment_data():
    if os.path.exists(INVESTMENT_DATA_PATH):
        with open(INVESTMENT_DATA_PATH, 'r') as f:
            return json.load(f)
    else:
        data = [
            {"id": str(uuid.uuid4()), "name": "Tech Innovators Fund", "type": "mutual-fund", "category": "Technology", "risk": "High", "volatility": 15, "analystRating": 4.5, "projectedGrowth": "18-25%", "description": "Invests in high-growth technology companies.", "aiCompatibility": 92},
            {"id": str(uuid.uuid4()), "name": "Global Green Energy ETF", "type": "etf", "category": "Renewables", "risk": "Medium", "volatility": 12, "analystRating": 4.0, "projectedGrowth": "10-15%", "description": "Tracks leading companies in the renewable energy sector.", "aiCompatibility": 88},
            {"id": str(uuid.uuid4()), "name": "Blue Chip Stock Portfolio", "type": "stock", "category": "Diversified", "risk": "Low", "volatility": 8, "analystRating": 4.8, "projectedGrowth": "5-8%", "description": "A collection of stable, well-established companies.", "aiCompatibility": 95},
            {"id": str(uuid.uuid4()), "name": "Emerging Markets Bond Fund", "type": "mutual-fund", "category": "Bonds", "risk": "Medium", "volatility": 10, "analystRating": 3.5, "projectedGrowth": "7-10%", "description": "Fixed-income investments in developing economies.", "aiCompatibility": 75}
        ]
        with open(INVESTMENT_DATA_PATH, 'w') as f:
            json.dump(data, f, indent=4)
        return data

investment_data = load_investment_data()

charities_data['features'] = charities_data['category'] + " " + charities_data['description'] + " " + charities_data['impact']
tfidf_vectorizer = TfidfVectorizer(stop_words='english')
tfidf_matrix = tfidf_vectorizer.fit_transform(charities_data['features'])
cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

def get_content_score_donations(user_id):
    user_prefs = users_data.loc[users_data['id'] == user_id, 'preferred_causes'].iloc[0]
    scores = {}
    for _, charity in charities_data.iterrows():
        score = 0
        if any(cause in charity['category'] for cause in user_prefs):
            score = 100
        scores[charity['id']] = score
    return scores

def get_collaborative_score_donations(user_id):
    scores = {}
    user_donated_ids = set(donations_data.loc[donations_data['user_id'] == user_id, 'charity_id'])
    similar_users = []
    for other_user_id, other_donations in donations_data.groupby('user_id'):
        if other_user_id == user_id: continue
        other_donated_ids = set(other_donations['charity_id'])
        if not user_donated_ids.isdisjoint(other_donated_ids):
            similar_users.append(other_user_id)
    if similar_users:
        recs = donations_data.loc[donations_data['user_id'].isin(similar_users)]
        for _, rec in recs.iterrows():
            if rec['charity_id'] not in user_donated_ids:
                scores[rec['charity_id']] = scores.get(rec['charity_id'], 0) + 50
    return scores

def get_hybrid_donations_recommendations(user_id, num_recs=3):
    content_scores = get_content_score_donations(user_id)
    collaborative_scores = get_collaborative_score_donations(user_id)
    hybrid_scores = {}
    for charity_id in charities_data['id']:
        content_based_weight = 0.5
        collaborative_weight = 0.5
        hybrid_scores[charity_id] = (content_scores.get(charity_id, 0) * content_based_weight) + \
                                     (collaborative_scores.get(charity_id, 0) * collaborative_weight)
    user_donated_ids = set(donations_data.loc[donations_data['user_id'] == user_id, 'charity_id'])
    final_recs = []
    sorted_charities = sorted(hybrid_scores.items(), key=lambda item: item[1], reverse=True)
    for charity_id, score in sorted_charities:
        if charity_id not in user_donated_ids:
            charity = charities_data.loc[charities_data['id'] == charity_id].iloc[0]
            rec = {
                "id": charity_id, "name": charity["name"], "type": charity["type"], "category": charity["category"],
                "description": charity["description"], "trustScore": int(charity["trust_score"]),
                "transparencyScore": int(charity["transparency_score"]), "efficiencyScore": int(charity["efficiency_score"]),
                "impact": charity["impact"], "location": charity["location"],
                "matchScore": min(100, int(score + random.uniform(-5, 5))),
                "confidenceLevel": min(99, int(score + random.uniform(5, 10))),
                "primaryReason": f"High alignment with your preferences in {charity['category']}.",
                "secondaryReasons": ["High Trust & Transparency", "Similar users have donated here"],
                "algorithmUsed": "Hybrid Collaborative & Content-Based",
                "modelVersion": "v4.0"
            }
            final_recs.append(rec)
            if len(final_recs) >= num_recs: break
    return final_recs

# ==================== INVESTMENT RECOMMENDATION LOGIC (from ml_model_api.py) ====================
def generate_investment_recommendations(user_profile):
    recommendations = []
    df = pd.DataFrame(investment_data)
    user_preferred_categories = user_profile.get("preferred_causes", [])
    user_risk_profile = user_profile.get("risk_profile", "moderate").lower()
    df['match_score'] = 0.0
    if user_preferred_categories:
        for category in user_preferred_categories:
            df['match_score'] += df['category'].apply(lambda x: 20 if x and x.lower() == category.lower() else 0)
    if user_risk_profile == 'low':
        df['match_score'] += df['risk'].apply(lambda x: 30 if x == 'Low' else -10)
    elif user_risk_profile == 'high':
        df['match_score'] += df['risk'].apply(lambda x: 30 if x == 'High' else -10)
    else: # Moderate
        df['match_score'] += df['risk'].apply(lambda x: 15 if x in ['Medium', 'Low'] else -5)
    df['match_score'] += df['aiCompatibility'] * 0.5
    df['match_score'] = df['match_score'] + np.random.randint(-10, 10, size=len(df))
    df['match_score'] = np.clip(df['match_score'], 0, 100)
    top_recommendations = df.sort_values(by='match_score', ascending=False).head(3).to_dict('records')
    for rec in top_recommendations:
        rec_data = {
            "id": rec["id"], "name": rec["name"], "type": rec["type"], "category": rec["category"],
            "description": rec["description"], "risk": rec["risk"], "volatility": rec["volatility"],
            "analystRating": rec["analystRating"], "projectedGrowth": rec["projectedGrowth"],
            "matchScore": int(rec["match_score"]),
            "confidenceLevel": int(min(100, rec["match_score"] + np.random.randint(0, 5))),
            "primaryReason": f"Based on your preferences, this {rec['category'].lower()} investment is a strong match.",
            "secondaryReasons": [f"High Trust Score ({rec.get('trust_score', 'N/A')})", "Proven Track Record"]
        }
        recommendations.append(rec_data)
    return recommendations

# ==================== API ENDPOINTS (Combined) ====================

@app.route('/api/ml/donations/recommendations/<user_id>', methods=['GET'])
def get_donations_recommendations_endpoint(user_id):
    try:
        recommendations = get_hybrid_donations_recommendations(user_id)
        if not recommendations:
            return jsonify({"message": "No new recommendations at this time."}), 200
        return jsonify(recommendations)
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        return jsonify({"error": "Failed to generate recommendations."}), 500

@app.route('/api/ml/investments/recommendations', methods=['POST'])
def get_investment_recommendations_endpoint():
    try:
        data = request.get_json()
        user_profile = data.get('userProfile', {})
        # To get user preferences, we can look up from our mock user data
        user_id = user_profile.get('id')
        user_data = users_data.loc[users_data['id'] == user_id].iloc[0]
        full_user_profile = {
            "id": user_data['id'],
            "preferred_causes": user_data['preferred_causes'],
            "risk_profile": user_data['risk_profile']
        }
        recommendations = generate_investment_recommendations(full_user_profile)
        return jsonify(recommendations)
    except Exception as e:
        print(f"Error generating investment recommendations: {e}")
        return jsonify({"error": "Failed to generate investment recommendations"}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)