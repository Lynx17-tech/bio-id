const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 4000;

// Database connection
const dbPath = path.join(__dirname, 'database', 'bioid.sqlite');
const db = new sqlite3.Database(dbPath);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// --- API ROUTES ---

// 0. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: "running", database: dbPath });
});

// 0.1 Terminal Logger
app.post('/api/log', (req, res) => {
    const { message, level = 'INFO' } = req.body;
    const icons = {
        'INFO': 'ℹ️',
        'SUCCESS': '✅',
        'ERROR': '❌',
        'SCANNER': '🔍'
    };
    const icon = icons[level] || '➡️';
    console.log(`[${new Date().toLocaleTimeString()}] ${icon} ${message}`);
    res.json({ status: "logged" });
});

// 1. Unified Login (Admin & Police)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log(`🔑 Login Attempt: [${username}] with password [${password}]`);

    // Check System Users (PDRRMO / MDRRMO)
    db.get(`SELECT * FROM system_users WHERE username = ? COLLATE NOCASE AND temp_password = ?`, 
    [username, password], (err, adminUser) => {
        if (err) {
            console.error("❌ System User query error:", err);
            return res.status(500).json({ error: err.message });
        }
        
        if (adminUser) {
            console.log(`✅ Admin Authenticated: ${adminUser.username} (${adminUser.role})`);
            return res.json({ user: adminUser, role: adminUser.role });
        }

        console.log(`🔍 No match in system_users. Checking police_accounts...`);

        // Check Police Accounts
        db.get(`SELECT * FROM police_accounts 
                WHERE username = ? COLLATE NOCASE AND temporary_password = ?`, 
        [username, password], (err, policeUser) => {
            if (err) {
                console.error("❌ Police User query error:", err);
                return res.status(500).json({ error: err.message });
            }
            
            if (policeUser) {
                console.log(`✅ Police Authenticated: ${policeUser.username}`);
                return res.json({ user: policeUser, role: 'POLICE' });
            }

            console.log(`🔍 No match in police_accounts. Checking residents...`);

            // Check Residents
            db.get(`SELECT * FROM residents WHERE username = ? COLLATE NOCASE AND password = ?`, 
            [username, password], (err, residentUser) => {
                if (err) {
                    console.error("❌ Resident query error:", err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (residentUser) {
                    console.log(`✅ Resident Authenticated: ${residentUser.username}`);
                    return res.json({ user: residentUser, role: 'RESIDENT' });
                }

                console.warn(`❌ Login FAILED for: [${username}]`);
                res.status(401).json({ error: "Invalid credentials" });
            });
        });
    });
});

// 2. Create MDRRMO/PDRRMO Accounts
app.post('/api/auth/register', (req, res) => {
    const { username, role, first_name, last_name, assigned_municipality, contact_number, temp_password, status } = req.body;
    
    const query = `INSERT INTO system_users 
        (username, role, first_name, last_name, assigned_municipality, contact_number, temp_password) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [username, role, first_name, last_name, assigned_municipality, contact_number, temp_password], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username already taken." });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: "Account Created Successfully" });
    });
});

// 3. Get User Accounts (for lists)
app.get('/api/admin/system-users', (req, res) => {
    const { role } = req.query;
    let query = `SELECT * FROM system_users`;
    let params = [];
    
    if (role) {
        query += ` WHERE role = ?`;
        params.push(role);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. Police Accounts CRUD
app.get('/api/police-accounts', (req, res) => {
    const { jurisdiction } = req.query;
    let query = `SELECT * FROM police_accounts`;
    let params = [];
    
    if (jurisdiction) {
        query += ` WHERE jurisdiction = ?`;
        params.push(jurisdiction);
    }
    
    query += ` ORDER BY created_at DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/police-accounts', (req, res) => {
    const { username, first_name, last_name, contact_number, jurisdiction, temporary_password } = req.body;
    const query = `INSERT INTO police_accounts 
        (username, first_name, last_name, contact_number, jurisdiction, temporary_password) 
        VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [username, first_name, last_name, contact_number, jurisdiction, temporary_password], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username already taken." });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: "Police Account Created" });
    });
});

app.put('/api/police-accounts/:id', (req, res) => {
    const { id } = req.params;
    const { username, first_name, last_name, contact_number, temporary_password } = req.body;
    
    let query = `UPDATE police_accounts SET username = ?, first_name = ?, last_name = ?, contact_number = ?`;
    let params = [username, first_name, last_name, contact_number];

    if (temporary_password) {
        query += `, temporary_password = ?`;
        params.push(temporary_password);
    }

    query += ` WHERE id = ?`;
    params.push(id);
    
    db.run(query, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username already taken." });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Police Account Updated" });
    });
});

app.delete('/api/police-accounts/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM police_accounts WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Police Account Deleted" });
    });
});

// 5. Resident Biometric Login (Fingerprint)
app.post('/api/residents/biometric-login', (req, res) => {
    const { fingerprint_id, biometric_template } = req.body;
    let query = `SELECT * FROM residents WHERE fingerprint_id = ?`;
    let params = [fingerprint_id];

    if (biometric_template) {
        query = `SELECT * FROM residents WHERE biometric_template = ?`;
        params = [biometric_template];
    }

    db.get(query, params, (err, resident) => {
        if (err) return res.status(500).json({ error: err.message });
        if (resident) {
            res.json({ success: true, message: "Identity Verified", resident });
        } else {
            res.status(404).json({ success: false, message: "No Match Found" });
        }
    });
});

// 6. System Users Update
app.put('/api/admin/system-users/:id', (req, res) => {
    const { id } = req.params;
    const { username, first_name, last_name, contact_number, temp_password } = req.body;

    let query = `UPDATE system_users SET first_name = ?, last_name = ?, contact_number = ?`;
    let params = [first_name, last_name, contact_number];

    if (username) {
        query += `, username = ?`;
        params.push(username);
    }
    
    if (temp_password) {
        query += `, temp_password = ?`;
        params.push(temp_password);
    }
    query += ` WHERE id = ?`;
    params.push(id);
    
    db.run(query, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username already taken." });
            }
            return res.status(500).json({ error: err.message });
        }
        
        // Fetch the updated user to return it
        db.get(`SELECT * FROM system_users WHERE id = ?`, [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row);
        });
    });
});

app.delete('/api/admin/system-users/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM system_users WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Account Deleted" });
    });
});

app.get('/api/residents/count', (req, res) => {
    const { municipality } = req.query;
    let query = `SELECT COUNT(*) as count FROM residents`;
    let params = [];
    
    if (municipality) {
        query += ` WHERE municipality = ?`;
        params.push(municipality);
    }
    
    db.get(query, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row.count });
    });
});

app.get('/api/residents', (req, res) => {
    const { municipality, fingerprint_id } = req.query;
    let query = `SELECT * FROM residents WHERE 1=1`;
    let params = [];
    
    if (municipality) {
        query += ` AND municipality = ?`;
        params.push(municipality);
    }
    
    if (fingerprint_id) {
        query += ` AND fingerprint_id = ?`;
        params.push(fingerprint_id);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/residents', (req, res) => {
    const { first_name, last_name, municipality, barangay, contact_number, blood_type, fingerprint_id, biometric_template, medical_info, emergency_contact, emergency_phone, username, password } = req.body;
    const query = `INSERT INTO residents 
        (first_name, last_name, municipality, barangay, contact_number, blood_type, fingerprint_id, biometric_template, medical_info, emergency_contact, emergency_phone, username, password) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [first_name, last_name, municipality, barangay, contact_number, blood_type, fingerprint_id, biometric_template, medical_info, emergency_contact, emergency_phone, username, password], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username or Fingerprint ID already registered." });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: "Resident Registered Successfully" });
    });
});

app.post('/api/residents/wipe-all', (req, res) => {
    db.run(`DELETE FROM residents`, [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "All Resident Database Records Deleted", changes: this.changes });
    });
});

app.delete('/api/residents/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM residents WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Resident not found" });
        res.json({ message: "Resident Record Deleted" });
    });
});

// Flat POST route for account updates (more robust routing)
app.post('/api/residents/update-account', (req, res) => {
    const { id, username, password } = req.body;
    
    if (!id || !username || !password) {
        return res.status(400).json({ error: "Required fields missing (ID, Username, Password)." });
    }

    const query = `UPDATE residents SET username = ?, password = ? WHERE id = ?`;
    db.run(query, [username, password, id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Username already taken." });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Account Updated Successfully" });
    });
});

// 3. Accident Reports CRUD
app.get('/api/reports', (req, res) => {
    const { jurisdiction } = req.query;
    let query = `SELECT * FROM accident_reports`;
    let params = [];
    
    if (jurisdiction) {
        query += ` WHERE jurisdiction = ?`;
        params.push(jurisdiction);
    }
    
    query += ` ORDER BY datetime DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/reports', (req, res) => {
    const { datetime, jurisdiction, location, severity, status, involved_biometrics, reporting_officer } = req.body;
    const query = `INSERT INTO accident_reports 
        (datetime, jurisdiction, location, severity, status, involved_biometrics, reporting_officer) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [datetime, jurisdiction, location, severity, status, involved_biometrics, reporting_officer], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "Report Created" });
    });
});

app.put('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    const { datetime, jurisdiction, location, severity, status, involved_biometrics } = req.body;
    const query = `UPDATE accident_reports SET datetime = ?, jurisdiction = ?, location = ?, severity = ?, status = ?, involved_biometrics = ? WHERE id = ?`;
    
    db.run(query, [datetime, jurisdiction, location, severity, status, involved_biometrics, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Report Updated" });
    });
});

app.delete('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM accident_reports WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Report Deleted" });
    });
});

app.use(express.static(__dirname)); // Serve frontend files AFTER routes

// 404 Handler (Should be after all routes)
app.use((req, res) => {
    console.error(`❌ 404 Not Found: ${req.url}`);
    res.status(404).json({ error: "API Route not found on local server." });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`❌ Server Error:`, err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 [${new Date().toLocaleTimeString()}] BioID Local Server (v2) running at http://localhost:${PORT}/`);
    console.log(`📁 Database: ${dbPath}`);
    console.log(`✨ SQLite is now handling all logins and reports!`);
    console.log(`\nTo test on mobile, run: npx localtunnel --port ${PORT}\n`);
});
