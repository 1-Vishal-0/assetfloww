require('dotenv').config();
const { pool } = require('../config/database');

const createTables = async () => {
  const conn = await pool.getConnection();
  try {
    console.log('🔄 Starting database migration...');

    // Disable foreign key checks for dropping and recreating tables
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // Drop legacy and requested tables for a clean slate
    await conn.query('DROP TABLE IF EXISTS notifications');
    await conn.query('DROP TABLE IF EXISTS activity_logs');
    await conn.query('DROP TABLE IF EXISTS damage_reports');
    await conn.query('DROP TABLE IF EXISTS returns');
    await conn.query('DROP TABLE IF EXISTS allocations');
    await conn.query('DROP TABLE IF EXISTS asset_events'); // Legacy table
    await conn.query('DROP TABLE IF EXISTS assets');
    await conn.query('DROP TABLE IF EXISTS employees');
    await conn.query('DROP TABLE IF EXISTS categories');
    await conn.query('DROP TABLE IF EXISTS users');

    console.log('🗑️ Legacy tables dropped.');

    /* ── USERS TABLE ─────────────────────────────────── */
    await conn.query(`
      CREATE TABLE users (
        id          INT PRIMARY KEY AUTO_INCREMENT,
        email       VARCHAR(255) UNIQUE NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(50)  NOT NULL DEFAULT 'Admin', -- Admin, Inventory Manager, Employee
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME     DEFAULT NULL
      )
    `);
    console.log('✅ users table created');

    /* ── CATEGORIES TABLE ────────────────────────────── */
    await conn.query(`
      CREATE TABLE categories (
        id          INT PRIMARY KEY AUTO_INCREMENT,
        name        VARCHAR(255) UNIQUE NOT NULL,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME     DEFAULT NULL
      )
    `);
    console.log('✅ categories table created');

    /* ── EMPLOYEES TABLE ─────────────────────────────── */
    await conn.query(`
      CREATE TABLE employees (
        id            INT PRIMARY KEY AUTO_INCREMENT,
        employee_code VARCHAR(50) UNIQUE NOT NULL,
        full_name     VARCHAR(255) NOT NULL,
        department    VARCHAR(255) NOT NULL,
        designation   VARCHAR(255) NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        phone         VARCHAR(50),
        profile_image VARCHAR(500) NULL,
        created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME     DEFAULT NULL
      )
    `);
    console.log('✅ employees table created');

    /* ── ASSETS TABLE ────────────────────────────────── */
    await conn.query(`
      CREATE TABLE assets (
        id              INT PRIMARY KEY AUTO_INCREMENT,
        serial_number   VARCHAR(255) UNIQUE NOT NULL,
        asset_tag       VARCHAR(255) UNIQUE NOT NULL,
        category_id     INT,
        brand           VARCHAR(255) NOT NULL,
        model           VARCHAR(255) NOT NULL,
        purchase_date   DATE NOT NULL,
        warranty_expiry DATE NOT NULL,
        location        VARCHAR(255) NOT NULL,
        \`condition\`     VARCHAR(50)  DEFAULT 'Good', -- Good, Fair, Poor
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME     DEFAULT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ assets table created');

    /* ── ALLOCATIONS TABLE ───────────────────────────── */
    await conn.query(`
      CREATE TABLE allocations (
        id                   INT PRIMARY KEY AUTO_INCREMENT,
        asset_id             INT NOT NULL,
        employee_id          INT NOT NULL,
        allocated_by         INT NULL,
        allocated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expected_return_date DATE NULL,
        notes                TEXT NULL,
        updated_at           DATETIME  DEFAULT NULL,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ allocations table created');

    /* ── RETURNS TABLE ───────────────────────────────── */
    await conn.query(`
      CREATE TABLE returns (
        id              INT PRIMARY KEY AUTO_INCREMENT,
        allocation_id   INT UNIQUE NOT NULL, -- One return per allocation
        returned_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        condition_notes TEXT NULL,
        received_by     INT NULL,
        updated_at      DATETIME  DEFAULT NULL,
        FOREIGN KEY (allocation_id) REFERENCES allocations(id) ON DELETE CASCADE,
        FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ returns table created');

    /* ── DAMAGE REPORTS TABLE ────────────────────────── */
    await conn.query(`
      CREATE TABLE damage_reports (
        id                INT PRIMARY KEY AUTO_INCREMENT,
        asset_id          INT NOT NULL,
        reported_by       INT NULL,
        severity          VARCHAR(50)  NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Critical
        description       TEXT NOT NULL,
        photo_path        VARCHAR(500) NULL,
        resolution_status VARCHAR(50)  NOT NULL DEFAULT 'Unresolved', -- Unresolved, Resolved
        created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME     DEFAULT NULL,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ damage_reports table created');

    /* ── ACTIVITY LOGS TABLE ─────────────────────────── */
    await conn.query(`
      CREATE TABLE activity_logs (
        id          INT PRIMARY KEY AUTO_INCREMENT,
        user_id     INT NULL,
        action      VARCHAR(255) NOT NULL,
        details     TEXT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ activity_logs table created');

    /* ── NOTIFICATIONS TABLE ─────────────────────────── */
    await conn.query(`
      CREATE TABLE notifications (
        id          INT PRIMARY KEY AUTO_INCREMENT,
        user_id     INT NULL, -- If NULL, system-wide notification
        message     TEXT NOT NULL,
        is_read     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ notifications table created');

    // Re-enable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n🎉 Migration complete. Database is normalized and all 9 tables are created!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    conn.release();
    process.exit(0);
  }
};

createTables();