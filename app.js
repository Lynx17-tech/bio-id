// Simple base64url encoding/decoding for storing credentials
function bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let charCode of bytes) {
        str += String.fromCharCode(charCode);
    }
    const base64String = btoa(str);
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url) {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
}

const statusBox = document.getElementById('status-message');
const listContainer = document.getElementById('list-container');

function showStatus(message, isError = false) {
    statusBox.textContent = message;
    statusBox.className = 'status-box ' + (isError ? 'status-error' : 'status-success');
    statusBox.style.display = 'block';
    setTimeout(() => {
        statusBox.style.display = 'none';
    }, 4000);
}

// Simulated Database
function getRegisteredDevices() {
    return JSON.parse(localStorage.getItem('registered_fingerprints') || '[]');
}

function saveDevice(device) {
    const devices = getRegisteredDevices();
    devices.push(device);
    localStorage.setItem('registered_fingerprints', JSON.stringify(devices));
    renderList();
}

function clearDevices() {
    localStorage.removeItem('registered_fingerprints');
    renderList();
}

function renderList() {
    const devices = getRegisteredDevices();
    if (devices.length === 0) {
        listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">No fingerprints registered yet.</div>';
    } else {
        listContainer.innerHTML = devices.map(d => `
            <div class="registered-item">
                <div style="display:flex; align-items:center; gap:0.5rem">
                    <span style="font-size: 1.25rem;">📱</span>
                    <div>
                        <div style="color: var(--text-main); font-weight: 500;">${d.username} <span style="font-size: 0.75rem; color: #60a5fa;">(${d.thumbType || 'Right Thumb'})</span></div>
                        <div style="color: var(--text-muted); font-size: 0.75rem;">Created: ${new Date(d.date).toLocaleString()}</div>
                    </div>
                </div>
                <div style="color: var(--success); font-weight:600; font-size: 0.8rem;">Registered</div>
            </div>
        `).join('');
    }
}

// 1. REGISTRATION
document.getElementById('register-right-btn').addEventListener('click', () => startRegistration('Right Thumb'));
document.getElementById('register-left-btn').addEventListener('click', () => startRegistration('Left Thumb'));

async function startRegistration(thumbType) {
    const username = document.getElementById('username').value.trim();
    if (!username) return showStatus('Please enter a username first.', true);

    // SECURITY CHECK: WebAuthn API strictly requires an HTTPS connection.
    // If you run this on a normal HTTP IP address, the browser blocks it and throws an undefined error.
    if (!window.PublicKeyCredential || !navigator.credentials) {
        return showStatus('SECURITY BLOCKED: You are not on a secure HTTPS connection. Your mobile browser has disabled the fingerprint scanner for your safety.', true);
    }

    const maxAttempts = 5;
    let successfulScans = 0;

    // Disable inputs while scanning
    const registerRightBtn = document.getElementById('register-right-btn');
    const registerLeftBtn = document.getElementById('register-left-btn');
    const authBtn = document.getElementById('authenticate-btn');
    const nameInput = document.getElementById('username');

    registerRightBtn.disabled = true;
    registerLeftBtn.disabled = true;
    authBtn.disabled = true;
    nameInput.disabled = true;

    try {
        const userID = new Uint8Array(16);
        window.crypto.getRandomValues(userID);

        // We will store only the last credential generated as the main key
        let finalCredential = null;

        while (successfulScans < maxAttempts) {
            showStatus(`Enroll ${thumbType} - Scan ${successfulScans + 1} of ${maxAttempts}: Please press your finger...`);

            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialCreationOptions = {
                challenge: challenge,
                rp: {
                    name: "BioID Native Fingerprint Manager",
                },
                user: {
                    id: userID,
                    name: username,
                    displayName: username,
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // Forces built-in phone/laptop biometric scanner
                    userVerification: "required"
                },
                timeout: 60000,
                attestation: "direct"
            };

            // This will trigger the phone's native prompt
            finalCredential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });

            successfulScans++;

            // Optional: add a tiny delay between prompts so it doesn't instantly jump
            if (successfulScans < maxAttempts) {
                showStatus(`✅ Scan ${successfulScans} recorded. Lift and place ${thumbType} again...`);
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        // Once 5 scans are complete, save the final credential ID
        const credentialIdBase64 = bufferToBase64url(finalCredential.rawId);
        saveDevice({
            username: username,
            thumbType: thumbType,
            credentialId: credentialIdBase64,
            date: new Date().toISOString()
        });

        showStatus(`✨ ${thumbType} fully enrolled and registered!`);
        document.getElementById('username').value = '';

    } catch (err) {
        console.error(err);
        showStatus(`Registration failed or cancelled on scan ${successfulScans + 1}: ` + err.message, true);
    } finally {
        // Re-enable inputs
        registerRightBtn.disabled = false;
        registerLeftBtn.disabled = false;
        authBtn.disabled = false;
        nameInput.disabled = false;
    }
}

// 2. VERIFICATION (LOGIN)
document.getElementById('authenticate-btn').addEventListener('click', async () => {
    const devices = getRegisteredDevices();
    if (devices.length === 0) {
        return showStatus('No fingerprints are currently registered!', true);
    }

    // SECURITY CHECK
    if (!window.PublicKeyCredential || !navigator.credentials) {
        return showStatus('SECURITY BLOCKED: You are not on a secure HTTPS connection.', true);
    }

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const allowCredentials = devices.map(d => ({
            type: 'public-key',
            id: base64urlToBuffer(d.credentialId),
            transports: ['internal']
        }));

        const publicKeyCredentialRequestOptions = {
            challenge: challenge,
            allowCredentials: allowCredentials,
            userVerification: "required",
            timeout: 60000
        };

        const assertion = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions
        });

        const id = bufferToBase64url(assertion.rawId);
        const user = devices.find(d => d.credentialId === id);

        if (user) {
            showStatus(`✅ Biometric Match! Verified as: ${user.username}`);
        } else {
            showStatus('Fingerprint verified, but user not found in database.', true);
        }

    } catch (err) {
        console.error(err);
        showStatus('Verification failed or cancelled.', true);
    }
});

// Init UI
renderList();
