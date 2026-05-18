require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const seedData = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    console.log('🔄 Seeding database...');

    /* ── Users ───────────────────────────────────── */
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const employeePassword = await bcrypt.hash('employee123', 10);

    const [adminResult] = await connection.query(`
      INSERT INTO users (email, password, role)
      VALUES (?, ?, 'Admin')
    `, ['admin@company.com', adminPassword]);

    const [managerResult] = await connection.query(`
      INSERT INTO users (email, password, role)
      VALUES (?, ?, 'Inventory Manager')
    `, ['manager@company.com', managerPassword]);

    const [empUserResult] = await connection.query(`
      INSERT INTO users (email, password, role)
      VALUES (?, ?, 'Employee')
    `, ['employee@company.com', employeePassword]);

    const adminId = adminResult.insertId;
    const managerId = managerResult.insertId;
    const empUserId = empUserResult.insertId;

    console.log('✅ Users seeded:');
    console.log('   - Admin: admin@company.com / admin123');
    console.log('   - Manager: manager@company.com / manager123');
    console.log('   - Employee: employee@company.com / employee123');

    /* ── Categories ─────────────────────────────── */
    const categories = ['Laptops', 'Monitors', 'Accessories', 'Phones'];
    const categoryIds = {};
    for (const name of categories) {
      const [res] = await connection.query(`INSERT INTO categories (name) VALUES (?)`, [name]);
      categoryIds[name] = res.insertId;
    }
    console.log('✅ Categories seeded');

    /* ── Employees ───────────────────────────────── */
    const employees = [
      ['EMP-2026-001', 'Alice Johnson', 'Engineering', 'Senior Software Engineer', 'alice@company.com', '+1234567890'],
      ['EMP-2026-002', 'Bob Smith', 'Design', 'Senior UI/UX Designer', 'bob@company.com', '+1234567891'],
      ['EMP-2026-003', 'Charlie Brown', 'HR', 'HR Manager', 'charlie@company.com', '+1234567892'],
      ['EMP-2026-004', 'Diana Prince', 'Marketing', 'VP Marketing', 'diana@company.com', '+1234567893'],
      ['EMP-2026-005', 'Ethan Hunt', 'Operations', 'Special Security Officer', 'ethan@company.com', '+1234567894'],
    ];

    const employeeIds = [];
    for (const [code, name, dept, desig, email, phone] of employees) {
      const [res] = await connection.query(
        `INSERT INTO employees (employee_code, full_name, department, designation, email, phone) VALUES (?,?,?,?,?,?)`,
        [code, name, dept, desig, email, phone]
      );
      employeeIds.push(res.insertId);
    }
    console.log('✅ Employees seeded');

    /* ── Assets ──────────────────────────────────── */
    const assets = [
      { serial_number: 'SN-LAP-DELL-001', asset_tag: 'TAG-LAP-001', category_id: categoryIds['Laptops'], brand: 'Dell', model: 'Latitude 5420', purchase_date: '2025-01-10', warranty_expiry: '2028-01-10', location: 'Bangalore Office', condition: 'Good' },
      { serial_number: 'SN-MON-LG-001', asset_tag: 'TAG-MON-001', category_id: categoryIds['Monitors'], brand: 'LG', model: 'UltraWide 34"', purchase_date: '2025-02-15', warranty_expiry: '2027-02-15', location: 'Bangalore Office', condition: 'Good' },
      { serial_number: 'SN-ACC-LOGI-001', asset_tag: 'TAG-ACC-001', category_id: categoryIds['Accessories'], brand: 'Logitech', model: 'MX Keys Keyboard', purchase_date: '2025-01-20', warranty_expiry: '2026-01-20', location: 'Bangalore Office', condition: 'Good' },
      { serial_number: 'SN-PHN-APPL-001', asset_tag: 'TAG-PHN-001', category_id: categoryIds['Phones'], brand: 'Apple', model: 'iPhone 15 Pro', purchase_date: '2025-03-01', warranty_expiry: '2027-03-01', location: 'Bangalore Office', condition: 'Good' },
      { serial_number: 'SN-LAP-MAC-001', asset_tag: 'TAG-LAP-002', category_id: categoryIds['Laptops'], brand: 'Apple', model: 'MacBook Pro 14" M3', purchase_date: '2025-03-10', warranty_expiry: '2028-03-10', location: 'Mumbai Office', condition: 'Good' },
      { serial_number: 'SN-LAP-LEN-001', asset_tag: 'TAG-LAP-003', category_id: categoryIds['Laptops'], brand: 'Lenovo', model: 'ThinkPad X1 Carbon', purchase_date: '2025-04-01', warranty_expiry: '2028-04-01', location: 'Mumbai Office', condition: 'Fair' },
    ];

    const assetIds = [];
    for (const asset of assets) {
      const [res] = await connection.query(`
        INSERT INTO assets (serial_number, asset_tag, category_id, brand, model, purchase_date, warranty_expiry, location, \`condition\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [asset.serial_number, asset.asset_tag, asset.category_id, asset.brand, asset.model, asset.purchase_date, asset.warranty_expiry, asset.location, asset.condition]);
      assetIds.push(res.insertId);
    }
    console.log('✅ Assets seeded');

    /* ── Allocations ─────────────────────────────── */
    // 1. Allocate Dell Latitude to Alice (employeeIds[0])
    const [alloc1] = await connection.query(`
      INSERT INTO allocations (asset_id, employee_id, allocated_by, expected_return_date, notes)
      VALUES (?, ?, ?, '2026-01-10', 'Issued for full-time work-from-home setup')
    `, [assetIds[0], employeeIds[0], adminId]);

    // 2. Allocate Apple iPhone to Bob (employeeIds[1])
    const [alloc2] = await connection.query(`
      INSERT INTO allocations (asset_id, employee_id, allocated_by, expected_return_date, notes)
      VALUES (?, ?, ?, '2025-09-01', 'For mobile development testing')
    `, [assetIds[3], employeeIds[1], adminId]);

    console.log('✅ Allocations seeded');

    /* ── Returns ─────────────────────────────────── */
    // Return the Dell Latitude allocation back
    await connection.query(`
      INSERT INTO returns (allocation_id, condition_notes, received_by)
      VALUES (?, 'Returned in perfect condition', ?)
    `, [alloc1.insertId, adminId]);

    console.log('✅ Returns seeded (Dell Latitude is returned, Apple iPhone remains allocated)');

    /* ── Damage Reports ──────────────────────────── */
    // LG Monitor (assetIds[1]) reported damaged (Severity: Medium)
    await connection.query(`
      INSERT INTO damage_reports (asset_id, reported_by, severity, description, photo_path, resolution_status)
      VALUES (?, ?, 'Medium', 'Flickering display lines on the left side of the screen', '/uploads/sample_display.jpg', 'Unresolved')
    `, [assetIds[1], adminId]);

    console.log('✅ Damage reports seeded (LG UltraWide is currently damaged)');

    /* ── Activity Logs ───────────────────────────── */
    const logs = [
      [adminId, 'CREATE_USER', 'Admin user created system accounts'],
      [adminId, 'ADD_ASSET', 'Added Dell Latitude (SN-LAP-DELL-001) to inventory'],
      [adminId, 'ADD_ASSET', 'Added LG UltraWide Monitor (SN-MON-LG-001) to inventory'],
      [adminId, 'ALLOCATE_ASSET', 'Allocated Dell Latitude to Alice Johnson'],
      [adminId, 'ALLOCATE_ASSET', 'Allocated Apple iPhone 15 Pro to Bob Smith'],
      [adminId, 'RETURN_ASSET', 'Processed return of Dell Latitude from Alice Johnson'],
      [adminId, 'REPORT_DAMAGE', 'Reported display flickering on LG UltraWide Monitor']
    ];

    for (const [userId, action, details] of logs) {
      await connection.query(`
        INSERT INTO activity_logs (user_id, action, details)
        VALUES (?, ?, ?)
      `, [userId, action, details]);
    }
    console.log('✅ Activity logs seeded');

    /* ── Notifications ───────────────────────────── */
    const notifications = [
      [adminId, 'System Notification: Database successfully migrated and populated.'],
      [adminId, 'Asset Alert: LG UltraWide 34" reported damaged with Medium severity.'],
      [null, 'System Alert: Low stock of Monitors in Mumbai branch (less than 2 available).']
    ];

    for (const [userId, msg] of notifications) {
      await connection.query(`
        INSERT INTO notifications (user_id, message)
        VALUES (?, ?)
      `, [userId, msg]);
    }
    console.log('✅ Notifications seeded');

    await connection.commit();
    console.log('\n🎉 Seeding finished successfully!');
    console.log('Login credentials:');
    console.log('- Admin: admin@company.com / admin123');
    console.log('- Manager: manager@company.com / manager123');
    console.log('- Employee: employee@company.com / employee123');

  } catch (err) {
    await connection.rollback();
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
};

seedData();