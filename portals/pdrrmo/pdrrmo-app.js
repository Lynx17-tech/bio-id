document.addEventListener('DOMContentLoaded', () => {
    // API CONFIGURATION
    const API_URL = 'http://localhost:4000/api';

    // --- MUNICIPALITY COLOR CONFIGURATION ---
    const municipalities = [
        'Anini-y', 'Barbaza', 'Belison', 'Bugasong', 'Caluya', 'Culasi',
        'Hamtic', 'Laua-an', 'Libertad', 'Pandan', 'Patnongon', 'San Jose de Buenavista',
        'San Remigio', 'Sebaste', 'Sibalom', 'Tibiao', 'Tobias Fornier', 'Valderrama'
    ];

    const generateMuniColor = (idx, total) => {
        const hue = (idx * 360) / total;
        return `hsla(${hue}, 75%, 50%, 0.8)`;
    };

    const muniColorMap = {};
    municipalities.forEach((m, i) => {
        muniColorMap[m] = generateMuniColor(i, municipalities.length);
    });

    // --- ACTIVE USER PROFILE SESSION HANDLING ---
    let activeUser = null;
    try {
        const sessionData = sessionStorage.getItem('activeUserData');
        if (sessionData) {
            activeUser = JSON.parse(sessionData);

            // Render Profile Display
            const adminNameDisplay = document.querySelector('.admin_name');
            const profileImage = document.querySelector('.profile-details img');
            if (adminNameDisplay && activeUser.first_name && activeUser.last_name) {
                adminNameDisplay.textContent = `${activeUser.first_name} ${activeUser.last_name}`;
                if (profileImage) {
                    profileImage.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.first_name + ' ' + activeUser.last_name)}&background=FF9800&color=fff`;
                }
            }
        } else {
            // Optional: Block page access, e.g. window.location.href = '../index.html';
        }
    } catch (e) {
        console.error("No active user session found.", e);
    }

    // PROFILE DROPDOWN
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (profileDropdownBtn && profileDropdown) {
        profileDropdownBtn.addEventListener('click', (e) => {
            // Prevent event from bubbling and immediately closing
            e.stopPropagation();
            profileDropdown.style.display = profileDropdown.style.display === 'none' || profileDropdown.style.display === '' ? 'flex' : 'none';
        });

        // Close dropdown when clicking anywhere else
        document.addEventListener('click', () => {
            profileDropdown.style.display = 'none';
        });
    }

    // SETTINGS MODAL
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');

    if (openSettingsBtn && settingsModal) {
        openSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            profileDropdown.style.display = 'none';
            settingsModal.style.display = 'flex';

            // Pre-fill user data
            if (activeUser) {
                document.getElementById('settingsFirstName').value = activeUser.first_name || '';
                document.getElementById('settingsLastName').value = activeUser.last_name || '';
                document.getElementById('settingsContact').value = activeUser.contact_number || '';
                
                const pwdInput = document.getElementById('settingsPassword');
                if (pwdInput) {
                    pwdInput.value = activeUser.temp_password || '';
                    pwdInput.type = 'text'; // Show by default
                }
            }
        });

        closeSettingsModal.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });

        // Form Submit
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Ask for confirmation
                const confirmed = await window.confirm('Are you sure you want to update your profile settings?');
                if (!confirmed) return;

                const newFirst = document.getElementById('settingsFirstName').value;
                const newLast = document.getElementById('settingsLastName').value;
                const newContact = document.getElementById('settingsContact').value;
                const newPass = document.getElementById('settingsPassword').value;

                let updates = {
                    first_name: newFirst,
                    last_name: newLast,
                    contact_number: newContact,
                    temp_password: newPass
                };

                const saveBtn = document.getElementById('saveSettingsBtn');
                saveBtn.textContent = 'Saving...';
                saveBtn.disabled = true;

                try {
                    const response = await fetch(`${API_URL}/admin/system-users/${activeUser.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Update failed');
                    }

                    const updatedUser = await response.json();
                    alert('✅ Account details updated successfully! Your changes will reflect immediately.');
                    sessionStorage.setItem('activeUserData', JSON.stringify(updatedUser));
                    settingsModal.style.display = 'none';
                } catch (error) {
                    alert('❌ Error updating account details: ' + error.message);
                    console.error(error);
                } finally {
                    saveBtn.textContent = 'Save Changes';
                    saveBtn.disabled = false;
                }
            });
        }
    }

    // LOGOUT LOGIC
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('activeUserData');
            window.location.href = '../index.html';
        });
    }

    // SAVE ORIGINAL MODALS FOR FALLBACK
    window.__originalAlert = window.alert;
    window.__originalConfirm = window.confirm;

    // CUSTOM ALERT OVERRIDE
    window.alert = function (message) {
        const modal = document.getElementById('customAlertModal');
        const msgEl = document.getElementById('customAlertMessage');
        const okBtn = document.getElementById('customAlertOkBtn');
        if (modal && msgEl && okBtn) {
            msgEl.innerHTML = message.replace(/\n/g, '<br>');
            modal.style.display = 'flex';

            // Allow checking if there's a successful message to reload the page afterwards
            okBtn.onclick = () => {
                modal.style.display = 'none';
                if (message.includes('reflect immediately')) {
                    window.location.reload();
                }
            };
        } else {
            console.log("ALERT FALLBACK:", message);
        }
    };

    // CUSTOM CONFIRM OVERRIDE
    window.confirm = (message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            const msgEl = document.getElementById('customConfirmMessage');
            const okBtn = document.getElementById('customConfirmOkBtn');
            const cancelBtn = document.getElementById('customConfirmCancelBtn');

            if (modal && msgEl && okBtn && cancelBtn) {
                msgEl.textContent = message;
                modal.style.display = 'flex';

                okBtn.onclick = () => {
                    modal.style.display = 'none';
                    resolve(true);
                };
                cancelBtn.onclick = () => {
                    modal.style.display = 'none';
                    resolve(false);
                };
            } else {
                resolve(window.__originalConfirm ? window.__originalConfirm(message) : true);
            }
        });
    };

    // SIDEBAR TOGGLE LOGIC
    let sidebar = document.querySelector(".sidebar");
    let sidebarBtn = document.querySelector(".sidebarBtn");
    if (sidebarBtn) {
        sidebarBtn.onclick = function () {
            sidebar.classList.toggle("active");
            if (sidebar.classList.contains("active")) {
                sidebarBtn.classList.replace("bx-menu", "bx-menu-alt-right");
            } else {
                sidebarBtn.classList.replace("bx-menu-alt-right", "bx-menu");
            }
        }
    }

    // TAB SWITCHING LOGIC
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class from all links
            navBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked link
            btn.classList.add('active');

            // Hide all tabs
            tabContents.forEach(tab => {
                tab.style.display = 'none';
            });
            // Show target tab
            const targetTab = document.getElementById(btn.dataset.tab + 'Tab');
            if (targetTab) {
                targetTab.style.display = 'block';
            }

            // Update Header Title
            const headerTitle = document.getElementById('current-tab-title');
            if (headerTitle) {
                const linkName = btn.querySelector('.links_name').textContent;
                headerTitle.textContent = linkName;
            }

            // Fix Leaflet map rendering glitch when switching tabs
            if (btn.dataset.tab === 'dashboard' && typeof map !== 'undefined') {
                setTimeout(() => map.invalidateSize(), 50);
            }
        });
    });

    // TOGGLE TEMPORARY PASSWORD VISIBILITY (MDRRMO FORM)
    const tempPasswordInput = document.getElementById('tempPasswordInput');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');

    if (togglePasswordBtn && tempPasswordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = tempPasswordInput.getAttribute('type') === 'password';
            tempPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
            togglePasswordBtn.className = isPassword ? 'bx bx-show' : 'bx bx-hide';
            togglePasswordBtn.style.color = isPassword ? '#2C74B3' : '#64748B';
        });
    }

    // TOGGLE SETTINGS PASSWORD VISIBILITY
    document.querySelectorAll('.toggle-settings-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                const isPassword = targetInput.getAttribute('type') === 'password';
                targetInput.setAttribute('type', isPassword ? 'text' : 'password');
                btn.className = isPassword ? 'bx bx-show' : 'bx bx-hide';
                btn.style.color = isPassword ? '#2C74B3' : '#64748B';
            }
        });
    });

    // TOGGLE FORM VISIBILITY
    const toggleFormBtn = document.getElementById('toggleFormBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const accountForm = document.getElementById('accountForm');

    toggleFormBtn.addEventListener('click', () => {
        accountForm.style.display = accountForm.style.display === 'none' ? 'block' : 'none';
        if (accountForm.style.display === 'block') {
            toggleFormBtn.innerHTML = "<i class='bx bx-minus'></i> Close Form";
            toggleFormBtn.classList.replace('btn-primary', 'btn-secondary');
        } else {
            toggleFormBtn.innerHTML = "<i class='bx bx-plus'></i> New MDRRMO Account";
            toggleFormBtn.classList.replace('btn-secondary', 'btn-primary');
        }
    });

    // MOCK ACCOUNT CREATION AND EDITING HANDLING
    const saveAccountBtn = document.getElementById('saveAccountBtn');
    const mdrrmoTableBody = document.getElementById('mdrrmoTableBody');
    let editingRow = null;

// 3. FETCH ADMINS ON LOAD
    const fetchAdmins = async () => {
        try {
            const response = await fetch(`${API_URL}/admin/system-users?role=MDRRMO`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to fetch');

            // Clear current rows except empty state
            mdrrmoTableBody.querySelectorAll('tr:not(#emptyAdminRow)').forEach(e => e.remove());

            if (data && data.length > 0) {
                data.forEach(admin => {
                    const newRow = document.createElement('tr');
                    newRow.innerHTML = `
                        <td>
                            <div style="font-weight: 600; color: #1E293B;">${admin.first_name} ${admin.last_name}</div>
                            <div style="font-size: 12px; color: #64748B;">@${admin.username || 'no-username'}</div>
                        </td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="badge badge-jurisdiction">${admin.assigned_municipality}</span>
                            </div>
                        </td>
                        <td>${admin.contact_number || 'N/A'}</td>
                        <td><span class="badge badge-active">${admin.status}</span></td>
                        <td>
                            <button class="btn-icon btn-edit" data-id="${admin.id}" data-username="${admin.username || ''}"><i class='bx bx-edit-alt'></i></button>
                            <button class="btn-icon btn-delete" data-id="${admin.id}"><i class='bx bx-trash'></i></button>
                        </td>
                    `;
                    mdrrmoTableBody.prepend(newRow);
                });
            }
            updateAdminCount();
        } catch (err) {
            console.error('Error fetching admins:', err);
        }
    };

    // Initialize Fetch
    fetchAdmins();

    cancelFormBtn.addEventListener('click', () => {
        accountForm.style.display = 'none';
        toggleFormBtn.innerHTML = "<i class='bx bx-plus'></i> New MDRRMO Account";
        toggleFormBtn.classList.replace('btn-secondary', 'btn-primary');

        // Reset edit states and clear inputs
        editingRow = null;
        saveAccountBtn.textContent = 'Create Account';

        const officerNameInput = document.getElementById('officerName');
        const usernameInput = document.getElementById('usernameInput');
        const contactNumberInput = document.getElementById('contactNumberInput');
        const municipalitySelect = document.getElementById('municipalitySelect');
        const tempPasswordInput = document.getElementById('tempPasswordInput');

        if (officerNameInput) officerNameInput.value = '';
        if (usernameInput) usernameInput.value = '';
        if (contactNumberInput) contactNumberInput.value = '';
        if (municipalitySelect) municipalitySelect.value = '';
        if (tempPasswordInput) tempPasswordInput.value = 'AntiqueMDRRMO2026!';
    });

    // Helper: Dynamic Dashboard Counter
    const updateAdminCount = () => {
        const countDisplay = document.getElementById('adminCount');
        const emptyRow = document.getElementById('emptyAdminRow');
        if (!countDisplay || !mdrrmoTableBody) return;

        let activeRows = mdrrmoTableBody.querySelectorAll('tr:not(#emptyAdminRow)').length;
        countDisplay.textContent = activeRows;

        if (emptyRow) {
            emptyRow.style.display = activeRows > 0 ? 'none' : '';
        }

        // Update indicator logic visually completely linked to count
        const indicator = countDisplay.nextElementSibling;
        if (indicator) {
            if (activeRows > 0) {
                indicator.innerHTML = `<span class="text">${activeRows} active admin${activeRows !== 1 ? 's' : ''}</span>`;
            } else {
                indicator.innerHTML = `<span class="text">No active admins</span>`;
            }
        }
    };

    // Role Selection Logic
    const roleSelect = document.getElementById('roleSelect');
    const municipalitySelect = document.getElementById('municipalitySelect');

    if (roleSelect && municipalitySelect) {
        roleSelect.addEventListener('change', (e) => {
            if (e.target.value === 'PDRRMO') {
                municipalitySelect.innerHTML = '<option value="Antique" selected>Antique (Province-Wide)</option>';
                municipalitySelect.disabled = true;
                municipalitySelect.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            } else {
                municipalitySelect.innerHTML = `
                    <option value="" disabled selected>Select Municipality</option>
                    <option value="Anini-y">Anini-y</option>
                    <option value="Barbaza">Barbaza</option>
                    <option value="Belison">Belison</option>
                    <option value="Bugasong">Bugasong</option>
                    <option value="Caluya">Caluya</option>
                    <option value="Culasi">Culasi</option>
                    <option value="Hamtic">Hamtic</option>
                    <option value="Laua-an">Laua-an</option>
                    <option value="Libertad">Libertad</option>
                    <option value="Pandan">Pandan</option>
                    <option value="Patnongon">Patnongon</option>
                    <option value="San Jose de Buenavista">San Jose de Buenavista</option>
                    <option value="San Remigio">San Remigio</option>
                    <option value="Sebaste">Sebaste</option>
                    <option value="Sibalom">Sibalom</option>
                    <option value="Tibiao">Tibiao</option>
                    <option value="Tobias Fornier">Tobias Fornier</option>
                    <option value="Valderrama">Valderrama</option>
                `;
                municipalitySelect.disabled = false;
                municipalitySelect.style.backgroundColor = 'transparent';
            }
        });
    }

    saveAccountBtn.addEventListener('click', async () => {
        const officerNameInput = document.getElementById('officerName');
        const usernameInput = document.getElementById('usernameInput');
        const contactNumberInput = document.getElementById('contactNumberInput');
        const municipalitySelectElement = document.getElementById('municipalitySelect');
        const roleSelectElement = document.getElementById('roleSelect');
        const tempPasswordInput = document.getElementById('tempPasswordInput');

        let deptHead = officerNameInput ? officerNameInput.value.trim() : '';
        let username = usernameInput ? usernameInput.value.trim() : '';
        let municipality = municipalitySelectElement ? municipalitySelectElement.value : '';
        let role = roleSelectElement ? roleSelectElement.value : 'MDRRMO';
        let contact = contactNumberInput ? contactNumberInput.value.trim() : '';
        let tempPassword = tempPasswordInput ? tempPasswordInput.value : 'AntiqueMDRRMO2026!';

        if (role === 'PDRRMO') municipality = 'Antique';

        if (!deptHead || !username || !municipality || !contact) {
            alert("⚠️ Please fill in all details including a unique username.");
            return;
        }

        // Split name intuitively
        let nameParts = deptHead.split(' ');
        let firstName = nameParts[0];
        let lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';

        // UX: Show saving state
        const originalBtnText = saveAccountBtn.textContent;
        saveAccountBtn.textContent = 'Saving to Database...';
        saveAccountBtn.disabled = true;

        if (editingRow) {
            const adminId = editingRow.querySelector('.btn-edit').getAttribute('data-id');
            try {
                const response = await fetch(`${API_URL}/admin/system-users/${adminId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        first_name: firstName,
                        last_name: lastName,
                        contact_number: contact
                    })
                });

                if (!response.ok) throw new Error("Update failed");

                await fetchAdmins();
                alert(`✅ Account updated successfully.`);
            } catch (err) {
                console.error("Update error", err);
                alert("❌ Failed to update account: " + err.message);
                saveAccountBtn.textContent = originalBtnText;
                saveAccountBtn.disabled = false;
                return;
            }
        } else {
            // DATABASE INSERT - Use Local API
            try {
                const response = await fetch('http://localhost:4000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        role: role,
                        first_name: firstName,
                        last_name: lastName,
                        assigned_municipality: municipality,
                        contact_number: contact,
                        temp_password: tempPassword,
                        status: 'Active'
                    })
                });

                const responseText = await response.text();
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (e) {
                    console.error('SERVER RETURNED HTML INSTEAD OF JSON:', responseText);
                    throw new Error(`Server Error: Received HTML instead of JSON. Ensure you are visiting through http://localhost:3000 and the server is running.`);
                }

                if (!response.ok) throw new Error(result.error || 'Failed to create account');

                // Sync UI fully with Database
                await fetchAdmins();

                alert(`The MDRRMO admin for ${municipality} can now log in securely.`);
            } catch (error) {
                console.error('Account Creation Error:', error);
                alert('❌ ' + error.message);
                saveAccountBtn.textContent = originalBtnText;
                saveAccountBtn.disabled = false;
                return;
            }
        }

        // Clean up and hide form
        if (officerNameInput) officerNameInput.value = '';
        if (usernameInput) usernameInput.value = '';
        if (contactNumberInput) contactNumberInput.value = '';
        if (tempPasswordInput) tempPasswordInput.value = 'AntiqueMDRRMO2026!';
        if (roleSelect && roleSelect.value === 'MDRRMO' && municipalitySelect) {
            municipalitySelect.value = '';
        }

        accountForm.style.display = 'none';
        toggleFormBtn.innerHTML = "<i class='bx bx-plus'></i> New MDRRMO Account";
        toggleFormBtn.classList.replace('btn-secondary', 'btn-primary');

        saveAccountBtn.textContent = 'Create Account';
        saveAccountBtn.disabled = false;
        editingRow = null;
    });

    // Handle Edit and Delete directly from the table rows
    mdrrmoTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const row = btn.closest('tr');
        const adminId = btn.getAttribute('data-id');

        if (btn.classList.contains('btn-delete')) {
            if (confirm("⚠️ Are you sure you want to delete this MDRRMO account?\n\nThis action cannot be undone and will revoke their access to the system.")) {

                // If it was pulled from DB, delete from DB first
                if (adminId) {
                    btn.disabled = true;
                    btn.innerHTML = "<i class='bx bx-loader bx-spin'></i>";

                    try {
                        const response = await fetch(`${API_URL}/admin/system-users/${adminId}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error("Delete failed");
                        
                        // Apply a quick fade out animation before deleting visually
                        row.style.transition = 'opacity 0.3s ease';
                        row.style.opacity = '0';
                        setTimeout(() => {
                            row.remove();
                            updateAdminCount();
                        }, 300);
                    } catch (err) {
                        console.error('Delete error', err);
                        alert('❌ Error deleting account: ' + err.message);
                        btn.disabled = false;
                        btn.innerHTML = "<i class='bx bx-trash'></i>";
                    }
                    return;
                }

                // Apply a quick fade out animation before deleting visually
                row.style.transition = 'opacity 0.3s ease';
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                    updateAdminCount();
                }, 300);
            }
        } else if (btn.classList.contains('btn-edit')) {
            const officerNameInput = document.getElementById('officerName');
            const usernameInput = document.getElementById('usernameInput');
            const contactNumberInput = document.getElementById('contactNumberInput');
            const municipalitySelect = document.getElementById('municipalitySelect');

            // Populate form with existing data
            const nameDiv = row.cells[0].querySelector('div');
            const fullName = nameDiv ? nameDiv.textContent : '';
            if (officerNameInput) officerNameInput.value = fullName;
            if (usernameInput) usernameInput.value = btn.getAttribute('data-username');
            if (municipalitySelect) {
                const badge = row.cells[1].querySelector('.badge-jurisdiction');
                municipalitySelect.value = badge ? badge.textContent.trim() : '';
            }
            if (contactNumberInput) contactNumberInput.value = row.cells[2].textContent;

            editingRow = row;
            saveAccountBtn.textContent = 'Update Account';

            // Show form if it isn't already visible
            accountForm.style.display = 'block';
            toggleFormBtn.innerHTML = "<i class='bx bx-minus'></i> Close Form";
            toggleFormBtn.classList.replace('btn-primary', 'btn-secondary');

            // Optional enhancement: Smooth scroll up to the form so the user isn't lost
            accountForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    // PIE CHART: Accidents per Municipality (Antique Data Example)
    const ctx = document.getElementById('municipalityChart').getContext('2d');

    // Gradient definitions for a premium look
    const purpleGradient = ctx.createLinearGradient(0, 0, 0, 400);
    purpleGradient.addColorStop(0, 'rgba(156, 39, 176, 0.8)');
    purpleGradient.addColorStop(1, 'rgba(103, 58, 183, 0.4)');

    const blueGradient = ctx.createLinearGradient(0, 0, 0, 400);
    blueGradient.addColorStop(0, 'rgba(33, 150, 243, 0.8)');
    blueGradient.addColorStop(1, 'rgba(3, 169, 244, 0.4)');

    const orangeGradient = ctx.createLinearGradient(0, 0, 0, 400);
    orangeGradient.addColorStop(0, 'rgba(255, 152, 0, 0.8)');
    orangeGradient.addColorStop(1, 'rgba(255, 87, 34, 0.4)');

    const cyanGradient = ctx.createLinearGradient(0, 0, 0, 400);
    cyanGradient.addColorStop(0, 'rgba(0, 188, 212, 0.8)');
    cyanGradient.addColorStop(1, 'rgba(0, 150, 136, 0.4)');

    // Mock corresponding incident data (Zero state for now)
    const accidentData = new Array(municipalities.length).fill(0);

    // Generate gradients or colors dynamically
    const bgColors = municipalities.map(m => muniColorMap[m]);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: municipalities,
            datasets: [{
                label: 'Accidents',
                data: accidentData,
                backgroundColor: bgColors,
                borderColor: 'rgba(6, 24, 44, 1)', // match bg-color
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#000000',
                        font: {
                            family: 'Inter',
                            size: 13
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 38, 71, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(44, 116, 179, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true
                }
            }
        }
    });

    // BAR CHART: Severity Breakdown
    const severityCtx = document.getElementById('severityBarChart').getContext('2d');
    new Chart(severityCtx, {
        type: 'bar',
        data: {
            labels: ['Minor', 'Moderate', 'Severe', 'Critical'],
            datasets: [{
                label: 'Accident Count',
                data: [0, 0, 0, 0], // Zero state awaiting DB
                backgroundColor: [
                    'rgba(100, 181, 246, 0.7)',
                    'rgba(255, 179, 0, 0.7)',
                    'rgba(255, 82, 82, 0.7)',
                    'rgba(176, 0, 32, 0.7)'
                ],
                borderColor: [
                    '#64B5F6',
                    '#FFB300',
                    '#FF5252',
                    '#B00020'
                ],
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.08)' },
                    ticks: {
                        color: '#2196F3',
                        stepSize: 1,
                        precision: 0
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#2196F3' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // LINE CHART: 7-Day Trend
    const trendCtx = document.getElementById('weeklyLineChart').getContext('2d');

    // Generate simple last 7 days strings
    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        }
        return days;
    };

    new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: getLast7Days(),
            datasets: [{
                label: 'Accidents',
                data: [0, 0, 0, 0, 0, 0, 0], // Zero state
                borderColor: '#FFB300',
                backgroundColor: 'rgba(255, 179, 0, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#FFB300'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.08)' },
                    ticks: {
                        color: '#2196F3',
                        stepSize: 1,
                        precision: 0
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#2196F3' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // MAP: High Risk Areas (Leaflet.js)
    // Antique Province bounds roughly including islands
    const antiqueBounds = [
        [10.35, 121.30], // Southwest (Anini-y / Semirara bounds)
        [12.10, 122.35]  // Northeast (Libertad / Border bounds)
    ];

    const map = L.map('riskMap', {
        zoomControl: false,
        maxBounds: antiqueBounds,
        maxBoundsViscosity: 1.0,
        minZoom: 9
    }).setView([11.15, 122.04], 9);

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Premium Light Theme tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        bounds: antiqueBounds
    }).addTo(map);

    // Fetch precise GeoJSON boundary for Antique Province from OSM Nominatim
    fetch(`https://nominatim.openstreetmap.org/search.php?state=Antique&country=Philippines&polygon_geojson=1&format=jsonv2`)
        .then(res => res.json())
        .then(data => {
            // Find the boundary (relation) type for the province
            if (data && data.length > 0) {
                // Ensure we pick the actual administrative boundary for the province, not a point
                const antiqueData = data.find(item => item.osm_type === 'relation' && item.type === 'administrative') || data[0];

                if (antiqueData && antiqueData.geojson) {
                    const geojsonBoundary = antiqueData.geojson;

                    const borderLayer = L.geoJSON(geojsonBoundary, {
                        style: {
                            opacity: 0,
                            fillOpacity: 0
                        }
                    }).addTo(map);

                    // Optional: Fit bounds specifically to the newly drawn border
                    // map.fitBounds(borderLayer.getBounds());
                }
            }
        })
        .catch(err => console.error("Error fetching Antique geojson boundary:", err));

    // Custom Icons setup
    const createMarkerIcon = (color) => {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; box-shadow: 0 0 15px ${color}; opacity: 0.8; border: 2px solid #fff;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    const redIcon = createMarkerIcon('#FF5252'); // Critical
    const orangeIcon = createMarkerIcon('#FFB300'); // Moderate
    const blueIcon = createMarkerIcon('#64B5F6'); // General

    // Initialize Marker Layer and Cache
    const markerLayer = L.layerGroup().addTo(map);
    const coordinateCache = {};

    // --- ACCIDENT REPORTS FETCHING AND RENDERING ---
    let muniChartInstance, severityChartInstance, trendChartInstance;
    let allAccidentReports = [];
    let currentMuniFilter = '';
    let currentMonthFilter = '';

    const fetchAndRenderReports = async () => {
        try {
            const response = await fetch(`${API_URL}/reports`);
            const reports = await response.json();
            
            if (!response.ok) throw new Error("Failed to load reports");

            allAccidentReports = reports;
            applyFilters();

            updateDashboardCounters(reports);
            updateCharts(reports);
            updateMapMarkers(reports);
            updateActivityFeed(reports);
        } catch (err) {
            console.error("Error fetching accident reports:", err);
        }
    };

    const applyFilters = () => {
        let filtered = [...allAccidentReports];
        const reportsTitle = document.querySelector('#reportsTab .title span');
        const activeCasesTitle = document.querySelector('#active-casesTab .title span');

        if (currentMuniFilter) {
            filtered = filtered.filter(r => r.jurisdiction === currentMuniFilter);
        }

        if (currentMonthFilter) {
            const [year, month] = currentMonthFilter.split('-').map(Number);
            filtered = filtered.filter(r => {
                const rDate = new Date(r.datetime);
                return rDate.getFullYear() === year && (rDate.getMonth() + 1) === month;
            });
        }

        let label = currentMuniFilter || "All Municipalities";
        if (currentMonthFilter) {
            const d = new Date(currentMonthFilter + "-02");
            const monthYear = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (label === "All Municipalities") label = monthYear;
            else label += `, ${monthYear}`;
        }

        if (reportsTitle) reportsTitle.textContent = `Provincial Accident Reports (${label})`;
        if (activeCasesTitle) activeCasesTitle.textContent = `Active Provincial Cases (${label})`;

        renderReportsToTabs(filtered);
    };

    const renderReportsToTabs = (reports) => {
        const reportsTableBody = document.getElementById('reportsTableBody');
        const activeCasesTableBody = document.getElementById('activeCasesTableBody');

        if (!reportsTableBody || !activeCasesTableBody) return;

        reportsTableBody.innerHTML = '';
        activeCasesTableBody.innerHTML = '';

        reports.forEach(r => {
            const date = new Date(r.datetime).toLocaleString();

            // Extract Victim Name from involved_biometrics
            let victimName = 'Anonymous';
            if (r.involved_biometrics && r.involved_biometrics.includes('Name:')) {
                const parts = r.involved_biometrics.split('Name:');
                if (parts.length > 1) {
                    victimName = parts[1].split('\n')[0].trim();
                }
            }

            // Severity Color Mapping
            let sevClass = 'badge-pending';
            if (r.severity === 'Critical') sevClass = 'badge-critical';
            else if (r.severity === 'Severe') sevClass = 'badge-critical';
            else if (r.severity === 'Moderate') sevClass = 'badge-resolved';

            const rowHTML = `
                <tr>
                    <td>${date}</td>
                    <td><div style="font-weight: 600; color: #1E293B;">${victimName}</div></td>
                    <td><span class="badge badge-jurisdiction">${r.jurisdiction}</span></td>
                    <td>${r.location}</td>
                    <td><span class="badge ${sevClass}">${r.severity}</span></td>
                    <td><span class="badge badge-pending">${r.status}</span></td>
                    <td>${r.reporting_officer || 'Police Dept'}</td>
                </tr>
            `;

            reportsTableBody.insertAdjacentHTML('beforeend', rowHTML);

            if (r.status !== 'Resolved') {
                activeCasesTableBody.insertAdjacentHTML('beforeend', rowHTML);
            }
        });

        if (reports.length === 0) {
            const empty = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#64748B;">No reports found.</td></tr>`;
            reportsTableBody.innerHTML = empty;
            activeCasesTableBody.innerHTML = empty;
        }
    };

    const updateDashboardCounters = (reports) => {
        const totalAccidentsEl = document.querySelector('.overview-boxes .box:nth-child(1) .number');
        const activeCasesEl = document.querySelector('.overview-boxes .box:nth-child(3) .number');

        if (totalAccidentsEl) totalAccidentsEl.textContent = reports.length;

        const activeCount = reports.filter(r => r.status !== 'Resolved').length;
        if (activeCasesEl) activeCasesEl.textContent = activeCount;

        // Update indicators
        const accidentIndicator = document.querySelector('.overview-boxes .box:nth-child(1) .indicator');
        if (accidentIndicator) {
            accidentIndicator.innerHTML = `<span class="text">Across 18 Municipalities</span>`;
        }
    };

    const updateCharts = (reports) => {
        // 1. Accidents per Municipality
        const muniCounts = {};
        municipalities.forEach(m => muniCounts[m] = 0);
        reports.forEach(r => {
            if (muniCounts.hasOwnProperty(r.jurisdiction)) {
                muniCounts[r.jurisdiction]++;
            }
        });

        const muniChartCanvas = document.getElementById('municipalityChart');
        if (muniChartCanvas) {
            const chart = Chart.getChart(muniChartCanvas);
            if (chart) {
                chart.data.datasets[0].data = municipalities.map(m => muniCounts[m]);
                chart.update();
            }
        }

        // 2. Severity Breakdown
        const severityCounts = { 'Minor': 0, 'Moderate': 0, 'Severe': 0, 'Critical': 0 };
        reports.forEach(r => {
            if (severityCounts.hasOwnProperty(r.severity)) {
                severityCounts[r.severity]++;
            }
        });

        const severityChartCanvas = document.getElementById('severityBarChart');
        if (severityChartCanvas) {
            const chart = Chart.getChart(severityChartCanvas);
            if (chart) {
                chart.data.datasets[0].data = [
                    severityCounts['Minor'],
                    severityCounts['Moderate'],
                    severityCounts['Severe'],
                    severityCounts['Critical']
                ];
                chart.update();
            }
        }

        // 3. 7-Day Trend
        const trendCounts = new Array(7).fill(0);
        const todayAtMidnight = new Date();
        todayAtMidnight.setHours(0, 0, 0, 0);

        reports.forEach(r => {
            // Use created_at for accurate system activity tracking
            const rDate = new Date(r.datetime || r.created_at);
            const rDateAtMidnight = new Date(rDate);
            rDateAtMidnight.setHours(0, 0, 0, 0);

            const diffTime = todayAtMidnight - rDateAtMidnight;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < 7) {
                trendCounts[6 - diffDays]++;
            }
        });

        const trendChartCanvas = document.getElementById('weeklyLineChart');
        if (trendChartCanvas) {
            const chart = Chart.getChart(trendChartCanvas);
            if (chart) {
                chart.data.datasets[0].data = trendCounts;
                chart.update();
            }
        }
    };

    const updateMapMarkers = async (reports) => {
        markerLayer.clearLayers();

        for (const r of reports) {
            const query = `${r.location}, ${r.jurisdiction}, Antique, Philippines`;
            const cacheKey = `${r.location}, ${r.jurisdiction}`;

            if (coordinateCache[cacheKey]) {
                addMarker(coordinateCache[cacheKey], r);
                continue;
            }

            try {
                // Throttle requests slightly if there are many reports
                await new Promise(resolve => setTimeout(resolve, 100));

                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
                const data = await response.json();

                if (data && data.length > 0) {
                    const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                    coordinateCache[cacheKey] = coords;
                    addMarker(coords, r);
                } else {
                    // Specific fallback for Anini-y or other municipalities if address search fails
                    const muniCoords = {
                        'Anini-y': [10.4300, 121.9250],
                        'Barbaza': [11.2167, 122.0333],
                        'San Jose de Buenavista': [10.7431, 121.9422],
                        'Sibalom': [10.7833, 122.0167],
                        'Pandan': [11.7222, 122.0944],
                        'Culasi': [11.4250, 122.0553]
                    };
                    const fallbackCoords = muniCoords[r.jurisdiction] || [11.15, 122.04];
                    addMarker(fallbackCoords, r);
                }
            } catch (err) {
                console.error("Geocoding error:", err);
            }
        }
    };

    const addMarker = (coords, report) => {
        // Use the municipality color from the shared color map
        const mColor = muniColorMap[report.jurisdiction] || '#64B5F6';
        const icon = createMarkerIcon(mColor);

        L.marker(coords, { icon: icon })
            .addTo(markerLayer)
            .bindPopup(`
                <div style="font-family: 'Inter', sans-serif; padding: 5px;">
                    <b style="color: #103155; display: block; margin-bottom: 5px;">${report.jurisdiction}: ${report.location}</b>
                    <span style="font-size: 12px; color: #64748B;">
                        Severity: <b style="color: ${report.severity === 'Critical' ? '#EF4444' : '#103155'}">${report.severity}</b><br>
                        Status: <b>${report.status}</b><br>
                        Date: ${new Date(report.datetime).toLocaleDateString()}
                    </span>
                    <div style="margin-top: 8px; font-size: 11px; color: ${mColor}; font-weight: bold;">
                        <i class='bx bxs-circle'></i> Local Municipality Zone
                    </div>
                </div>
            `);
    };

    const updateActivityFeed = (reports) => {
        const feed = document.getElementById('liveActivityFeed');
        if (!feed) return;

        if (reports.length > 0) {
            feed.innerHTML = '';
            reports.slice(0, 8).forEach(r => {
                const timeAgo = getTimeAgo(new Date(r.datetime || r.created_at));
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.style.padding = '12px';
                item.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
                item.style.display = 'flex';
                item.style.alignItems = 'flex-start';
                item.style.gap = '12px';

                const muniColor = muniColorMap[r.jurisdiction] || '#2C74B3';
                item.innerHTML = `
                    <div style="background: ${muniColor}; width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 14px; color: #1E293B; font-weight: 500;">
                            <b>${r.jurisdiction}</b>: ${r.severity} incident reported at ${r.location}
                        </p>
                        <span style="font-size: 12px; color: #64748B; font-weight: 500;">${timeAgo}</span>
                    </div>
                `;
                feed.appendChild(item);
            });
        }
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor(Math.abs(new Date() - date) / 1000);

        let interval = seconds / 31536000;
        if (interval >= 1) {
            const val = Math.floor(interval);
            return `${val} year${val > 1 ? 's' : ''} ago`;
        }

        interval = seconds / 2592000;
        if (interval >= 1) {
            const val = Math.floor(interval);
            return `${val} month${val > 1 ? 's' : ''} ago`;
        }

        interval = seconds / 604800;
        if (interval >= 1) {
            const val = Math.floor(interval);
            return `${val} week${val > 1 ? 's' : ''} ago`;
        }

        interval = seconds / 86400;
        if (interval >= 1) {
            const val = Math.floor(interval);
            return `${val} day${val > 1 ? 's' : ''} ago`;
        }

        interval = seconds / 3600;
        if (interval >= 1) {
            const val = Math.floor(interval);
            return `${val} hour${val > 1 ? 's' : ''} ago`;
        }

        interval = seconds / 60;
        if (interval >= 1) {
            const val = Math.floor(interval);
            return `${val} minute${val > 1 ? 's' : ''} ago`;
        }

        return `${Math.floor(seconds)} second${Math.floor(seconds) !== 1 ? 's' : ''} ago`;
    };

    const fetchResidents = async () => {
        try {
            const response = await fetch(`${API_URL}/residents`);
            const data = await response.json();

            if (!response.ok) throw new Error("Failed to load residents");

            const residentsTableBody = document.getElementById('residentsTableBody');
            const residentsCountEl = document.getElementById('stats-residents');

            if (residentsCountEl) residentsCountEl.textContent = data.length || 0;

            if (residentsTableBody) {
                residentsTableBody.innerHTML = '';
                if (data && data.length > 0) {
                    data.forEach(res => {
                        const date = new Date(res.created_at).toLocaleDateString();
                        const row = `
                            <tr>
                                <td>${res.first_name} ${res.last_name}</td>
                                <td><span class="badge badge-jurisdiction">${res.municipality}</span></td>
                                <td>${res.barangay}</td>
                                <td>${res.contact_number || 'N/A'}</td>
                                <td>${date}</td>
                                <td><span class="badge badge-active">Verified</span></td>
                            </tr>
                        `;
                        residentsTableBody.insertAdjacentHTML('beforeend', row);
                    });
                } else {
                    residentsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748B;">No residents registered yet.</td></tr>`;
                }
            }
        } catch (err) {
            console.error("Error fetching residents:", err);
        }
    };

    // Initial Load of Data
    fetchAndRenderReports();
    fetchResidents();

    // Periodically Refresh Data
    setInterval(() => {
        fetchAndRenderReports();
        fetchResidents();
    }, 15000); // Every 15 seconds

    // --- FILTERING LOGIC ---
    const residentsMuniFilter = document.querySelector('#residentsTab select.modern-select');
    const reportsMuniFilter = document.querySelector('#reportsTab select.modern-select');
    const activeCasesMuniFilter = document.querySelector('#active-casesTab select.modern-select');
    const reportsMonthFilter = document.querySelector('#reportsTab input[type="month"]');
    const activeCasesMonthFilter = document.querySelector('#active-casesTab input[type="month"]');

    // Initialize state from existing DOM values
    if (reportsMuniFilter) currentMuniFilter = reportsMuniFilter.value;
    if (reportsMonthFilter) currentMonthFilter = reportsMonthFilter.value;

    if (residentsMuniFilter) {
        residentsMuniFilter.addEventListener('change', async (e) => {
            const muni = e.target.value;
            try {
                const url = muni ? `${API_URL}/residents?municipality=${encodeURIComponent(muni)}` : `${API_URL}/residents`;
                const response = await fetch(url);
                const data = await response.json();
                if (response.ok) renderResidents(data);
            } catch (err) {
                console.error("Filter error", err);
            }
        });
    }

    if (reportsMuniFilter) {
        reportsMuniFilter.addEventListener('change', (e) => {
            currentMuniFilter = e.target.value;
            if (activeCasesMuniFilter) activeCasesMuniFilter.value = currentMuniFilter;
            applyFilters();
        });
    }

    if (activeCasesMuniFilter) {
        activeCasesMuniFilter.addEventListener('change', (e) => {
            currentMuniFilter = e.target.value;
            if (reportsMuniFilter) reportsMuniFilter.value = currentMuniFilter;
            applyFilters();
        });
    }

    if (reportsMonthFilter) {
        const updateMonth = (e) => {
            currentMonthFilter = e.target.value;
            if (activeCasesMonthFilter) activeCasesMonthFilter.value = currentMonthFilter;
            applyFilters();
        };
        reportsMonthFilter.addEventListener('change', updateMonth);
        reportsMonthFilter.addEventListener('input', updateMonth);
    }

    if (activeCasesMonthFilter) {
        const updateMonth = (e) => {
            currentMonthFilter = e.target.value;
            if (reportsMonthFilter) reportsMonthFilter.value = currentMonthFilter;
            applyFilters();
        };
        activeCasesMonthFilter.addEventListener('change', updateMonth);
        activeCasesMonthFilter.addEventListener('input', updateMonth);
    }

    const renderResidents = (data) => {
        const residentsTableBody = document.getElementById('residentsTableBody');
        if (!residentsTableBody) return;
        residentsTableBody.innerHTML = '';
        if (data && data.length > 0) {
            data.forEach(res => {
                const date = new Date(res.created_at).toLocaleDateString();
                const row = `
                    <tr>
                        <td>${res.first_name} ${res.last_name}</td>
                        <td><span class="badge badge-jurisdiction">${res.municipality}</span></td>
                        <td>${res.barangay}</td>
                        <td>${res.contact_number || 'N/A'}</td>
                        <td>${date}</td>
                        <td><span class="badge badge-active">Verified</span></td>
                    </tr>
                `;
                residentsTableBody.insertAdjacentHTML('beforeend', row);
            });
        } else {
            residentsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748B;">No residents found for this filter.</td></tr>`;
        }
    };

    // --- CUSTOM DROPDOWN IMPLEMENTATION ---
    const initCustomSelect = (select) => {
        if (!select || select.dataset.customInit) return;
        
        // Skip hidden selects or ones already handled
        if (select.offsetParent === null && !select.classList.contains('modern-select')) return;

        select.dataset.customInit = "true";
        select.style.display = 'none';

        const container = document.createElement('div');
        container.className = 'custom-dropdown';
        if (select.id) container.id = 'custom-' + select.id;

        const trigger = document.createElement('div');
        trigger.className = 'custom-dropdown-trigger';
        trigger.innerHTML = `<span class="selected-text">${select.options[select.selectedIndex]?.text || 'Select...'}</span><i class='bx bx-chevron-down'></i>`;

        const optionsList = document.createElement('div');
        optionsList.className = 'custom-dropdown-options';

        container.appendChild(trigger);
        container.appendChild(optionsList);
        select.parentNode.insertBefore(container, select);

        const refreshOptions = () => {
            optionsList.innerHTML = '';
            Array.from(select.options).forEach((opt, idx) => {
                if (opt.disabled && idx === 0) return; // Skip placeholder if disabled
                const div = document.createElement('div');
                div.className = 'custom-dropdown-option';
                if (idx === select.selectedIndex) div.classList.add('selected');
                div.textContent = opt.text;
                div.dataset.value = opt.value;
                div.onclick = (e) => {
                    e.stopPropagation();
                    select.selectedIndex = idx;
                    trigger.querySelector('.selected-text').textContent = opt.text;
                    container.classList.remove('active');
                    trigger.classList.remove('active');
                    
                    // Trigger native events
                    select.dispatchEvent(new Event('change'));
                    select.dispatchEvent(new Event('input'));
                    
                    refreshOptions();
                };
                optionsList.appendChild(div);
            });
            
            // Handle disabled state
            if (select.disabled) {
                container.style.opacity = '0.6';
                container.style.pointerEvents = 'none';
            } else {
                container.style.opacity = '1';
                container.style.pointerEvents = 'auto';
            }
            
            const selectedText = select.options[select.selectedIndex]?.text || 'Select...';
            trigger.querySelector('.selected-text').textContent = selectedText;
        };

        trigger.onclick = (e) => {
            e.stopPropagation();
            const isActive = container.classList.contains('active');
            
            // Close all other custom dropdowns
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== container) {
                    d.classList.remove('active');
                    d.querySelector('.custom-dropdown-trigger').classList.remove('active');
                }
            });

            container.classList.toggle('active');
            trigger.classList.toggle('active');
        };

        document.addEventListener('click', () => {
            container.classList.remove('active');
            trigger.classList.remove('active');
        });

        // Initial build
        refreshOptions();

        // Export refresh function to Native Select
        select.refreshCustomUI = refreshOptions;
    };

    // Auto-init for all relevant selects
    const runDropdownInit = () => {
        const selectsToCustom = document.querySelectorAll('#municipalitySelect, .modern-select');
        selectsToCustom.forEach(sel => initCustomSelect(sel));
    };

    // Delay slightly to ensure dynamic elements are ready
    setTimeout(runDropdownInit, 500);

    // Re-bind the roleSelect listener to refresh the custom UI when role changes
    const roleSelectEl = document.getElementById('roleSelect');
    if (roleSelectEl) {
        roleSelectEl.addEventListener('change', () => {
            setTimeout(() => {
                const muniSel = document.getElementById('municipalitySelect');
                if (muniSel && muniSel.refreshCustomUI) muniSel.refreshCustomUI();
            }, 50);
        });
    }

    // Also refresh when tab changes just in case
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(runDropdownInit, 200);
        });
    });
});
