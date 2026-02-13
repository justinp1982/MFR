console.log("MFR Tool Loaded (v1.8 PDF Engine).");

// --- STATE MANAGEMENT ---
const defaultState = {
    mode: 'treatment', 
    painMuscles: [],
    treatedMuscles: [],
    technique: "Myofascial Release", 
    response: "Tolerated well",
    notes: ""
};

const defaultSettings = {
    intro: "Patient presents for manual therapy session.",
    pain: "Areas of pain/restriction identified:"
};

let state = JSON.parse(localStorage.getItem('mfr_session_state')) || { ...defaultState };
let settings = JSON.parse(localStorage.getItem('mfr_settings')) || { ...defaultSettings };

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    restoreUI();
    generateSOAP();
    renderSuperbill();
});

function saveState() {
    localStorage.setItem('mfr_session_state', JSON.stringify(state));
}

function restoreUI() {
    setMode(state.mode);
    document.querySelectorAll('.muscle-zone').forEach(el => el.classList.remove('pain', 'treated'));
    
    state.painMuscles.forEach(name => {
        const el = document.querySelector(`.muscle-zone[data-name="${name}"]`);
        if(el) el.classList.add('pain');
    });
    state.treatedMuscles.forEach(name => {
        const el = document.querySelector(`.muscle-zone[data-name="${name}"]`);
        if(el) el.classList.add('treated');
    });
}

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

// --- SETTINGS ---
document.getElementById('btn-settings').addEventListener('click', () => toggleSettings());

window.toggleSettings = function() {
    const modal = document.getElementById('settings-modal');
    modal.classList.toggle('hidden');
    if(!modal.classList.contains('hidden')) {
        document.getElementById('set-sub').value = settings.intro;
        document.getElementById('set-pain').value = settings.pain;
    }
}

window.saveSettings = function() {
    settings.intro = document.getElementById('set-sub').value;
    settings.pain = document.getElementById('set-pain').value;
    localStorage.setItem('mfr_settings', JSON.stringify(settings));
    toggleSettings();
    generateSOAP();
}

// --- CONTROLS ---
window.setMode = function(newMode) {
    state.mode = newMode;
    saveState();
    document.getElementById('btn-mode-assess').classList.toggle('active', newMode === 'assessment');
    document.getElementById('btn-mode-treat').classList.toggle('active', newMode === 'treatment');
}

window.switchView = function(viewName) {
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
        if(!document.getElementById('superbill-view').classList.contains('hidden')) renderSuperbill();
    });
});

function updateInputPanel(lastClickedMuscle) {
    const container = document.getElementById('form-container');
    let statusText = "";
    if (state.painMuscles.includes(lastClickedMuscle)) statusText += "🔴 Reported Pain. ";
    if (state.treatedMuscles.includes(lastClickedMuscle)) statusText += "🟢 Treated.";

    const techniques = ["Myofascial Release", "Trigger Point", "Soft Tissue Mob"];
    const responses = ["Tolerated well", "Decreased Pain", "Improved ROM"];

    const createButtons = (items, currentVal, type) => {
        return items.map(item => {
            const isActive = item === currentVal ? 'active' : '';
            return `<button class="chip-btn ${isActive}" onclick="window.setGlobalOption('${type}', '${item}', '${lastClickedMuscle}')">${item}</button>`;
        }).join('');
    };

    container.innerHTML = `
        <h3>Selected: ${lastClickedMuscle}</h3>
        <p style="font-size:0.9rem; margin-bottom:15px;"><strong>Status:</strong> ${statusText || "Normal"}</p>
        <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
        <h4>Technique</h4>
        <div class="chip-group">${createButtons(techniques, state.technique, 'technique')}</div>
        <h4>Patient Response</h4>
        <div class="chip-group">${createButtons(responses, state.response, 'response')}</div>
    `;
}

window.setGlobalOption = function(type, value, muscleContext) {
    if (type === 'technique') state.technique = value;
    if (type === 'response') state.response = value;
    saveState();
    updateInputPanel(muscleContext);
    generateSOAP(); 
};

function generateSOAP() {
    const painList = state.painMuscles.length > 0 ? state.painMuscles.join(", ") : "None reported";
    const treatedList = state.treatedMuscles.length > 0 ? state.treatedMuscles.join(", ") : "None";

    const note = `SOAP NOTE (Draft)
DATE: ${new Date().toLocaleDateString()}

SUBJECTIVE:
${settings.intro}
${settings.pain} ${painList}.

OBJECTIVE:
Manual therapy (CPT 97140) performed.
Treated Areas: ${treatedList}.
Techniques: ${state.technique} to address fascial restrictions.

ASSESSMENT:
Patient response: ${state.response}. Palpable release of tension noted.

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
        navigator.clipboard.writeText(document.getElementById('soap-preview').value).then(() => alert("SOAP Note Copied!"));
    } else {
        let csv = "CPT, Description, Area\n";
        state.treatedMuscles.forEach(m => csv += `97140, Manual Therapy, ${m}\n`);
        navigator.clipboard.writeText(csv).then(() => alert("Billing Data Copied as CSV!"));
    }
});

// --- NEW PDF ENGINE (V1.8) ---
document.getElementById('btn-pdf').addEventListener('click', generatePDF);

async function generatePDF() {
    // Check if library loaded
    if (!window.jspdf) {
        alert("PDF Library not loaded. Check internet connection.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    // -- HEADER --
    doc.setFontSize(22);
    doc.text("Manual Therapy Session Record", 105, 20, null, null, "center");
    
    doc.setFontSize(10);
    doc.text(`Date of Service: ${dateStr}`, 20, 30);
    doc.text("Provider: Occupational Therapy MFR", 20, 35);
    
    // -- SECTION 1: SUPERBILL --
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45); // Line
    
    doc.setFontSize(14);
    doc.text("Superbill / Procedure Codes", 20, 55);
    
    // Table Headers
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CPT Code", 20, 65);
    doc.text("Description", 50, 65);
    doc.text("Treatment Area", 110, 65);
    doc.text("Fee", 170, 65);
    doc.setFont("helvetica", "normal");

    // Table Rows
    let y = 75;
    if (state.treatedMuscles.length === 0) {
        doc.text("No billable procedures recorded.", 20, y);
        y += 10;
    } else {
        state.treatedMuscles.forEach(muscle => {
            doc.text("97140", 20, y);
            doc.text("Manual Therapy", 50, y);
            doc.text(muscle, 110, y);
            doc.text("$--", 170, y); // Placeholder for fee
            y += 8;
        });
    }

    // -- SECTION 2: CLINICAL NOTES --
    y += 20; // Spacer
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y); // Line
    y += 10;

    doc.setFontSize(14);
    doc.text("Clinical SOAP Note", 20, y);
    y += 10;

    // Get the SOAP text
    const soapText = document.getElementById('soap-preview').value;
    
    // Split text to fit page width
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(soapText, 170); // 170mm width
    doc.text(splitText, 20, y);

    // -- FOOTER --
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Generated by MFR Rapid Doc Tool", 105, 280, null, null, "center");

    // -- SAVE --
    doc.save(`Session_Record_${new Date().toISOString().slice(0,10)}.pdf`);
}
