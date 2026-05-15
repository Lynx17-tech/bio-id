document.addEventListener('DOMContentLoaded', () => {
    // SUPABASE INITIALIZATION
    const supabaseUrl = 'https://tzsglayusbbaajvsohtn.supabase.co';
    const supabaseKey = 'sb_publishable_fKtzX1kqT-2Qfi2j_aQoUQ_8dZFCmIa';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.querySelector('.btn-login');

    // Function to show custom alert
    function showCustomAlert(message, type = 'error', title = 'Error') {
        const modal = document.getElementById('customAlert');
        if (!modal) return; // Prevent errors if modal isn't loaded

        const titleEl = document.getElementById('customAlertTitle');
        const messageEl = document.getElementById('customAlertMessage');
        const iconEl = document.getElementById('customAlertIcon');

        if (titleEl) titleEl.innerText = title;
        if (messageEl) messageEl.innerText = message;

        if (iconEl) {
            if (type === 'error') {
                iconEl.innerHTML = "<i class='bx bx-error-circle'></i>";
                iconEl.className = 'custom-alert-icon error';
            } else if (type === 'warning') {
                iconEl.innerHTML = "<i class='bx bx-error'></i>";
                iconEl.className = 'custom-alert-icon warning';
            } else if (type === 'success') {
                iconEl.innerHTML = "<i class='bx bx-check-circle'></i>";
                iconEl.className = 'custom-alert-icon success';
            }
        }

        modal.classList.add('show');
    }

    // Function to close custom alert
    window.closeCustomAlert = function () {
        const modal = document.getElementById('customAlert');
        if (modal) modal.classList.remove('show');
    };

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('username');
            const username = usernameInput.value.trim();
            const password = document.getElementById('password').value;

            // UX: Loading state
            const originalBtnText = loginBtn.innerHTML;
            loginBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Authenticating...";
            loginBtn.disabled = true;

            try {
                let userData = null;
                let userRole = null;

                // 1. Check system_users (Admin / PDRRMO / MDRRMO)
                const { data: adminUser, error: adminErr } = await supabase
                    .from('system_users')
                    .select('*')
                    .ilike('username', username)
                    .eq('temp_password', password)
                    .maybeSingle();

                if (adminUser) {
                    userData = adminUser;
                    userRole = adminUser.role;
                } else {
                    // 2. Check police_accounts
                    const { data: policeUser, error: policeErr } = await supabase
                        .from('police_accounts')
                        .select('*')
                        .ilike('username', username)
                        .eq('temporary_password', password)
                        .maybeSingle();

                    if (policeUser) {
                        userData = policeUser;
                        userRole = 'POLICE';
                    } else {
                        // 3. Check residents
                        const { data: residentUser, error: resErr } = await supabase
                            .from('residents')
                            .select('*')
                            .ilike('username', username)
                            .eq('password', password)
                            .maybeSingle();

                        if (residentUser) {
                            userData = residentUser;
                            userRole = 'RESIDENT';
                        }
                    }
                }

                if (userData) {
                    userData.role = userRole; // Ensure role is preserved
                    sessionStorage.setItem('activeUserData', JSON.stringify(userData));
                    
                    if (userRole === 'PDRRMO') {
                        window.location.href = 'portals/pdrrmo/index.html';
                    } else if (userRole === 'MDRRMO') {
                        window.location.href = 'portals/mdrrmo/index.html';
                    } else if (userRole === 'POLICE') {
                        window.location.href = 'portals/police/index.html';
                    } else if (userRole === 'RESIDENT') {
                        window.location.href = 'portals/resident/index.html';
                    }
                    return;
                }

                // If login fails
                usernameInput.style.borderColor = '#FF5252';
                usernameInput.style.boxShadow = '0 0 10px rgba(255, 82, 82, 0.4)';

                setTimeout(() => {
                    usernameInput.style.borderColor = 'var(--glass-border)';
                    usernameInput.style.boxShadow = 'none';
                }, 2000);

                showCustomAlert('Invalid account credentials.', 'error', 'Login Failed');
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;

            } catch (err) {
                console.error(err);
                showCustomAlert("Database Connection Error. Please check your internet connection.", 'error', 'Connection Error');
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;
            }
        });
    }

    // Password Toggle Functionality
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            // Toggle icon
            togglePasswordBtn.classList.toggle('bx-hide');
            togglePasswordBtn.classList.toggle('bx-show');
        });
    }
});
