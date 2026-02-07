import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function main() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME || 'case_monitoring',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
    });

    try {
        // Get all unique police stations from cases
        const [stations] = await pool.query<mysql.RowDataPacket[]>(
            'SELECT DISTINCT police_station FROM cases ORDER BY police_station'
        );

        console.log('\n📋 Police Stations found in case data:');
        console.log('='.repeat(50));
        stations.forEach((s, i) => console.log(`  ${i + 1}. ${s.police_station}`));

        // Get existing SHO users
        const [existingSHOs] = await pool.query<mysql.RowDataPacket[]>(
            "SELECT police_station FROM users WHERE role = 'SHO'"
        );
        const existingStations = new Set(existingSHOs.map((s) => s.police_station));

        // Find stations without SHO
        const stationsNeedingSHO = stations.filter(
            (s) => !existingStations.has(s.police_station)
        );

        if (stationsNeedingSHO.length === 0) {
            console.log('\n✅ All police stations already have SHO accounts!');
        } else {
            console.log(`\n📝 Creating SHO accounts for ${stationsNeedingSHO.length} stations...`);

            const hashedPassword = await bcrypt.hash('password123', 12);

            for (let i = 0; i < stationsNeedingSHO.length; i++) {
                const station = stationsNeedingSHO[i].police_station;
                const shortName = station.replace(/\s+/g, '').toLowerCase().slice(0, 10);
                const username = `sho_${shortName}`;
                const employeeNumber = `SHO${String(i + 10).padStart(3, '0')}`;

                await pool.query(
                    `INSERT INTO users (id, username, password, name, role, police_station, employee_number)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        uuidv4(),
                        username,
                        hashedPassword,
                        `SHO ${station}`,
                        'SHO',
                        station,
                        employeeNumber,
                    ]
                );
                console.log(`  ✅ Created: ${username} for ${station}`);
            }
        }

        // Show all SHO credentials
        const [allSHOs] = await pool.query<mysql.RowDataPacket[]>(
            "SELECT username, name, police_station FROM users WHERE role = 'SHO' ORDER BY police_station"
        );

        console.log('\n' + '='.repeat(70));
        console.log('📋 ALL SHO LOGIN CREDENTIALS');
        console.log('='.repeat(70));
        console.log('| Username                | Police Station                        |');
        console.log('|' + '-'.repeat(24) + '|' + '-'.repeat(40) + '|');
        allSHOs.forEach((sho) => {
            const username = sho.username.padEnd(22);
            const station = sho.police_station.substring(0, 38).padEnd(38);
            console.log(`| ${username} | ${station} |`);
        });
        console.log('='.repeat(70));
        console.log('\n🔑 Password for ALL accounts: password123');
        console.log('');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();
