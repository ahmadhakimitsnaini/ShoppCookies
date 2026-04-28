-- ============================================================
--  GUDANG KREATIF STUDIO — Database Schema (Final Revision)
--  Backend: Node.js + Prisma ORM | DB: PostgreSQL 15+
-- ============================================================

-- Aktifkan ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role           AS ENUM ('ADMIN', 'OPERATOR');
CREATE TYPE studio_status       AS ENUM ('ACTIVE', 'MAINTENANCE');
CREATE TYPE account_status      AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED'); -- BARU: Status fungsional toko
CREATE TYPE account_health      AS ENUM ('EXCELLENT', 'WARNING', 'CRITICAL');
CREATE TYPE session_status      AS ENUM ('LIVE', 'OFFLINE', 'EXPIRED');
CREATE TYPE bot_task_type       AS ENUM ('SYNC_OMZET', 'AUTO_TREATMENT', 'STOP_LIVE', 'CHECK_COOKIE', 'AUTO_INJECT');
CREATE TYPE bot_task_status     AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');


-- ============================================================
-- 1. TABEL: users
-- ============================================================

CREATE TABLE users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            user_role       NOT NULL DEFAULT 'OPERATOR',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(), -- BARU

    CONSTRAINT chk_users_email CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

COMMENT ON TABLE  users           IS 'Akun login internal untuk admin dan operator Gudang Kreatif.';


-- ============================================================
-- 2. TABEL: Members
-- ============================================================

CREATE TABLE members (
    id                   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(255)    NOT NULL,
    phone                VARCHAR(30)     NOT NULL UNIQUE,
    email                VARCHAR(255)    UNIQUE,
    username_studio      VARCHAR(100)    UNIQUE,
    alamat               TEXT,
    bank_name            VARCHAR(100),
    bank_account_number  VARCHAR(50),
    telegram_token_owner VARCHAR(255),
    chat_id_owner        VARCHAR(100),
    telegram_token_pesan VARCHAR(255),
    chat_id_pesan        VARCHAR(100),
    joined_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(), -- BARU
    deleted_at           TIMESTAMPTZ                             -- BARU: Soft Delete
);

COMMENT ON TABLE  members IS 'Data mitra riil pemilik akun/toko Shopee yang bergabung ke platform.';


-- ============================================================
-- 3. TABEL: studios
-- ============================================================

CREATE TABLE studios (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(150)    NOT NULL UNIQUE,
    status           studio_status   NOT NULL DEFAULT 'ACTIVE',
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(), -- BARU
    is_share_on      BOOLEAN         NOT NULL DEFAULT true,
    telegram_token   VARCHAR(255),
    telegram_chat_id VARCHAR(100)
);

COMMENT ON TABLE  studios IS 'Representasi studio fisik atau virtual tempat Shopee Live dijalankan.';


-- ============================================================
-- 4. TABEL: shopee_accounts
-- ============================================================

CREATE TABLE shopee_accounts (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id           UUID            NOT NULL,
    studio_id           UUID,
    shopee_username     VARCHAR(100)    NOT NULL UNIQUE,
    shopee_shop_name    VARCHAR(255)    NOT NULL,
    status              account_status  NOT NULL DEFAULT 'ACTIVE', -- BARU: Status level toko (Anti ban bot spam)
    health_status       account_health  NOT NULL DEFAULT 'EXCELLENT',
    total_sessions      INT             NOT NULL DEFAULT 0 CHECK (total_sessions >= 0),
    use_custom_vault    BOOLEAN         NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,                            -- BARU: Soft Delete

    CONSTRAINT fk_shopee_accounts_member
        FOREIGN KEY (member_id)
        REFERENCES members(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_shopee_accounts_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


-- ============================================================
-- 5. TABEL: shopee_sessions
-- ============================================================

CREATE TABLE shopee_sessions (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id              UUID            NOT NULL,
    raw_cookie_encrypted    TEXT            NOT NULL,
    user_agent              TEXT            NOT NULL,
    status                  session_status  NOT NULL DEFAULT 'LIVE',
    health_score            SMALLINT        NOT NULL DEFAULT 100
                                            CHECK (health_score BETWEEN 1 AND 100),
    last_sync_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    live_cart_snapshot      JSONB           DEFAULT '[]',
    expired_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(), -- BARU

    CONSTRAINT fk_shopee_sessions_account
        FOREIGN KEY (account_id)
        REFERENCES shopee_accounts(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================
-- 6. TABEL: live_performances
-- ============================================================

CREATE TABLE live_performances (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID            NOT NULL,
    session_id      UUID,           -- BARU: Melacak omzet dihasilkan dari sesi cookie mana
    live_title      VARCHAR(255),
    viewers         INT             NOT NULL DEFAULT 0 CHECK (viewers >= 0),
    buyers          INT             NOT NULL DEFAULT 0 CHECK (buyers >= 0),
    omzet_live      DECIMAL(18, 2)  NOT NULL DEFAULT 0.00,
    omzet_komisi    DECIMAL(18, 2)  NOT NULL DEFAULT 0.00,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_live_performances_account
        FOREIGN KEY (account_id)
        REFERENCES shopee_accounts(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_live_performances_session
        FOREIGN KEY (session_id)
        REFERENCES shopee_sessions(id)
        ON DELETE SET NULL          -- PERBAIKAN: Jika sesi hilang perlahan, performa keuangan tetap tertinggal
);


-- ============================================================
-- 7. TABEL: account_violations
-- ============================================================

CREATE TABLE account_violations (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID            NOT NULL,
    violation_type  VARCHAR(100)    NOT NULL,
    description     TEXT,
    detected_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_account_violations_account
        FOREIGN KEY (account_id)
        REFERENCES shopee_accounts(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================
-- 8. TABEL: bot_tasks
-- ============================================================

CREATE TABLE bot_tasks (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID            NOT NULL,
    task_type   bot_task_type   NOT NULL,
    status      bot_task_status NOT NULL DEFAULT 'PENDING',
    payload     JSONB           DEFAULT '{}',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,

    CONSTRAINT fk_bot_tasks_account
        FOREIGN KEY (account_id)
        REFERENCES shopee_accounts(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================
-- 9. TABEL: studio_products
-- ============================================================

CREATE TABLE studio_products (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id       UUID            NOT NULL,
    account_id      UUID,
    product_url     TEXT            NOT NULL,
    product_name    VARCHAR(255),
    order_index     INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_studio_products_studio
        FOREIGN KEY (studio_id)
        REFERENCES studios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_studio_products_account
        FOREIGN KEY (account_id)
        REFERENCES shopee_accounts(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================
-- INDEKS — Dioptimalkan 
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_deleted_at ON members(deleted_at) WHERE deleted_at IS NULL; -- BARU: Optimasi Soft Delete

CREATE INDEX idx_shopee_accounts_member_id     ON shopee_accounts(member_id);
CREATE INDEX idx_shopee_accounts_studio_id     ON shopee_accounts(studio_id);
CREATE INDEX idx_shopee_accounts_status        ON shopee_accounts(status); -- BARU
CREATE INDEX idx_shopee_accounts_deleted_at    ON shopee_accounts(deleted_at) WHERE deleted_at IS NULL; -- BARU
CREATE INDEX idx_shopee_accounts_studio_health ON shopee_accounts(studio_id, health_status);

CREATE INDEX idx_shopee_sessions_account_id     ON shopee_sessions(account_id);
CREATE INDEX idx_shopee_sessions_status         ON shopee_sessions(status);
CREATE INDEX idx_shopee_sessions_last_sync_at   ON shopee_sessions(last_sync_at DESC);
CREATE INDEX idx_shopee_sessions_expired_at     ON shopee_sessions(expired_at) WHERE expired_at IS NOT NULL;
CREATE INDEX idx_shopee_sessions_account_status_health ON shopee_sessions(account_id, status, health_score);

CREATE INDEX idx_live_performances_account_id   ON live_performances(account_id);
CREATE INDEX idx_live_performances_session_id   ON live_performances(session_id); -- BARU
CREATE INDEX idx_live_performances_recorded_at  ON live_performances(recorded_at DESC);
CREATE INDEX idx_live_performances_account_time ON live_performances(account_id, recorded_at DESC);

CREATE INDEX idx_account_violations_account_id  ON account_violations(account_id);
CREATE INDEX idx_account_violations_detected_at ON account_violations(detected_at DESC);

CREATE INDEX idx_bot_tasks_account_id   ON bot_tasks(account_id);
CREATE INDEX idx_bot_tasks_status       ON bot_tasks(status);
CREATE INDEX idx_bot_tasks_active       ON bot_tasks(status, created_at) WHERE status IN ('PENDING', 'PROCESSING');


-- ============================================================
-- TRIGGER: auto-update updated_at secara massal
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- PERBAIKAN: Menambahkan trigger updated_at di seluruh tabel krusial
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_studios_updated_at BEFORE UPDATE ON studios FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_shopee_accounts_updated_at BEFORE UPDATE ON shopee_accounts FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_shopee_sessions_updated_at BEFORE UPDATE ON shopee_sessions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- TRIGGER: auto-update total_sessions (Disempurnakan)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_sync_total_sessions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shopee_accounts SET total_sessions = total_sessions + 1 WHERE id = NEW.account_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shopee_accounts SET total_sessions = GREATEST(total_sessions - 1, 0) WHERE id = OLD.account_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_total_sessions
    AFTER INSERT OR DELETE ON shopee_sessions
    FOR EACH ROW EXECUTE FUNCTION fn_sync_total_sessions();


-- ============================================================
-- VIEW: v_active_sessions (Disempurnakan Filter TIdak Terblokir)
-- ============================================================

CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
    ss.id                   AS session_id,
    sa.shopee_username,
    sa.shopee_shop_name,
    sa.health_status        AS account_health,
    m.name                  AS member_name,
    m.phone                 AS member_phone,
    st.name                 AS studio_name,
    ss.status               AS session_status,
    ss.health_score,
    ss.last_sync_at,
    ss.expired_at
FROM shopee_sessions ss
JOIN shopee_accounts sa  ON sa.id = ss.account_id
JOIN members m           ON m.id  = sa.member_id
LEFT JOIN studios st     ON st.id = sa.studio_id
WHERE ss.status = 'LIVE' 
  AND sa.status = 'ACTIVE' 
  AND sa.deleted_at IS NULL;

-- ============================================================
-- VIEW: v_bot_queue (Disempurnakan Filter TIdak Terblokir)
-- ============================================================

CREATE OR REPLACE VIEW v_bot_queue AS
SELECT
    bt.id,
    bt.task_type,
    bt.status,
    bt.payload,
    bt.created_at,
    sa.shopee_username,
    sa.health_status
FROM bot_tasks bt
JOIN shopee_accounts sa ON sa.id = bt.account_id
WHERE bt.status IN ('PENDING', 'PROCESSING') 
  AND sa.status = 'ACTIVE'
  AND sa.deleted_at IS NULL
ORDER BY bt.created_at ASC;
