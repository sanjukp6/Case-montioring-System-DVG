import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const dbName = process.env.DB_NAME || 'case_monitoring';

async function createDatabase() {
    // Connect to MySQL without specifying a database first
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
    });

    try {
        // Check if database exists and create if not
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✅ Database '${dbName}' created/verified successfully`);
    } catch (error) {
        console.error('Error creating database:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

async function initializeTables() {
    // Connect to our database
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: dbName,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        waitForConnections: true,
        connectionLimit: 10,
    });

    try {
        // Create users table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        police_station VARCHAR(100) NOT NULL,
        employee_number VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT chk_role CHECK (role IN ('Writer', 'SHO', 'SP'))
      )
    `);
        console.log('✅ Users table created');

        // Create cases table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id VARCHAR(36) PRIMARY KEY,
        sl_no VARCHAR(50),
        police_station VARCHAR(100) NOT NULL,
        crime_number VARCHAR(100) NOT NULL,
        sections_of_law TEXT,
        investigating_officer VARCHAR(100),
        public_prosecutor VARCHAR(100),
        date_of_charge_sheet DATE,
        cc_no_sc_no VARCHAR(100),
        court_name VARCHAR(200),
        total_accused INT DEFAULT 0,
        accused_names TEXT,
        accused_in_judicial_custody INT DEFAULT 0,
        accused_on_bail INT DEFAULT 0,
        total_witnesses INT DEFAULT 0,
        witness_details JSON,
        hearings JSON,
        next_hearing_date DATE,
        current_stage_of_trial VARCHAR(100),
        date_of_framing_charges DATE,
        date_of_judgment DATE,
        judgment_result VARCHAR(50),
        reason_for_acquittal TEXT,
        total_accused_convicted INT DEFAULT 0,
        accused_convictions JSON,
        fine_amount VARCHAR(50),
        victim_compensation VARCHAR(50),
        higher_court_details JSON,
        status VARCHAR(20) DEFAULT 'draft',
        created_by VARCHAR(36),
        approved_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT chk_status CHECK (status IN ('draft', 'pending_approval', 'approved')),
        CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
        console.log('✅ Cases table created');

        // Create audit_logs table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(36),
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
        console.log('✅ Audit logs table created');

        // Create indexes for better performance (ignore errors if they already exist)
        try {
            await pool.query(`CREATE INDEX idx_cases_police_station ON cases(police_station)`);
        } catch (e) { /* Index may already exist */ }
        try {
            await pool.query(`CREATE INDEX idx_cases_crime_number ON cases(crime_number)`);
        } catch (e) { /* Index may already exist */ }
        try {
            await pool.query(`CREATE INDEX idx_cases_status ON cases(status)`);
        } catch (e) { /* Index may already exist */ }
        try {
            await pool.query(`CREATE INDEX idx_cases_created_at ON cases(created_at)`);
        } catch (e) { /* Index may already exist */ }
        try {
            await pool.query(`CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)`);
        } catch (e) { /* Index may already exist */ }
        try {
            await pool.query(`CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at)`);
        } catch (e) { /* Index may already exist */ }
        console.log('✅ Indexes created');

        return pool;
    } catch (error) {
        console.error('Error creating tables:', error);
        throw error;
    }
}

async function insertDummyData(pool: mysql.Pool) {
    try {
        // Check if users already exist
        const [existingUsers] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
        if ((existingUsers[0] as { count: number }).count > 0) {
            console.log('ℹ️ Users already exist, skipping dummy data insertion');
            return;
        }

        // Hash passwords
        const hashedPassword = await bcrypt.hash('password123', 12);

        // Insert demo users
        const users = [
            {
                id: uuidv4(),
                username: 'writer1',
                password: hashedPassword,
                name: 'Constable Ravi Kumar',
                role: 'Writer',
                police_station: 'Davangere City PS',
                employee_number: 'EMP001',
            },
            {
                id: uuidv4(),
                username: 'writer2',
                password: hashedPassword,
                name: 'Constable Suma B',
                role: 'Writer',
                police_station: 'Harihar PS',
                employee_number: 'EMP002',
            },
            {
                id: uuidv4(),
                username: 'sho1',
                password: hashedPassword,
                name: 'Inspector Manjunath R',
                role: 'SHO',
                police_station: 'Davangere City PS',
                employee_number: 'SHO001',
            },
            {
                id: uuidv4(),
                username: 'sho2',
                password: hashedPassword,
                name: 'Inspector Lakshmi Devi',
                role: 'SHO',
                police_station: 'Harihar PS',
                employee_number: 'SHO002',
            },
            {
                id: uuidv4(),
                username: 'sp1',
                password: hashedPassword,
                name: 'SP Uma Prashanth',
                role: 'SP',
                police_station: 'District HQ',
                employee_number: 'SP001',
            },
        ];

        for (const user of users) {
            await pool.query(
                `INSERT INTO users (id, username, password, name, role, police_station, employee_number)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [user.id, user.username, user.password, user.name, user.role, user.police_station, user.employee_number]
            );
        }
        console.log('✅ Demo users created');
        console.log('');
        console.log('📋 Demo Login Credentials:');
        console.log('   ┌─────────────┬───────────────┬─────────┐');
        console.log('   │ Username    │ Password      │ Role    │');
        console.log('   ├─────────────┼───────────────┼─────────┤');
        console.log('   │ writer1     │ password123   │ Writer  │');
        console.log('   │ writer2     │ password123   │ Writer  │');
        console.log('   │ sho1        │ password123   │ SHO     │');
        console.log('   │ sho2        │ password123   │ SHO     │');
        console.log('   │ sp1         │ password123   │ SP      │');
        console.log('   └─────────────┴───────────────┴─────────┘');

        // Insert sample cases
        const sampleCases = [
            {
                id: uuidv4(),
                sl_no: '1',
                police_station: 'Davangere City PS',
                crime_number: 'CR/2024/001',
                sections_of_law: 'IPC 302, 307',
                investigating_officer: 'SI Ramesh',
                public_prosecutor: 'PP Advocate Sharma',
                cc_no_sc_no: 'SC/2024/100',
                court_name: 'District Sessions Court, Davangere',
                total_accused: 2,
                accused_names: 'Accused 1, Accused 2',
                accused_in_judicial_custody: 1,
                accused_on_bail: 1,
                total_witnesses: 5,
                current_stage_of_trial: 'Evidence',
                status: 'approved',
                created_by: users[0].id,
            },
            {
                id: uuidv4(),
                sl_no: '2',
                police_station: 'Davangere City PS',
                crime_number: 'CR/2024/002',
                sections_of_law: 'IPC 379, 411',
                investigating_officer: 'SI Shivakumar',
                public_prosecutor: 'PP Advocate Reddy',
                cc_no_sc_no: 'CC/2024/150',
                court_name: 'JMFC Court 1, Davangere',
                total_accused: 1,
                accused_names: 'Accused A',
                accused_in_judicial_custody: 0,
                accused_on_bail: 1,
                total_witnesses: 3,
                current_stage_of_trial: 'Arguments',
                status: 'pending_approval',
                created_by: users[0].id,
            },
            {
                id: uuidv4(),
                sl_no: '3',
                police_station: 'Harihar PS',
                crime_number: 'CR/2024/010',
                sections_of_law: 'IPC 420',
                investigating_officer: 'PSI Meena',
                public_prosecutor: 'PP Advocate Kumar',
                cc_no_sc_no: 'CC/2024/200',
                court_name: 'JMFC Court, Harihar',
                total_accused: 3,
                accused_names: 'Accused X, Accused Y, Accused Z',
                accused_in_judicial_custody: 2,
                accused_on_bail: 1,
                total_witnesses: 7,
                current_stage_of_trial: 'Framing of Charges',
                status: 'draft',
                created_by: users[1].id,
            },
        ];

        for (const caseData of sampleCases) {
            await pool.query(
                `INSERT INTO cases (id, sl_no, police_station, crime_number, sections_of_law, investigating_officer,
          public_prosecutor, cc_no_sc_no, court_name, total_accused, accused_names,
          accused_in_judicial_custody, accused_on_bail, total_witnesses, current_stage_of_trial,
          status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    caseData.id, caseData.sl_no, caseData.police_station, caseData.crime_number, caseData.sections_of_law,
                    caseData.investigating_officer, caseData.public_prosecutor, caseData.cc_no_sc_no,
                    caseData.court_name, caseData.total_accused, caseData.accused_names,
                    caseData.accused_in_judicial_custody, caseData.accused_on_bail, caseData.total_witnesses,
                    caseData.current_stage_of_trial, caseData.status, caseData.created_by
                ]
            );
        }
        console.log('✅ Sample cases created');

    } catch (error) {
        console.error('Error inserting dummy data:', error);
        throw error;
    }
}

async function main() {
    console.log('');
    console.log('='.repeat(60));
    console.log('  🗄️  Database Initialization Script');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Step 1: Create database
        await createDatabase();

        // Step 2: Create tables
        const pool = await initializeTables();

        // Step 3: Insert dummy data
        await insertDummyData(pool);

        await pool.end();

        console.log('');
        console.log('='.repeat(60));
        console.log('  ✅ Database initialization completed successfully!');
        console.log('='.repeat(60));
        console.log('');
        console.log('Next steps:');
        console.log('  1. Start the backend server: npm run dev');
        console.log('  2. Start the frontend: cd .. && npm run dev');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ Database initialization failed:', error);
        console.error('');
        console.error('Please ensure:');
        console.error('  1. MySQL is installed and running');
        console.error('  2. The credentials in .env are correct');
        console.error('');
        process.exit(1);
    }
}

main();
