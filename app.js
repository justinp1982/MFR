console.log("MFR Tool Loaded. Ready for logic.");

// Basic Copy Functionality (Proof of Concept)
document.getElementById('btn-copy').addEventListener('click', () => {
    const noteContent = document.getElementById('soap-preview').value;
    if(noteContent) {
        navigator.clipboard.writeText(noteContent).then(() => {
            alert("Copied to clipboard!");
        });
    } else {
        alert("Nothing to copy yet.");
    }
});