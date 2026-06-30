const form            = document.getElementById('assessmentForm');
const btnSaveLocally  = document.getElementById('btnSaveLocally');
const btnSubmitSheets = document.getElementById('btnSubmitSheets');
const statusText      = document.getElementById('statusText');
const toastElement    = document.getElementById('toast');

const DRAFT_KEY   = 'phcc_draft';
const RECORDS_KEY = 'phcc_records';

const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwZ-mx67gpgbiCpVo1Rax-xlCvZgzSLEfVItsVPrfSSNUD3sbn4qqdJTmFhvtbp0JD7/exec';

const SUBMIT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

// ── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadDraft();
    refreshStatus();
});

// Auto-save draft while typing
form.addEventListener('input', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getFormData()));
});

// ── SAVE LOCALLY ──────────────────────────────────────────────────────────────

btnSaveLocally.addEventListener('click', () => {
    const data = getFormData();

    if (!data.phccName) {
        showToast('Please enter a PHCC name before saving.', 'error');
        return;
    }

    const records = getRecords();
    records.push({
        id: Date.now(),
        data,
        submitted: false,
        savedAt: new Date().toISOString()
    });
    saveRecords(records);

    localStorage.removeItem(DRAFT_KEY);
    form.reset();

    showToast('Record saved locally!', 'success');
    refreshStatus();
});

// ── SUBMIT TO GOOGLE SHEETS ───────────────────────────────────────────────────

btnSubmitSheets.addEventListener('click', async () => {
    let records = getRecords();
    const currentData = getFormData();
    const formHasData = !!currentData.phccName;

    // If the form has data, validate required fields before adding to queue
    if (formHasData) {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        records.push({
            id: Date.now(),
            data: currentData,
            submitted: false,
            savedAt: new Date().toISOString()
        });
        saveRecords(records);
    }

    const pending = records.filter(r => !r.submitted);

    if (pending.length === 0) {
        showToast('No records to submit. Fill in the form or save records locally first.', 'error');
        return;
    }

    setLoadingState(true, pending.length);

    let successCount = 0;

    for (const record of pending) {
        try {
            await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record.data)
            });
            record.submitted = true;
            record.submittedAt = new Date().toISOString();
            successCount++;
        } catch (err) {
            console.error('Failed to submit record', record.id, err);
        }
    }

    saveRecords(records);
    setLoadingState(false);

    if (successCount === pending.length) {
        const label = successCount === 1 ? '1 record' : `${successCount} records`;
        showToast(`${label} submitted to Google Sheets!`, 'success');
        localStorage.removeItem(DRAFT_KEY);
        form.reset();
    } else {
        const failed = pending.length - successCount;
        showToast(`${successCount} submitted, ${failed} failed — try again.`, 'error');
    }

    refreshStatus();
});

// ── HELPERS ───────────────────────────────────────────────────────────────────

function getFormData() {
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });
    return data;
}

function getRecords() {
    try { return JSON.parse(localStorage.getItem(RECORDS_KEY)) || []; }
    catch { return []; }
}

function saveRecords(records) {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function loadDraft() {
    try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
        if (!draft) return;
        Object.entries(draft).forEach(([key, val]) => {
            const el = form.elements[key];
            if (el) el.value = val;
        });
        updateStatus('Draft restored.');
    } catch {}
}

function refreshStatus() {
    const pending = getRecords().filter(r => !r.submitted).length;
    if (pending > 0) {
        const label = pending === 1 ? '1 record' : `${pending} records`;
        updateStatus(`${label} saved locally — ready to submit.`);
        btnSubmitSheets.innerHTML = `${SUBMIT_ICON} Submit ${label}`;
    } else {
        updateStatus('Ready.');
        btnSubmitSheets.innerHTML = `${SUBMIT_ICON} Submit to Google Sheets`;
    }
}

function setLoadingState(isLoading, count = 0) {
    btnSubmitSheets.disabled = isLoading;
    if (isLoading) {
        btnSubmitSheets.innerHTML = count > 1 ? `Submitting ${count} records…` : 'Submitting…';
        updateStatus('Submitting to Google Sheets…');
    }
}

function updateStatus(message) {
    statusText.textContent = message;
    statusText.style.color = 'var(--text-main)';
    setTimeout(() => { statusText.style.color = 'var(--text-muted)'; }, 2500);
}

let toastTimeout;
function showToast(message, type = 'success') {
    toastElement.textContent = message;
    toastElement.className = `toast show ${type}`;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toastElement.classList.remove('show'); }, 4000);
}
