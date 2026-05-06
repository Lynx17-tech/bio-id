document.addEventListener('DOMContentLoaded', () => {
    // SUPABASE INITIALIZATION
    const supabaseUrl = 'https://rbncteviieusldynswny.supabase.co';
    const supabaseKey = 'sb_publishable_7CR3OUMv3lrkGVIfzHko1g_Dpu-yrF0';
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
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const result = await response.json();

                if (response.ok) {
                    const userData = result.user;
                    userData.role = result.role; // Ensure role is preserved
                    
                    sessionStorage.setItem('activeUserData', JSON.stringify(userData));
                    
                    if (userData.role === 'PDRRMO') {
                        window.location.href = 'pdrrmo-portal/index.html';
                    } else if (userData.role === 'MDRRMO') {
                        window.location.href = 'mdrrmo-portal/index.html';
                    } else if (userData.role === 'POLICE') {
                        window.location.href = 'police-portal/index.html';
                    } else if (userData.role === 'RESIDENT') {
                        window.location.href = 'resident-portal/index.html';
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

                showCustomAlert(result.error || 'Invalid account credentials.', 'error', 'Login Failed');
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;

            } catch (err) {
                console.error(err);
                showCustomAlert("Local Server Connection Error. Please ensure 'npm start' is running.", 'error', 'Connection Error');
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
