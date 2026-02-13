console.log("MFR Tool Loaded.");

// [FUTURE-SECURITY]
// Line 4: Placeholder for User Authentication Object
// In the SaaS version, this will be populated by the Auth Provider (e.g., Supabase.auth.user())
// If currentUser is null, the app should redirect to the login screen.
const currentUser = {
    id: "local-user-001", // Hardcoded for PoC
    plan: "pro",
    preferences: {} 
};

// --- STATE MANAGEMENT ---
const state = {
    selectedMuscles: [], 
    notes: ""
};

// [FUTURE-SECURITY]
// Line 18: Initialization Check
// Use this function to verify if the user has a valid session token before loading data.
function checkAuth() {
    if (!currentUser.id) {
        console.warn("No user logged in. Redirecting...");
        // window.location.href = "/login.html";
    }
}
checkAuth();

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

// --- INTERACTION LOGIC ---
document.querySelectorAll('.muscle-zone').forEach(zone => {
    zone.addEventListener('click', function() {
        this.classList.toggle('selected');
        const muscleName = this.getAttribute('data-name');
        
        if (this.classList.contains('selected')) {
            addMuscleToState(muscleName);
        } else {
            removeMuscleFromState(muscleName);
        }
    });
});

function addMuscleToState(muscle) {
    state.selectedMuscles.push(muscle);
    updateInputPanel(muscle);
    generateSOAP();
}

function removeMuscleFromState(muscle) {
    state.selectedMuscles = state.selectedMuscles.filter(m => m !== muscle);
    generateSOAP();
}

// --- UI UPDATES ---
function updateInputPanel(lastClickedMuscle) {
    const container = document.getElementById('form-container');
    
    if (state.selectedMuscles.length === 0) {
        container.innerHTML = `<p class="instruction">Select a body part to begin.</p>`;
        return;
    }

    container.innerHTML = `
        <h3>Last Selected: ${lastClickedMuscle}</h3>
        <p><strong>CPT Code:</strong> 97140 (Manual Therapy)</p>
        <label>Technique:</label>
        <select id="technique-select" onchange="generateSOAP()" style="width: 100%; padding: 8px; margin-bottom: 10px;">
            <option>Myofascial Release</option>
            <option>Trigger Point Release</option>
            <option>Soft Tissue Mobilization</option>
        </select>
        
        <label>Patient Response:</label>
        <select id="response-select" onchange="generateSOAP()" style="width: 100%; padding: 8px; margin-bottom: 10px;">
            <option>Tolerated well</option>
            <option>Reported decreased pain</option>
            <option>Improved ROM</option>
        </select>
    `;
}

// --- SOAP GENERATOR ---
function generateSOAP() {
    if (state.selectedMuscles.length === 0) {
        document.getElementById('soap-preview').value = "";
        return;
    }

    const musclesList = state.selectedMuscles.join(", ");
    const techniqueElem = document.getElementById('technique-select');
    const responseElem = document.getElementById('response-select');
    
    const technique = techniqueElem ? techniqueElem.value : "Myofascial Release";
    const response = responseElem ? responseElem.value : "Tolerated well";

    // [FUTURE-SECURITY]
    // Line 98: Privacy / Scrubbing
    // Before saving or transmitting this string, ensure no PII (Patient Identifiable Info)
    // is included if the user is on a non-HIPAA compliant tier.
    const note = `SOAP NOTE (Draft)
DATE: ${new Date().toLocaleDateString()}

OBJECTIVE:
Manual therapy (CPT 97140) performed on: ${musclesList}.
Techniques utilized: ${technique} to address fascial restrictions and hypertonicity.

ASSESSMENT:
Patient ${response} to treatment. Palpable release of tension noted in treated areas.

PLAN:
Continue plan of care focusing on ${musclesList} to restore mobility.`;

    document.getElementById('soap-preview').value = note;
}

// Copy Button Logic
document.getElementById('btn-copy').addEventListener('click', () => {
    const noteContent = document.getElementById('soap-preview').value;
    if(noteContent) {
        navigator.clipboard.writeText(noteContent).then(() => {
            alert("Copied to clipboard!");
        });
    }
});
