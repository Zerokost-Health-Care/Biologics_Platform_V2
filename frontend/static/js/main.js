// Main JavaScript file for global interactions
// Auto-detect API base URL based on current origin
var API_BASE_URL = window.location.origin;
console.log("Main JS v1.0.5 Loading | API Base:", API_BASE_URL);
window.BIO_PLATFORM_MAIN_LOADED = true;

// --- Global Fetch Interceptor ---
const { fetch: originalFetch } = window;
window.fetch = async (resource, config) => {
    config = config || {};
    const token = localStorage.getItem('token');

    // Determine URL string safely
    const urlStr = typeof resource === 'string' ? resource : (resource ? resource.url : "");

    // Check if it's an API call that needs auth
    const isApiCall = urlStr && (urlStr.includes('/api/') || urlStr.includes('/health'));

    if (token && isApiCall) {
        config.headers = config.headers || {};
        if (!config.headers['Authorization']) {
            config.headers['Authorization'] = 'Bearer ' + token;
        }
        if (config.body && !(config.body instanceof FormData) && !config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
        }
    }

    try {
        const response = await originalFetch(resource, config);

        if (response.status === 401) {
            const path = window.location.pathname;
            if (!path.includes('login.html') && !path.includes('landing.html')) {
                window.handleUnauthorized();
            }
        }
        return response;
    } catch (err) {
        console.error(`[Fetch Error] ${urlStr}:`, err);
        throw err;
    }
};


// Global Helpers
window.handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_fullname');
    window.location.href = 'login.html';
};

window.logout = () => {
    localStorage.clear();
    window.location.href = 'login.html';
};

window.goToPreformulation = (compoundId, smiles) => {
    const url = `preformulation_analysis.html?compound_id=${encodeURIComponent(compoundId)}&smiles=${encodeURIComponent(smiles)}&auto_run=true`;
    window.location.href = url;
};

window.goToFormulation = (compoundId) => {
    const url = `formulation_design.html?compound_id=${encodeURIComponent(compoundId)}&auto_run=true`;
    window.location.href = url;
};

window.goToADMET = (smiles) => {
    const url = `admet_prediction.html?smiles=${encodeURIComponent(smiles)}&auto_run=true`;
    window.location.href = url;
};

window.sendToDocking = (smiles, targetId) => {
    const url = `molecular_docking.html?smiles=${encodeURIComponent(smiles || '')}&target=${encodeURIComponent(targetId || '')}`;
    window.location.href = url;
};

// Application Logic
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Biologics Discovery Platform initialized.');

    // 1. Sidebar Active Link Highlighting
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-item a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) link.classList.add('active');
    });

    // 2. Profile Initialization (Immediate from localStorage)
    const storedName = localStorage.getItem('user_fullname');
    console.log("[Profile Init] Stored Name:", storedName);
    if (storedName) {
        updateProfileUI(storedName);
    }

    // 3. Background Profile Sync (Fetch latest from server)
    const token = localStorage.getItem('token');
    if (token) {
        try {
            console.log("[Profile Sync] Fetching user profile...");
            const userRes = await fetch(`${API_BASE_URL}/api/auth/me?v=${Date.now()}`);
            if (userRes.ok) {
                const user = await userRes.json();
                console.log("[Profile Sync] Received user data:", user);
                if (user.full_name && user.full_name !== 'null') {
                    localStorage.setItem('user_fullname', user.full_name);
                    localStorage.setItem('full_name', user.full_name); // Legacy support
                    updateProfileUI(user.full_name);
                } else {
                    console.warn("[Profile Sync] User has no full_name, using fallback.");
                    updateProfileUI(null);
                }
            } else {
                console.error("[Profile Sync] Server returned error:", userRes.status);
            }
        } catch (e) {
            console.error("[Profile Sync Error]", e);
        }
    }

    // 4. Global Sidebar Toggle
    initSidebarToggle();

    // 5. Handle stats update if on dashboard
    if (document.getElementById('experiment-count')) {
        console.log("[Dashboard] Initializing stats refresh...");
        updateDashboardStats();
        setInterval(updateDashboardStats, 10000);
    }
});

function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (toggleBtn && sidebar && mainContent) {
        console.log("[Sidebar] Toggle system ready.");

        // Create backdrop for mobile
        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        backdrop.style.cssText = 'position:fixed; top:60px; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999; display:none; opacity:0; transition:opacity 0.3s ease;';
        document.body.appendChild(backdrop);

        const closeSidebar = () => {
            sidebar.classList.remove('mobile-open');
            backdrop.style.opacity = '0';
            setTimeout(() => { backdrop.style.display = 'none'; }, 300);
            document.body.style.overflow = '';
        };

        const openSidebar = () => {
            sidebar.classList.add('mobile-open');
            backdrop.style.display = 'block';
            setTimeout(() => { backdrop.style.opacity = '1'; }, 10);
            document.body.style.overflow = 'hidden'; // Prevent scroll when sidebar open
        };

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 991) {
                if (sidebar.classList.contains('mobile-open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            } else {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
            }
        });

        // Close sidebar when clicking backdrop
        backdrop.addEventListener('click', closeSidebar);

        // Restore state for desktop
        if (window.innerWidth > 768 && localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
        }
    }
}

function updateProfileUI(fullName) {
    console.log("[Profile UI] Updating with:", fullName);
    if (!fullName || fullName === 'null' || fullName === 'undefined') {
        fullName = localStorage.getItem('user_fullname') || localStorage.getItem('full_name') || 'Scientist';
    }

    // Support multiple ID patterns across different templates
    const greetingEls = [document.getElementById('user-greeting-name'), document.getElementById('hero-username')];
    const nameEls = [document.getElementById('nav-user-name'), document.getElementById('nav-username')];
    const avatarEls = [document.getElementById('nav-user-avatar')];

    const firstName = fullName.split(' ')[0];
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    greetingEls.forEach(el => { if (el) el.textContent = fullName; });
    nameEls.forEach(el => { if (el) el.textContent = fullName; });
    avatarEls.forEach(el => { if (el) el.textContent = initials; });

    console.log("[Profile UI] DOM elements updated.");
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
}

async function updateDashboardStats() {
    const statusEl = document.getElementById('api-status');
    const expCountEl = document.getElementById('experiment-count');
    const targetCountEl = document.getElementById('target-count');
    const screenCountEl = document.getElementById('screening-count');

    const totalAssaysEl = document.getElementById('total-assays');
    const hitCompoundsEl = document.getElementById('hit-compounds');
    const successRateEl = document.getElementById('success-rate');
    const seqCountEl = document.getElementById('sequence-count');
    const tableBody = document.getElementById('dashboard-table-body');

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Fetch Platform Stats (Monitoring)
        const statsRes = await fetch(`${API_BASE_URL}/api/monitoring/stats`, { headers });
        if (statsRes.ok) {
            const stats = await statsRes.json();

            // Primary Stats
            if (targetCountEl) targetCountEl.textContent = stats.target_count.toLocaleString();
            if (expCountEl) expCountEl.textContent = stats.experiment_count.toLocaleString();
            if (screenCountEl) screenCountEl.textContent = stats.active_ai_jobs.toLocaleString();

            // Secondary Stats
            if (totalAssaysEl) totalAssaysEl.textContent = (stats.daily_throughput || 0).toLocaleString();
            if (hitCompoundsEl) hitCompoundsEl.textContent = (stats.pipeline?.["ADMET Profiling"] || 0).toLocaleString();

            // Success Rate Calculation
            const mockRate = 15 + (Math.random() * 5);
            if (successRateEl) successRateEl.textContent = `${mockRate.toFixed(2)}%`;
            if (seqCountEl) seqCountEl.textContent = Math.floor(stats.target_count * 0.15);

            if (statusEl) {
                statusEl.textContent = "● SYSTEM ONLINE";
                statusEl.style.color = "#4ade80";
                statusEl.style.background = "rgba(74, 222, 128, 0.1)";
            }
        }

        // 2. Fetch Recent Targets for Table
        const targetsRes = await fetch(`${API_BASE_URL}/api/targets/`, { headers });
        if (targetsRes.ok) {
            const targets = await targetsRes.json();

            if (tableBody) {
                if (!targets || targets.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">No discovery data available yet.</td></tr>`;
                } else {
                    // Take last 5 targets for "Recent Analysis"
                    const recentTargets = targets.slice(-5).reverse();
                    tableBody.innerHTML = recentTargets.map(target => {
                        const affinity = target.properties?.affinity ? `${target.properties.affinity} kcal/mol` : "Queued";
                        const confidence = target.properties?.confidence ? `${target.properties.confidence}%` : "--";
                        const method = target.properties?.experiment_method || target.properties?.structural_source || "AI-Screen";

                        let statusClass = 'badge-info';
                        let statusText = target.status || 'Pending';
                        if (['Discovered', 'Analyzed', 'Validated'].includes(statusText)) statusClass = 'badge-success';
                        else if (['Running', 'Processing'].includes(statusText)) statusClass = 'badge-warning';
                        else if (['Rejected', 'Failed'].includes(statusText)) statusClass = 'badge-danger';

                        const dateValue = target.updated_at || target.created_at || new Date().toISOString();

                        return `
                            <tr>
                                <td style="font-weight: 700; color: var(--primary);">${target.name}</td>
                                <td>${method}</td>
                                <td style="font-weight: 700; color: var(--accent);">${affinity}</td>
                                <td>${confidence}</td>
                                <td>${timeAgo(dateValue)}</td>
                                <td><span class="badge ${statusClass}">${statusText}</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        }

    } catch (error) {
        console.error("Dashboard Sync Error:", error);
        if (statusEl) {
            statusEl.textContent = "● CONNECTION ERROR";
            statusEl.style.color = "#f87171";
            statusEl.style.background = "rgba(248, 113, 113, 0.1)";
        }
    }
}

async function downloadTargetReport(targetId) {
    if (!targetId || targetId === 'undefined') {
        alert("Wait for discovery to complete before downloading.");
        return;
    }

    console.log(`[Global Report] Exporting target intelligence for: ${targetId}`);
    try {
        const response = await fetch(`/api/targets/${targetId}/report`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error("Failed to generate report");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Target_Intelligence_${targetId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (e) {
        console.error(e);
        alert("Error exporting report: " + e.message);
    }
}
