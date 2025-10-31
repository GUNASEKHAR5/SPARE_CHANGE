const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Load environment variables for database connection
require('dotenv').config();

// Main Pool using DB_USER / DB_HOST / DB_NAME / DB_PASS / DB_PORT
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    console.log('Starting database table creation and population...');
    await client.query('BEGIN');

    // Enable uuid extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // 1. Create users table first (no dependencies)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        preferred_causes VARCHAR(255)[],
        donation_wallet NUMERIC(12,2) DEFAULT 0.00,
        investment_wallet NUMERIC(12,2) DEFAULT 0.00,
        savings_wallet NUMERIC(12,2) DEFAULT 0.00,
        total_spare_change NUMERIC(12,2) DEFAULT 0.00,
        donation_percentage INTEGER DEFAULT 40,
        investment_percentage INTEGER DEFAULT 40,
        savings_percentage INTEGER DEFAULT 20
      );
    `);
    
    // 2. Create charities table (no dependencies)
    await client.query(`
      CREATE TABLE IF NOT EXISTS charities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255),
        category VARCHAR(255),
        location VARCHAR(255),
        verified BOOLEAN DEFAULT false,
        beneficiaries VARCHAR(255),
        projects INT DEFAULT 0,
        rating DECIMAL(3,1) DEFAULT 0.0,
        description TEXT,
        trust_score INT DEFAULT 0,
        transparency_score INT DEFAULT 0,
        ai_compatibility INT DEFAULT 0,
        impact TEXT,
        efficiency_score INT DEFAULT 0
      );
    `);

    // 3. Create payments table (depends on users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_upi VARCHAR(255),
        recipient_phone VARCHAR(20),
        recipient_name VARCHAR(255),
        original_amount NUMERIC(12,2) NOT NULL,
        rounded_amount NUMERIC(12,2) NOT NULL,
        spare_change NUMERIC(12,2) NOT NULL,
        donation_amount NUMERIC(12,2) NOT NULL,
        investment_amount NUMERIC(12,2) NOT NULL,
        savings_amount NUMERIC(12,2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create spare_change_transactions table (depends on users and payments)
    await client.query(`
      CREATE TABLE IF NOT EXISTS spare_change_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL,
        wallet_type VARCHAR(50) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create donations table (depends on users and charities)
    await client.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
        charity_name VARCHAR(255) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        donation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source VARCHAR(50) DEFAULT 'donation_wallet'
      );
    `);

    console.log('All tables created successfully.');

    // 6. Insert mock user (after users table exists)
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    await client.query(`
      INSERT INTO users (id, full_name, email, password_hash, preferred_causes, donation_wallet, investment_wallet, savings_wallet, total_spare_change) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        preferred_causes = EXCLUDED.preferred_causes,
        donation_wallet = EXCLUDED.donation_wallet,
        investment_wallet = EXCLUDED.investment_wallet,
        savings_wallet = EXCLUDED.savings_wallet,
        total_spare_change = EXCLUDED.total_spare_change
    `, [userId, 'Demo User', 'demo@example.com', 'hashed_password', ['education', 'healthcare', 'child-welfare'], 500.00, 600.00, 200.00, 1300.00]);

    console.log('Mock user inserted/updated successfully.');

    // 7. Insert mock charities (after charities table exists)
    const charities = [
      {
        id: '9a91726a-93f9-4b6d-a60d-5872a15c898c',
        name: 'Akshaya Patra Foundation',
        type: 'child-home',
        category: 'Child Nutrition',
        location: 'Bangalore, India',
        verified: true,
        beneficiaries: '2.5M+',
        projects: 450,
        rating: 4.9,
        description: 'Providing nutritious mid-day meals to school children across India.',
        trust_score: 96,
        transparency_score: 94,
        ai_compatibility: 98,
        impact: 'Feeds 1.8M children daily across 19 states',
        efficiency_score: 91
      },
      {
        id: 'b81c2f9d-7a6c-4b3e-8c7a-9c6a7a28f80c',
        name: 'Smile Foundation',
        type: 'trust',
        category: 'Education & Healthcare',
        location: 'New Delhi, India',
        verified: true,
        beneficiaries: '2.5M+',
        projects: 450,
        rating: 4.8,
        description: 'Working towards education, healthcare, and women empowerment.',
        trust_score: 93,
        transparency_score: 91,
        ai_compatibility: 94,
        impact: 'Educates 350K+ children annually',
        efficiency_score: 95
      },
      {
        id: '6b6d5113-d343-470a-9d93-3d02a0a24080',
        name: 'Teach for India',
        type: 'trust',
        category: 'Education Leadership',
        location: 'Mumbai, India',
        verified: true,
        beneficiaries: '800K+',
        projects: 155,
        rating: 4.6,
        description: 'Developing educational leaders to eliminate inequality in classrooms.',
        trust_score: 89,
        transparency_score: 96,
        ai_compatibility: 91,
        impact: 'Impacts 45K+ children through leadership development',
        efficiency_score: 88
      },
      {
        id: 'd0f3e691-236b-4e12-8d7d-5a8b7c3d2e1a',
        name: 'CRY - Child Rights and You',
        type: 'child-home',
        category: 'Child Rights',
        location: 'Chennai, India',
        verified: true,
        beneficiaries: '3M+',
        projects: 155,
        rating: 4.6,
        description: 'Ensuring happy, healthy, and creative childhoods for all children.',
        trust_score: 91,
        transparency_score: 87,
        ai_compatibility: 89,
        impact: 'Helps 3M+ children annually with rights protection',
        efficiency_score: 85
      },
      {
        id: 'e1c9d642-8a9d-4357-a9a2-5f6e8d9c1234',
        name: 'HelpAge India',
        type: 'old-age',
        category: 'Senior Care',
        location: 'New Delhi, India',
        verified: true,
        beneficiaries: '2M+',
        projects: 120,
        rating: 4.7,
        description: 'Caring for the needs of elderly citizens in India.',
        trust_score: 90,
        transparency_score: 92,
        ai_compatibility: 85,
        impact: 'Provides healthcare and support to 2M+ seniors',
        efficiency_score: 88
      }
    ];

    for (const charity of charities) {
      await client.query(`
        INSERT INTO charities (id, name, type, category, location, verified, beneficiaries, projects, rating, description, trust_score, transparency_score, ai_compatibility, impact, efficiency_score) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          category = EXCLUDED.category,
          location = EXCLUDED.location,
          verified = EXCLUDED.verified,
          beneficiaries = EXCLUDED.beneficiaries,
          projects = EXCLUDED.projects,
          rating = EXCLUDED.rating,
          description = EXCLUDED.description,
          trust_score = EXCLUDED.trust_score,
          transparency_score = EXCLUDED.transparency_score,
          ai_compatibility = EXCLUDED.ai_compatibility,
          impact = EXCLUDED.impact,
          efficiency_score = EXCLUDED.efficiency_score
      `, [
        charity.id, charity.name, charity.type, charity.category, charity.location, 
        charity.verified, charity.beneficiaries, charity.projects, charity.rating, 
        charity.description, charity.trust_score, charity.transparency_score, 
        charity.ai_compatibility, charity.impact, charity.efficiency_score
      ]);
    }

    console.log('Mock charities inserted/updated successfully.');

    // 8. Insert mock donations (after both users and charities exist)
    const mockDonations = [
      {
        id: uuidv4(),
        user_id: userId,
        charity_id: '9a91726a-93f9-4b6d-a60d-5872a15c898c',
        charity_name: 'Akshaya Patra Foundation',
        amount: 125.00
      },
      {
        id: uuidv4(),
        user_id: userId,
        charity_id: 'b81c2f9d-7a6c-4b3e-8c7a-9c6a7a28f80c',
        charity_name: 'Smile Foundation',
        amount: 75.00
      },
      {
        id: uuidv4(),
        user_id: userId,
        charity_id: 'e1c9d642-8a9d-4357-a9a2-5f6e8d9c1234',
        charity_name: 'HelpAge India',
        amount: 200.00
      }
    ];

    for (const donation of mockDonations) {
      await client.query(`
        INSERT INTO donations (id, user_id, charity_id, charity_name, amount) 
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (id) DO NOTHING
      `, [donation.id, donation.user_id, donation.charity_id, donation.charity_name, donation.amount]);
    }

    console.log('Mock donations inserted successfully.');

    await client.query('COMMIT');
    console.log('Database initialization completed successfully.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
};





module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  createTables
};





