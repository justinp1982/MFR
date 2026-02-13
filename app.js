console.log("MFR Tool Loaded.");

// [FUTURE-SECURITY] User Auth Placeholder
const currentUser = { id: "local-user-001", plan: "pro" };

// --- STATE MANAGEMENT ---
const defaultState = {
    mode: 'treatment', 
    painMuscles: [],
    treatedMuscles: [],
    notes: ""
};

// Load from LocalStorage OR use Default
let state = JSON.parse(localStorage.getItem('mfr_session_state')) || { ...defaultState };

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    restoreUI();
    generateSOAP();
    renderSuperbill();
});

function saveState() {
    localStorage.setItem('mfr_session_state', JSON.stringify(state));
    console.log("State Saved");
}

function restoreUI() {
    setMode(state.mode);
    // Clear
    document.querySelectorAll('.muscle-zone').forEach(el => el.classList.remove('pain', 'treated'));
    // Restore
    state.painMuscles.forEach(name => {
        const el = document.querySelector(`.muscle-zone[data-name="${name}"]`);
        if(el) el.classList.add('pain');
    });
    state.treatedMuscles.forEach(name => {
        const el = document.querySelector(`.muscle-zone[data-name="${name}"]`);
        if(el) el.classList.add('treated');
    });
}

// --- NEW SESSION (RESET) ---
document.getElementById('btn-reset').addEventListener('click', () => {
    if(confirm("Start a new patient session? This will clear current data.")) {
        state = { ...defaultState };
        state.painMuscles = [];
        state.treatedMuscles = [];
        saveState();
        restoreUI();
        generateSOAP();
        renderSuperbill();
        document.getElementById('form-container').innerHTML = '<p class="instruction">Select a body part to begin.</p>';
    }
});

// --- CONTROLS ---
function setMode(newMode) {
    state.mode = newMode;
    saveState();
    document.getElementById('btn-mode-assess').classList.toggle('active', newMode === 'assessment');
    document.getElementById('btn-mode-treat').classList.toggle('active', newMode === 'treatment');
}

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

window.switchTab = function(tabName) {
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
        renderSuperbill(); 
    }
}

// --- INTERACTION ---
document.querySelectorAll('.muscle-zone').forEach(zone => {
    zone.addEventListener('click', function() {
        const muscleName = this.getAttribute('data-name');
        
        if (state.mode === 'assessment') {
            if (state.painMuscles.includes(muscleName)) {
                state.painMuscles = state.painMuscles.filter(m => m !== muscleName);
                this.classList.remove('pain');
            } else {
                state.painMuscles.push(muscleName);
                this.classList.add('pain');
            }
        } else {
            if (state.treatedMuscles.includes(muscleName)) {
                state.treatedMuscles = state.treatedMuscles.filter(m => m !== muscleName);
                this.classList.remove('treated');
            } else {
                state.treatedMuscles.push(muscleName);
                this.classList.add('treated');
            }
        }

        if (state.treatedMuscles.includes(muscleName)) this.classList.add('treated');

        saveState();
        updateInputPanel(muscleName);
        generateSOAP();
        if(!document.getElementById('superbill-view').classList.contains('hidden')) {
            renderSuperbill();
        }
    });
});

function updateInputPanel(lastClickedMuscle) {
    const container = document.getElementById('form-container');
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

function generateSOAP() {
    const techniqueElem = document.getElementById('technique-select');
    const responseElem = document.getElementById('response-select');
    const technique = techniqueElem ? techniqueElem.value : "Myofascial Release";
    const response = responseElem ? responseElem.value : "Tolerated well";

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

function renderSuperbill() {
    const tbody = document.querySelector('#billing-table tbody');
    if (!tbody) return; 
    tbody.innerHTML = ""; 

    if (state.treatedMuscles.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3'>No treatment areas selected.</td></tr>";
        return;
    }

    state.treatedMuscles.forEach(muscle => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>97140</td><td>Manual Therapy</td><td>${muscle}</td>`;
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-copy').addEventListener('click', () => {
    const soapActive = !document.getElementById('soap-preview').classList.contains('hidden');
    if (soapActive) {
        const noteContent = document.getElementById('soap-preview').value;
        navigator.clipboard.writeText(noteContent).then(() => alert("SOAP Note Copied!"));
    } else {
        let csv = "CPT, Description, Area\n";
        state.treatedMuscles.forEach(m => csv += `97140, Manual Therapy, ${m}\n`);
        navigator.clipboard.writeText(csv).then(() => alert("Billing Data Copied as CSV!"));
    }
});
