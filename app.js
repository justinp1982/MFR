console.log("MFR Tool Loaded.");

// [FUTURE-SECURITY] Placeholder for User Auth
const currentUser = { id: "local-user-001", plan: "pro" };

// --- STATE MANAGEMENT ---
// Updated to track Pain vs Treated separately
const state = {
    mode: 'treatment', // 'assessment' or 'treatment'
    painMuscles: [],
    treatedMuscles: [],
    notes: ""
};

// --- MODE SWITCHING ---
function setMode(newMode) {
    state.mode = newMode;
    
    // Update UI Buttons
    document.getElementById('btn-mode-assess').classList.toggle('active', newMode === 'assessment');
    document.getElementById('btn-mode-treat').classList.toggle('active', newMode === 'treatment');
}

// --- VIEW TOGGLING ---
function switchView(viewName) {
    const frontView = document.getElementById('view-front');
    const backView = document.getElementById('view-back');

    if(viewName === 'front') {
        frontView.classList.remove('hidden');
        backView.classList.add('hidden');
    } else {
        frontView.classList.add('hidden');
        backView.classList.remove('hidden');
    }
}

// --- TAB SWITCHING (Output Panel) ---
function switchTab(tabName) {
    const soapView = document.getElementById('soap-preview');
    const billView = document.getElementById('superbill-view');
    const tabSoap = document.getElementById('tab-soap');
    const tabBill = document.getElementById('tab-bill');

    if (tabName === 'soap') {
        soapView.classList.remove('hidden');
        billView.classList.add('hidden');
        tabSoap.classList.add('active');
        tabBill.classList.remove('active');
    } else {
        soapView.classList.add('hidden');
        billView.classList.remove('hidden');
        tabSoap.classList.remove('active');
        tabBill.classList.add('active');
        renderSuperbill(); // Generate table on switch
    }
}


// --- INTERACTION LOGIC ---
document.querySelectorAll('.muscle-zone').forEach(zone => {
    zone.addEventListener('click', function() {
        const muscleName = this.getAttribute('data-name');
        
        // Logic based on current mode
        if (state.mode === 'assessment') {
            // Toggle Pain List
            if (state.painMuscles.includes(muscleName)) {
                state.painMuscles = state.painMuscles.filter(m => m !== muscleName);
                this.classList.remove('pain');
            } else {
                state.painMuscles.push(muscleName);
                this.classList.add('pain');
            }
        } else {
            // Toggle Treatment List
            if (state.treatedMuscles.includes(muscleName)) {
                state.treatedMuscles = state.treatedMuscles.filter(m => m !== muscleName);
                this.classList.remove('treated');
            } else {
                state.treatedMuscles.push(muscleName);
                this.classList.add('treated');
            }
        }

        // If a muscle is BOTH painful and treated, ensure 'treated' class stays (Green wins visually)
        if (state.treatedMuscles.includes(muscleName)) {
            this.classList.add('treated');
        }

        updateInputPanel(muscleName);
        generateSOAP();
        if(!document.getElementById('superbill-view').classList.contains('hidden')) {
            renderSuperbill();
        }
    });
});


// --- UI UPDATES ---
function updateInputPanel(lastClickedMuscle) {
    const container = document.getElementById('form-container');
    
    // Determine status of this muscle
    let statusText = "";
    if (state.painMuscles.includes(lastClickedMuscle)) statusText += "🔴 Reported Pain. ";
    if (state.treatedMuscles.includes(lastClickedMuscle)) statusText += "🟢 Treated.";

    container.innerHTML = `
        <h3>Selected: ${lastClickedMuscle}</h3>
        <p><strong>Status:</strong> ${statusText || "Normal"}</p>
        <hr>
        <label>Technique (Global):</label>
        <select id="technique-select" onchange="generateSOAP()" style="width: 100%; padding: 8px; margin-bottom: 10px;">
            <option>Myofascial Release</option>
            <option>Trigger Point Release</option>
            <option>Soft Tissue Mobilization</option>
        </select>
        
        <label>Patient Response (Global):</label>
        <select id="response-select" onchange="generateSOAP()" style="width: 100%; padding: 8px; margin-bottom: 10px;">
            <option>Tolerated well</option>
            <option>Reported decreased pain</option>
            <option>Improved ROM</option>
        </select>
    `;
}

// --- SOAP GENERATOR ---
function generateSOAP() {
    const techniqueElem = document.getElementById('technique-select');
    const responseElem = document.getElementById('response-select');
    const technique = techniqueElem ? techniqueElem.value : "Myofascial Release";
    const response = responseElem ? responseElem.value : "Tolerated well";

    // Build Lists
    const painList = state.painMuscles.length > 0 ? state.painMuscles.join(", ") : "None reported";
    const treatedList = state.treatedMuscles.length > 0 ? state.treatedMuscles.join(", ") : "None";

    const note = `SOAP NOTE (Draft)
DATE: ${new Date().toLocaleDateString()}

SUBJECTIVE:
Patient presents for manual therapy.
Areas of pain/restriction identified: ${painList}.

OBJECTIVE:
Manual therapy (CPT 97140) performed.
Treated Areas: ${treatedList}.
Techniques: ${technique} to address fascial restrictions.

ASSESSMENT:
Patient ${response} to treatment. Palpable release of tension noted.

PLAN:
Continue plan of care focusing on ${painList} to restore mobility.`;

    document.getElementById('soap-preview').value = note;
}

// --- SUPERBILL RENDERER ---
function renderSuperbill() {
    const tbody = document.querySelector('#billing-table tbody');
    tbody.innerHTML = ""; // Clear existing

    if (state.treatedMuscles.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3'>No treatment areas selected.</td></tr>";
        return;
    }

    // Create one row per treated muscle (or group them, but listing is clearer for PoC)
    state.treatedMuscles.forEach(muscle => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>97140</td>
            <td>Manual Therapy</td>
            <td>${muscle}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Copy Button Logic
document.getElementById('btn-copy').addEventListener('click', () => {
    // Check which tab is active to decide what to copy
    const soapActive = !document.getElementById('soap-preview').classList.contains('hidden');
    
    if (soapActive) {
        const noteContent = document.getElementById('soap-preview').value;
        navigator.clipboard.writeText(noteContent).then(() => alert("SOAP Note Copied!"));
    } else {
        // Copy Table Data (Simple CSV format)
        let csv = "CPT, Description, Area\n";
        state.treatedMuscles.forEach(m => csv += `97140, Manual Therapy, ${m}\n`);
        navigator.clipboard.writeText(csv).then(() => alert("Billing Data Copied as CSV!"));
    }
});
