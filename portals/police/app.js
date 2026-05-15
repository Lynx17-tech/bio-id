document.addEventListener('DOMContentLoaded', async () => {
    // 1. SUPABASE INITIALIZATION
    const supabaseUrl = 'https://tzsglayusbbaajvsohtn.supabase.co';
    const supabaseKey = 'sb_publishable_fKtzX1kqT-2Qfi2j_aQoUQ_8dZFCmIa';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // 2. CHECK SESSION
    const activeUserData = JSON.parse(sessionStorage.getItem('activeUserData'));
    if (!activeUserData || activeUserData.role !== 'POLICE') {
        window.location.href = '../../index.html';
        return;
    }

    const API_URL = `${window.location.origin}/api`;

    // --- MOBILE HARDWARE SUPPORT ---
    const BiometricService = {
        isNative: !!window.Capacitor,
        async scan() {
            if (this.isNative) {
                try {
                    const { NativeBiometric } = Capacitor.Plugins;
                    await NativeBiometric.verifyIdentity({
                        reason: "Biometric identification for BioID System",
                        title: "BioID Verification",
                        subtitle: "Place your finger on the sensor",
                    });
                    return { success: true, type: 'native' };
                } catch (e) {
                    console.error("Native Biometric Error:", e);
                    return { success: false, error: e };
                }
            }
            return { success: false, error: "Not a native environment" };
        }
    };

    // Terminal Logging Helper
    async function logToTerminal(message, level = 'INFO') {
        try {
            await fetch(`${API_URL}/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, level })
            });
        } catch (e) {
            console.error('Logger failed', e);
        }
    }

    // Identify Jurisdiction and Officer
    const officerName = `${activeUserData.first_name} ${activeUserData.last_name}`;
    const assignedJurisdiction = activeUserData.jurisdiction;

    // Update UI Elements
    document.getElementById('profileName').textContent = `Officer ${activeUserData.last_name}`;
    document.getElementById('municipalityBadge').textContent = `Jurisdiction: ${assignedJurisdiction}`;
    document.getElementById('jurisdictionTitle').textContent = assignedJurisdiction;
    document.getElementById('profileImg').src = `https://ui-avatars.com/api/?name=${activeUserData.first_name}+${activeUserData.last_name}&background=103155&color=fff`;

    const muniTexts = document.querySelectorAll('.dynamic-muni');
    muniTexts.forEach(el => el.textContent = assignedJurisdiction);

    // Sidebar Logic
    const sidebar = document.querySelector(".sidebar");
    const sidebarBtn = document.querySelector(".sidebarBtn");
    sidebarBtn.onclick = function () {
        sidebar.classList.toggle("active");
        if (sidebar.classList.contains("active")) {
            sidebarBtn.classList.replace("bx-menu", "bx-menu-alt-right");
        } else {
            sidebarBtn.classList.replace("bx-menu-alt-right", "bx-menu");
        }
    }

    // TAB SWITCHING LOGIC
    const navLinks = document.querySelectorAll('.nav-links li a');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const tabName = link.getAttribute('data-tab');
            if (!tabName) return;

            e.preventDefault();
            const targetTabId = tabName + 'Tab';
            const targetTab = document.getElementById(targetTabId);

            if (targetTab) {
                // Update active state in sidebar
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Toggle tabs
                tabContents.forEach(tab => tab.classList.remove('active'));
                targetTab.classList.add('active');

                // Update Title
                document.querySelector('.dashboard').textContent = link.querySelector('.links_name').textContent;

                // Mobile Sidebar Auto-close
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove("active");
                    sidebarBtn.classList.replace("bx-menu-alt-right", "bx-menu");
                }

                // Special handling for Leaflet maps
                if ((tabName === 'dashboard' || tabName === 'map') && typeof map !== 'undefined') {
                    setTimeout(() => {
                        if (map) map.invalidateSize();
                        if (fullMap) fullMap.invalidateSize();
                    }, 100);
                }
            }
        });
    });

    // 3. PROFILE DROPDOWN LOGIC
    const profileBtn = document.getElementById('profileDropdownBtn');
    const profileMenu = document.getElementById('profileMenu');

    profileBtn.onclick = (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('show');
    };

    window.onclick = (event) => {
        if (!event.target.closest('.profile-details')) {
            profileMenu.classList.remove('show');
        }
    };

    // 4. SETTINGS MODAL LOGIC
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');

    // Pre-fill
    if (activeUserData) {
        document.getElementById('settingsUsername').value = activeUserData.username || '';
        document.getElementById('settingsFirstName').value = activeUserData.first_name || '';
        document.getElementById('settingsLastName').value = activeUserData.last_name || '';
        document.getElementById('settingsContact').value = activeUserData.contact_number || '';
        document.getElementById('settingsPassword').value = activeUserData.temporary_password || '';
    }

    // Password Toggle
    document.querySelectorAll('.toggle-settings-password').forEach(icon => {
        icon.onclick = () => {
            const fieldId = icon.getAttribute('data-target');
            const field = document.getElementById(fieldId);
            if (field.type === 'password') {
                field.type = 'text';
                icon.classList.replace('bx-hide', 'bx-show');
            } else {
                field.type = 'password';
                icon.classList.replace('bx-show', 'bx-hide');
            }
        };
    });

    openSettingsBtn.onclick = (e) => {
        e.preventDefault();
        settingsModal.style.display = 'flex';
        profileMenu.classList.remove('show');
    };

    closeSettingsBtn.onclick = () => {
        settingsModal.style.display = 'none';
    };

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updateData = {
            username: document.getElementById('settingsUsername').value.trim(),
            first_name: document.getElementById('settingsFirstName').value.trim(),
            last_name: document.getElementById('settingsLastName').value.trim(),
            contact_number: document.getElementById('settingsContact').value.trim(),
            temporary_password: document.getElementById('settingsPassword').value.trim()
        };

        try {
            const response = await fetch(`${API_URL}/police-accounts/${activeUserData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Update failed");

            // Update session storage
            const updatedUser = { ...activeUserData, ...updateData };
            sessionStorage.setItem('activeUserData', JSON.stringify(updatedUser));
            
            showCustomAlert("Settings updated! Reloading to apply changes...", "success", "Update Success");
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            console.error(err);
            showCustomAlert(err.message || "Update failed.", "error", "Error");
        }
    });

    // 5. ACCIDENT REPORTS MANAGEMENT
    const openAddReportBtn = document.getElementById('openAddReportBtn');
    const closeReportBtn = document.getElementById('closeReportBtn');
    const cancelReportBtn = document.getElementById('cancelReportBtn');
    const reportModal = document.getElementById('reportModal');
    const reportForm = document.getElementById('reportForm');
    const dashboardReportsTableBody = document.getElementById('dashboardReportsTableBody');
    const fullReportsTableBody = document.getElementById('fullReportsTableBody');

    // ANTIQUE DATASET
    const antiqueData = {
        "Anini-y": ["Bayo Grande", "Bayo Pequeño", "Butuan", "Casay", "Casay Viejo", "Iba", "Igbarabatuan", "Igpalge", "Igtumarom", "Lisub A", "Lisub B", "Mabuyong", "Magdalena", "Nasuli C", "Nato", "Poblacion", "Sagua", "Salvacion", "San Francisco", "San Ramon", "San Roque", "Tagaytay", "Talisayan"],
        "Barbaza": ["Baghari", "Bahuyan", "Beri", "Biga-a", "Binangbang", "Binangbang Centro", "Binanu-an", "Cadiao", "Calapadan", "Capoyuan", "Cubay", "Embrangga-an", "Esparar", "Gua", "Idao", "Igpalge", "Igtunarum", "Integasan", "Ipil", "Jinalinan", "Lanas", "Langcaon", "Lisub", "Lombuyan", "Mablad", "Magtulis", "Marigne", "Mayabay", "Mayos", "Nalusdan", "Narirong", "Palma", "Poblacion", "San Antonio", "San Ramon", "Soligao", "Tabongtabong", "Tig-alaran", "Yapo"],
        "Belison": ["Borocboroc", "Buenavista", "Concepcion", "Delima", "Ipil", "Maradiona", "Mojon", "Poblacion", "Rombang", "Salvacion", "Sinaja"],
        "Bugasong": ["Anilawan", "Arangote", "Bagtason", "Camangahan", "Centro Ilawod", "Centro Ilaya", "Centro Pojo", "Cubay North", "Cubay South", "Guija", "Igbalangao", "Igsoro", "Ilaures", "Jinalinan", "Lacayon", "Maray", "Paliwan", "Pangalcagan", "Sabang East", "Sabang West", "Tagudtud North", "Tagudtud South", "Talisay", "Tica", "Tono-an", "Yapu", "Zaragoza"],
        "Caluya": ["Alegria", "Bacong", "Banago", "Bonbon", "Dawis", "Dionela", "Harigue", "Hininga-an", "Imba", "Masanag", "Poblacion", "Sabang", "Salamento", "Semirara", "Sibato", "Sibay", "Sibolo", "Tinogboc"],
        "Culasi": ["Alojipan", "Bagacay", "Balac-balac", "Batbatan Island", "Batonan Norte", "Batonan Sur", "Bita", "Bitadton Norte", "Bitadton Sur", "Buenavista", "Buhi", "Camancijan", "Caridad", "Carit-an", "Centro Norte", "Centro Poblacion", "Centro Sur", "Condes", "Esperanza", "Fe", "Flores", "Jalandoni", "Janlagasi", "Lamputong", "Lipata", "Magsaysay", "Malacañang", "Malalison Island", "Maniguin", "Naba", "Osorio", "Paningayan", "Salde", "San Antonio", "San Gregorio", "San Juan", "San Luis", "San Pascual", "San Vicente", "Simbola", "Tigbobolo", "Tinabusan", "Tomao", "Valderama"],
        "Hamtic": ["Apdo", "Asluman", "Banawon", "Bia-an", "Bongbongan I-II", "Bongbongan III", "Botbot", "Budbudan", "Buhang", "Calacja I", "Calacja II", "Calala", "Cantulan", "Caridad", "Caromangay", "Casalngan", "Dangcalan", "Del Pilar", "Fabrica", "Funda", "General Fullon", "Gov. Evelio B. Javier", "Guintas", "Igbical", "Igbucagay", "Inabasan", "Ingwan-Batangan", "La Paz", "Linaban", "Malandog", "Mapatag", "Masanag", "Nalihawan", "Pamandayan", "Pasu-Jungao", "Piape I", "Piape II", "Piape III", "Pili 1, 2, 3", "Poblacion 1", "Poblacion 2", "Poblacion 3", "Poblacion 4", "Poblacion 5", "Pu-ao", "Suloc", "Villavert-Jimenez"],
        "Laua-an": ["Bagongbayan", "Banban", "Bongbongan", "Cabariwan", "Cadajug", "Canituan", "Capnayan", "Casit-an", "Guiamon", "Guinbanga-an", "Guisijan", "Igtadiao", "Intao", "Jaguikican", "Jinalinan", "Lactudan", "Latazon", "Laua-an", "Liberato", "Lindero", "Liya-liya", "Loon", "Lugta", "Lupa-an", "Magyapo", "Maria", "Mauno", "Maybunga", "Necesito", "Oloc", "Omlot", "Pandanan", "Paningayan", "Pascuala", "Poblacion", "San Ramon", "Santiago", "Tibacan", "Tigunhao", "Virginia"],
        "Libertad": ["Barusbus", "Bulanao", "Centro Este", "Centro Weste", "Codiong", "Cubay", "Igcagay", "Inyawan", "Lindero", "Maramig", "Pajo", "Panangkilon", "Paz", "Pucio", "San Roque", "Taboc", "Tinigbas", "Tinindugan", "Union"],
        "Pandan": ["Aracay", "Badiangan", "Bagumbayan", "Baybay", "Botbot", "Buang", "Cabugao", "Candari", "Carmen", "Centro Norte", "Centro Sur", "Dionela", "Dumrog", "Duyong", "Fragante", "Guia", "Idiacacan", "Jinalinan", "Luhod-Bayang", "Maadios", "Mag-aba", "Napuid", "Nauring", "Patria", "Perfecta", "San Andres", "San Joaquin", "Santa Ana", "Santa Cruz", "Santa Fe", "Santo Rosario", "Talisay", "Tingib", "Zaldivar"],
        "Patnongon": ["Alvañiz", "Amparo", "Apgahan", "Aureliana", "Badiangan", "Bernaldo A. Julagting", "Carit-an", "Cuyapiao", "Gella", "Igbarawan", "Igbobon", "Igburi", "La Rioja", "Mabasa", "Macarina", "Magarang", "Magsaysay", "Padang", "Pandanan", "Patlabawon", "Poblacion", "Quezon", "Salaguiawan", "Samalague", "San Rafael", "Tamayoc", "Tigbalogo", "Tobias Fornier", "Villa Crespo", "Villa Cruz", "Villa Elio", "Villa Flores", "Villa Laua-an", "Villa Sal", "Villa Salomon", "Vista Alegre"],
        "San Jose de Buenavista": ["Atabay", "Badiang", "Barangay 1", "Barangay 2", "Barangay 3", "Barangay 4", "Barangay 5", "Barangay 6", "Barangay 7", "Barangay 8", "Bariri", "Bugarot", "Cansadan", "Durog", "Funda-Dalipe", "Igbonglo", "Inabasan", "Madrangca", "Magcalon", "Malaiba", "Maybato Norte", "Maybato Sur", "Mojon", "Pantao", "San Angel", "San Fernando", "San Pedro", "Supa"],
        "San Remigio": ["Agricula", "Alegria", "Aningalan", "Atabay", "Bagumbayan", "Baladjay", "Banbanan", "Barangbang", "Bawang", "Bugo", "Bulan-bulan", "Cabiawan", "Cabunga-an", "Cadolonan", "Carawisan I", "Carawisan II", "Carmelo I", "Carmelo II", "General Fullon", "General Luna", "Iguirindon", "Insubuan", "La Union", "Lapak", "Lumpatan", "Magdalena", "Maragubdub", "Nagbangi I", "Nagbangi II", "Nasuli", "Orquia", "Osorio I", "Osorio II", "Panpanan I", "Panpanan II", "Poblacion", "Ramon Magsaysay", "Rizal", "San Rafael", "Sinundolan", "Sumaray", "Trinidad", "Tubudan", "Vilvar", "Walker"],
        "Sebaste": ["Abiera", "Aguila", "Alegre", "Aras-asan", "Bacalan", "Callan", "Idio", "Nauhon", "P. Javier", "Poblacion"],
        "Sibalom": ["Alangan", "Bari", "Biga-a", "Bongbongan I", "Bongbongan II", "Bongsod", "Bontol", "Bugnay", "Bulalacao", "Cabanbanan", "Cabariuan", "Cabladan", "Cadoldolan", "Calo-oy", "Calog", "Catmon", "Catungan I", "Catungan II", "Catungan III", "Catungan IV", "Cubay-Napultan", "Cubay-Sermon", "District I", "District II", "District III", "District IV", "Egaña", "Esperanza I", "Esperanza II", "Esperanza III", "Igcococ", "Igdagmay", "Igdalaquit", "Iglanot", "Igpanolong", "Igparas", "Igsuming", "Ilabas", "Imparayan", "Inabasan", "Indag-an", "Initan", "Insarayan", "Lacaron", "Lagdo", "Lambayagan", "Luna", "Luyang", "Maasin", "Mabini", "Millamena", "Mojon", "Nagdayao", "Nazareth", "Odiong", "Olaga", "Pangpang", "Panlagangan", "Pantao", "Pasong", "Pis-anan", "Rombang", "Salvacion", "San Juan", "Sido", "Solong", "Tabongtabong", "Tig-ohot", "Tigbalua I", "Tigbalua II", "Tordesillas", "Tulatula", "Valentin Grasparil", "Villafont", "Villahermosa", "Villar"],
        "Tibiao": ["Alegre", "Amar", "Bandoja", "Castillo", "Esparagoza", "Importante", "La Paz", "Malabor", "Martinez", "Natividad", "Pitac", "Poblacion", "Salazar", "San Francisco Norte", "San Francisco Sur", "San Isidro", "Santa Ana", "Santa Justa", "Santo Rosario", "Tigbaboy", "Tuno"],
        "Tobias Fornier": ["Abaca", "Aras-asan", "Arobo", "Atabay", "Atiotes", "Bagumbayan", "Balloscas", "Balud", "Barasanan A", "Barasanan B", "Barasanan C", "Bariri", "Camandagan", "Cato-ogan", "Danawan", "Diclum", "Fatima", "Gamad", "Igbalogo", "Igbangcal-A", "Igbangcal-B", "Igbangcal-C", "Igcabuad", "Igcadac", "Igcado", "Igcalawagan", "Igcapuyas", "Igcasicad", "Igdalaguit", "Igdanlog", "Igdurarog", "Igtugas", "Lawigan", "Lindero", "Manaling", "Masayo", "Nagsubuan", "Nasuli-A", "Opsan", "Paciencia", "Poblacion Norte", "Poblacion Sur", "Portillo", "Quezon", "Salamague", "Santo Tomas", "Tacbuyan", "Tene", "Villaflor", "Ysulat"],
        "Valderrama": ["Alon", "Bakiang", "Binanogan", "Borocboroc", "Bugnay", "Buluangan I", "Buluangan II", "Bunsod", "Busog", "Cananghan", "Canipayan", "Cansilayan", "Culyat", "Iglinab", "Igmasandig", "Lublub", "Manlacbo", "Pandanan", "San Agustin", "Takas", "Tigmamale", "Ubos"]
    };

    const muniInput = document.getElementById('reportMunicipality');
    const locInput = document.getElementById('reportLocation');

    // Populate Municipality Dropdown
    Object.keys(antiqueData).sort().forEach(muni => {
        const opt = document.createElement('option');
        opt.value = muni;
        opt.textContent = muni;
        muniInput.appendChild(opt);
    });

    // LOCK TO ASSIGNED JURISDICTION
    if (assignedJurisdiction && antiqueData[assignedJurisdiction]) {
        muniInput.value = assignedJurisdiction;
        muniInput.disabled = true; // Prevent changing municipality

        // Initial population of barangays for assigned municipality
        locInput.innerHTML = '<option value="" disabled selected>Select Barangay</option>';
        antiqueData[assignedJurisdiction].sort().forEach(brgy => {
            const opt = document.createElement('option');
            opt.value = brgy;
            opt.textContent = brgy;
            locInput.appendChild(opt);
        });
        locInput.disabled = false;
    }

    // Handle Municipality Change
    muniInput.onchange = () => {
        const muni = muniInput.value;
        locInput.innerHTML = '<option value="" disabled selected>Select Barangay</option>';
        if (muni) {
            antiqueData[muni].sort().forEach(brgy => {
                const opt = document.createElement('option');
                opt.value = brgy;
                opt.textContent = brgy;
                locInput.appendChild(opt);
            });
            locInput.disabled = false;
        } else {
            locInput.disabled = true;
        }
    };

    const openReportModal = (report = null) => {
        const title = document.getElementById('reportModalTitle');
        const idInput = document.getElementById('reportId');
        const dateInput = document.getElementById('reportDateTime');
        const muniInput = document.getElementById('reportMunicipality');
        const locInput = document.getElementById('reportLocation');
        const sevInput = document.getElementById('reportSeverity');
        const statInput = document.getElementById('reportStatus');
        const invInput = document.getElementById('reportInvolved');

        if (report) {
            title.textContent = "Edit Incident Report";
            idInput.value = report.id;
            // Format date for datetime-local input
            const d = new Date(report.datetime);
            const formattedDate = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0') + 'T' +
                String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0');
            dateInput.value = formattedDate;

            // Set Municipality and trigger barangay list
            muniInput.value = report.jurisdiction;
            muniInput.onchange(); // Trigger population
            locInput.value = report.location;

            sevInput.value = report.severity;
            statInput.value = report.status;
            invInput.value = report.involved_biometrics || '';

            // Toggle based on existing data
            const isIdentified = invInput.value && invInput.value.includes("VICTIM IDENTIFIED AUTOMATICALLY");
            const scannerInitialState = document.getElementById('scannerInitialState');
            const verifiedState = document.getElementById('verifiedState');
            const rescanBtn = document.getElementById('rescanBtn');

            if (isIdentified) {
                if (scannerInitialState) scannerInitialState.style.display = 'none';
                if (verifiedState) verifiedState.style.display = 'flex';
            } else {
                if (scannerInitialState) scannerInitialState.style.display = 'block';
                if (verifiedState) verifiedState.style.display = 'none';
            }

            // Ensure rescan works for both new and existing reports
            if (rescanBtn) {
                rescanBtn.onclick = () => {
                    if (scannerInitialState) scannerInitialState.style.display = 'block';
                    if (verifiedState) verifiedState.style.display = 'none';
                    if (victimInfoArea) victimInfoArea.style.display = 'none';
                    invInput.value = "";
                };
            }
        } else {
            title.textContent = "Add Incident Report";
            idInput.value = "";
            const d = new Date();
            const formattedDate = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0') + 'T' +
                String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0');
            dateInput.value = formattedDate;

            // Default to officer's own jurisdiction
            if (assignedJurisdiction) {
                muniInput.value = assignedJurisdiction;
            }
            muniInput.onchange(); // Populate barangays

            sevInput.value = "Minor";
            statInput.value = "Reported";
            invInput.value = "";
            if (victimInfoArea) victimInfoArea.style.display = 'none';
            
            // Reset Scanner UI
            const scannerInitialState = document.getElementById('scannerInitialState');
            const verifiedState = document.getElementById('verifiedState');
            if (scannerInitialState) scannerInitialState.style.display = 'block';
            if (verifiedState) verifiedState.style.display = 'none';
        }
        reportModal.classList.add('show');
    };

    openAddReportBtn.onclick = () => openReportModal();
    closeReportBtn.onclick = cancelReportBtn.onclick = () => reportModal.classList.remove('show');

    reportForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('reportId').value;
        const reportData = {
            datetime: document.getElementById('reportDateTime').value,
            jurisdiction: assignedJurisdiction || document.getElementById('reportMunicipality').value,
            location: document.getElementById('reportLocation').value,
            severity: document.getElementById('reportSeverity').value,
            status: document.getElementById('reportStatus').value,
            involved_biometrics: document.getElementById('reportInvolved').value.trim(),
            reporting_officer: officerName
        };

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `${API_URL}/reports/${id}` : `${API_URL}/reports`;

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to save report");

            showCustomAlert("Successfully!", "success", "Incident Reported Successfully");
            reportModal.classList.remove('show');
            await fetchAndRenderAll();
        } catch (err) {
            console.error(err);
            showCustomAlert("Error: " + err.message, "error", "Sync Error");
        }
    };

    const deleteReport = async (id) => {
        showCustomConfirm(
            "Are you sure you want to delete this report? This action cannot be undone.",
            "Delete Report",
            async () => {
                try {
                    const response = await fetch(`${API_URL}/reports/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error("Delete failed");
                    showCustomAlert("Report deleted.", "success", "Deleted");
                    await fetchAndRenderAll();
                } catch (err) {
                    console.error(err);
                    showCustomAlert("Delete failed.", "error", "Error");
                }
            }
        );
    };

    const fetchAndRenderAll = async () => {
        try {
            const response = await fetch(`${API_URL}/reports?jurisdiction=${encodeURIComponent(assignedJurisdiction)}`);
            const reports = await response.json();

            if (!response.ok) throw new Error("Fetch failed");

            renderReports(reports);
            updateStatsAndCharts(reports);
            await loadResidents(); // Refresh residents count too
        } catch (error) {
            console.error('Fetch reports error:', error);
        }
    };

    const renderReports = (reports) => {
        const createRow = (r, isFull = false) => {
            const row = document.createElement('tr');
            const date = new Date(r.datetime).toLocaleString();

            // Extract victim name from the blob
            let victimName = "No Biometrics";
            if (r.involved_biometrics) {
                const match = r.involved_biometrics.match(/Name:\s*([^\n]+)/);
                if (match) {
                    victimName = match[1].trim();
                } else {
                    victimName = "Non-Resident / Manual";
                }
            }

            // Map severity to badges
            let sevBadge = 'badge-pending';
            if (r.severity === 'Critical') sevBadge = 'badge-critical';
            else if (r.severity === 'Severe') sevBadge = 'badge-critical';
            else if (r.severity === 'Resolved') sevBadge = 'badge-resolved';

            row.innerHTML = `
                <td>${date}</td>
                <td><div style="font-weight:600; color:#1e293b;">${victimName}</div></td>
                <td>${r.location}</td>
                <td><span class="badge ${sevBadge}">${r.severity}</span></td>
                <td><span class="badge badge-pending">${r.status}</span></td>
                <td>
                    <button class="btn-action btn-edit" title="Edit"><i class='bx bx-edit-alt'></i></button>
                    ${isFull ? `<button class="btn-action btn-delete" title="Delete"><i class='bx bx-trash'></i></button>` : ''}
                </td>
            `;

            row.querySelector('.btn-edit').onclick = () => openReportModal(r);
            if (isFull) row.querySelector('.btn-delete').onclick = () => deleteReport(r.id);
            return row;
        };

        dashboardReportsTableBody.innerHTML = '';
        fullReportsTableBody.innerHTML = '';

        reports.forEach((r, idx) => {
            if (idx < 5) dashboardReportsTableBody.appendChild(createRow(r, false));
            fullReportsTableBody.appendChild(createRow(r, true));
        });

        if (reports.length === 0) {
            const emptyMsg = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94A3B8;">No reports found for this jurisdiction.</td></tr>`;
            dashboardReportsTableBody.innerHTML = emptyMsg;
            fullReportsTableBody.innerHTML = emptyMsg;
        }
    };

    const updateStatsAndCharts = (reports) => {
        document.getElementById('stats-accidents').textContent = reports.length;
        const heroEl = document.getElementById('stats-accidents-hero');
        if (heroEl) heroEl.textContent = reports.length;

        const criticalCount = reports.filter(r => r.severity === 'Critical' || r.severity === 'Severe').length;
        document.getElementById('stats-critical').textContent = criticalCount;

        // Clear Map Markers
        markerLayer.clearLayers();
        fullMarkerLayer.clearLayers();

        // Update Chart
        const locationCounts = {};
        reports.forEach(r => {
            locationCounts[r.location] = (locationCounts[r.location] || 0) + 1;
            // Add marker to map asynchronously
            geocodeAndPlot(r);
        });

        const labels = Object.keys(locationCounts);
        const data = Object.values(locationCounts);

        if (labels.length > 0) {
            muniChart.data.labels = labels;
            muniChart.data.datasets[0].data = data;
            
            // Ensure no rotation or wiggling on mobile
            muniChart.options.scales.x.ticks.maxRotation = 0;
            muniChart.options.scales.x.ticks.minRotation = 0;
            
            muniChart.update('none'); // 'none' forces a silent, instant update with 0 animation
        }
    };

    // 6. INITIALIZE MAPS
    let map, fullMap;
    let markerLayer = L.layerGroup();
    let fullMarkerLayer = L.layerGroup();
    const coordinateCache = {};

    const geocodeAndPlot = async (report) => {
        const key = `${report.location}, ${report.jurisdiction}`;
        let coords = coordinateCache[key];

        if (!coords) {
            try {
                const query = `${report.location}, ${report.jurisdiction}, Antique, Philippines`;
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
                const data = await response.json();

                if (data && data.length > 0) {
                    coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                    coordinateCache[key] = coords;
                } else {
                    // Fallback to municipality center if barangay fails
                    const fbQuery = `${report.jurisdiction}, Antique, Philippines`;
                    const fbRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fbQuery)}&format=json&limit=1`);
                    const fbData = await fbRes.json();
                    if (fbData && fbData.length > 0) {
                        coords = [parseFloat(fbData[0].lat), parseFloat(fbData[0].lon)];
                        console.log(`Fallback geocoding for ${report.location} to ${report.jurisdiction} center.`);
                    }
                }
            } catch (err) {
                console.error("Geocoding error:", err);
            }
        }

        if (coords) {
            // Add a tiny random jitter (approx 10-20 meters) to prevent perfect overlapping markers
            const jitteredCoords = [
                coords[0] + (Math.random() - 0.5) * 0.0005,
                coords[1] + (Math.random() - 0.5) * 0.0005
            ];
            addMarkerToMap(jitteredCoords, report);
        }
    };

    const addMarkerToMap = (coords, report) => {
        const markerOptions = {
            radius: 6,
            fillColor: '#3b82f6',
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        };

        const popupContent = `
            <div style="font-family: inherit; padding: 5px;">
                <strong style="color: #103155; display: block; margin-bottom: 5px;">${report.location}</strong>
                <span style="font-size: 12px; color: #64748B;">
                    Severity: <b>${report.severity}</b><br>
                    Status: <b>${report.status}</b><br>
                    Date: ${new Date(report.datetime).toLocaleDateString()}
                </span>
            </div>
        `;

        if (map) {
            L.circleMarker(coords, markerOptions)
                .bindPopup(popupContent)
                .addTo(markerLayer);
        }
        if (fullMap) {
            L.circleMarker(coords, markerOptions)
                .bindPopup(popupContent)
                .addTo(fullMarkerLayer);
        }
    };

    const initMaps = async () => {
        const commonOptions = { zoomControl: false, minZoom: 11 };
        const riskMapEl = document.getElementById('riskMap');
        const fullRiskMapEl = document.getElementById('fullRiskMap');

        if (riskMapEl) {
            map = L.map('riskMap', commonOptions).setView([11.15, 122.04], 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; CartoDB'
            }).addTo(map);
            markerLayer.addTo(map);
        }

        if (fullRiskMapEl) {
            fullMap = L.map('fullRiskMap', commonOptions).setView([11.15, 122.04], 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; CartoDB'
            }).addTo(fullMap);
            fullMarkerLayer.addTo(fullMap);
        }

        // Fetch precise boundary once
        let initialBoundsSet = false;
        fetch(`https://nominatim.openstreetmap.org/search.php?q=${assignedJurisdiction},+Antique,+Philippines&polygon_geojson=1&format=jsonv2`)
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0 && data[0].geojson && !initialBoundsSet) {
                    const style = { opacity: 0, fillOpacity: 0 };
                    if (map) {
                        const geoLayer1 = L.geoJSON(data[0].geojson, { style }).addTo(map);
                        map.fitBounds(geoLayer1.getBounds());
                    }
                    if (fullMap) {
                        const geoLayer2 = L.geoJSON(data[0].geojson, { style }).addTo(fullMap);
                        fullMap.fitBounds(geoLayer2.getBounds());
                    }
                    initialBoundsSet = true; // Stop it from jumping again
                }
            });
    };

    // 7. CHART LOGIC
    let muniChart;
    const initChart = () => {
        const chartCtx = document.getElementById('municipalityChart');
        if (!chartCtx) return;

        const ctx = chartCtx.getContext('2d');
        muniChart = new Chart(ctx, {
            type: 'bar', // Horizontal Bar Chart for stability
            data: {
                labels: ['No Data'],
                datasets: [{
                    label: 'Total Incidents',
                    data: [0],
                    backgroundColor: '#103155', // Solid premium color
                    borderRadius: 4,
                    barThickness: 15
                }]
            },
            options: {
                indexAxis: 'y', // Makes it Horizontal
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 10,
                            font: { size: 12, weight: 'bold' }
                        },
                        grid: { color: 'rgba(0,0,0,0.03)' }
                    },
                    y: {
                        ticks: {
                            font: { size: 11 },
                            autoSkip: false
                        },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                },
                layout: {
                    padding: { top: 10, bottom: 10, left: 10, right: 30 }
                }
            }
        });
    };

    // Utility Alert
    window.showCustomAlert = (message, iconCode, title) => {
        const alertBox = document.getElementById('customAlert');
        const alertIcon = document.getElementById('customAlertIcon');
        const alertTitle = document.getElementById('customAlertTitle');
        const alertMessage = document.getElementById('customAlertMessage');

        if (iconCode === 'success') alertIcon.innerHTML = "<i class='bx bx-check-circle' style='color:#10B981'></i>";
        else if (iconCode === 'info') alertIcon.innerHTML = "<i class='bx bx-info-circle' style='color:#10B981'></i>";
        else alertIcon.innerHTML = "<i class='bx bx-error-circle' style='color:#EF4444'></i>";

        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertBox.style.display = 'flex';
    };

    window.showCustomConfirm = (message, title, onConfirm) => {
        const confirmBox = document.getElementById('customConfirm');
        const confirmTitle = document.getElementById('customConfirmTitle');
        const confirmMessage = document.getElementById('customConfirmMessage');
        const okBtn = document.getElementById('customConfirmOk');
        const cancelBtn = document.getElementById('customConfirmCancel');

        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmBox.style.display = 'flex';

        // Use one-time listeners
        const handleConfirm = () => {
            confirmBox.style.display = 'none';
            okBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            onConfirm();
        };

        const handleCancel = () => {
            confirmBox.style.display = 'none';
            okBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        okBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    };

    // 8. RESIDENTS MANAGEMENT
    const residentsTableBody = document.getElementById('residentsTableBody');
    const openAddResidentBtn = document.getElementById('openAddResidentBtn');
    const closeResidentBtn = document.getElementById('closeResidentBtn');
    const cancelResidentBtn = document.getElementById('cancelResidentBtn');
    const residentModal = document.getElementById('residentModal');
    const residentForm = document.getElementById('residentForm');
    const resBarangaySelect = document.getElementById('resBarangay');

    const openResidentModal = () => {
        // Populate Barangays for the resident modal
        resBarangaySelect.innerHTML = '<option value="" disabled selected>Select Barangay</option>';
        if (assignedJurisdiction && antiqueData[assignedJurisdiction]) {
            antiqueData[assignedJurisdiction].sort().forEach(brgy => {
                const opt = document.createElement('option');
                opt.value = brgy;
                opt.textContent = brgy;
                resBarangaySelect.appendChild(opt);
            });
        }
        
        // Reset form
        residentForm.reset();
        // Reset Biometric UI
        const section = document.getElementById('biometricSection');
        const initialState = document.getElementById('resScannerInitialState');
        const verifiedState = document.getElementById('resVerifiedState');
        if (section) {
            section.style.background = '#F0F9FF';
            section.style.borderColor = '#BAE6FD';
        }
        if (initialState) initialState.style.display = 'block';
        if (verifiedState) verifiedState.style.display = 'none';
        
        document.getElementById('saveResidentBtn').disabled = false;
        if (resFingerprintId) resFingerprintId.value = '';
        
        residentModal.classList.add('show');
    };

    if (openAddResidentBtn) openAddResidentBtn.onclick = openResidentModal;
    if (closeResidentBtn) closeResidentBtn.onclick = () => residentModal.classList.remove('show');
    if (cancelResidentBtn) cancelResidentBtn.onclick = () => residentModal.classList.remove('show');

    // Biometric Capture Simulation
    const registerFingerprintBtn = document.getElementById('registerFingerprintBtn');
    const fingerprintStatus = document.getElementById('fingerprintStatus');
    const capturedFpId = document.getElementById('capturedFpId');
    const resFingerprintId = document.getElementById('resFingerprintId');
    const saveResidentBtn = document.getElementById('saveResidentBtn');
    const resRescanBtn = document.getElementById('resRescanBtn');

    // Handle Resident Form "Retry Scan"
    if (resRescanBtn) {
        resRescanBtn.onclick = () => {
            const section = document.getElementById('biometricSection');
            const initialState = document.getElementById('resScannerInitialState');
            const verifiedState = document.getElementById('resVerifiedState');
            
            if (section) {
                section.style.background = '#F0F9FF';
                section.style.borderColor = '#BAE6FD';
            }
            if (initialState) initialState.style.display = 'block';
            if (verifiedState) verifiedState.style.display = 'none';
            if (resFingerprintId) resFingerprintId.value = '';
            
            logToTerminal("Resident enrollment reset for re-capture", "INFO");
        };
    }

    // --- INTELLIGENT HARDWARE LISTENER (ALWAYS ON) ---
    let serialPort = null;
    let scannerActive = false;
    const scannerBtn = document.getElementById('scannerStatusBtn');

    function updateScannerUI(status) {
        scannerBtn.classList.remove('offline', 'online', 'scanning');
        if (status === 'online') {
            scannerBtn.classList.add('online');
            scannerBtn.title = "Scanner: Ready (Always Listening)";
        } else if (status === 'scanning') {
            scannerBtn.classList.add('scanning');
            scannerBtn.title = "Scanner: Processing Fingerprint...";
        } else {
            scannerBtn.classList.add('offline');
            scannerBtn.title = "Scanner: Disconnected (Click to Connect)";
        }
    }

    async function initScannerConnection(requestNew = false) {
        if (window.Capacitor) {
            // --- MOBILE OTG LOGIC (Android) ---
            try {
                if (!window.usbserial) {
                    showCustomAlert("USB Serial plugin not found. Please ensure it is installed.", "error");
                    return;
                }
                // Arduino Uno (CdcAcm) - vid: 0x2341, pid: 0x0043
                window.usbserial.requestPermission({vid: '2341', pid: '0043'}, async () => {
                    window.usbserial.connect({baudRate: 57600}, () => {
                        scannerActive = true;
                        updateScannerUI('online');
                        logToTerminal("Mobile OTG: Arduino Connected!", "SUCCESS");
                        showCustomAlert("Arduino OTG Connected!", "success", "Hardware Ready");
                        
                        // Listen for fingerprint data from OTG
                        window.usbserial.registerReadCallback((data) => {
                            const view = new Uint8Array(data);
                            let str = "";
                            for (let i = 0; i < view.length; i++) {
                                str += String.fromCharCode(view[i]);
                            }
                            handleHardwareInput(str);
                        }, (err) => console.error("OTG Read Error:", err));
                    }, (err) => {
                        console.error("OTG Connect Error:", err);
                        showCustomAlert("OTG Connection Failed. Check cable.", "error");
                    });
                }, (err) => {
                    console.error("OTG Permission Error:", err);
                    showCustomAlert("OTG Permission Denied", "warning");
                });
            } catch (e) {
                console.error("Capacitor OTG Error:", e);
                showCustomAlert("Hardware error: " + e.message, "error");
            }
        } else {
            // --- DESKTOP BROWSER LOGIC ---
            try {
                if (!("serial" in navigator)) {
                    showCustomAlert("Web Serial not supported in this browser. Use Chrome/Edge on Desktop.", "warning");
                    return;
                }

                // 1. Get port (auto-find or request)
                if (!serialPort) {
                    const ports = await navigator.serial.getPorts();
                    if (ports.length > 0 && !requestNew) {
                        serialPort = ports[0];
                    } else if (requestNew) {
                        serialPort = await navigator.serial.requestPort();
                    }
                }

                if (!serialPort) return;

                // 2. Open port if closed
                if (serialPort.readable === null) {
                    await serialPort.open({ baudRate: 57600 });
                    // Arduino Uno reboots when port is opened
                    console.log("Port opened. Waiting 3.5s for Arduino to reboot...");
                    await new Promise(resolve => setTimeout(resolve, 3500));
                }

                if (!scannerActive) {
                    scannerActive = true;
                    updateScannerUI('online');
                    logToTerminal("Desktop: Scanner connected and ready!", "SUCCESS");
                    startBackgroundListener();
                }
            } catch (err) {
                console.error("Scanner Init Error:", err);
                updateScannerUI('offline');
                scannerActive = false;
                showCustomAlert("Connection failed. Ensure hardware is plugged in.", "error");
            }
        }
    }

    async function startBackgroundListener() {
        while (serialPort && serialPort.readable && scannerActive) {
            const decoder = new TextDecoderStream();
            const inputDone = serialPort.readable.pipeTo(decoder.writable);
            const inputStream = decoder.readable;
            const reader = inputStream.getReader();

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    if (value) handleHardwareInput(value);
                }
            } catch (error) {
                console.error("Read error:", error);
            } finally {
                reader.releaseLock();
            }
        }
    }

    let globalSerialBuffer = '';
    async function handleHardwareInput(data) {
        globalSerialBuffer += data;
        
        // Process complete lines only (solves USB packet chunking)
        while (globalSerialBuffer.includes('\n')) {
            const newlineIndex = globalSerialBuffer.indexOf('\n');
            const line = globalSerialBuffer.slice(0, newlineIndex).trim();
            globalSerialBuffer = globalSerialBuffer.slice(newlineIndex + 1);
            
            if (line) {
                console.log("Hardware Full Line:", line);
                updateScannerUI('scanning');
                
                // 0. HANDLE COMMAND ACKNOWLEDGMENT
                if (line.includes("CMD_ACK:ENROLL")) {
                    console.log("Arduino successfully entered Enrollment Mode!");
                    logToTerminal("Scanner: Ready for Resident Enrollment. Put your thumb on scanner.", "SCANNER");
                    if (typeof enrollAckTimeout !== 'undefined' && enrollAckTimeout) clearTimeout(enrollAckTimeout);
                    showCustomAlert("Arduino is ready! Waiting for your thumb...", "info", "Arduino Ready");
                }

                // 1. HANDLE ENROLLMENT (Registration)
                if (line.includes("ENROLLED:")) {
                    const match = line.match(/ENROLLED:(\d+)/);
                    if (match) {
                        const id = match[1];
                        logToTerminal(`FINGERPRINT ENROLLED SUCCESSFULLY: ID ${id}`, "SUCCESS");
                        if (residentModal && residentModal.classList.contains('show')) {
                            const section = document.getElementById('biometricSection');
                            const initialState = document.getElementById('resScannerInitialState');
                            const verifiedState = document.getElementById('resVerifiedState');
                            const displayFpId = document.getElementById('resCapturedFpIdDisplay');
                            const resFingerprintId = document.getElementById('resFingerprintId');

                            if (displayFpId) displayFpId.textContent = id;
                            if (resFingerprintId) resFingerprintId.value = id;
                            
                            // Switch UI to success (green theme)
                            if (section) {
                                section.style.background = '#F0FDF4'; 
                                section.style.borderColor = '#4ADE80';
                            }
                            if (initialState) initialState.style.display = 'none';
                            if (verifiedState) verifiedState.style.display = 'block';
                            
                            showCustomAlert(`FINGERPRINT SAVED! Resident assigned ID ${id}`, "success", "Hardware Ready");
                        }
                    }
                }

                // 2. HANDLE MATCH (Identification)
                if (line.includes("MATCH_ID:")) {
                    const match = line.match(/MATCH_ID:(\d+)/);
                    if (match) {
                        const id = match[1];
                        logToTerminal(`SCANNER: Analyzing Fingerprint (Match found: ${id})`, "SCANNER");
                        await autoIdentifyVictim(id);
                    }
                }
                
                setTimeout(() => updateScannerUI('online'), 1000);
            }
        }
    }

    async function autoIdentifyVictim(hardwareId) {
        // DO NOT show identification alert if we are CURRENTLY Registering a new resident
        if (residentModal && residentModal.classList.contains('show')) {
            console.log("Scanner: Match found, but resident modal is open. Skipping identification.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/residents?fingerprint_id=${hardwareId}`);
            const residents = await response.json();

            if (residents.length === 0) {
                showCustomAlert(`Scanner recognized ID ${hardwareId}, but this person is not in our system yet.`, "error", "Unknown Fingerprint");
                return;
            }

            const person = residents[0];

            // AUTO-OPEN ACCIDENT REPORT MODAL
            if (!reportModal.classList.contains('show')) {
                openReportModal();
            }

            // POPULATE DATA
            const victimInfoArea = document.getElementById('victimInfoArea');
            const victimNameText = document.getElementById('victimNameText');
            const victimAddressText = document.getElementById('victimAddressText');
            const involvedInput = document.getElementById('reportInvolved');

            victimInfoArea.style.display = 'block';
            victimNameText.textContent = `${person.first_name} ${person.last_name}`;
            victimAddressText.innerHTML = `${person.barangay}, ${person.municipality} <br> <span style="color:#EF4444; font-weight:700;">Blood: ${person.blood_type || 'Unknown'}</span>`;
            
            involvedInput.value = `VICTIM IDENTIFIED AUTOMATICALLY\nName: ${person.first_name} ${person.last_name}\nBlood Type: ${person.blood_type || 'Unknown'}\nMedical: ${person.medical_info || 'None'}\nEmergency: ${person.emergency_contact || 'None'} (${person.emergency_phone || 'N/A'})\n\nNotes: `;
            
            // Switch to Verified UI
            const scannerInitialState = document.getElementById('scannerInitialState');
            const verifiedState = document.getElementById('verifiedState');
            const rescanBtn = document.getElementById('rescanBtn');

            if (scannerInitialState) scannerInitialState.style.display = 'none';
            if (verifiedState) verifiedState.style.display = 'flex';

            if (rescanBtn) {
                rescanBtn.onclick = () => {
                    if (scannerInitialState) scannerInitialState.style.display = 'block';
                    if (verifiedState) verifiedState.style.display = 'none';
                    if (victimInfoArea) victimInfoArea.style.display = 'none';
                    involvedInput.value = "";
                    logToTerminal("User chose to re-scan/clear identification", "INFO");
                };
            }

            // Auto resize
            involvedInput.style.height = 'auto';
            involvedInput.style.height = involvedInput.scrollHeight + 'px';
            
            logToTerminal(`VICTIM IDENTIFIED: ${person.first_name} ${person.last_name}`, "SUCCESS");
            showCustomAlert("Resident identity verified. Data pulled automatically.", "success", "Identity Verified");

        } catch (err) {
            console.error("Identification Error:", err);
        }
    }

    // Manual Re-connect Button
    scannerBtn.onclick = () => initScannerConnection(true);

    let enrollAckTimeout = null;

    if (registerFingerprintBtn) {
        registerFingerprintBtn.onclick = async () => {
            
            // Auto-connect if not already connected
            if (!scannerActive) {
                console.log("Scanner offline, attempting to connect automatically...");
                await initScannerConnection(true);
            }
            
            // If still not active after prompting
            if (!scannerActive) {
                showCustomAlert("Please select the Arduino COM port in the popup to connect the scanner!", "error", "Scanner Disconnected");
                return;
            }
            
            showCustomAlert("Sending command to Arduino... Keep thumb ready.", "info", "Waiting for Arduino");
            
            // Send "ENROLL" command to Arduino
            try {
                if (serialPort && serialPort.writable && !serialPort.writable.locked) {
                    const writer = serialPort.writable.getWriter();
                    const data = new TextEncoder().encode("ENROLL\n");
                    await writer.write(data);
                    writer.releaseLock();
                    console.log("Successfully sent ENROLL command");
                    
                    // Set a timeout to check if Arduino actually heard us
                    if (enrollAckTimeout) clearTimeout(enrollAckTimeout);
                    enrollAckTimeout = setTimeout(async () => {
                        showCustomAlert("Arduino did not respond! Chrome may be stuck on a broken connection. Unplug your USB, plug it back in, and try again.", "error", "Connection Error");
                        
                        // Force aggressive disconnect to clear Chrome's broken state
                        if (serialPort) {
                            try { await serialPort.close(); } catch(e) {}
                            serialPort = null;
                        }
                        scannerActive = false;
                        updateScannerUI('offline');

                    }, 6000); // Wait 6 FULL seconds to reply with CMD_ACK

                } else {
                    console.error("Failed to write! Port:", serialPort);
                    showCustomAlert("Cannot write to scanner. Try refreshing page or reconnecting USB.", "error", "Connection Error");
                }
            } catch (err) {
                console.error("Failed to send command to scanner", err);
            }
        };
    }

    if (residentForm) {
        residentForm.onsubmit = async (e) => {
            e.preventDefault();
            const fingerprintId = document.getElementById('resFingerprintId').value;
            
            if (!fingerprintId) {
                showCustomAlert("Fingerprint scan required! Please place the resident's finger on the scanner first.", "error", "Registration Error");
                return;
            }

            const resData = {
                first_name: document.getElementById('resFirstName').value,
                last_name: document.getElementById('resLastName').value,
                municipality: assignedJurisdiction,
                barangay: document.getElementById('resBarangay').value,
                contact_number: document.getElementById('resContact').value,
                emergency_contact: document.getElementById('resEmergencyName').value.trim() + " (" + document.getElementById('resEmergencyRelation').value.trim() + ")",
                emergency_phone: document.getElementById('resEmergencyContact').value.trim(),
                blood_type: document.getElementById('resBloodType').value,
                fingerprint_id: document.getElementById('resFingerprintId').value,
                medical_info: document.getElementById('resMedical').value,
                username: document.getElementById('resUsername').value.trim(),
                password: document.getElementById('resPassword').value.trim()
            };

            try {
                const response = await fetch(`${API_URL}/residents`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(resData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Failed to register resident");

                showCustomAlert("Resident registered successfully!", "success", "Registration Complete");
                residentModal.classList.remove('show');
                loadResidents();
            } catch (err) {
                showCustomAlert(err.message, "error", "Saving Error");
            }
        };
    }

    const deleteResident = async (res) => {
        showCustomConfirm(
            `Are you sure you want to delete ${res.first_name} ${res.last_name}? This will also clear their fingerprint from the scanner hardware.`,
            "Delete Resident",
            async () => {
                try {
                    // 1. HARDWARE DELETE (Sync)
                    if (res.fingerprint_id && scannerActive && serialPort && serialPort.writable) {
                        try {
                            const writer = serialPort.writable.getWriter();
                            const data = new TextEncoder().encode(`DELETE:${res.fingerprint_id}\n`);
                            await writer.write(data);
                            writer.releaseLock();
                            logToTerminal(`Sent DELETE command for Hardware ID: ${res.fingerprint_id}`, "SCANNER");
                        } catch (hwErr) {
                            console.error("Hardware delete failed", hwErr);
                        }
                    }

                    // 2. DATABASE DELETE
                    const response = await fetch(`${API_URL}/residents/${res.id}`, { method: 'DELETE' });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `Delete failed (Status: ${response.status})`);
                    }
                    
                    showCustomAlert("Resident record and fingerprint cleared successfully.", "success", "Full Cleanup");
                    await loadResidents();
                } catch (err) {
                    console.error(err);
                    showCustomAlert("Delete failed.", "error", "Error");
                }
            }
        );
    };

    const wipeHardwareBtn = document.getElementById('wipeHardwareBtn');
    if (wipeHardwareBtn) {
        wipeHardwareBtn.onclick = () => {
            showCustomConfirm(
                "DANGER: This will permanently ERASE ALL fingerprints stored in the scanner hardware (Arduino). This cannot be undone. Are you absolutely sure?",
                "Factory Wipe Hardware",
                async () => {
                    if (scannerActive && serialPort && serialPort.writable) {
                        try {
                            const writer = serialPort.writable.getWriter();
                            const data = new TextEncoder().encode("CLEARDATA\n");
                            await writer.write(data);
                            writer.releaseLock();
                            logToTerminal("COMMAND SENT: FACTORY WIPE ALL HARDWARE BIOMETRICS", "ERROR");
                            
                            // 2. DATABASE WIPE (Sync)
                            const dbResp = await fetch(`${API_URL}/residents/wipe-all`, { method: 'POST' });
                            if (dbResp.ok) {
                                logToTerminal("DATABASE WIPE: All resident records deleted from SQLITE", "SUCCESS");
                            }

                            showCustomAlert("Wipe command sent. Hardware cleared and Database emptied.", "success", "Full System Reset");
                            await loadResidents();
                        } catch (err) {
                            console.error("Wipe failed", err);
                            showCustomAlert("Failed to send wipe command.", "error", "Error");
                        }
                    } else {
                        showCustomAlert("Scanner not connected. Connect first to wipe.", "error", "Disconnected");
                    }
                }
            );
        };
    }

    const loadResidents = async () => {
        if (!residentsTableBody) return;
        try {
            const response = await fetch(`${API_URL}/residents?municipality=${encodeURIComponent(assignedJurisdiction)}`);
            const residents = await response.json();

            residentsTableBody.innerHTML = '';
            if (residents.length === 0) {
                residentsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px;">No residents registered in this jurisdiction.</td></tr>`;
            } else {
                residents.forEach(res => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${res.first_name} ${res.last_name}</td>
                        <td>
                            <div style="font-weight:600;">${res.contact_number || 'N/A'}</div>
                            <div style="font-size:11px; color:#EF4444;"><i class='bx bxs-droplet'></i> Blood: ${res.blood_type || 'Unknown'}</div>
                        </td>
                        <td><span style="font-size:12px; color:#64748B;">${res.barangay}, ${res.municipality}</span></td>
                        <td><span class="badge badge-resolved">Verified</span></td>
                        <td style="text-align: right;">
                            <button class="btn-action btn-delete" title="Delete"><i class='bx bx-trash'></i></button>
                        </td>
                    `;
                    row.querySelector('.btn-delete').onclick = () => deleteResident(res);
                    residentsTableBody.appendChild(row);
                });
            }

            // Also update stats counter
            document.getElementById('stats-residents').textContent = residents.length;
        } catch (e) {
            console.error("Load residents failed", e);
        }
    };

    // 9. VICTIM SCANNING LOGIC
    const scanVictimBtn = document.getElementById('scanVictimBtn');
    const victimInfoArea = document.getElementById('victimInfoArea');
    const victimNameText = document.getElementById('victimNameText');
    const victimAddressText = document.getElementById('victimAddressText');
    const involvedInput = document.getElementById('reportInvolved');

    if (scanVictimBtn) {
        scanVictimBtn.onclick = async () => {
            if (BiometricService.isNative) {
                const result = await BiometricService.scan();
                if (result.success) {
                    showCustomAlert("Hardware Verified! (Implementation for specific resident lookup via native biometric ID coming in next update)", "success", "Native Biometric Success");
                } else {
                    showCustomAlert("Biometric failed or cancelled.", "error", "Scan Failed");
                }
            } else if (!scannerActive) {
                showCustomAlert("Scanner is not connected! Connect it at the top of the screen.", "error", "Offline");
            } else {
                openReportModal();
                showCustomAlert("Dashboard is listening! Just place the victim's finger on the hardware.", "info", "Scanner Active");
            }
        };
    }

    // Initial load
    await initMaps();
    initChart();
    await fetchAndRenderAll();
    await loadResidents();
    
    // Auto-connect scanner if already paired
    initScannerConnection(false);

    // Auto-expanding Textareas Logic
    document.querySelectorAll('.textarea-auto').forEach(ta => {
        ta.addEventListener('input', function() {
            this.style.height = 'auto'; // Reset height
            this.style.height = (this.scrollHeight) + 'px'; // Set to scrollHeight
        });
    });
});
