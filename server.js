const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 4000;

// Supabase Connection
const supabaseUrl = 'https://tzsglayusbbaajvsohtn.supabase.co';
const supabaseKey = 'sb_publishable_fKtzX1kqT-2Qfi2j_aQoUQ_8dZFCmIa';
const supabase = createClient(supabaseUrl, supabaseKey);

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
app.get('/api/health', (req, res) => res.json({ status: "running", database: "Supabase Postgres" }));

// 0.1 Terminal Logger
app.post('/api/log', (req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.body.message}`);
    res.json({ status: "logged" });
});

// 1. Unified Login (Fallback if frontend calls it)
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    let { data: adminUser } = await supabase.from('system_users').select('*').ilike('username', username).eq('temp_password', password).maybeSingle();
    if (adminUser) return res.json({ user: adminUser, role: adminUser.role });

    let { data: policeUser } = await supabase.from('police_accounts').select('*').ilike('username', username).eq('temporary_password', password).maybeSingle();
    if (policeUser) return res.json({ user: policeUser, role: 'POLICE' });

    let { data: residentUser } = await supabase.from('residents').select('*').ilike('username', username).eq('password', password).maybeSingle();
    if (residentUser) return res.json({ user: residentUser, role: 'RESIDENT' });

    res.status(401).json({ error: "Invalid credentials" });
});

// 2. Create System Accounts
app.post('/api/auth/register', async (req, res) => {
    const { username, role, first_name, last_name, assigned_municipality, contact_number, temp_password } = req.body;
    const { data, error } = await supabase.from('system_users').insert([{ username, role, first_name, last_name, assigned_municipality, contact_number, temp_password }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id, message: "Account Created Successfully" });
});

// 3. Get System Users
app.get('/api/admin/system-users', async (req, res) => {
    const { role } = req.query;
    let query = supabase.from('system_users').select('*');
    if (role) query = query.eq('role', role);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 4. Police Accounts CRUD
app.get('/api/police-accounts', async (req, res) => {
    const { jurisdiction } = req.query;
    let query = supabase.from('police_accounts').select('*').order('created_at', { ascending: false });
    if (jurisdiction) query = query.eq('jurisdiction', jurisdiction);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/police-accounts', async (req, res) => {
    const { username, first_name, last_name, contact_number, jurisdiction, temporary_password } = req.body;
    const { data, error } = await supabase.from('police_accounts').insert([{ username, first_name, last_name, contact_number, jurisdiction, temporary_password }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id, message: "Police Account Created" });
});

app.put('/api/police-accounts/:id', async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body };
    const { error } = await supabase.from('police_accounts').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Police Account Updated" });
});

app.delete('/api/police-accounts/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('police_accounts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Police Account Deleted" });
});

// Residents CRUD
app.get('/api/residents', async (req, res) => {
    const { municipality, fingerprint_id } = req.query;
    let query = supabase.from('residents').select('*');
    if (municipality) query = query.eq('municipality', municipality);
    if (fingerprint_id) query = query.eq('fingerprint_id', fingerprint_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/residents', async (req, res) => {
    const { data, error } = await supabase.from('residents').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id, message: "Resident Registered Successfully" });
});

app.delete('/api/residents/:id', async (req, res) => {
    const { error } = await supabase.from('residents').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Resident Record Deleted" });
});

// Reports CRUD
app.get('/api/reports', async (req, res) => {
    const { jurisdiction } = req.query;
    let query = supabase.from('accident_reports').select('*').order('datetime', { ascending: false });
    if (jurisdiction) query = query.eq('jurisdiction', jurisdiction);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/reports', async (req, res) => {
    const { data, error } = await supabase.from('accident_reports').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id, message: "Report Created" });
});

app.put('/api/reports/:id', async (req, res) => {
    const { error } = await supabase.from('accident_reports').update(req.body).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Report Updated" });
});

app.delete('/api/reports/:id', async (req, res) => {
    const { error } = await supabase.from('accident_reports').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Report Deleted" });
});

// Serve frontend files AFTER routes
app.use(express.static(__dirname));

app.use((req, res) => res.status(404).json({ error: "API Route not found." }));
app.use((err, req, res, next) => res.status(500).json({ error: "Internal Server Error", details: err.message }));

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 BioID Supabase Server running at http://localhost:${PORT}`));
}

module.exports = app;
