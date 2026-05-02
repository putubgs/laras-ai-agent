# Database (PostgreSQL / Supabase)

This project uses **Supabase as a Postgres host**. Sign-in is **not** Supabase Auth: the app stores sessions in an **httpOnly cookie** (JWT) and reads/writes the `users` table via the **service role** from API routes only.

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon key (browser / SSR client if needed) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — used to run SQL over REST for `users` and future tables; bypasses RLS |
| `SESSION_SECRET` | Signs the app session JWT (≥ 32 characters) |

Never expose the service role key or `SESSION_SECRET` to the client.

## Applying the schema

1. Open the Supabase dashboard → **SQL** → **New query**.
2. Paste the script below and run it once on a fresh project (or adapt for migrations).
3. Prefer **`timestamptz`** for new columns if you want timezone-safe timestamps; the script below uses `TIMESTAMP` as specified.

### UUID generation

The script uses `uuid-ossp` and `uuid_generate_v4()`. On Supabase you can instead use:

```sql
-- optional replacement for defaults:
-- DEFAULT gen_random_uuid()
```

(requires no extension on modern Postgres; remove `uuid-ossp` if you switch entirely.)

---

## Schema SQL

```sql
-- EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- USERS
-- ======================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    special_keyword VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- USER CV
-- ======================
CREATE TABLE user_cv (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    description VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    llm_raw_text TEXT,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT fk_user_cv_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ======================
-- KEYWORDS
-- ======================
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL UNIQUE
);

-- ======================
-- CV KEYWORDS
-- ======================
CREATE TABLE cv_keywords (
    user_cv_id UUID NOT NULL,
    keyword_id UUID NOT NULL,

    PRIMARY KEY (user_cv_id, keyword_id),

    CONSTRAINT fk_cv_keywords_cv
        FOREIGN KEY (user_cv_id)
        REFERENCES user_cv(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cv_keywords_keyword
        FOREIGN KEY (keyword_id)
        REFERENCES keywords(id)
        ON DELETE CASCADE
);

-- ======================
-- JOB APPLICATION
-- ======================
CREATE TABLE job_application (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,

    company VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    job_type VARCHAR(255),
    job_url TEXT,
    source VARCHAR(255),
    status VARCHAR(255),

    salary_min INT,
    salary_max INT,

    contact_name VARCHAR(255),
    notes TEXT,
    cover_letter TEXT,
    job_description TEXT,

    cv_id UUID,

    is_applied BOOLEAN DEFAULT FALSE,
    is_interested BOOLEAN DEFAULT FALSE,

    applied_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT fk_job_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_job_cv
        FOREIGN KEY (cv_id)
        REFERENCES user_cv(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_salary
        CHECK (
            salary_min IS NULL OR
            salary_max IS NULL OR
            salary_min <= salary_max
        )
);

-- ======================
-- JOB KEYWORDS
-- ======================
CREATE TABLE job_keywords (
    job_application_id UUID NOT NULL,
    keyword_id UUID NOT NULL,
    importance_weight FLOAT NOT NULL DEFAULT 1.0,

    PRIMARY KEY (job_application_id, keyword_id),

    CONSTRAINT fk_job_keywords_job
        FOREIGN KEY (job_application_id)
        REFERENCES job_application(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_job_keywords_keyword
        FOREIGN KEY (keyword_id)
        REFERENCES keywords(id)
        ON DELETE CASCADE
);

-- ======================
-- PHASE
-- ======================
CREATE TABLE phase (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(255),
    "order" INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- ======================
-- APPLICATION PHASE
-- ======================
CREATE TABLE application_phase (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_application_id UUID NOT NULL,
    phase_id UUID NOT NULL,

    status VARCHAR(255),
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT fk_app_phase_job
        FOREIGN KEY (job_application_id)
        REFERENCES job_application(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_app_phase_phase
        FOREIGN KEY (phase_id)
        REFERENCES phase(id)
        ON DELETE CASCADE
);

-- ======================
-- MONTHLY TARGET
-- ======================
CREATE TABLE monthly_target (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INT NOT NULL,
    month INT NOT NULL,
    target INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT unique_year_month UNIQUE (year, month),

    CONSTRAINT chk_month CHECK (month BETWEEN 1 AND 12)
);

-- ======================
-- INDEXES (IMPORTANT)
-- ======================
CREATE INDEX idx_user_email ON users(email);

CREATE INDEX idx_cv_user ON user_cv(user_id);

CREATE INDEX idx_job_user ON job_application(user_id);
CREATE INDEX idx_job_status ON job_application(status);

CREATE INDEX idx_app_phase_job ON application_phase(job_application_id);
```

---

## Model overview

| Table | Role |
|-------|------|
| **users** | Accounts: profile, hashed `password`, `special_keyword` for recovery, unique `email`. Root entity for multi-tenant data. |
| **user_cv** | One or more CV uploads per user (`file_*`, `llm_raw_text`, `is_used`). FK `user_id` → `users`, cascade delete. |
| **keywords** | Normalized dictionary of keywords (`TEXT UNIQUE`). |
| **cv_keywords** | Many-to-many: which keywords appear on which CV. Composite PK `(user_cv_id, keyword_id)`. |
| **job_application** | Job pipeline row per user: company, role, salary range, links, notes, optional `cv_id` (SET NULL on CV delete). `chk_salary` keeps min/max sensible. |
| **job_keywords** | Tags a job with weighted keywords (`importance_weight` default `1.0`). Composite PK `(job_application_id, keyword_id)`. |
| **phase** | Reusable pipeline stages (`name`, `color`, `"order"`, `is_active`). Reserved column name `order` is quoted in SQL. |
| **application_phase** | Links a job application to a phase with optional schedule/completion and notes. |
| **monthly_target** | Global monthly application targets (`year`, `month`, `target`); `unique_year_month` + `chk_month`. |

### Relationships (high level)

```
users
  ├──< user_cv >──< cv_keywords >── keywords
  │       └── (optional FK from job_application.cv_id)
  └──< job_application >──< job_keywords >── keywords
        └──< application_phase >── phase

monthly_target  (standalone config)
```

### Indexes (recap)

- **users(email)** — login and lookups by email.
- **user_cv(user_id)** — list CVs for a user.
- **job_application(user_id, status)** — dashboard lists and filters.
- **application_phase(job_application_id)** — timeline per application.

### Row Level Security (RLS)

If you enable RLS on these tables for the **anon** key, the app’s **service role** (used in `/api/auth/*`) still bypasses RLS for server-side operations. For client-side reads later, add policies per table (e.g. `user_id = auth.uid()` only if you adopt Supabase Auth, or custom JWT claims).

---

## App code touchpoints today

- **Register / login / forgot-password** use the **`users`** table only (`src/app/api/auth/*`, `src/lib/supabase/service-role.ts`).
- Other tables are **forward-looking** for CV parsing, job tracking, phases, and targets; wire them in as features land.
