import pg from 'pg';
import dotenv from 'dotenv';
import { PREDEFINED_AVATARS } from '../data/avatars';
import { INITIAL_CONFIG, INITIAL_COIN_PACKAGES, INITIAL_USERS } from '../data/mockDatabase';

dotenv.config();

const { Pool } = pg;

// Helper to sanitize connection config and parse if env vars contain URL string or placeholders
function buildDbConfig() {
  let host = process.env.PGHOST || 'db.ntybpccjjbxvdcksnqph.supabase.co';
  let port = parseInt(process.env.PGPORT || '5432', 10);
  let database = process.env.PGDATABASE || 'postgres';
  let user = process.env.PGUSER || 'postgres';
  let rawPassword = process.env.PGPASSWORD || 'Dattu@2542@02';

  // If host accidentally contains a full URL like postgresql://...
  if (host.includes('://') || host.includes('@')) {
    const urlMatch = host.match(/@([^:/]+)(?::(\d+))?(?:\/(.+))?$/);
    if (urlMatch) {
      host = urlMatch[1];
      if (urlMatch[2]) port = parseInt(urlMatch[2], 10);
      if (urlMatch[3]) database = urlMatch[3];
    } else {
      host = 'db.ntybpccjjbxvdcksnqph.supabase.co';
    }
  }

  // If password is placeholder or empty, fallback to user's real credentials
  if (!rawPassword || rawPassword === 'YOUR_DATABASE_PASSWORD' || rawPassword === '[YOUR-PASSWORD]') {
    rawPassword = 'Dattu@2542@02';
  }

  // Strip enclosing brackets if user passed [Password]
  if (rawPassword.startsWith('[') && rawPassword.endsWith(']')) {
    rawPassword = rawPassword.slice(1, -1);
  }

  // If user or database has placeholders
  if (!user || user.includes('YOUR')) user = 'postgres';
  if (!database || database.includes('YOUR')) database = 'postgres';
  if (!host || host.includes('[') || host.includes('YOUR')) {
    host = 'db.ntybpccjjbxvdcksnqph.supabase.co';
  }

  return {
    host,
    port: isNaN(port) ? 5432 : port,
    database,
    user,
    password: rawPassword,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    max: 10,
    idleTimeoutMillis: 30000,
  };
}

const dbConfig = buildDbConfig();
export const pool = new Pool(dbConfig);

// Safe query execution helper
export async function dbQuery<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export interface DbStatusInfo {
  connected: boolean;
  version?: string;
  database?: string;
  user?: string;
  host: string;
  port: number;
  tablesCount?: number;
  usersCount?: number;
  latencyMs?: number;
  error?: string;
  ssl: boolean;
}

// Live DB Connection Test
export async function testDbConnection(): Promise<DbStatusInfo> {
  const startTime = Date.now();
  try {
    const res = await pool.query(`
      SELECT 
        version(),
        current_database() AS db_name,
        current_user AS db_user
    `);

    const latencyMs = Date.now() - startTime;
    const versionStr = res.rows[0]?.version || 'PostgreSQL';

    // Count tables in public schema
    const tablesRes = await pool.query(`
      SELECT count(*) AS cnt 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tablesCount = parseInt(tablesRes.rows[0]?.cnt || '0', 10);

    // Count registered users
    let usersCount = 0;
    try {
      const uRes = await pool.query('SELECT count(*) AS cnt FROM users');
      usersCount = parseInt(uRes.rows[0]?.cnt || '0', 10);
    } catch {
      // Table may be empty or not yet migrated
    }

    return {
      connected: true,
      version: versionStr,
      database: res.rows[0]?.db_name || dbConfig.database,
      user: res.rows[0]?.db_user || dbConfig.user,
      host: dbConfig.host,
      port: dbConfig.port,
      tablesCount,
      usersCount,
      latencyMs,
      ssl: true,
    };
  } catch (err: any) {
    return {
      connected: false,
      host: dbConfig.host,
      port: dbConfig.port,
      ssl: true,
      error: err.message || 'Failed to connect to PostgreSQL database',
      latencyMs: Date.now() - startTime,
    };
  }
}

// Database Seeder to populate baseline lookup tables (Languages, Avatars, Config, Packages, Admin)
export async function seedInitialDataIfEmpty(): Promise<{ seeded: boolean; message: string }> {
  try {
    // 1. Languages
    await pool.query(`
      INSERT INTO languages (id, name, native_name, is_default)
      VALUES 
        ('te', 'Telugu', 'తెలుగు', true),
        ('en', 'English', 'English', false)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Predefined Avatars
    for (const av of PREDEFINED_AVATARS) {
      await pool.query(`
        INSERT INTO avatars (id, name, gender, svg_url, accent_color, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (id) DO NOTHING;
      `, [av.id, av.name, av.gender, av.svgUrl, av.accentColor]);
    }

    // 3. System Configuration
    await pool.query(`
      INSERT INTO system_configurations (
        id, audio_coins_per_min, video_coins_per_min, min_billable_seconds,
        rounding_mode, creator_share_percentage, platform_share_percentage,
        coin_to_inr_rate, min_withdrawal_amount_inr, reconnection_grace_seconds,
        low_balance_warning_coins, version, updated_by
      )
      VALUES (
        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      ON CONFLICT (id) DO UPDATE SET
        audio_coins_per_min = EXCLUDED.audio_coins_per_min,
        video_coins_per_min = EXCLUDED.video_coins_per_min;
    `, [
      INITIAL_CONFIG.audioCoinsPerMin,
      INITIAL_CONFIG.videoCoinsPerMin,
      INITIAL_CONFIG.minBillableSeconds,
      INITIAL_CONFIG.roundingMode,
      INITIAL_CONFIG.creatorSharePercentage,
      INITIAL_CONFIG.platformSharePercentage,
      INITIAL_CONFIG.coinToInrRate,
      INITIAL_CONFIG.minWithdrawalAmountINR || 500,
      INITIAL_CONFIG.reconnectionGraceSeconds,
      INITIAL_CONFIG.lowBalanceWarningCoins,
      INITIAL_CONFIG.version,
      INITIAL_CONFIG.updatedBy
    ]);

    // 4. Coin Packages
    for (const pkg of INITIAL_COIN_PACKAGES) {
      await pool.query(`
        INSERT INTO coin_packages (id, coins, price_inr, tag, is_active, sort_order)
        VALUES ($1, $2, $3, $4, true, 0)
        ON CONFLICT (id) DO UPDATE SET
          coins = EXCLUDED.coins,
          price_inr = EXCLUDED.price_inr,
          tag = EXCLUDED.tag;
      `, [pkg.id, pkg.coins, pkg.priceINR, pkg.tag || null]);
    }

    // 5. Default Super Admin User
    await pool.query(`
      INSERT INTO admin_users (id, name, email, password_hash, role, is_active)
      VALUES ('ADM001', 'Dinesh Super Admin', 'admin@matladuko.com', 'sha256_mock_hash', 'Super Admin', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed Demo Users if users table is empty
    const userCountRes = await pool.query('SELECT count(*) AS cnt FROM users');
    const existingUsers = parseInt(userCountRes.rows[0]?.cnt || '0', 10);

    if (existingUsers === 0) {
      for (const u of INITIAL_USERS) {
        // Users table
        await pool.query(`
          INSERT INTO users (id, phone_number, status)
          VALUES ($1, $2, $3)
          ON CONFLICT (id) DO NOTHING;
        `, [u.id, u.phoneNumber || `+9198765${Math.floor(10000 + Math.random() * 90000)}`, u.status === 'Active' ? 'Active' : 'Suspended']);

        // User profiles
        await pool.query(`
          INSERT INTO user_profiles (
            user_id, display_name, gender, date_of_birth, age,
            preferred_language_id, avatar_id, bio, is_creator_eligible
          )
          VALUES ($1, $2, $3, '1998-05-15', $4, 'te', $5, $6, $7)
          ON CONFLICT (user_id) DO NOTHING;
        `, [
          u.id,
          u.displayName,
          u.gender === 'Female' ? 'Female' : 'Male',
          u.age || 24,
          u.avatarId,
          u.bio || 'Telugu Stranger Calling App user',
          true
        ]);

        // User wallet
        await pool.query(`
          INSERT INTO wallets (user_id, balance_coins, reserved_coins)
          VALUES ($1, $2, 0)
          ON CONFLICT (user_id) DO NOTHING;
        `, [u.id, u.coinsBalance || 100]);
      }
    }

    return { seeded: true, message: 'Initial data seeded successfully into PostgreSQL' };
  } catch (err: any) {
    console.error('Error seeding initial data to PostgreSQL:', err);
    return { seeded: false, message: err.message };
  }
}
