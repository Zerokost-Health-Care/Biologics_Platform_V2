// Target Explorer Logic (Production Rewrite)

document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('target-search-btn');
    const searchInput = document.getElementById('target-search-input');
    const resultsContainer = document.getElementById('target-results');
    const viewerSection = document.getElementById('viewer-section');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) performDiscovery(query);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) performDiscovery(query);
            }
        });
    }

    async function performDiscovery(uniprotId) {
        // Reset View
        viewerSection.style.display = 'none';
        resultsContainer.innerHTML = `
            <div style="text-align: center; opacity: 0.8; margin-top: 2rem;" class="fade-in">
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/23/DNA_Orbit_Animated.gif" width="100" style="filter: hue-rotate(90deg);">
                <p style="margin-top: 1rem; font-family: monospace; color: var(--primary-color);">[SCANNING UNIPROT] Accessing genomic databanks...</p>
                <div class="scanner-line" style="margin-top:20px; width:200px; margin-left:auto; margin-right:auto;"></div>
            </div>
        `;

        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        try {
            const response = await fetch(`${API_BASE_URL}/api/targets/discover/${encodeURIComponent(uniprotId)}`, {
                method: 'POST',
                headers: headers
            });

            if (response.status === 401) {
                if (window.handleUnauthorized) window.handleUnauthorized();
                throw new Error("Unauthorized: Please login first");
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Database query failed.");
            }

            const targetData = await response.json();
            displayDiscoveryResults(targetData);
            
            // Show prominent download button in search card
            const btnContainer = document.getElementById('download-btn-container');
            if (btnContainer) {
                btnContainer.innerHTML = `
                    <button onclick="downloadTargetReport('${targetData.uniprot_id}')" class="btn-launch" style="width: 100%; justify-content: center; background: #0369a1; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); white-space: normal; height: auto; padding: 1rem; text-align: center;">
                        <i class="fas fa-file-pdf"></i> DOWNLOAD ${targetData.name} REPORT
                    </button>
                `;
            }
            
        } catch (error) {
            console.error('Error:', error);
            resultsContainer.innerHTML = `
                <div style="padding: 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); text-align: center; border-radius: 8px;" class="fade-in">
                    <p style="color: var(--danger); margin: 0; font-family: monospace;">[EXECUTION ERROR] ${error.message}</p>
                </div>
            `;
        }
    }

    function displayDiscoveryResults(targetData) {
        resultsContainer.innerHTML = '';
        
        const card = document.createElement('div');
        card.className = "glass-card card tech-border fade-in";
        card.style.position = 'relative';

        // Genomic Profile Section
        let sequenceHtml = '';
        if (targetData.sequence) {
             sequenceHtml = `
                <div style="margin-top: 1.5rem; background: var(--background-dark); padding: 1rem; border-radius: 8px; max-height: 150px; overflow-y: auto; overflow-x: hidden; border: 1px solid var(--border-color);">
                    <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 0.5rem; font-family: monospace;">// SEQUENCED AMINO ACIDS</div>
                    <div style="font-family: monospace; font-size: 0.85rem; color: #64748b; word-break: break-all; overflow-wrap: anywhere;">
                        ${targetData.sequence}
                    </div>
                </div>
             `;
        }

        // ChEMBL Ligands Section
        let ligandsHtml = '';
        if (targetData.known_ligands && targetData.known_ligands.length > 0) {
            const rows = targetData.known_ligands.map(ligand => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem; color: var(--primary-color);">${ligand.molecule_chembl_id}</td>
                    <td style="padding: 0.75rem; color: var(--success); font-weight: 600;">${ligand.standard_type}</td>
                    <td style="padding: 0.75rem;">${ligand.standard_value} ${ligand.standard_units}</td>
                    <td style="padding: 0.75rem; font-family: monospace; font-size: 0.8rem; color: #64748b; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ligand.smiles}</td>
                </tr>
            `).join('');

            ligandsHtml = `
                <div style="margin-top: 2rem;">
                    <h4 style="color: var(--text-main); margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                        Identified ChEMBL Binders (${targetData.known_ligands.length})
                    </h4>
                    <div class="table-wrapper">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr>
                                    <th style="padding: 0.5rem; color: var(--text-muted); font-weight: 500; font-size: 0.85rem;">ChEMBL ID</th>
                                    <th style="padding: 0.5rem; color: var(--text-muted); font-weight: 500; font-size: 0.85rem;">Affinity Metric</th>
                                    <th style="padding: 0.5rem; color: var(--text-muted); font-weight: 500; font-size: 0.85rem;">Bioactivity</th>
                                    <th style="padding: 0.5rem; color: var(--text-muted); font-weight: 500; font-size: 0.85rem;">SMILES Signature</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // PPI Interactome Section
        let ppiHtml = '';
        if (targetData.interaction_partners && targetData.interaction_partners.length > 0) {
            const ppiRows = targetData.interaction_partners.map(p => `
                 <div style="background: rgba(14, 165, 233, 0.05); border: 1px solid rgba(14, 165, 233, 0.2); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div>
                        <span style="font-weight: bold; color: var(--primary-color);">${p.symbol}</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted); margin-left: 0.5rem;">(${p.method})</span>
                        <div style="font-size: 0.65rem; color: #64748b;">${p.type}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; font-weight: bold; color: ${p.score > 0.8 ? 'var(--success)' : '#facc15'}">${(p.score * 100).toFixed(0)}%</div>
                        <div style="font-size: 0.6rem; color: var(--text-muted);">STRING SCORE</div>
                    </div>
                 </div>
            `).join('');

            ppiHtml = `
                <div style="margin-top: 2rem;">
                    <h4 style="color: var(--text-main); margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; display: flex; justify-content: space-between;">
                        PPI Interactome Mapping <span style="font-size: 0.7rem; color: #64748b; font-weight: normal;">(STRING BENCHMARK)</span>
                    </h4>
                    <div class="ppi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem;">
                        ${ppiRows}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card-header" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="font-size: 1.5rem; font-weight: 600; color: var(--text-main); margin: 0;">${targetData.name}</h3>
                    <span style="background: rgba(14, 165, 233, 0.1); color: var(--primary-color); padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: bold; font-family: monospace; margin-top: 0.5rem; display: inline-block;">
                        ${targetData.uniprot_id || 'UNKNOWN'}
                    </span>
                </div>
            </div>
            <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.95rem;">${targetData.description || 'Protein signature retrieved.'}</p>
            
            ${sequenceHtml}
            ${ppiHtml}
            ${ligandsHtml}
        `;

        resultsContainer.appendChild(card);
        
        // Trigger generic 3DMol Rendering Pipeline
        render3DStructure(targetData);
    }

    function render3DStructure(targetData) {
        const container = document.getElementById('mol-viewer');
        const titleHeader = document.querySelector('#viewer-section h3');
        const sourceBadge = document.querySelector('#viewer-section .badge');

        const _3Dmol = window.$3Dmol || window['3Dmol'];
        if (viewerSection) viewerSection.style.display = 'flex';
        
        // UI Feedback: Show loading in viewer
        if (container) {
            container.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:100%; color:#94a3b8; flex-direction:column; font-family:monospace;">
                    <div style="font-size:2rem; margin-bottom:1rem;">🧬</div>
                    <div>[ACQUIRING_STRUCTURE] Resolving 3D coordinates...</div>
                </div>
            `;
        }

        let structureLoaded = false;
        const pdbIds = targetData.pdb_ids || [];

        const tryLoadPDB = async () => {
            for (const pid of pdbIds) {
                if (structureLoaded) return;
                console.info(`[Probing RCSB] Checking structure: ${pid}`);
                // Note: 404s in the console here are EXPECTED and handled by the discovery engine fallback.
                try {
                    // Try PDB format first
                    let pdbRes = await fetch(`https://files.rcsb.org/download/${pid}.pdb`);
                    if (pdbRes.ok) {
                        const pdbData = await pdbRes.text();
                        if (typeof _3Dmol === 'undefined') {
                            console.error("[CRITICAL] 3Dmol library is not defined. Check script tags.");
                            throw new Error("3D Visualization library not loaded.");
                        }
                        console.info(`[3Dmol] Initializing viewer. Container: ${container.offsetWidth}x${container.offsetHeight}`);
                        container.innerHTML = '';
                        const viewer = _3Dmol.createViewer($(container), { backgroundColor: '#f8fafc' });
                        viewer.addModel(pdbData, "pdb");
                        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
                        viewer.zoomTo();
                        viewer.center({});
                        viewer.render();
                        viewer.spin(true);
                        setTimeout(() => { viewer.resize(); viewer.zoomTo(); viewer.center({}); }, 500);
                        structureLoaded = true;
                        if (titleHeader) titleHeader.innerText = `>>> MOLECULAR_VISUALIZATION_MODULE [${pid}]`;
                        console.info(`Successfully loaded PDB: ${pid}`);
                        setTimeout(() => viewerSection.scrollIntoView({ behavior: 'smooth' }), 200);
                        return;
                    } else {
                        // Fallback to CIF format
                        let cifRes = await fetch(`https://files.rcsb.org/download/${pid}.cif`);
                        if (cifRes.ok) {
                            const cifData = await cifRes.text();
                            if (typeof _3Dmol === 'undefined') {
                                throw new Error("3D Visualization library not loaded.");
                            }
                            container.innerHTML = '';
                            const viewer = _3Dmol.createViewer($(container), { backgroundColor: '#f8fafc' });
                            viewer.addModel(cifData, "cif");
                            viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
                            viewer.zoomTo();
                            viewer.center({});
                            viewer.render();
                            viewer.spin(true);
                            setTimeout(() => { viewer.resize(); viewer.zoomTo(); viewer.center({}); }, 500);
                            structureLoaded = true;
                            if (titleHeader) titleHeader.innerText = `>>> MOLECULAR_VISUALIZATION_MODULE [${pid} (CIF)]`;
                            console.info(`Successfully loaded CIF: ${pid}`);
                            setTimeout(() => viewerSection.scrollIntoView({ behavior: 'smooth' }), 200);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn(`Retry path for ${pid} failed, skipping...`);
                }
            }

            // Fallback to AlphaFold if all PDBs fail or none exist
            if (!structureLoaded && targetData.alphafold_url) {
                console.info("Falling back to AlphaFold...");
                try {
                    const res = await fetch(targetData.alphafold_url);
                    if (res.ok) {
                        const data = await res.text();
                        if (typeof _3Dmol === 'undefined') {
                            throw new Error("3D Visualization library not loaded.");
                        }
                        container.innerHTML = '';
                        const viewer = _3Dmol.createViewer($(container), { backgroundColor: '#f8fafc' });
                        const plddtToColor = function(atom) {
                            if (atom.b > 90) return '#0053D6';
                            if (atom.b > 70) return '#65CBF3';
                            if (atom.b > 50) return '#FFE000';
                            return '#FF7D45';
                        };
                        viewer.addModel(data, "pdb");
                        viewer.setStyle({}, { cartoon: { colorfunc: plddtToColor } });
                        viewer.zoomTo();
                        viewer.center({});
                        viewer.render();
                        viewer.spin(true);
                        setTimeout(() => { viewer.resize(); viewer.zoomTo(); viewer.center({}); }, 500);
                        structureLoaded = true;
                        if (titleHeader) titleHeader.innerText = `>>> MOLECULAR_VISUALIZATION_MODULE [ALPHAFOLD]`;
                        setTimeout(() => viewerSection.scrollIntoView({ behavior: 'smooth' }), 200);
                    }
                } catch (e) {
                    console.error("AlphaFold load failed:", e);
                }
            }

            if (!structureLoaded) {
                container.innerHTML = `
                    <div style="display:flex; justify-content:center; align-items:center; height:100%; color:#f87171; flex-direction:column; background: #020617; border-radius: 8px; font-family: monospace; text-align: center; padding: 2rem;">
                        <div style="font-size:3rem; margin-bottom:1rem;">⚠️</div>
                        <div>[CRITICAL_ERROR] No 3D topology available for this target.</div>
                        <div style="font-size:0.8rem; margin-top:0.5rem; opacity:0.7;">Structural matrices were not found in RCSB PDB or AlphaFold DB.</div>
                    </div>
                `;
            }
        };

        tryLoadPDB();
    }
});

async function downloadTargetReport(targetId) {
    if (!targetId || targetId === 'undefined') {
        alert("Wait for discovery to complete before downloading.");
        return;
    }
    
    console.log(`[Report] Exporting target intelligence for: ${targetId}`);
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
