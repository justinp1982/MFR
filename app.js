// Wait for HTML to load before running ANY code
document.addEventListener('DOMContentLoaded', () => {
    console.log("MFR Tool: DOM Ready.");

    // --- DEFAULTS ---
    const defaultSettings = {
        intro: "Patient presents for manual therapy session.",
        positive: "Tolerated well",
        pain: "Areas of pain/restriction identified:",
    };

    const defaultState = {
        mode: 'treatment', 
        painMuscles: [],
        treatedMuscles: [],
        notes: ""
    };

    // --- STATE LOADING ---
    let state = JSON.parse(localStorage.getItem('mfr_session_state')) || { ...defaultState };
    let settings = JSON.parse(localStorage.getItem('mfr_settings')) || { ...defaultSettings };

    // --- UI ELEMENTS ---
    const svgFront = document.getElementById('view-front');
    const svgBack = document.getElementById('view-back');
    const soapPreview = document.getElementById('soap-preview');
    const superbillView = document.getElementById('superbill-view');
    
    // --- INIT ---
    restoreUI();
    generateSOAP();
    renderSuperbill();

    // --- EVENT LISTENERS (The "Wiring") ---
    
    // 1. Muscle Clicks
    document.querySelectorAll('.muscle-zone').forEach(zone => {
        zone.addEventListener('click', function() {
            const muscleName = this.getAttribute('data-name');
            handleMuscleClick(muscleName, this);
        });
    });

    // 2. Mode Toggles
    document.getElementById('btn-mode-assess').addEventListener('click', () => setMode('assessment'));
    document.getElementById('btn-mode-treat').addEventListener('click', () => setMode('treatment'));

    // 3. View Toggles (Front/Back)
    document.getElementById('btn-view-front').addEventListener('click', () => switchView('front'));
    document.getElementById('btn-view-back').addEventListener('click', () => switchView('back'));

    // 4. Output Tabs (SOAP/Bill)
    document.getElementById('tab-soap').addEventListener('click', () => switchTab('soap'));
    document.getElementById('tab-bill').addEventListener('click', () => switchTab('bill'));

    // 5. Settings Modal
    document.getElementById('btn-open-settings').addEventListener('click', toggleSettings);
    document.getElementById('btn-close-settings').addEventListener('click', toggleSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

    // 6. Action Buttons
    document.getElementById('btn-reset').addEventListener('click', resetSession);
    document.getElementById('btn-copy').addEventListener('click', copyToClipboard);
    document.getElementById('btn-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-pdf').addEventListener('click', generatePDF);


    // --- FUNCTIONS ---

    function handleMuscleClick(muscleName, element) {
        if (state.mode === 'assessment') {
            toggleArray(state.painMuscles, muscleName);
        } else {
            toggleArray(state.treatedMuscles, muscleName);
        }
        
        // Save & Refresh
        saveState();
        refreshVisuals(); // Update all colors
        updateInputPanel(muscleName);
        generateSOAP();
        renderSuperbill();
    }

    function toggleArray(arr, val) {
        const idx = arr.indexOf(val);
        if (idx > -1) arr.splice(idx, 1);
        else arr.push(val);
    }

    function refreshVisuals() {
        // Reset all first
        document.querySelectorAll('.muscle-zone').forEach(el => {
            el.classList.remove('pain', 'treated');
        });

        // Apply Pain (Red)
        state.painMuscles.forEach(m => {
            const el = document.querySelector(`[data-name="${m}"]`);
            if(el) el.classList.add('pain');
        });

        // Apply Treated (Green - Overrides Pain visually)
        state.treatedMuscles.forEach(m => {
            const el = document.querySelector(`[data-name="${m}"]`);
            if(el) el.classList.add('treated');
        });
    }

    function setMode(newMode) {
        state.mode = newMode;
        saveState();
        document.getElementById('btn-mode-assess').classList.toggle('active', newMode === 'assessment');
        document.getElementById('btn-mode-treat').classList.toggle('active', newMode === 'treatment');
    }

    function switchView(viewName) {
        if(viewName === 'front') {
            svgFront.classList.remove('hidden');
            svgBack.classList.add('hidden');
            document.getElementById('btn-view-front').classList.add('active-view');
            document.getElementById('btn-view-back').classList.remove('active-view');
        } else {
            svgFront.classList.add('hidden');
            svgBack.classList.remove('hidden');
            document.getElementById('btn-view-front').classList.remove('active-view');
            document.getElementById('btn-view-back').classList.add('active-view');
        }
    }

    function switchTab(tabName) {
        if (tabName === 'soap') {
            soapPreview.classList.remove('hidden');
            superbillView.classList.add('hidden');
            document.getElementById('tab-soap').classList.add('active');
            document.getElementById('tab-bill').classList.remove('active');
        } else {
            soapPreview.classList.add('hidden');
            superbillView.classList.remove('hidden');
            document.getElementById('tab-soap').classList.remove('active');
            document.getElementById('tab-bill').classList.add('active');
            renderSuperbill();
        }
    }

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

        soapPreview.value = note;
    }

    function renderSuperbill() {
        const tbody = document.querySelector('#billing-table tbody');
        tbody.innerHTML = state.treatedMuscles.map(m => `<tr><td>97140</td><td>${m}</td></tr>`).join('');
    }

    // --- SETTINGS LOGIC ---
    function toggleSettings() {
        const modal = document.getElementById('settings-modal');
        const isHidden = modal.classList.contains('hidden');
        
        if (isHidden) {
            modal.classList.remove('hidden');
            // Load current values
            document.getElementById('set-sub').value = settings.intro;
            document.getElementById('set-pos').value = settings.positive;
            document.getElementById('set-pain').value = settings.pain;
        } else {
            modal.classList.add('hidden');
        }
    }

    function saveSettings() {
        settings.intro = document.getElementById('set-sub').value;
        settings.positive = document.getElementById('set-pos').value;
        settings.pain = document.getElementById('set-pain').value;
        
        localStorage.setItem('mfr_settings', JSON.stringify(settings));
        toggleSettings(); // Close modal
        generateSOAP(); // Refresh note
        alert("Preferences Saved!");
    }

    // --- EXPORTS ---
    function copyToClipboard() {
        navigator.clipboard.writeText(soapPreview.value);
        alert("Copied!");
    }

    function exportCSV() {
        let csvContent = "data:text/csv;charset=utf-8,Date,CPT,Area,Status\n";
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

    async function generatePDF() {
        if (!window.jspdf) {
            alert("PDF Library not loaded yet. Please wait a moment.");
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
        state.treatedMuscles.forEach(muscle => {
            doc.text("97140", 20, y);
            doc.text(muscle, 60, y);
            doc.text("$--", 160, y);
            y += 10;
        });

        doc.save(`Superbill_${new Date().toISOString().slice(0,10)}.pdf`);
    }

    function resetSession() {
        if(confirm("Start new session?")) {
            state.painMuscles = [];
            state.treatedMuscles = [];
            saveState();
            refreshVisuals();
            generateSOAP();
            renderSuperbill();
        }
    }

    function saveState() {
        localStorage.setItem('mfr_session_state', JSON.stringify(state));
    }

    function restoreUI() {
        setMode(state.mode);
        refreshVisuals();
    }
});
