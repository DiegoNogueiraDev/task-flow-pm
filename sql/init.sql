-- Task Flow PM Database Initialization Script
-- Este script configura o banco de dados PostgreSQL para o sistema

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users and Teams tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    team_id UUID,
    role VARCHAR(20) DEFAULT 'member',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    lead_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects and Tasks tables
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    team_id UUID REFERENCES teams(id),
    status VARCHAR(20) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id),
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'medium',
    estimated_hours INTEGER,
    actual_hours INTEGER,
    complexity VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Metrics and Analytics tables
CREATE TABLE IF NOT EXISTS task_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id),
    user_id UUID REFERENCES users(id),
    metric_type VARCHAR(50),
    metric_value DECIMAL(10,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS team_productivity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id),
    date DATE,
    tasks_completed INTEGER DEFAULT 0,
    total_hours DECIMAL(10,2) DEFAULT 0,
    productivity_score DECIMAL(5,2),
    quality_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50),
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time tracking table
CREATE TABLE IF NOT EXISTS time_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES tasks(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    context VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(id);
ALTER TABLE teams ADD CONSTRAINT fk_teams_lead FOREIGN KEY (lead_id) REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_metrics_timestamp ON task_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp);
CREATE INDEX IF NOT EXISTS idx_time_sessions_user_task ON time_sessions(user_id, task_id);

-- Insert sample data for testing
INSERT INTO teams (id, name, description) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Desenvolvimento Frontend', 'Equipe responsável pelo desenvolvimento da interface'),
    ('22222222-2222-2222-2222-222222222222', 'Desenvolvimento Backend', 'Equipe responsável pelo desenvolvimento da API'),
    ('33333333-3333-3333-3333-333333333333', 'DevOps & Infraestrutura', 'Equipe responsável pela infraestrutura e deploy')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, email, full_name, team_id, role) VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'joao.silva', 'joao.silva@taskflow.com', 'João Silva', '11111111-1111-1111-1111-111111111111', 'lead'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'maria.santos', 'maria.santos@taskflow.com', 'Maria Santos', '11111111-1111-1111-1111-111111111111', 'member'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'pedro.costa', 'pedro.costa@taskflow.com', 'Pedro Costa', '22222222-2222-2222-2222-222222222222', 'lead'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'ana.ferreira', 'ana.ferreira@taskflow.com', 'Ana Ferreira', '22222222-2222-2222-2222-222222222222', 'member'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'carlos.oliveira', 'carlos.oliveira@taskflow.com', 'Carlos Oliveira', '33333333-3333-3333-3333-333333333333', 'lead')
ON CONFLICT (id) DO NOTHING;

UPDATE teams SET lead_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE teams SET lead_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE teams SET lead_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' WHERE id = '33333333-3333-3333-3333-333333333333';

-- Create views for reporting
CREATE OR REPLACE VIEW team_performance_summary AS
SELECT 
    t.name as team_name,
    COUNT(tk.id) as total_tasks,
    COUNT(CASE WHEN tk.status = 'completed' THEN 1 END) as completed_tasks,
    AVG(tk.actual_hours) as avg_task_hours,
    COUNT(DISTINCT tk.assigned_to) as active_members
FROM teams t
LEFT JOIN projects p ON p.team_id = t.id
LEFT JOIN tasks tk ON tk.project_id = p.id
GROUP BY t.id, t.name;

CREATE OR REPLACE VIEW user_productivity_summary AS
SELECT 
    u.full_name,
    u.username,
    t.name as team_name,
    COUNT(tk.id) as total_tasks,
    COUNT(CASE WHEN tk.status = 'completed' THEN 1 END) as completed_tasks,
    SUM(tk.actual_hours) as total_hours,
    AVG(tk.actual_hours) as avg_task_hours
FROM users u
LEFT JOIN teams t ON t.id = u.team_id
LEFT JOIN tasks tk ON tk.assigned_to = u.id
WHERE u.active = true
GROUP BY u.id, u.full_name, u.username, t.name; 