export const FLYWAY_SQL_V1 = `-- ==============================================================================
-- FLYWAY MIGRATION V1__init_matladuko_schema.sql
-- Production Database Schema for Matladuko (Telugu Stranger Social Calling App)
-- PostgreSQL 16+ / CockroachDB / Cloud SQL compatible
-- Modular Monolith Architecture with strict financial invariants & foreign keys
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. USERS & PROFILES MODULE (Zero GPS / Zero City / Predefined Avatars Only)
-- ------------------------------------------------------------------------------

CREATE TYPE user_gender_enum AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE user_status_enum AS ENUM ('Active', 'Suspended', 'Blocked', 'Deleted');

CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE,
    google_id VARCHAR(128) UNIQUE,
    status user_status_enum NOT NULL DEFAULT 'Active',
    failed_otp_attempts INT NOT NULL DEFAULT 0,
    otp_lockout_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE avatars (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    svg_url TEXT NOT NULL,
    accent_color VARCHAR(16) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE languages (
    id VARCHAR(16) PRIMARY KEY, -- 'te' (Telugu), 'en', 'hi', etc.
    name VARCHAR(64) NOT NULL,
    native_name VARCHAR(64) NOT NULL, -- 'తెలుగు'
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE user_profiles (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(64) NOT NULL,
    gender user_gender_enum NOT NULL,
    date_of_birth DATE NOT NULL,
    age INT,
    preferred_language_id VARCHAR(16) NOT NULL REFERENCES languages(id),
    avatar_id VARCHAR(64) NOT NULL REFERENCES avatars(id),
    bio VARCHAR(256),
    is_creator_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_languages (
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_id VARCHAR(16) NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, language_id)
);

CREATE TABLE user_devices (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token TEXT,
    platform VARCHAR(32) NOT NULL, -- 'android', 'ios', 'web'
    app_version VARCHAR(32) NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(128) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. DISCOVERY, FAVORITES, PRESENCE & BLOCKING
-- ------------------------------------------------------------------------------

CREATE TABLE user_favorites (
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    favorite_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, favorite_user_id)
);

CREATE TABLE user_blocks (
    blocker_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(256),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_user_id, blocked_user_id)
);

-- ------------------------------------------------------------------------------
-- 3. WALLET & FINANCIAL LEDGER (Immutable Accounting - Invariant: Sum of credits/debits)
-- ------------------------------------------------------------------------------

CREATE TABLE wallets (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    balance_coins NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance_coins >= 0.00),
    reserved_coins NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (reserved_coins >= 0.00),
    version BIGINT NOT NULL DEFAULT 0, -- Optimistic locking
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE wallet_tx_type_enum AS ENUM (
    'CREDIT_PURCHASE',
    'DEBIT_CALL_RESERVATION',
    'SETTLE_CALL_CHARGE',
    'REFUND_CALL_RESERVATION',
    'CREDIT_CREATOR_EARNING',
    'LOCK_WITHDRAWAL',
    'COMPENSATING_REFUND'
);

CREATE TABLE wallet_transactions (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    wallet_user_id VARCHAR(64) NOT NULL REFERENCES wallets(user_id) ON DELETE RESTRICT,
    type wallet_tx_type_enum NOT NULL,
    amount_coins NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE,
    reference_id VARCHAR(128) NOT NULL, -- call_id or payment_order_id
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_tx_user_created ON wallet_transactions(wallet_user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. COIN PACKAGES & PAYMENT ORDERS
-- ------------------------------------------------------------------------------

CREATE TABLE coin_packages (
    id VARCHAR(64) PRIMARY KEY,
    coins NUMERIC(10, 0) NOT NULL CHECK (coins > 0),
    price_inr NUMERIC(10, 2) NOT NULL CHECK (price_inr > 0),
    tag VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TYPE payment_status_enum AS ENUM ('Created', 'Processing', 'Success', 'Failed', 'Refunded');

CREATE TABLE payment_orders (
    id VARCHAR(64) PRIMARY KEY, -- e.g. PAY1001
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    package_id VARCHAR(64) NOT NULL REFERENCES coin_packages(id),
    amount_inr NUMERIC(10, 2) NOT NULL,
    coins_to_credit NUMERIC(10, 0) NOT NULL,
    status payment_status_enum NOT NULL DEFAULT 'Created',
    gateway_provider VARCHAR(32) NOT NULL, -- 'Razorpay', 'Cashfree', 'Paytm'
    gateway_order_id VARCHAR(128),
    gateway_payment_id VARCHAR(128),
    signature VARCHAR(256),
    idempotency_key VARCHAR(128) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE payment_transactions (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_id VARCHAR(64) NOT NULL REFERENCES payment_orders(id),
    raw_payload JSONB NOT NULL,
    webhook_event_id VARCHAR(128) UNIQUE,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. CALL SESSIONS, WEBRTC EVENTS & SERVER-AUTHORITATIVE BILLING
-- ------------------------------------------------------------------------------

CREATE TYPE call_type_enum AS ENUM ('audio', 'video');
CREATE TYPE call_status_enum AS ENUM ('ringing', 'connected', 'rejected', 'missed', 'cancelled', 'ended', 'failed');

CREATE TABLE call_sessions (
    id VARCHAR(64) PRIMARY KEY, -- CALL_UUID
    caller_id VARCHAR(64) NOT NULL REFERENCES users(id),
    callee_id VARCHAR(64) NOT NULL REFERENCES users(id),
    type call_type_enum NOT NULL,
    status call_status_enum NOT NULL DEFAULT 'ringing',
    ringing_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    connected_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INT NOT NULL DEFAULT 0,
    end_reason VARCHAR(64), -- 'USER_HUNG_UP', 'LOW_BALANCE', 'TIMEOUT', 'NETWORK_ERR'
    turn_server_used VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calls_caller ON call_sessions(caller_id, created_at DESC);
CREATE INDEX idx_calls_callee ON call_sessions(callee_id, created_at DESC);

CREATE TABLE call_events (
    id BIGSERIAL PRIMARY KEY,
    call_id VARCHAR(64) NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL, -- 'OFFER', 'ANSWER', 'ICE_CANDIDATE', 'CONNECTED', 'DISCONNECTED'
    metadata JSONB,
    server_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE call_billings (
    call_id VARCHAR(64) PRIMARY KEY REFERENCES call_sessions(id),
    rate_coins_per_min NUMERIC(8, 2) NOT NULL,
    min_billable_seconds INT NOT NULL DEFAULT 30,
    rounding_mode VARCHAR(32) NOT NULL,
    billable_seconds INT NOT NULL,
    total_coins_billed NUMERIC(10, 2) NOT NULL,
    creator_share_percentage NUMERIC(5, 2) NOT NULL,
    creator_coins_earned NUMERIC(10, 2) NOT NULL,
    platform_coins_earned NUMERIC(10, 2) NOT NULL,
    coin_to_inr_snapshot NUMERIC(6, 4) NOT NULL,
    billed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. CREATOR EARNINGS, PAYOUT METHODS & WITHDRAWAL REQUESTS
-- ------------------------------------------------------------------------------

CREATE TABLE creator_accounts (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id),
    total_earned_coins NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    withdrawn_coins NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    available_coins NUMERIC(14, 2) GENERATED ALWAYS AS (total_earned_coins - withdrawn_coins) STORED,
    kyc_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE creator_earnings (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    creator_id VARCHAR(64) NOT NULL REFERENCES users(id),
    call_id VARCHAR(64) NOT NULL REFERENCES call_sessions(id),
    earned_coins NUMERIC(10, 2) NOT NULL,
    equivalent_inr NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payout_methods (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    method_type VARCHAR(32) NOT NULL, -- 'UPI', 'BANK_TRANSFER'
    upi_id VARCHAR(128),
    bank_account_encrypted TEXT,
    bank_ifsc VARCHAR(16),
    beneficiary_name VARCHAR(128) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE withdrawal_status_enum AS ENUM ('Pending', 'Processing', 'Success', 'Rejected');

CREATE TABLE withdrawal_requests (
    id VARCHAR(64) PRIMARY KEY, -- WD1001
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    amount_inr NUMERIC(10, 2) NOT NULL CHECK (amount_inr >= 500.00),
    coins_deducted NUMERIC(10, 2) NOT NULL,
    payout_method_id VARCHAR(64) REFERENCES payout_methods(id),
    payout_summary VARCHAR(128) NOT NULL, -- 'Bank Transfer •••• 1234'
    status withdrawal_status_enum NOT NULL DEFAULT 'Pending',
    rejection_reason TEXT,
    approved_by_admin_id VARCHAR(64),
    payout_utr_ref VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- 7. MODERATION & USER REPORTS
-- ------------------------------------------------------------------------------

CREATE TYPE report_reason_enum AS ENUM ('Harassment', 'Inappropriate', 'Fake Profile', 'Spam', 'Abuse');
CREATE TYPE report_status_enum AS ENUM ('Pending', 'Resolved', 'Dismissed');

CREATE TABLE reports (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    reporter_id VARCHAR(64) NOT NULL REFERENCES users(id),
    reported_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    reason report_reason_enum NOT NULL,
    notes TEXT,
    status report_status_enum NOT NULL DEFAULT 'Pending',
    reviewed_by_admin_id VARCHAR(64),
    action_taken VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- 8. ADMIN RBAC, AUDIT LOGGING & SYSTEM CONFIGURATION SNAPSHOTS
-- ------------------------------------------------------------------------------

CREATE TYPE admin_role_enum AS ENUM ('Super Admin', 'Moderator', 'Finance Admin', 'Support Agent', 'Analyst');

CREATE TABLE admin_users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role admin_role_enum NOT NULL,
    mfa_secret VARCHAR(128),
    mfa_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_audit_logs (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    admin_id VARCHAR(64) NOT NULL REFERENCES admin_users(id),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    details TEXT NOT NULL,
    ip_address INET NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_configurations (
    id INT PRIMARY KEY DEFAULT 1,
    audio_coins_per_min NUMERIC(6, 2) NOT NULL DEFAULT 10.00,
    video_coins_per_min NUMERIC(6, 2) NOT NULL DEFAULT 20.00,
    min_billable_seconds INT NOT NULL DEFAULT 30,
    rounding_mode VARCHAR(32) NOT NULL DEFAULT 'CEIL_MINUTE',
    creator_share_percentage NUMERIC(5, 2) NOT NULL DEFAULT 60.00,
    platform_share_percentage NUMERIC(5, 2) NOT NULL DEFAULT 40.00,
    coin_to_inr_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.5000,
    min_withdrawal_amount_inr NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    reconnection_grace_seconds INT NOT NULL DEFAULT 45,
    low_balance_warning_coins INT NOT NULL DEFAULT 30,
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(128) NOT NULL
);

CREATE TABLE configuration_history (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    version INT NOT NULL,
    snapshot JSONB NOT NULL,
    changed_by VARCHAR(128) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(32) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
