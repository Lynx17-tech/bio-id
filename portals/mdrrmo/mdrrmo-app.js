function showCustomAlert(message, type = 'success', title = 'BioID Notification') {
    const modal = document.getElementById('customAlert');
    const titleEl = document.getElementById('customAlertTitle');
    const messageEl = document.getElementById('customAlertMessage');
    const iconEl = document.getElementById('customAlertIcon');

    titleEl.innerText = title;
    messageEl.innerText = message;

    // Reset icons
    iconEl.className = 'custom-alert-icon ' + type;
    if (type === 'success') {
        iconEl.innerHTML = "<i class='bx bx-check-circle'></i>";
        iconEl.style.color = "#2E7D32";
    } else if (type === 'error') {
        iconEl.innerHTML = "<i class='bx bx-error-circle'></i>";
        iconEl.style.color = "#D32F2F";
    } else if (type === 'warning') {
        iconEl.innerHTML = "<i class='bx bx-error'></i>";
        iconEl.style.color = "#F57C00";
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

window.closeCustomAlert = function () {
    const modal = document.getElementById('customAlert');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

// Custom Confirm Function
function showCustomConfirm(message, title = 'Confirm', onConfirmCallback) {
    const modal = document.getElementById('customConfirm');
    if (!modal) return;

    const titleEl = document.getElementById('customConfirmTitle');
    const messageEl = document.getElementById('customConfirmMessage');
    const okBtn = document.getElementById('customConfirmOk');
    const cancelBtn = document.getElementById('customConfirmCancel');

    titleEl.innerText = title;
    messageEl.innerText = message;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);

    // Clean up existing listeners to prevent multiple fires
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            if (onConfirmCallback) onConfirmCallback();
        }, 300);
    });

    newCancelBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    });
}

document.addEventListener('DOMContentLoaded', () => {

    // --- SUPABASE INITIALIZATION ---
    const supabaseUrl = 'https://rbncteviieusldynswny.supabase.co';
    const supabaseKey = 'sb_publishable_7CR3OUMv3lrkGVIfzHko1g_Dpu-yrF0';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    const API_URL = `${window.location.origin}/api`;

    // --- DYNAMIC CONTENT INJECTION FROM SESSION ---
    let activeMunicipality = 'Barbaza';
    let adminFullName = 'MDRRMO Admin';
    let activeUser = null;

    const sessionData = sessionStorage.getItem('activeUserData');
    if (sessionData) {
        try {
            activeUser = JSON.parse(sessionData);
            if (activeUser.jurisdiction) activeMunicipality = activeUser.jurisdiction;

            // If the role is MDRRMO but the field in DB is assigned_municipality (from PDRRMO logic)
            if (activeUser.assigned_municipality) activeMunicipality = activeUser.assigned_municipality;

            if (activeUser.first_name && activeUser.last_name) {
                adminFullName = `${activeUser.first_name} ${activeUser.last_name}`;
            }
        } catch (e) {
            console.error("Could not parse session user data", e);
        }
    }

    // Replace all dynamic texts
    document.querySelectorAll('.dynamic-muni-text').forEach(el => {
        el.textContent = activeMunicipality;
    });

    // --- DATE FILTER INITIALIZATION ---
    const recordsMonthFilter = document.getElementById('recordsMonthFilter');
    let currentMonthFilter = '';
    if (recordsMonthFilter) {
        const now = new Date();
        currentMonthFilter = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        recordsMonthFilter.value = currentMonthFilter;

        recordsMonthFilter.addEventListener('change', (e) => {
            currentMonthFilter = e.target.value;
            applyFilters();
        });
    }

    // Update Admin Profile Name
    const adminNameSpan = document.querySelector('.admin_name');
    if (adminNameSpan) adminNameSpan.textContent = adminFullName;

    // Update Profile Image Initials
    const profileImg = document.querySelector('.profile-details img');
    if (profileImg) {
        profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminFullName)}&background=4CAF50&color=fff`;
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

                if (!activeUser?.id) {
                    return showCustomAlert('Session validation failed. Cannot update account. Please log out and log back in.', 'error');
                }

                showCustomConfirm('Are you sure you want to update your profile settings?', 'Update Profile', async () => {
                    const newFirst = document.getElementById('settingsFirstName').value.trim();
                    const newLast = document.getElementById('settingsLastName').value.trim();
                    const newContact = document.getElementById('settingsContact').value.trim();
                    const newPass = document.getElementById('settingsPassword').value.trim();

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

                        const result = await response.json();
                        saveBtn.textContent = 'Save Changes';
                        saveBtn.disabled = false;

                        if (!response.ok) throw new Error(result.error || 'Failed to update');

                        // Refresh session data with the new values
                        const updatedUser = { ...activeUser, ...updates };
                        sessionStorage.setItem('activeUserData', JSON.stringify(updatedUser));

                        settingsModal.style.display = 'none';
                        showCustomAlert('Account details updated successfully! Reloading to apply changes...', 'success', 'Profile Updated');

                        setTimeout(() => window.location.reload(), 1500);

                    } catch (error) {
                        console.error('Update Error:', error);
                        saveBtn.textContent = 'Save Changes';
                        saveBtn.disabled = false;
                        showCustomAlert(error.message || 'Error updating account details.', 'error', 'Error');
                    }
                });
            });
        }
    }

    // LOGOUT LOGIC
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('activeUserData');
            window.location.href = '../../index.html';
        });
    }

    // Form inputs
    const assignedMuniInput = document.getElementById('assignedMunicipalityInput');
    if (assignedMuniInput) {
        assignedMuniInput.value = activeMunicipality;
    }


    // Update Filter and Form Defaults based on active municipality
    const recordsMuniFilter = document.getElementById('recordsMunicipalityFilter');
    if (recordsMuniFilter) recordsMuniFilter.value = activeMunicipality;

    const assignedMuniDisplay = document.getElementById('assignedMunicipalityInput');
    if (assignedMuniDisplay) assignedMuniDisplay.value = activeMunicipality;

    const tempPassDisplay = document.getElementById('tempPassDisplay');
    if (tempPassDisplay) tempPassDisplay.value = `${activeMunicipality}Police2026!`;

    // FETCH POLICE ACCOUNTS FROM DB
    const policeTableBody = document.getElementById('policeTableBody');

    async function loadPoliceAccounts() {
        if (!policeTableBody) return;

        try {
            const apiUrl = `${API_URL}/police-accounts?jurisdiction=${encodeURIComponent(activeMunicipality)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to fetch');

            policeTableBody.innerHTML = ''; // Clear loading/existing

            if (!data || data.length === 0) {
                policeTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--mdrrmo-text-light); padding: 30px;">
                            <i class='bx bx-user-x' style="font-size: 24px; display: block; margin-bottom: 5px;"></i>
                            No police accounts registered for ${activeMunicipality} yet.
                        </td>
                    </tr>
                `;
                return;
            }

            data.forEach(account => {
                const row = document.createElement('tr');
                row.dataset.id = account.id;

                // Format date easily
                const dateCreated = new Date(account.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });

                row.innerHTML = `
                    <td>
                        <div style="font-weight: 600;">${account.first_name} ${account.last_name}</div>
                        <div style="font-size: 12px; color: #7F8C8D;">@${account.username || 'no_username'}</div>
                    </td>
                    <td>${account.contact_number}</td>
                    <td style="font-size: 13px; color: #7F8C8D;">${dateCreated}</td>
                    <td><span class="badge badge-jurisdiction">${account.jurisdiction}</span></td>
                    <td><span class="badge badge-resolved">${account.status || 'Active'}</span></td>
                    <td>
                        <button class="btn-icon btn-edit" title="Edit" data-username="${account.username || ''}"><i class='bx bx-edit-alt'></i></button>
                        <button class="btn-icon btn-delete" title="Delete"><i class='bx bx-trash'></i></button>
                    </td>
                `;
                policeTableBody.appendChild(row);
            });
        } catch (err) {
            console.error('Error fetching police accounts:', err);
            policeTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #E74C3C; padding: 30px;">
                        <i class='bx bx-error' style="font-size: 24px; display: block; margin-bottom: 5px;"></i>
                        Failed to load police accounts. View console for details.
                    </td>
                </tr>
            `;
        }
    }

    // Call load immediately
    loadPoliceAccounts();

    // SIDEBAR TOGGLE
    let sidebar = document.querySelector(".sidebar");
    let sidebarBtn = document.querySelector(".sidebarBtn");
    sidebarBtn.onclick = function () {
        sidebar.classList.toggle("active");
        if (sidebar.classList.contains("active")) {
            sidebarBtn.classList.replace("bx-menu", "bx-menu-alt-right");
        } else {
            sidebarBtn.classList.replace("bx-menu-alt-right", "bx-menu");
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

            // Mobile Sidebar Auto-close
            if (window.innerWidth <= 768) {
                sidebar.classList.remove("active");
                sidebarBtn.classList.replace("bx-menu-alt-right", "bx-menu");
            }
        });
    });

    // TOGGLE FORM VISIBILITY
    const toggleFormBtn = document.getElementById('toggleFormBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const accountForm = document.getElementById('accountForm');
    const policeFormElement = document.querySelector('.police-account-form');

    if (policeFormElement) {
        policeFormElement.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent accidental page reloads from Enter key
        });
    }

    toggleFormBtn.addEventListener('click', () => {
        accountForm.classList.toggle('show');
        if (accountForm.classList.contains('show')) {
            toggleFormBtn.innerHTML = "<i class='bx bx-minus'></i> Close Form";
            toggleFormBtn.classList.replace('btn-primary', 'btn-secondary');
        } else {
            toggleFormBtn.innerHTML = "<i class='bx bx-plus'></i> New Police Account";
            toggleFormBtn.classList.replace('btn-secondary', 'btn-primary');
        }
    });

    // MOCK ACCOUNT CREATION AND EDITING
    const saveAccountBtn = document.getElementById('saveAccountBtn');
    let editingRow = null;

    cancelFormBtn.addEventListener('click', () => {
        accountForm.classList.remove('show');
        toggleFormBtn.innerHTML = "<i class='bx bx-plus'></i> New Police Account";
        toggleFormBtn.classList.replace('btn-secondary', 'btn-primary');

        editingRow = null;
        saveAccountBtn.textContent = 'Create Account';
        document.getElementById('usernameInput').value = '';
        document.getElementById('firstNameInput').value = '';
        document.getElementById('lastNameInput').value = '';
        document.getElementById('contactInput').value = '';
    });

    saveAccountBtn.addEventListener('click', async () => {
        const username = document.getElementById('usernameInput').value.trim();
        const firstName = document.getElementById('firstNameInput').value.trim();
        const lastName = document.getElementById('lastNameInput').value.trim();
        const contact = document.getElementById('contactInput').value.trim();
        const tempPassword = document.getElementById('tempPassDisplay').value.trim();

        if (!username || !firstName || !lastName || !contact) {
            showCustomAlert("Please fill in all required fields (Username, First Name, Last Name, and Contact).", 'error', 'Missing Information');
            return;
        }

        try {
            saveAccountBtn.textContent = 'Saving...';
            saveAccountBtn.disabled = true;

            const response = await fetch(`${API_URL}/police-accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    first_name: firstName,
                    last_name: lastName,
                    contact_number: contact,
                    jurisdiction: activeMunicipality,
                    temporary_password: tempPassword
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save');

            showCustomAlert(`Account created successfully for ${firstName} ${lastName}.`, 'success', 'Account Registered');

            // Reload accounts to get the new table showing correctly
            await loadPoliceAccounts();

            // Clean up and hide form
            document.getElementById('usernameInput').value = '';
            document.getElementById('firstNameInput').value = '';
            document.getElementById('lastNameInput').value = '';
            document.getElementById('contactInput').value = '';
            accountForm.classList.remove('show');
            toggleFormBtn.innerHTML = "<i class='bx bx-plus'></i> New Police Account";
            toggleFormBtn.classList.replace('btn-secondary', 'btn-primary');
            editingRow = null;

        } catch (err) {
            console.error('Error saving account:', err);
            showCustomAlert("Failed to save account. Ensure you have the right permissions and check console.", 'error', 'Error');
        } finally {
            saveAccountBtn.textContent = editingRow ? 'Update Account' : 'Create Account';
            saveAccountBtn.disabled = false;
        }
    });

    // --- Password Toggle for Account Creation ---
    const toggleTempPassBtn = document.getElementById('toggleTempPassword');
    const tempPassInput = document.getElementById('tempPassDisplay');

    if (toggleTempPassBtn && tempPassInput) {
        toggleTempPassBtn.addEventListener('click', () => {
            const type = tempPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
            tempPassInput.setAttribute('type', type);
            // Toggle icon classes
            toggleTempPassBtn.classList.toggle('bx-hide');
            toggleTempPassBtn.classList.toggle('bx-show');
        });
    }

    // --- Password Toggle for Settings Modal ---
    document.querySelectorAll('.toggle-settings-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                const isText = targetInput.getAttribute('type') === 'text';
                targetInput.setAttribute('type', isText ? 'password' : 'text');
                btn.className = isText ? 'bx bx-hide' : 'bx bx-show';
                btn.style.color = isText ? '#8FA4BB' : '#3498DB';
            }
        });
    });

    // Handle Edit and Delete directly from the table rows
    policeTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const row = btn.closest('tr');
        const accountId = row.dataset.id;

        if (btn.classList.contains('btn-delete')) {
            showCustomConfirm(
                "⚠️ Are you sure you want to delete this Police account?\n\nThis will revoke their access to the portal.",
                "Delete Account",
                async () => {
                    try {
                        const response = await fetch(`${API_URL}/police-accounts/${accountId}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok) throw new Error('Delete failed');

                        // Fade out animation before removing
                        row.style.transition = 'opacity 0.3s ease';
                        row.style.opacity = '0';
                        showCustomAlert(`Account for ${row.cells[0].textContent} has been removed.`, 'warning', 'Account Deleted');
                        setTimeout(() => row.remove(), 300);

                    } catch (err) {
                        console.error('Error deleting account:', err);
                        showCustomAlert("Failed to delete account. Check console for details.", 'error', 'Error');
                    }
                }
            );
        } else if (btn.classList.contains('btn-edit')) {
            // Extract Name (Safely from the first child div to avoid username text)
            const nameDiv = row.cells[0].querySelector('div');
            let fullName = nameDiv ? nameDiv.textContent.trim() : row.cells[0].textContent.trim().split('@')[0].trim();
            
            // Safer splitting
            let lastSpaceIndex = fullName.lastIndexOf(' ');
            let firstName = lastSpaceIndex !== -1 ? fullName.substring(0, lastSpaceIndex) : fullName;
            let lastName = lastSpaceIndex !== -1 ? fullName.substring(lastSpaceIndex + 1) : '';

            // POPULATE EDIT MODAL
            document.getElementById('editAccountId').value = accountId;
            document.getElementById('editUsername').value = btn.getAttribute('data-username') || '';
            document.getElementById('editFirstName').value = firstName;
            document.getElementById('editLastName').value = lastName;
            document.getElementById('editContact').value = row.cells[1].textContent.trim();

            document.getElementById('editAccountModal').style.display = 'flex';
        }
    });

    // --- NEW EDIT MODAL LOGIC ---
    const editAccountModal = document.getElementById('editAccountModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const editAccountForm = document.getElementById('editAccountForm');

    if (closeEditModal) {
        closeEditModal.addEventListener('click', () => {
            editAccountModal.style.display = 'none';
        });
    }

    if (editAccountForm) {
        editAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('editAccountId').value;
            const username = document.getElementById('editUsername').value.trim();
            const first = document.getElementById('editFirstName').value.trim();
            const last = document.getElementById('editLastName').value.trim();
            const contact = document.getElementById('editContact').value.trim();

            const saveBtn = document.getElementById('saveEditAccountBtn');
            saveBtn.textContent = 'Updating...';
            saveBtn.disabled = true;

            try {
                const response = await fetch(`${API_URL}/police-accounts/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        first_name: first,
                        last_name: last,
                        contact_number: contact
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Update failed');
                }

                showCustomAlert("Police account updated successfully.", 'success', 'Done');
                editAccountModal.style.display = 'none';
                await loadPoliceAccounts();
            } catch (err) {
                console.error(err);
                showCustomAlert(err.message, 'error', 'Error');
            } finally {
                saveBtn.textContent = 'Update Account';
                saveBtn.disabled = false;
            }
        });
    }

    // --- ACCIDENT REPORTS FETCHING AND RENDERING ---
    let barangayChartInstance, severityChartInstance, trendChartInstance;
    let loadedReports = [];

        try {
            const apiUrl = `${window.location.protocol}//${window.location.hostname}:4000/api/reports?jurisdiction=${encodeURIComponent(activeMunicipality)}`;
            const response = await fetch(apiUrl);
            const reports = await response.json();

            if (!response.ok) throw new Error('Fetch failed');
            loadedReports = reports;

            applyFilters();
            await loadResidents(); // Refresh residents as well
        } catch (err) {
            console.error('Error fetching reports:', err);
        }
    }

    function applyFilters() {
        let filtered = [...loadedReports];

        if (currentMonthFilter) {
            const [year, month] = currentMonthFilter.split('-');
            filtered = filtered.filter(r => {
                const d = new Date(r.datetime);
                return d.getFullYear() == year && (d.getMonth() + 1) == month;
            });
        }

        renderReportsTable(filtered);
        updateDashboardStats(filtered);
        updateCharts(filtered);
        updateActivityFeed(filtered);
        if (map) updateMapMarkers(filtered);
    }

    async function updateDashboardStats(reports) {
        // Total Accidents
        const totalAccidentCount = reports.length;
        const totalNumberEl = document.querySelector('.overview-boxes .box:nth-child(1) .number');
        const totalIndicatorEl = document.querySelector('.overview-boxes .box:nth-child(1) .text');

        if (totalNumberEl) totalNumberEl.textContent = totalAccidentCount;
        if (totalIndicatorEl) {
            totalIndicatorEl.textContent = totalAccidentCount > 0 ? "Reports recorded in jurisdiction" : "No data recorded yet";
        }

        // Active Cases (Reported or Under Investigation) + 5-day filter (120 hours)
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setHours(fiveDaysAgo.getHours() - 120);

        const activeCasesList = reports.filter(r => {
            const isPending = r.status === 'Reported' || r.status === 'Under Investigation';
            const isRecent = new Date(r.datetime || r.created_at) >= fiveDaysAgo;
            return isPending && isRecent;
        });

        const activeCasesCount = activeCasesList.length;
        const activeNumberEl = document.querySelector('.overview-boxes .box:nth-child(3) .number');
        const activeIndicatorEl = document.querySelector('.overview-boxes .box:nth-child(3) .text');

        if (activeNumberEl) activeNumberEl.textContent = activeCasesCount;
        if (activeIndicatorEl) {
            activeIndicatorEl.textContent = activeCasesCount > 0 
                ? `${activeCasesCount} active cases (within 5 days)` 
                : "No recent active cases";
        }

        // Registered Residents for this Municipality
        try {
            const apiUrl = `${window.location.protocol}//${window.location.hostname}:4000/api/residents/count?municipality=${encodeURIComponent(activeMunicipality)}`;
            const response = await fetch(apiUrl);
            const result = await response.json();

            if (response.ok) {
                const resNumberEl = document.getElementById('stats-residents');
                if (resNumberEl) resNumberEl.textContent = result.count;
            }
        } catch (e) {
            console.error("Error fetching resident count:", e);
        }

        // Police Accounts (Already handled by loadPoliceAccounts, but we can sync the UI more if needed)
    }

    async function loadResidents() {
        const residentsTableBody = document.getElementById('residentsTableBody');
        if (!residentsTableBody) return;

        try {
            const apiUrl = `${window.location.protocol}//${window.location.hostname}:4000/api/residents?municipality=${encodeURIComponent(activeMunicipality)}`;
            const response = await fetch(apiUrl);
            const residents = await response.json();

            if (!response.ok) throw new Error('Fetch failed');

            residentsTableBody.innerHTML = '';
            if (residents.length === 0) {
                residentsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 30px; color: #A0A0A0;">
                            <i class='bx bx-fingerprint' style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                            No residents currently registered for ${activeMunicipality}.
                        </td>
                    </tr>
                `;
                return;
            }

            residents.forEach(res => {
                const regDate = new Date(res.created_at || Date.now()).toLocaleDateString();
                const row = `
                    <tr>
                        <td>
                            <div style="font-weight: 600; color: #1E293B;">${res.first_name} ${res.last_name}</div>
                        </td>
                        <td>${res.barangay}</td>
                        <td style="font-size: 13px;">
                            <div>${res.contact_number || 'N/A'}</div>
                            <div style="color: #64748B; font-size: 11px;">${res.username || ''}</div>
                        </td>
                        <td style="font-size: 13px; color: #64748B;">${regDate}</td>
                        <td><span class="badge badge-resolved">Verified</span></td>
                    </tr>
                `;
                residentsTableBody.insertAdjacentHTML('beforeend', row);
            });
        } catch (err) {
            console.error('Error fetching residents:', err);
        }
    }

    function renderReportsTable(reports) {
        const tableBody = document.getElementById('recordsTableBody');
        const activeCasesTableBody = document.getElementById('activeCasesTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        if (activeCasesTableBody) activeCasesTableBody.innerHTML = '';

        if (!reports || reports.length === 0) {
            const empty = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #A0A0A0;">
                        <i class='bx bx-data' style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                        No records available for ${activeMunicipality} yet.
                    </td>
                </tr>
            `;
            tableBody.innerHTML = empty;
            if (activeCasesTableBody) activeCasesTableBody.innerHTML = empty;
            return;
        }

        reports.forEach(r => {
            const date = new Date(r.datetime).toLocaleString('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: 'numeric', minute: '2-digit', hour12: true
            });

            // Extract Victim Name from involved_biometrics
            let victimName = 'Anonymous';
            if (r.involved_biometrics && r.involved_biometrics.includes('Name:')) {
                const parts = r.involved_biometrics.split('Name:');
                if (parts.length > 1) {
                    victimName = parts[1].split('\n')[0].trim();
                }
            }

            // Severity Styling
            let sevClass = 'badge-pending';
            if (r.severity === 'Critical' || r.severity === 'Severe') sevClass = 'badge-critical';
            else if (r.severity === 'Moderate') sevClass = 'badge-resolved';

            const row = `
                <tr>
                    <td>${date}</td>
                    <td style="font-weight:600; color: #1E293B;">${victimName}</td>
                    <td>${r.location || 'Unknown Location'}</td>
                    <td><span class="badge ${sevClass}">${r.severity}</span></td>
                    <td><span class="badge badge-pending">${r.status}</span></td>
                    <td>${r.reporting_officer || 'N/A'}</td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);

            // 5-Day Filter for Active Cases Table (120 Hours)
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setHours(fiveDaysAgo.getHours() - 120);
            const reportDate = new Date(r.datetime || r.created_at);

            if (activeCasesTableBody && r.status !== 'Resolved' && reportDate >= fiveDaysAgo) {
                activeCasesTableBody.insertAdjacentHTML('beforeend', row);
            }
        });

        // If activeCasesTableBody is still empty after processing
        if (activeCasesTableBody && activeCasesTableBody.innerHTML === '') {
            activeCasesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #A0A0A0;">
                        <i class='bx bx-check-circle' style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                        All incidents for ${activeMunicipality} are resolved.
                    </td>
                </tr>
            `;
        }
    }

    function updateCharts(reports) {
        updateLocationChart(reports);
        updateSeverityChart(reports);
        updateTrendChart(reports);
    }

    function updateLocationChart(reports) {
        const ctx = document.getElementById('barangayChart');
        if (!ctx) return;

        // Group by location (which is the barangay in this system)
        const counts = {};
        reports.forEach(r => {
            const loc = r.location || 'Unknown';
            counts[loc] = (counts[loc] || 0) + 1;
        });

        const labels = Object.keys(counts);
        const data = Object.values(counts);

        if (barangayChartInstance) barangayChartInstance.destroy();

        const bgColors = [
            '#FF5252', '#FF9800', '#FBC02D', '#D4E157', '#9CCC65',
            '#66BB6A', '#43A047', '#26A69A', '#00ACC1', '#039BE5',
            '#1E88E5', '#3F51B5', '#5C6BC0', '#7E57C2', '#8E24AA',
            '#D81B60', '#EC407A', '#F06292'
        ];

        barangayChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.length > 0 ? labels : ['No Data'],
                datasets: [{
                    data: data.length > 0 ? data : [1],
                    backgroundColor: labels.length > 0 ? bgColors : ['#F1F5F9'],
                    borderColor: '#FFFFFF',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function updateSeverityChart(reports) {
        const ctx = document.getElementById('severityBarChart');
        if (!ctx) return;

        const counts = { 'Minor': 0, 'Moderate': 0, 'Severe': 0, 'Critical': 0 };
        reports.forEach(r => {
            if (counts[r.severity] !== undefined) counts[r.severity]++;
        });

        if (severityChartInstance) severityChartInstance.destroy();

        severityChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    label: 'Reports',
                    data: Object.values(counts),
                    backgroundColor: [
                        'rgba(100, 181, 246, 0.7)',
                        'rgba(255, 179, 0, 0.7)',
                        'rgba(255, 82, 82, 0.7)',
                        'rgba(176, 0, 32, 0.7)'
                    ],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function updateTrendChart(reports) {
        const ctx = document.getElementById('weeklyLineChart');
        if (!ctx) return;

        const last7Days = [];
        const dailyCounts = {};

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last7Days.push(dateStr);
            dailyCounts[dateStr] = 0;
        }

        reports.forEach(r => {
            const rDate = new Date(r.created_at || r.datetime);
            rDate.setHours(0, 0, 0, 0);
            const rDateStr = rDate.toISOString().split('T')[0];
            if (dailyCounts[rDateStr] !== undefined) dailyCounts[rDateStr]++;
        });

        const labels = last7Days.map(dateStr => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { weekday: 'short' });
        });

        if (trendChartInstance) trendChartInstance.destroy();

        trendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Accidents',
                    data: Object.values(dailyCounts),
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
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    const markers = [];
    async function updateMapMarkers(reports) {
        if (!map) return;

        // Remove old markers
        markers.forEach(m => map.removeLayer(m));
        markers.length = 0;

        for (const r of reports) {
            let coords = null;

            // If coords exist in DB, use them
            if (r.latitude && r.longitude) {
                coords = [r.latitude, r.longitude];
            } else {
                // Otherwise, try to geocode based on location + municipality
                try {
                    console.log(`Geocoding: ${r.location}, ${activeMunicipality}`);
                    const query = `${r.location}, ${activeMunicipality}, Antique, Philippines`;
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
                    const data = await response.json();

                    if (data && data.length > 0) {
                        coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                    } else {
                        // Fallback: search just for the municipality center if location fails
                        const fallbackQuery = `${activeMunicipality}, Antique, Philippines`;
                        const fbRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1`);
                        const fbData = await fbRes.json();
                        if (fbData && fbData.length > 0) {
                            coords = [parseFloat(fbData[0].lat), parseFloat(fbData[0].lon)];
                        }
                    }
                } catch (e) {
                    console.error("Geocoding failed for:", r.location, e);
                }
            }

            if (coords) {
                let color = '#FFB300';
                if (r.severity === 'Critical' || r.severity === 'Severe') color = '#F44336';
                else if (r.severity === 'Minor') color = '#2196F3';

                const marker = L.circleMarker(coords, {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(map);

                marker.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif;">
                        <b style="color: #1E293B;">${r.severity} Accident</b><br>
                        <span style="color: #64748B; font-size: 12px;">${r.location}</span><br>
                        <span style="color: #2563EB; font-weight: 500; font-size: 13px;">${r.status}</span>
                    </div>
                `);

                markers.push(marker);
            }
        }
    }

    function updateActivityFeed(reports) {
        const feed = document.getElementById('liveActivityFeed');
        if (!feed) return;

        if (reports.length === 0) {
            feed.innerHTML = `
                <div style="color: #A0A0A0; padding: 20px; text-align: center;">
                    <i class='bx bx-broadcast' style="font-size: 24px; display: block; margin-bottom: 5px;"></i>
                    No incident reports in your jurisdiction yet.
                </div>
            `;
            return;
        }

        feed.innerHTML = '';
        reports.slice(0, 10).forEach(r => {
            const timeAgo = getTimeAgo(r.datetime || r.created_at);
            const severityColor = r.severity === 'Critical' || r.severity === 'Severe' ? '#EF4444' : '#3B82F6';

            const item = `
                <div class="activity-item" style="display: flex; gap: 12px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${severityColor}; margin-top: 5px; flex-shrink: 0;"></div>
                    <div>
                        <div style="font-size: 14px; font-weight: 600; color: #1E293B;">${r.severity} incident at ${r.location}</div>
                        <div style="font-size: 12px; color: #64748B;">Observed by Officer ${r.reporting_officer || 'N/A'}</div>
                        <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">${timeAgo}</div>
                    </div>
                </div>
            `;
            feed.insertAdjacentHTML('beforeend', item);
        });
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(date).toLocaleDateString();
    }

    // --- INITIAL LOAD & SUBSCRIPTIONS ---
    fetchAndRenderReports();

    supabase
        .channel('public:accident_reports_mdrrmo')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'accident_reports' }, payload => {
            // Only refetch if the payload is for our municipality (or it's a generic update/delete we should check)
            if (payload.new && payload.new.jurisdiction === activeMunicipality) {
                fetchAndRenderReports();
            } else if (payload.old) {
                // If it was ours before, we should refetch to be sure
                fetchAndRenderReports();
            }
        })
        .subscribe();

    // MAP: Dynamic Local Incident Map
    const municipalityCoordinates = {
        'Anini-y': [10.4333, 121.9333],
        'Barbaza': [11.2333, 122.0167],
        'Belison': [10.8333, 121.9667],
        'Bugasong': [11.0500, 122.0667],
        'Caluya': [12.0667, 121.4000],
        'Culasi': [11.4333, 122.0500],
        'Hamtic': [10.7000, 121.9833],
        'Laua-an': [11.1333, 122.0333],
        'Libertad': [11.7833, 121.9167],
        'Pandan': [11.7167, 122.1000],
        'Patnongon': [10.8833, 121.9833],
        'San Jose de Buenavista': [10.7500, 121.9333],
        'San Remigio': [10.9833, 122.1167],
        'Sebaste': [11.6000, 122.0833],
        'Sibalom': [10.7833, 122.0167],
        'Tibiao': [11.2833, 122.0500],
        'Tobias Fornier': [10.5167, 121.9500],
        'Valderrama': [11.0000, 122.1333]
    };

    let map;
    // Delay initialization slightly to ensure container is rendered if active
    setTimeout(() => {
        // Get coordinates for active municipality, fallback to Barbaza
        const coords = municipalityCoordinates[activeMunicipality] || municipalityCoordinates['Barbaza'];

        map = L.map('barbazaMap', {
            zoomControl: false,
            minZoom: 11
        }).setView(coords, 13);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Premium Light Theme tiles to match new UI
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: 'CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // Fetch precise GeoJSON boundary for the active municipality from OSM Nominatim
        fetch(`https://nominatim.openstreetmap.org/search.php?q=${activeMunicipality},+Antique,+Philippines&polygon_geojson=1&format=jsonv2`)
            .then(res => res.json())
            .then(data => {
                // If geometry exists, draw it
                if (data && data.length > 0 && data[0].geojson) {
                    const geojsonBoundary = data[0].geojson;

                    const borderLayer = L.geoJSON(geojsonBoundary, {
                        style: {
                            opacity: 0,
                            fillOpacity: 0
                        }
                    }).addTo(map);

                    // Automatically fit the map cleanly to that exact border outline
                    map.fitBounds(borderLayer.getBounds());
                }
            })
            .catch(err => console.error("Error fetching geojson boundary:", err));

        // Map is awaiting incident data from Supabase
        // Trigger marker update if we already have loaded reports
        if (loadedReports.length > 0) {
            updateMapMarkers(loadedReports);
        }
    }, 100);

});
