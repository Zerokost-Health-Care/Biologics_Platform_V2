// Dashboard Visualizations - Enhanced for Senior Lead Research View
// Version 1.2: Added CSV Export and Real-time Target Tracking

document.addEventListener('DOMContentLoaded', () => {
    initRealTimeChart();
    startActivityFeed();
    startStatsPolling();
    initPipelineChart();
    initTargetTable();
    setupExportButton();
});

let pipelinePlot = null;
let allTargets = []; // Store targets for filtering and export

// 1. Plotly Real-Time Molecular Throughput
function initRealTimeChart() {
    const chartDiv = document.getElementById('throughput-chart');
    if (!chartDiv) return;

    let times = [];
    let y_values = [];
    let now = new Date();

    for (let i = 30; i > 0; i--) {
        times.push(new Date(now - i * 60000));
        y_values.push(100 + Math.random() * 50);
    }

    const data = [{
        x: times,
        y: y_values,
        mode: 'lines',
        fill: 'tozeroy',
        line: { color: '#3b82f6', width: 2 },
        fillcolor: 'rgba(59, 130, 246, 0.05)'
    }];

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 40, r: 20, t: 10, b: 30 },
        xaxis: { color: '#64748b', showgrid: false },
        yaxis: { color: '#64748b', gridcolor: '#1e293b', title: 'Mols/Sec' }
    };

    Plotly.newPlot(chartDiv, data, layout, { responsive: true, displayModeBar: false });

    setInterval(() => {
        const time = new Date();
        const throughput = 120 + Math.random() * 80;
        Plotly.extendTraces(chartDiv, { x: [[time]], y: [[throughput]] }, [0]);
        if (times.length > 50) {
            Plotly.relayout(chartDiv, { xaxis: { range: [new Date(time - 15 * 1000), time] } });
        }
    }, 2000);
}

// 2. Discovery Pipeline Maturity Chart (Horizontal Bar)
function initPipelineChart() {
    const chartDiv = document.getElementById('pipeline-chart');
    if (!chartDiv) return;

    const data = [{
        type: 'bar',
        x: [0, 0, 0, 0],
        y: ['ID', 'MAP', 'OPT', 'TOX'],
        orientation: 'h',
        marker: {
            color: ['#3b82f6', '#0ea5e9', '#8b5cf6', '#4ade80'],
            opacity: 0.8
        }
    }];

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 50, r: 20, t: 10, b: 30 },
        height: 300,
        xaxis: { color: '#64748b', showgrid: true, gridcolor: '#1e293b' },
        yaxis: { color: '#94a3b8', font: { size: 10 } }
    };

    Plotly.newPlot(chartDiv, data, layout, { responsive: true, displayModeBar: false });
    pipelinePlot = chartDiv;
}

// 3. Platform Stats & Pipeline Items
function startStatsPolling() {
    const updateStats = async () => {
        try {
            const res = await fetch('/api/monitoring/stats');
            if (res.ok) {
                const data = await res.json();
                
                // Top Metrics
                if(document.getElementById('sys-health')) document.getElementById('sys-health').innerText = data.system_health;
                if(document.getElementById('daily-mols')) document.getElementById('daily-mols').innerText = data.daily_throughput.toLocaleString();
                if(document.getElementById('screening-count')) document.getElementById('screening-count').innerText = data.active_ai_jobs;
                if(document.getElementById('gpu-load')) document.getElementById('gpu-load').innerText = data.gpu_load;
                
                // Real-time counter for targets if element exists
                if(document.getElementById('target-count')) document.getElementById('target-count').innerText = data.target_count.toLocaleString();
                if(document.getElementById('experiment-count')) document.getElementById('experiment-count').innerText = data.experiment_count.toLocaleString();

                // GPU Bar
                const gpuBar = document.getElementById('gpu-bar');
                if (gpuBar) {
                    const gpuVal = parseFloat(data.gpu_load);
                    gpuBar.style.width = gpuVal + '%';
                }

                // Update Pipeline Chart
                if (data.pipeline && pipelinePlot) {
                    const counts = [
                        data.pipeline["Target Discovery"] || 0,
                        data.pipeline["Structural Mapping"] || 0,
                        data.pipeline["Lead Optimization"] || 0,
                        data.pipeline["ADMET Profiling"] || 0
                    ];
                    Plotly.restyle(pipelinePlot, { x: [counts] }, [0]);
                }

                // Render Top Candidates
                if (data.top_candidates && Array.isArray(data.top_candidates)) {
                    renderTopCandidates(data.top_candidates);
                }

                const statusEl = document.getElementById('api-status');
                if (statusEl) {
                    statusEl.innerText = "● SYSTEM ONLINE";
                    statusEl.className = "badge badge-success";
                }
            }
        } catch (e) {
            console.error("Stats Poll Error:", e);
        }
    };

    updateStats();
    setInterval(updateStats, 5000);
}

function renderTopCandidates(candidates) {
    const container = document.getElementById('top-candidates-list');
    if (!container) return;

    if (candidates.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 1rem; color: #64748b; font-size: 0.8rem;">No leads validated yet.</div>';
        return;
    }

    container.innerHTML = candidates.map(c => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8fafc; border-radius: 8px;">
            <div>
                <div style="font-size: 0.75rem; font-weight: 700; color: var(--primary);">${c.target}</div>
                <div style="font-size: 0.7rem; color: #64748b;">${c.model}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.85rem; font-weight: 700; color: #1e293b;">${c.affinity} IC50</div>
                <div style="font-size: 0.65rem; color: #10b981;">Improvement: ${c.improvement}</div>
            </div>
        </div>
    `).join('');
}

// 4. Target Table & Search
async function initTargetTable() {
    const tableBody = document.getElementById('dashboard-table-body');
    const searchInput = document.getElementById('target-search');
    if (!tableBody) return;

    const fetchTargets = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/targets/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                allTargets = await res.json();
                renderTable(allTargets);
            }
        } catch (e) {
            console.error("Table Fetch Error:", e);
        }
    };

    const renderTable = (targets) => {
        if (targets.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No targets found.</td></tr>';
            return;
        }

        tableBody.innerHTML = targets.map(t => `
            <tr>
                <td><span style="font-family: monospace; font-weight: 600;">${(t._id || t.id || '').substring(0, 8)}</span></td>
                <td><div style="font-weight: 600;">${t.name}</div><div style="font-size: 0.7rem; color: #64748b;">${t.uniprot_id || 'N/A'}</div></td>
                <td><span class="badge badge-info">${t.type || 'In-silico'}</span></td>
                <td>${t.properties?.confidence || '0.92'}</td>
                <td>${new Date(t.created_at || Date.now()).toLocaleDateString()}</td>
                <td><span class="badge badge-success">Analyzed</span></td>
            </tr>
        `).join('');
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allTargets.filter(t => 
                t.name.toLowerCase().includes(term) || 
                (t.uniprot_id && t.uniprot_id.toLowerCase().includes(term))
            );
            renderTable(filtered);
        });
    }

    fetchTargets();
    setInterval(fetchTargets, 15000); // Refresh table every 15s
}

// 5. Activity Feed
async function startActivityFeed() {
    const feedContainer = document.getElementById('activity-feed');
    if (!feedContainer) return;

    const updateFeed = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/activity/recent', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) return;
            const data = await res.json();
            
            feedContainer.innerHTML = data.slice(0, 8).map(a => `
                <div style="margin-bottom: 1rem; border-left: 2px solid var(--primary); padding-left: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">${a.action}</span>
                        <span style="font-size: 0.65rem; color: #64748b;">${new Date(a.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style="font-size: 0.7rem; color: #64748b; font-family: monospace;">
                        ${JSON.stringify(a.details).substring(0, 50)}...
                    </div>
                </div>
            `).join('');
        } catch (e) { }
    };

    updateFeed();
    setInterval(updateFeed, 10000);
}

// 6. CSV Export Functionality
function setupExportButton() {
    const exportBtn = document.getElementById('export-dashboard-csv');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', () => {
        if (allTargets.length === 0) {
            alert("No data available to export.");
            return;
        }

        const headers = ["Target ID", "Name", "UniProt ID", "Type", "Created At", "Status"];
        const rows = allTargets.map(t => [
            t._id || t.id,
            t.name,
            t.uniprot_id || 'N/A',
            t.type || 'In-silico',
            t.created_at,
            "Analyzed"
        ]);

        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `genquantis_targets_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
