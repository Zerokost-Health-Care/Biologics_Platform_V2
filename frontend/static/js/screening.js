document.addEventListener('DOMContentLoaded', () => {
    initScreening();
});

let currentSocket = null;

async function initScreening() {
    await loadJobHistory();

    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const uploadZone = document.getElementById('upload-zone');
    const startBtn = document.getElementById('start-screening-btn');

    fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            if (e.target.files.length === 1) {
                fileName.textContent = e.target.files[0].name;
            } else {
                fileName.textContent = `${e.target.files.length} files selected`;
            }
            fileName.style.display = 'block';
        }
    };

    startBtn.onclick = runScreening;
}



async function runScreening() {
    const targetId = document.getElementById('target-select').value;
    const fileInput = document.getElementById('file-input');
    const btn = document.getElementById('start-screening-btn');
    const logArea = document.getElementById('real-time-log');

    if (!targetId || fileInput.files.length === 0) {
        alert("Please select a target and upload a .smi/.sdf file.");
        return;
    }

    const formData = new FormData();
    formData.append('target_id', targetId);
    formData.append('library_id', 'User_Upload_' + Date.now());
    
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('files', fileInput.files[i]);
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> UPLOADING...';
    logArea.style.display = 'block';
    logArea.innerHTML = '<div>[SYSTEM] Uploading file to AI core...</div>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/screening/run', {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        });

        if (!res.ok) throw new Error("Upload failed");

        const job = await res.json();
        const jobId = job.id || job._id;
        
        btn.innerHTML = '<i class="fas fa-microchip fa-spin"></i> ANALYSIS RUNNING...';
        connectWS(jobId);

    } catch (err) {
        alert("Screening failed: " + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-bolt"></i> RUN ANALYSIS';
    }
}

function connectWS(jobId) {
    if (currentSocket) currentSocket.close();
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${jobId}`;
    
    currentSocket = new WebSocket(wsUrl);
    const logArea = document.getElementById('real-time-log');

    currentSocket.onmessage = (event) => {
        const div = document.createElement('div');
        div.textContent = `> ${event.data}`;
        logArea.appendChild(div);
        logArea.scrollTop = logArea.scrollHeight;

        if (event.data.includes("Complete")) {
            setTimeout(loadJobHistory, 1000);
            setTimeout(() => {
                document.getElementById('start-screening-btn').disabled = false;
                document.getElementById('start-screening-btn').innerHTML = '<i class="fas fa-check"></i> ANALYSIS COMPLETE';
            }, 2000);
        }
    };

    currentSocket.onerror = (err) => {
        console.error("WS Error:", err);
    };
}

async function loadJobHistory() {
    console.log("Loading screening job history...");
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/screening', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!res.ok) {
            console.error(`History fetch failed: ${res.status}`);
            return;
        }

        const jobs = await res.json();
        console.log(`Successfully loaded ${jobs.length} jobs.`);
        
        const list = document.getElementById('job-history-list');
        list.innerHTML = '';

        if (!jobs || jobs.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.8rem;">No previous jobs found.</p>';
            return;
        }

        jobs.forEach((job, index) => {
            const card = document.createElement('div');
            card.className = 'job-card';
            // Use a stable ID display
            const displayId = (job.id || job._id || 'unknown').substring(0, 8);
            const date = job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Unknown Date';
            const statusClass = job.status === 'Completed' ? 'badge-completed' : 'badge-running';
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <span style="font-weight: 800; font-size: 0.75rem; color: #115e59;">#${displayId}</span>
                    <span class="badge ${statusClass}">${(job.status || 'UNKNOWN').toUpperCase()}</span>
                </div>
                <div style="font-size: 0.8rem; color: #4d8b85; font-weight: 600;">Target: ${job.target_id || 'N/A'}</div>
                <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 0.4rem;">${date} | XGBoost-v1</div>
            `;
            card.onclick = () => displayResults(job);
            list.appendChild(card);

            // Automatically display the first (most recent) completed job
            if (index === 0 && job.status === 'Completed') {
                displayResults(job);
            }
        });
    } catch (err) {
        console.error("Failed to load history:", err);
    }
}

function displayResults(job) {
    if (job.status !== 'Completed') {
        alert("This job is still running. Please wait for completion.");
        return;
    }

    const jobId = job.id || job._id;
    document.getElementById('empty-results').style.display = 'none';
    document.getElementById('results-container').style.display = 'block';
    
    // Handle PDF Download — use authenticated fetch to avoid 401
    const downloadBtn = document.getElementById('download-pdf-btn');
    downloadBtn.onclick = () => {
        window.downloadPdf(`/api/screening/${jobId}/report`, `Screening_Report_${jobId.substring(0, 8)}.pdf`);
    };

    const tbody = document.getElementById('hits-tbody');
    tbody.innerHTML = '';

    const results = job.results;
    if (!results || !results.top_hits) return;

    document.getElementById('results-title').textContent = `Screening Results (${results.hits_found} compounds analyzed)`;
    document.getElementById('results-meta').textContent = `Target: ${job.target_id} | Algorithm: XGBoost Classifier`;

    results.top_hits.forEach((hit, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 800; color: #10b981;">#${index + 1}</td>
            <td style="font-family: monospace; font-size: 0.75rem;">${hit.molecule_id || 'CMP_' + index}</td>
            <td style="font-family: monospace; font-size: 0.75rem; color: #4d8b85; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${hit.smiles}">${hit.smiles}</td>
            <td style="font-weight: 800; color: #115e59;">${hit.affinity}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 100px; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${hit.confidence * 100}%; height: 100%; background: #10b981;"></div>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 700;">${Math.round(hit.confidence * 100)}%</span>
                </div>
            </td>
            <td>
                <button class="btn-launch" style="padding: 0.3rem 0.6rem; font-size: 0.7rem;" onclick="window.sendToDocking('${hit.smiles}', '${job.target_id}')">
                    DOCK
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
