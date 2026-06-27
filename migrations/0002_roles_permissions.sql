-- 0002_roles_permissions: Dynamic roles & permissions (RBAC)
-- Adds roles, permissions and a join table, seeds the permission catalog,
-- and seeds the five existing roles with permissions matching prior behaviour.

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Permission catalog (keep in sync with src/lib/permissions.ts)
INSERT INTO permissions (key, label) VALUES
    ('dashboard:view',         'View Dashboard'),
    ('complaints:create',      'Submit Complaints'),
    ('complaints:action',      'Take Action / Resolve Complaints'),
    ('reports:view',           'View Reports'),
    ('users:manage',           'Manage Users'),
    ('areas:manage',           'Manage Areas'),
    ('complaint_types:manage', 'Manage Complaint Types'),
    ('roles:manage',           'Manage Roles & Permissions')
ON CONFLICT (key) DO NOTHING;

-- Seed the existing five roles
INSERT INTO roles (name, description, is_system) VALUES
    ('admin',      'Full system access',                TRUE),
    ('owner',      'Dashboard and reports',             FALSE),
    ('manager',    'Resolve complaints',                FALSE),
    ('it_manager', 'Resolve complaints (IT)',           FALSE),
    ('employee',   'Submit complaints',                 FALSE)
ON CONFLICT (name) DO NOTHING;

-- Map roles to permissions to match prior hardcoded behaviour.
-- admin gets every permission; others get their historical subset.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
       (r.name = 'admin')
    OR (r.name = 'owner'      AND p.key IN ('dashboard:view', 'reports:view'))
    OR (r.name = 'manager'    AND p.key IN ('dashboard:view', 'complaints:action'))
    OR (r.name = 'it_manager' AND p.key IN ('dashboard:view', 'complaints:action'))
    OR (r.name = 'employee'   AND p.key IN ('complaints:create'))
)
ON CONFLICT DO NOTHING;
