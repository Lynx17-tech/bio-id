document.addEventListener('DOMContentLoaded', () => {
    // SUPABASE INITIALIZATION
    const supabaseUrl = 'https://rbncteviieusldynswny.supabase.co';
    const supabaseKey = 'sb_publishable_7CR3OUMv3lrkGVIfzHko1g_Dpu-yrF0';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    const API_URL = `${window.location.origin}/api`;

    // --- TAB SWITCHING LOGIC ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const headerTitle = document.getElementById('current-tab-title');

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = btn.dataset.tab;

            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(tab => tab.style.display = 'none');
            const targetTab = document.getElementById(tabId + 'Tab');
            if (targetTab) targetTab.style.display = 'block';

            if (headerTitle) headerTitle.textContent = btn.querySelector('.links_name').textContent;

            // Mobile Sidebar Auto-close
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector(".sidebar");
                if (sidebar) sidebar.classList.remove("active");
            }

            // Invalidate Map Size if Map Tab
            if (tabId === 'safemap' && typeof map !== 'undefined') {
                setTimeout(() => map.invalidateSize(), 50);
            }
        });
    });

    // --- RESIDENT DATA HANDLING ---
    const loadResidentData = async () => {
        let resident = null;
        const sessionData = sessionStorage.getItem('activeUserData');
        
        if (sessionData) {
            resident = JSON.parse(sessionData);
            renderProfile(resident);
            fetchIncidentReports(resident.municipality);
        } else {
            // Redirect to login if no session (Production Security)
            window.location.href = '../../index.html';
        }
    };

    const renderProfile = (res) => {
        const full = `${res.first_name} ${res.last_name}`;
        
        // Update welcome texts
        if (document.getElementById('welcome-name')) document.getElementById('welcome-name').textContent = res.first_name;
        if (document.getElementById('resident-name')) document.getElementById('resident-name').textContent = full;
        
        // Update ID Card
        if (document.getElementById('card-name')) document.getElementById('card-name').textContent = full;
        if (document.getElementById('card-muni')) document.getElementById('card-muni').textContent = `Municipality: ${res.municipality}`;
        
        // Update Medical Tab
        if (document.getElementById('med-blood')) document.getElementById('med-blood').textContent = res.blood_type || 'Unknown';
        if (document.getElementById('med-conditions')) document.getElementById('med-conditions').textContent = res.medical_remarks || 'None reported';
        
        // Update settings tab
        if (document.getElementById('biometric-status-text')) {
             document.getElementById('biometric-status-text').textContent = `Your fingerprint is registered and verified under ID: ${res.fingerprint_id || 'F-xxxx'}`;
        }

        // Sidebar avatar update
        const profileImg = document.querySelector('.profile-details img');
        if (profileImg) {
            profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(full)}&background=10B981&color=fff&bold=true`;
        }
    };

    window.showReportModal = (index) => {
        const report = window.currentReports[index];
        if(!report) return;
        
        document.getElementById('v-datetime').textContent = new Date(report.datetime).toLocaleString();
        
        let victimName = "Unidentified";
        if (report.involved_biometrics) {
            const match = report.involved_biometrics.match(/Name:\s*([^\n]+)/);
            if (match) victimName = match[1].trim();
        }
        document.getElementById('v-name').textContent = victimName;
        
        document.getElementById('v-location').textContent = report.location;
        document.getElementById('v-severity').textContent = report.severity;
        document.getElementById('v-officer').textContent = report.reporting_officer || 'PNP';
        
        document.getElementById('viewReportModal').classList.add('show');
    };

    const fetchIncidentReports = async (municipality) => {
        try {
            const apiUrl = `${API_URL}/reports?jurisdiction=${encodeURIComponent(municipality)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            const tbody = document.getElementById('resident-reports-body');
            
            if (data && data.length > 0) {
                window.currentReports = data;
                tbody.innerHTML = '';
                data.forEach((report, index) => {
                    const row = `
                        <tr>
                            <td>${new Date(report.datetime).toLocaleDateString()}</td>
                            <td>${report.location}</td>
                            <td><span class="badge ${getSeverityClass(report.severity)}">${report.severity}</span></td>
                            <td>Officer ${report.reporting_officer || 'PNP'}</td>
                            <td><button class="btn btn-sm btn-outline-primary" onclick="window.showReportModal(${index})">View</button></td>
                        </tr>
                    `;
                    tbody.insertAdjacentHTML('beforeend', row);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No recent records in ${municipality}. Safe travels!</td></tr>`;
            }
        } catch (err) {
            console.error("Error fetching municipality reports:", err);
            document.getElementById('resident-reports-body').innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Failed to load reports from server</td></tr>`;
        }
    };

    const getSeverityClass = (s) => {
        if (s === 'Minor') return 'badge-success';
        if (s === 'Moderate') return 'badge-pending';
        return 'badge-critical';
    };

    // --- PUBLIC SAFETY MAP INIT ---
    let map;
    const initMap = () => {
        const antiqueBounds = [
            [10.35, 121.30], 
            [12.10, 122.35]  
        ];

        map = L.map('residentRiskMap', {
            zoomControl: false,
            maxBounds: antiqueBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 9
        }).setView([11.15, 122.04], 9);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Fetch areas with high accident count
        fetchHighRiskZones();
    };

    const fetchHighRiskZones = async () => {
        try {
            const apiUrl = `${API_URL}/reports/statistics`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            // Marker logic based on frequency in data...
            // Mock markers for residents to see hotspots
            const hotspots = [
                { name: "San Jose Public Plaza Area", lat: 10.74, lng: 121.94, risk: "High" },
                { name: "Sibalom Crossing", lat: 10.78, lng: 122.01, risk: "Moderate" },
                { name: "Hamtic National Highway", lat: 10.71, lng: 121.97, risk: "High" }
            ];

            hotspots.forEach(spot => {
                const color = spot.risk === 'High' ? '#EF4444' : '#F59E0B';
                L.circle([spot.lat, spot.lng], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.5,
                    radius: 800
                }).addTo(map).bindPopup(`<b>${spot.name}</b><br>Risk Level: ${spot.risk}`);
            });

        } catch (err) {
            console.error("Error loading hotspots:", err);
        }
    };

    // --- PORTAL CREDENTIALS MGMT ---
    const editBtn = document.getElementById('edit-credentials-btn');
    const saveBtn = document.getElementById('save-credentials-btn');
    const cancelBtn = document.getElementById('cancel-credentials-btn');
    const viewMode = document.getElementById('credential-view-mode');
    const editMode = document.getElementById('credential-edit-mode');
    
    const displayUser = document.getElementById('display-username');
    const displayPass = document.getElementById('display-password');
    const inputUser = document.getElementById('edit-username');
    const inputPass = document.getElementById('edit-password');

    const toggleViewPass = document.getElementById('toggle-view-password');
    const toggleEditPass = document.getElementById('toggle-edit-password');

    // Initial load of values
    const resident = JSON.parse(sessionStorage.getItem('activeUserData'));
    if (resident) {
        displayUser.textContent = resident.username;
        inputUser.value = resident.username;
        inputPass.value = resident.password;
    }

    // Toggle Password Visibility in View Mode
    let isPassVisible = false;
    toggleViewPass.onclick = () => {
        isPassVisible = !isPassVisible;
        displayPass.textContent = isPassVisible ? resident.password : '••••••••';
        toggleViewPass.className = isPassVisible ? 'bx bx-hide' : 'bx bx-show';
        toggleViewPass.style.color = isPassVisible ? '#94A3B8' : 'var(--resident-primary)';
    };

    // Toggle Password Visibility in Edit Mode
    toggleEditPass.onclick = () => {
        const type = inputPass.getAttribute('type') === 'password' ? 'text' : 'password';
        inputPass.setAttribute('type', type);
        toggleEditPass.className = type === 'password' ? 'bx bx-hide' : 'bx bx-show';
    };

    editBtn.onclick = () => {
        viewMode.classList.add('d-none');
        editMode.classList.remove('d-none');
        editBtn.classList.add('d-none');
        saveBtn.classList.remove('d-none');
        cancelBtn.classList.remove('d-none');
    };

    cancelBtn.onclick = () => {
        viewMode.classList.remove('d-none');
        editMode.classList.add('d-none');
        editBtn.classList.remove('d-none');
        saveBtn.classList.add('d-none');
        cancelBtn.classList.add('d-none');
        // Reset inputs
        inputUser.value = resident.username;
        inputPass.value = resident.password;
    };

    saveBtn.onclick = async () => {
        const newUsername = inputUser.value.trim();
        const newPassword = inputPass.value;

        if (!newUsername || !newPassword) {
            alert("Username and password cannot be empty.");
            return;
        }

        if (!resident || !resident.id) {
            console.error("Resident ID missing from session. Cannot update.", resident);
            alert("Session issue: Resident ID missing. Please log out and back in.");
            saveBtn.disabled = false;
            saveBtn.innerHTML = "Update";
            return;
        }

        try {
            const apiUrl = `${API_URL}/residents/update-account`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: resident.id, 
                    username: newUsername, 
                    password: newPassword 
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Update local storage
                resident.username = newUsername;
                resident.password = newPassword;
                sessionStorage.setItem('activeUserData', JSON.stringify(resident));
                
                // Update display
                displayUser.textContent = newUsername;
                displayPass.textContent = isPassVisible ? newPassword : '••••••••';
                
                // Switch back to view mode
                cancelBtn.onclick();
                alert("Credentials updated successfully!");
            } else {
                alert(result.error || "Failed to update credentials.");
            }
        } catch (err) {
            console.error("Save error:", err);
            alert("Connection error. Is the server running?");
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = "Save Changes";
        }
    };

    // --- PROFILE DROPDOWN ---
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileMenu = document.getElementById('profileMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const settingsDropdownBtn = document.getElementById('openSettingsBtnDropdown');

    if (profileDropdownBtn && profileMenu) {
        profileDropdownBtn.onclick = (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('show');
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            profileMenu.classList.remove('show');
        });
    }

    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            sessionStorage.removeItem('activeUserData');
            window.location.href = '../../index.html';
        };
    }

    if (settingsDropdownBtn) {
        settingsDropdownBtn.onclick = (e) => {
            e.preventDefault();
            const settingsTabBtn = document.querySelector('.nav-btn[data-tab="settings"]');
            if (settingsTabBtn) settingsTabBtn.click();
        };
    }

    // --- SIDEBAR TOGGLE ---
    const sidebar = document.querySelector(".sidebar");
    const sidebarBtn = document.querySelector(".sidebarBtn");
    if (sidebarBtn) {
        sidebarBtn.onclick = () => {
            sidebar.classList.toggle("active");
        };
    }

    // --- INITIALIZE ---
    loadResidentData();
    initMap();
});
