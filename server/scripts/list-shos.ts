import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

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
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
            "SELECT username, police_station FROM users WHERE role = 'SHO' ORDER BY police_station"
        );

        let output = '# SHO Login Credentials\n\n';
        output += '**Password for ALL accounts:** `password123`\n\n';
        output += '| # | Username | Police Station |\n';
        output += '|---|----------|----------------|\n';

        rows.forEach((r, i) => {
            output += `| ${i + 1} | \`${r.username}\` | ${r.police_station} |\n`;
        });

        output += `\n**Total SHOs:** ${rows.length}\n`;

        fs.writeFileSync('sho-credentials.md', output);
        console.log('Credentials written to sho-credentials.md');
    } finally {
        await pool.end();
    }
}

main();
