-- 0001_init: Base schema (users, complaint_types, areas, complaints, complaint_seen)
-- Idempotent: safe to run against an existing database.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaint_types (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    area_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    building VARCHAR(100) NOT NULL,
    floor VARCHAR(50) NOT NULL,
    area_id INT NOT NULL,
    complaint_type_id INT NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(50),
    action TEXT NULL,
    seen BOOLEAN DEFAULT FALSE,
    resolution_date TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (complaint_type_id) REFERENCES complaint_types(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS complaint_seen (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    complaint_id INT NOT NULL,
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE SET NULL
);
