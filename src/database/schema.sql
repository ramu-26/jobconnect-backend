-- 1. Common authentication table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('employee', 'company')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Employee profile table
CREATE TABLE IF NOT EXISTS employees (
    user_id BIGINT PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    location VARCHAR(150),
    skills TEXT,
    experience NUMERIC(4,1) NOT NULL DEFAULT 0
        CHECK (experience >= 0),
    resume_url VARCHAR(500)
);

-- 3. Company profile table
CREATE TABLE IF NOT EXISTS companies (
    user_id BIGINT PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    location VARCHAR(150) NOT NULL,
    website VARCHAR(255),
    industry VARCHAR(100),
    description TEXT
);


CREATE TABLE IF NOT EXISTS jobs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id BIGINT NOT NULL
        REFERENCES companies(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(150) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    experience_required NUMERIC(4,1) DEFAULT 0
        CHECK (experience_required >= 0),
    salary_min NUMERIC(12,2),
    salary_max NUMERIC(12,2),
    skills TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        salary_min IS NULL OR salary_max IS NULL
        OR salary_max >= salary_min
    )
);


CREATE TABLE IF NOT EXISTS applications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    job_id BIGINT NOT NULL
        REFERENCES jobs(id) ON DELETE CASCADE,

    employee_id BIGINT NOT NULL
        REFERENCES employees(user_id) ON DELETE CASCADE,

    cover_letter TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'reviewing',
                'shortlisted',
                'rejected',
                'accepted'
            )
        ),

    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (job_id, employee_id)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_employees_location
    ON employees(location);

CREATE INDEX IF NOT EXISTS idx_companies_location
    ON companies(location);

CREATE INDEX IF NOT EXISTS idx_companies_industry
    ON companies(industry);

-- Jobs
CREATE INDEX IF NOT EXISTS idx_jobs_company_id
    ON jobs(company_id);

CREATE INDEX IF NOT EXISTS idx_jobs_status_created
    ON jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_location
    ON jobs(location);

-- Applications
CREATE INDEX IF NOT EXISTS idx_applications_employee_id
    ON applications(employee_id);

CREATE INDEX IF NOT EXISTS idx_applications_job_id
    ON applications(job_id);