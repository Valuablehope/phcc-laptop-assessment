const form            = document.getElementById('assessmentForm');
const btnSaveLocally  = document.getElementById('btnSaveLocally');
const btnSubmitSheets = document.getElementById('btnSubmitSheets');
const statusText      = document.getElementById('statusText');
const toastElement    = document.getElementById('toast');

const DRAFT_KEY   = 'phcc_draft';
const RECORDS_KEY = 'phcc_records';

const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxIfiDWiR3NA9gkeCYs21OW3C40u0nEG7pQYkNo7ypmelO1y6YWNatB29y9eMCYQ_Yo/exec';

const SUBMIT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

// ── INIT ─────────────────────────────────────────────────────────────────────

const phccSections = document.querySelectorAll('.phcc-section');
const hospitalSections = document.querySelectorAll('.hospital-section');
const facilityNameLabel = document.getElementById('facilityNameLabel');
const phccNameInput = document.getElementById('phccName');
const hospitalDetailsContainer = document.getElementById('hospitalDetailsContainer');
const pageTitle = document.getElementById('pageTitle');
const mainTitle = document.getElementById('mainTitle');
const subTitle = document.getElementById('subTitle');

function updateHospitalSectionNumbers() {
    const sections = hospitalDetailsContainer.querySelectorAll('section.card');
    sections.forEach((sec, index) => {
        const badge = sec.querySelector('.section-badge');
        if (badge) badge.textContent = 3 + index;
    });
}

function updateFacilityTypeView() {
    const facilityType = document.querySelector('input[name="facilityType"]:checked').value;
    if (facilityType === 'Hospital') {
        phccSections.forEach(el => el.classList.add('hidden'));
        hospitalSections.forEach(el => el.classList.remove('hidden'));
        facilityNameLabel.textContent = 'Hospital Name';
        phccNameInput.placeholder = 'Enter Hospital name…';
        phccNameInput.removeAttribute('list');
        
        pageTitle.textContent = 'Laptop Assessment — Hospital';
        mainTitle.textContent = 'Hospital Laptop Assessment';
        subTitle.textContent = 'Hospitals — Equipment Needs Survey';
    } else {
        phccSections.forEach(el => el.classList.remove('hidden'));
        hospitalSections.forEach(el => el.classList.add('hidden'));
        facilityNameLabel.textContent = 'PHCC Name';
        phccNameInput.placeholder = 'Type to search…';
        phccNameInput.setAttribute('list', 'phccList');
        
        pageTitle.textContent = 'Laptop Assessment — PHCC';
        mainTitle.textContent = 'PHCC Laptop Assessment';
        subTitle.textContent = 'Primary Healthcare Centers — Equipment Needs Survey';
    }
}

document.querySelectorAll('input[name="facilityType"]').forEach(radio => {
    radio.addEventListener('change', updateFacilityTypeView);
});

document.querySelectorAll('input[name="departments"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const deptName = e.target.value;
        const prefix = deptName.replace(/\s+/g, '').toLowerCase();
        const deptId = `dept-${prefix}`;

        if (e.target.checked) {
            if (!document.getElementById(deptId)) {
                const section = document.createElement('section');
                section.className = 'card';
                section.id = deptId;
                section.innerHTML = `
                    <div class="card-header">
                        <span class="section-badge">H</span>
                        <div>
                            <h2>${deptName}</h2>
                            <p class="section-desc">Laptop inventory for ${deptName}</p>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="${prefix}ReqPhenics">Staff requiring PHENICS access</label>
                                <input type="number" id="${prefix}ReqPhenics" name="${prefix}ReqPhenics" min="0" placeholder="0">
                            </div>
                            <div class="form-group">
                                <label for="${prefix}Available">Laptops available</label>
                                <input type="number" id="${prefix}Available" name="${prefix}Available" min="0" placeholder="0">
                            </div>
                            <div class="form-group">
                                <label for="${prefix}AdditionalNeeded">Additional laptops needed</label>
                                <input type="number" id="${prefix}AdditionalNeeded" name="${prefix}AdditionalNeeded" min="0" placeholder="0">
                            </div>
                        </div>
                        <div class="form-group form-group--last">
                            <label for="${prefix}Comments">Comments / Remarks</label>
                            <textarea id="${prefix}Comments" name="${prefix}Comments" rows="3" placeholder="Optional notes…"></textarea>
                        </div>
                    </div>
                `;
                hospitalDetailsContainer.appendChild(section);
                updateHospitalSectionNumbers();
                
                try {
                    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
                    if (draft) {
                        const inputs = section.querySelectorAll('input, textarea');
                        inputs.forEach(input => {
                            if (draft[input.name]) {
                                input.value = draft[input.name];
                            }
                        });
                    }
                } catch {}
            }
        } else {
            const section = document.getElementById(deptId);
            if (section) {
                section.remove();
                updateHospitalSectionNumbers();
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    loadDraft();
    updateFacilityTypeView();
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
    const fd = new FormData(form);
    for (const [k, v] of fd.entries()) {
        if (data[k] !== undefined) {
            if (!Array.isArray(data[k])) {
                data[k] = [data[k]];
            }
            data[k].push(v);
        } else {
            data[k] = v;
        }
    }
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
            if (key === 'departments') {
                const values = Array.isArray(val) ? val : [val];
                values.forEach(v => {
                    const el = form.querySelector(`input[name="${key}"][value="${v}"]`);
                    if (el) {
                       el.checked = true;
                       el.dispatchEvent(new Event('change'));
                    }
                });
            } else {
                const el = form.elements[key];
                if (el) {
                    if (el instanceof NodeList || el instanceof HTMLCollection) {
                        el.value = val;
                    } else {
                        el.value = val;
                    }
                }
            }
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
