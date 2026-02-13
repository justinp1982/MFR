console.log("MFR Tool Loaded.");

// --- DEFAULT SETTINGS (The "Voice") ---
const defaultSettings = {
    intro: "Patient presents for manual therapy session.",
    positive: "Tolerated well",
    pain: "Areas of pain/restriction identified:",
};

// --- STATE MANAGEMENT ---
const defaultState = {
    mode: 'treatment', 
    painMuscles: [],
    treatedMuscles: [],
    notes: ""
};

let state = JSON.parse(localStorage.getItem('mfr_session_state')) || { ...defaultState };
let settings = JSON.parse(localStorage.getItem('mfr_settings')) || { ...defaultSettings };

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    restoreUI();
    generateSOAP();
    renderSuperbill();

    // Attach Event Listeners (Safer than onclick)
    document.getElementById('btn-settings').addEventListener('click', toggleSettings);
    document.getElementById('btn-close-modal').addEventListener('click', toggleSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-pdf').addEventListener('click', generatePDF);
});

function saveState() {
    localStorage.setItem('mfr_session_state', JSON.stringify(state));
}

// --- SETTINGS LOGIC ---
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.toggle('hidden');
    
    if(!modal.classList.contains('hidden')) {
        // Load current values into inputs
        document.getElementById('set-sub').value = settings.intro;
        document.getElementById('set-pos').value = settings.positive;
        document.getElementById('set-pain').value = settings.pain;
    }
}

function saveSettings() {
    settings.intro = document.getElementById('set-sub').value;
    settings.positive = document.getElementById('set-pos').value;
    settings.pain = document.getElementById('set-pain').value;
    
    localStorage.setItem('mfr_settings', JSON.stringify(settings));
    toggleSettings();
    generateSOAP(); // Regenerate note with new voice
    alert("Preferences Saved!");
}

// --- CORE INTERACTION ---
window.setMode = function(newMode) {
    state.mode = newMode;
    saveState();
    document.getElementById('btn-mode-assess').classList.toggle('active', newMode === 'assessment');
    document.getElementById('btn-mode-treat').classList.toggle('active', newMode === 'treatment');
}

window.switchView = function(viewName) {
    document.getElementById('view-front').classList.toggle('hidden', viewName !== 'front');
    document.getElementById('view-back').classList.toggle('hidden', viewName !== 'back');
    document.getElementById('btn-front').classList.toggle('active-view', viewName === 'front');
    document.getElementById('btn-back').classList.toggle('active-view', viewName === 'back');
}

window.switchTab = function(tabName) {
    document.getElementById('soap-preview').classList.toggle('hidden', tabName !== 'soap');
    document.getElementById('superbill-view').classList.toggle('hidden', tabName !== 'bill');
    document.getElementById('tab-soap').classList.toggle('active', tabName === 'soap');
    document.getElementById('tab-bill').classList.toggle('active', tabName === 'bill');
    if (tabName === 'bill') renderSuperbill();
}

document.querySelectorAll('.muscle-zone').forEach(zone => {
    zone.addEventListener('click', function() {
        const muscleName = this.getAttribute('data-name');
        
        if (state.mode === 'assessment') {
            toggleArray(state.painMuscles, muscleName);
            this.classList.toggle('pain');
        } else {
            toggleArray(state.treatedMuscles, muscleName);
            this.classList.toggle('treated');
        }
        
        // Green wins logic
        if (state.treatedMuscles.includes(muscleName)) this.classList.add('treated');
        else if (state.painMuscles.includes(muscleName)) this.classList.add('pain'); // Restore red if not treated

        saveState();
        updateInputPanel(muscleName);
        generateSOAP();
        renderSuperbill();
    });
});

function toggleArray(arr, val) {
    const idx = arr.indexOf(val);
    if (idx > -1) arr.splice(idx, 1);
    else arr.push(val);
}

// --- GENERATORS ---
function updateInputPanel(muscle) {
    const container = document.getElementById('form-container');
    let status = "";
    if (state.painMuscles.includes(muscle)) status += "🔴 Pain ";
    if (state.treatedMuscles.includes(muscle)) status += "🟢 Treated";
    
    container.innerHTML = `<h3>${muscle}</h3><p>${status || "Normal"}</p>`;
}

function generateSOAP() {
    const painList = state.painMuscles.length ? state.painMuscles.join(", ") : "None";
    const treatedList = state.treatedMuscles.length ? state.treatedMuscles.join(", ") : "None";

    const note = `SOAP NOTE
DATE: ${new Date().toLocaleDateString()}

S: ${settings.intro}
${settings.pain} ${painList}.

O: Manual therapy (CPT 97140).
Treated: ${treatedList}.

A: ${settings.positive}. Palpable release noted.

P: Continue plan of care.`;

    document.getElementById('soap-preview').value = note;
}

function renderSuperbill() {
    const tbody = document.querySelector('#billing-table tbody');
    tbody.innerHTML = state.treatedMuscles.map(m => `<tr><td>97140</td><td>${m}</td></tr>`).join('');
}

function restoreUI() {
    setMode(state.mode);
    state.painMuscles.forEach(m => {
        const el = document.querySelector(`[data-name="${m}"]`);
        if(el) el.classList.add('pain');
    });
    state.treatedMuscles.forEach(m => {
        const el = document.querySelector(`[data-name="${m}"]`);
        if(el) el.classList.add('treated');
    });
}

// --- EXPORT TOOLS ---

// 1. PDF Generator (Robust)
function generatePDF() {
    // We access window.jspdf only when the function is CALLED, ensuring library is loaded
    if (!window.jspdf) {
        alert("PDF Library not loaded yet. Check internet connection.");
        return;
    }
    const { jsPDF } = window.jspdf;
    
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Manual Therapy Superbill", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text("Provider: Occupational Therapy MFR", 20, 40);
    
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);

    let y = 60;
    doc.text("CPT Code", 20, y);
    doc.text("Treatment Area", 60, y);
    doc.text("Fee", 160, y);
    
    y += 10;
    
    if (state.treatedMuscles.length === 0) {
        doc.text("No treatments recorded.", 20, y);
    } else {
        state.treatedMuscles.forEach(muscle => {
            doc.text("97140", 20, y);
            doc.text(muscle, 60, y);
            doc.text("$--", 160, y);
            y += 10;
        });
    }

    doc.save(`Superbill_${new Date().toISOString().slice(0,10)}.pdf`);
}

// 2. CSV Export
window.exportCSV = function() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,CPT,Area,Status\n";
    
    state.treatedMuscles.forEach(m => {
        csvContent += `${new Date().toLocaleDateString()},97140,${m},Treated\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "session_data.csv");
    document.body.appendChild(link);
    link.click();
}

// 3. Reset
document.getElementById('btn-reset').addEventListener('click', () => {
    if(confirm("Clear session?")) {
        state.painMuscles = [];
        state.treatedMuscles = [];
        saveState
