/**
 * WeighReport Web Application Logic
 * Interactive client for OIML R 76 Type Evaluation Report Generator.
 */

const API_BASE = "/api/v1";
let currentReportId = null;
let currentTestId = null;
let currentTestCode = "T3.1";
let currentGridRows = [];

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
  loadReports();
  loadEquipment();
});

// View Navigation
function switchView(viewName) {
  document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));

  const targetView = document.getElementById(`view-${viewName}`);
  const targetNav = document.getElementById(`nav-${viewName}`);
  if (targetView) targetView.classList.add("active");
  if (targetNav) targetNav.classList.add("active");

  if (viewName === "dashboard") {
    loadDashboardData();
    loadReports();
  } else if (viewName === "matrix") {
    loadMatrix();
  } else if (viewName === "equipment") {
    loadEquipment();
  } else if (viewName === "workspace") {
    if (!currentReportId) {
      // Pick first report if none open
      fetch(`${API_BASE}/reports`)
        .then(res => res.json())
        .then(reports => {
          if (reports.length > 0) {
            openWorkspace(reports[0].id);
          }
        });
    }
  }
}

// Workspace Subtabs
function switchWsTab(tabName) {
  document.querySelectorAll(".wstab-content").forEach(el => el.style.display = "none");
  document.querySelectorAll(".ws-tab-btn").forEach(el => el.classList.remove("active"));

  const targetContent = document.getElementById(`wstab-content-${tabName}`);
  const targetBtn = document.getElementById(`wstab-btn-${tabName}`);
  if (targetContent) targetContent.style.display = "block";
  if (targetBtn) targetBtn.classList.add("active");

  if (tabName === "reports") {
    loadArtifacts();
  } else if (tabName === "checklist") {
    loadChecklist();
  }
}

// 1. Dashboard & Reports
async function loadDashboardData() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/kpis`);
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById("kpi-total").innerText = data.total_reports;
    document.getElementById("kpi-in-progress").innerText = data.in_progress_count;
    document.getElementById("kpi-passed").innerText = data.passed_count;
    document.getElementById("kpi-failed").innerText = data.failed_count;
    document.getElementById("kpi-finalised").innerText = data.finalised_count;
  } catch (err) {
    console.error("Failed to load KPIs", err);
  }
}

async function loadReports() {
  try {
    const q = document.getElementById("filter-search").value;
    const verdict = document.getElementById("filter-verdict").value;
    const status = document.getElementById("filter-status").value;

    let url = `${API_BASE}/reports?`;
    if (verdict) url += `verdict=${verdict}&`;
    if (status) url += `status=${status}&`;

    const res = await fetch(url);
    const reports = await res.json();
    const tbody = document.getElementById("reports-table-body");
    tbody.innerHTML = "";

    reports.forEach(r => {
      const tr = document.createElement("tr");
      const vClass = `badge-${r.verdict}`;
      const inst = r.instrument || {};
      const maxVal = inst.Max || "15000";
      const eVal = inst.e || "5";
      const unit = inst.unit || "g";

      tr.innerHTML = `
        <td><b>${r.application_id || r.id.substring(0, 8)}</b></td>
        <td>${inst.type_designation || "APX-3000 Series"}</td>
        <td>Class ${inst.accuracy_class || "III"}</td>
        <td>${maxVal} ${unit} / ${eVal} ${unit}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="flex: 1; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="width: ${r.progress_pct}%; background: var(--accent-blue); height: 100%;"></div>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${r.progress_pct}%</span>
          </div>
        </td>
        <td><span class="badge badge-${r.status}">${r.status.replace('_', ' ')}</span></td>
        <td><span class="badge ${vClass}">${r.verdict}</span></td>
        <td>
          <button class="btn-primary" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="openWorkspace('${r.id}')">Open</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load reports", err);
  }
}

// 2. Pass / Fail Matrix (FR-DSH-3)
async function loadMatrix() {
  try {
    const verdict = document.getElementById("matrix-verdict-filter").value;
    let url = `${API_BASE}/dashboard/pass-fail-matrix`;
    if (verdict) url += `?verdict=${verdict}`;

    const res = await fetch(url);
    const matrix = await res.json();
    const tbody = document.getElementById("matrix-table-body");
    tbody.innerHTML = "";

    const testCols = ["T1", "T2", "T3.1", "T3.2", "T4.1.1", "T5", "T6.1", "T6.2", "T7", "T8", "T9", "T10", "T11", "T12.1", "T13a", "T14", "T15"];

    matrix.forEach(row => {
      const tr = document.createElement("tr");
      let cellsHtml = `
        <td style="position: sticky; left: 0; background: #131b2e; font-weight: 600;">
          <a href="javascript:void(0)" onclick="openWorkspace('${row.report_id}')" style="color: var(--accent-cyan); text-decoration: none;">
            ${row.application_no}
          </a>
        </td>
        <td>${row.type_designation}</td>
        <td>${row.accuracy_class}</td>
        <td><span class="badge badge-${row.overall_verdict}">${row.overall_verdict}</span></td>
      `;

      testCols.forEach(col => {
        const v = row.cells[col] || "incomplete";
        const vClass = `badge-${v}`;
        cellsHtml += `<td><span class="badge ${vClass}" style="cursor: pointer;" onclick="openWorkspaceAndTest('${row.report_id}', '${col}')">${v.substring(0, 4)}</span></td>`;
      });

      tr.innerHTML = cellsHtml;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load matrix", err);
  }
}

// 3. Report Workspace
async function openWorkspace(reportId) {
  currentReportId = reportId;
  switchView("workspace");

  try {
    const res = await fetch(`${API_BASE}/reports/${reportId}`);
    const rep = await res.json();

    document.getElementById("ws-app-no").innerText = rep.application_no || rep.id;
    document.getElementById("ws-type-name").innerText = rep.type_designation;
    document.getElementById("ws-class").innerText = `Class ${rep.instrument.accuracy_class || 'III'}`;
    document.getElementById("ws-max").innerText = `${rep.instrument.Max || '15000'} ${rep.instrument.unit || 'g'}`;
    document.getElementById("ws-e").innerText = `${rep.instrument.e || '5'} ${rep.instrument.unit || 'g'}`;
    document.getElementById("ws-progress").innerText = `${rep.progress_pct}%`;

    const statusBadge = document.getElementById("ws-status-badge");
    statusBadge.innerText = rep.status.replace("_", " ").toUpperCase();
    statusBadge.className = `badge badge-${rep.status}`;

    const verdictBadge = document.getElementById("ws-verdict-badge");
    verdictBadge.innerText = rep.verdict.toUpperCase();
    verdictBadge.className = `badge badge-${rep.verdict}`;

    // Populate instrument form
    document.getElementById("inst-class").value = rep.instrument.accuracy_class || "III";
    document.getElementById("inst-max").value = rep.instrument.Max || "15000";
    document.getElementById("inst-min").value = rep.instrument.Min || "100";
    document.getElementById("inst-e").value = rep.instrument.e || "5";
    document.getElementById("inst-d").value = rep.instrument.d || "5";
    document.getElementById("inst-temp-range").value = rep.instrument.temperature_range || "-10 °C / +40 °C";

    // Load selected test
    await loadSelectedTest();
  } catch (err) {
    console.error("Failed to load report workspace", err);
  }
}

function openWorkspaceAndTest(reportId, testCode) {
  currentReportId = reportId;
  currentTestCode = testCode;
  document.getElementById("test-selector").value = testCode;
  openWorkspace(reportId);
}

// 4. Test Forms & Calculations
async function loadSelectedTest() {
  if (!currentReportId) return;
  const testCode = document.getElementById("test-selector").value;
  currentTestCode = testCode;

  try {
    // Get test instance for current report and testCode
    const repRes = await fetch(`${API_BASE}/reports/${currentReportId}`);
    const repData = await repRes.json();
    const testMatch = repData.tests.find(t => t.test_code === testCode);

    if (!testMatch) {
      alert(`Test ${testCode} not found in this report.`);
      return;
    }
    currentTestId = testMatch.id;

    const tRes = await fetch(`${API_BASE}/tests/${currentTestId}`);
    const testData = await tRes.json();

    currentGridRows = testData.results.rows || testData.data.rows || [];
    if (currentGridRows.length === 0 && testCode === "T3.1") {
      // Default T3.1 structure
      currentGridRows = [
        { loc: 1, kind: "zero", L: "0", I: "0", dL: "0.5", P: "2.0", E: "2.0", E0: "2.0", Ec: "0", pass: true },
        { loc: 1, kind: "load", L: "5000", I: "5005", dL: "0.5", P: "5007.0", E: "7.0", E0: "2.0", Ec: "5.0", mpe: "5.0", pass: true },
        { loc: 2, kind: "zero", L: "0", I: "0", dL: "0.5", P: "2.0", E: "2.0", E0: "2.0", Ec: "0", pass: true },
        { loc: 2, kind: "load", L: "5000", I: "5005", dL: "0.5", P: "5007.0", E: "7.0", E0: "2.0", Ec: "5.0", mpe: "5.0", pass: true },
        { loc: 3, kind: "zero", L: "0", I: "0", dL: "0.5", P: "2.0", E: "2.0", E0: "2.0", Ec: "0", pass: true },
        { loc: 3, kind: "load", L: "5000", I: "5010", dL: "0.5", P: "5012.0", E: "12.0", E0: "2.0", Ec: "10.0", mpe: "5.0", pass: false },
        { loc: 4, kind: "zero", L: "0", I: "0", dL: "0.5", P: "2.0", E: "2.0", E0: "2.0", Ec: "0", pass: true },
        { loc: 4, kind: "load", L: "5000", I: "5005", dL: "0.5", P: "5007.0", E: "7.0", E0: "2.0", Ec: "5.0", mpe: "5.0", pass: true },
      ];
    }

    renderTestGrid(currentGridRows);
    updateResultPanel(testData.verdict, testData.results.metrics);
  } catch (err) {
    console.error("Failed to load test instance", err);
  }
}

function renderTestGrid(rows) {
  const tbody = document.getElementById("test-grid-body");
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    const isPass = r.pass !== false;
    if (!isPass) tr.classList.add("row-fail");

    const passBadge = isPass ? '<span class="badge badge-passed">PASS</span>' : '<span class="badge badge-failed">FAIL</span>';

    tr.innerHTML = `
      <td>${r.loc || idx + 1}</td>
      <td><span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">${r.kind || 'load'}</span></td>
      <td><input type="text" class="input-ctrl" style="width: 75px;" value="${r.L || '0'}" oninput="handleGridInput(${idx}, 'L', this.value)"></td>
      <td><input type="text" class="input-ctrl" style="width: 75px;" value="${r.I || '0'}" oninput="handleGridInput(${idx}, 'I', this.value)"></td>
      <td><input type="text" class="input-ctrl" style="width: 65px;" value="${r.dL || '0.5'}" oninput="handleGridInput(${idx}, 'dL', this.value)"></td>
      <td style="color: var(--text-muted);">${r.P || '-'}</td>
      <td style="color: var(--text-muted);">${r.E || '-'}</td>
      <td style="color: var(--text-muted);">${r.E0 || '-'}</td>
      <td><b>${r.Ec || '-'}</b></td>
      <td style="color: var(--accent-cyan);">${r.mpe ? '±' + r.mpe : '-'}</td>
      <td>${passBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

function handleGridInput(rowIndex, field, value) {
  if (currentGridRows[rowIndex]) {
    currentGridRows[rowIndex][field] = value;
  }
  // Debounce live calculation
  debounceLiveCalc();
}

let calcTimer = null;
function debounceLiveCalc() {
  clearTimeout(calcTimer);
  calcTimer = setTimeout(runLiveCalcPreview, 200);
}

async function runLiveCalcPreview() {
  const inst = {
    accuracy_class: document.getElementById("inst-class").value,
    Max: document.getElementById("inst-max").value,
    e: document.getElementById("inst-e").value,
    d: document.getElementById("inst-d").value,
    unit: "g"
  };

  const payload = {
    header: { e: inst.e, d: inst.d },
    data: { rows: currentGridRows }
  };

  try {
    const res = await fetch(`${API_BASE}/tests/calc/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        test_code: currentTestCode,
        instrument: inst,
        test_payload: payload
      })
    });
    if (!res.ok) return;
    const calcData = await res.json();
    currentGridRows = calcData.results.rows;
    renderTestGrid(currentGridRows);
    updateResultPanel(calcData.verdict, calcData.results.metrics);
  } catch (err) {
    console.error("Live preview failed", err);
  }
}

function updateResultPanel(verdict, metrics) {
  const vNorm = (verdict || "incomplete").toLowerCase();
  const vChip = document.getElementById("test-verdict-chip");
  vChip.innerText = vNorm.toUpperCase();
  vChip.className = `badge badge-${vNorm}`;

  const banner = document.getElementById("verdict-banner-box");
  const bannerText = document.getElementById("verdict-banner-text");
  banner.className = `verdict-box ${vNorm}`;
  bannerText.innerText = vNorm === "passed" ? "TEST PASSED" : (vNorm === "failed" ? "TEST FAILED" : "TEST INCOMPLETE");

  if (metrics) {
    document.getElementById("rule-max-ec").innerText = `${metrics.max_abs_Ec || '-'} g`;
    document.getElementById("rule-margin").innerText = `${metrics.min_margin || '-'} g`;
  }
}

// Acceptance Test AT-01 Demo Buttons
function simulateAT01Failure() {
  // Set location 3 indication to 5010 g (causing Ec = 10.0 g > mpe 5.0 g)
  if (currentGridRows.length >= 6) {
    currentGridRows[5].I = "5010";
    currentGridRows[5].L = "5000";
    currentGridRows[5].dL = "0.5";
  }
  runLiveCalcPreview();
}

function restorePassingData() {
  // Set location 3 indication back to 5005 g (Ec = 5.0 g <= mpe 5.0 g)
  if (currentGridRows.length >= 6) {
    currentGridRows[5].I = "5005";
    currentGridRows[5].L = "5000";
    currentGridRows[5].dL = "0.5";
  }
  runLiveCalcPreview();
}

async function saveTestObservations() {
  if (!currentTestId) return;
  try {
    const res = await fetch(`${API_BASE}/tests/${currentTestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { rows: currentGridRows }
      })
    });
    const data = await res.json();
    alert(`Observations saved! Test verdict: ${data.verdict.toUpperCase()}.\nReport overall verdict: ${data.report.verdict.toUpperCase()}.`);
    openWorkspace(currentReportId);
  } catch (err) {
    alert("Error saving observations: " + err);
  }
}

function addGridRow() {
  currentGridRows.push({
    loc: currentGridRows.length + 1,
    kind: "load",
    L: "5000",
    I: "5000",
    dL: "0.5"
  });
  renderTestGrid(currentGridRows);
  runLiveCalcPreview();
}

// 5. Checklist Module
async function loadChecklist() {
  if (!currentReportId) return;
  try {
    const res = await fetch(`${API_BASE}/reports/${currentReportId}/checklist`);
    const items = await res.json();
    const tbody = document.getElementById("checklist-table-body");
    tbody.innerHTML = "";

    items.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${c.clause || '-'}</b></td>
        <td>${c.text_en}</td>
        <td>
          <select class="input-ctrl" onchange="updateChecklistItem('${c.item_key}', this.value)">
            <option value="passed" ${c.result === 'passed' ? 'selected' : ''}>Passed</option>
            <option value="failed" ${c.result === 'failed' ? 'selected' : ''}>Failed</option>
            <option value="na" ${c.result === 'na' ? 'selected' : ''}>N/A</option>
          </select>
        </td>
        <td><input type="text" class="input-ctrl" style="width: 100%;" value="${c.remarks || ''}" placeholder="Remarks" onchange="updateChecklistItemRemarks('${c.item_key}', this.value)"></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load checklist", err);
  }
}

async function updateChecklistItem(itemKey, result) {
  if (!currentReportId) return;
  await fetch(`${API_BASE}/reports/${currentReportId}/checklist/${encodeURIComponent(itemKey)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_key: itemKey, result: result })
  });
  openWorkspace(currentReportId);
}

async function updateChecklistItemRemarks(itemKey, remarks) {
  if (!currentReportId) return;
  await fetch(`${API_BASE}/reports/${currentReportId}/checklist/${encodeURIComponent(itemKey)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_key: itemKey, result: "passed", remarks: remarks })
  });
}

// 6. Report Generation Pipeline (PDF & DOCX)
async function generateDocument(kind, format) {
  if (!currentReportId) {
    alert("Please select an active report.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/reports/${currentReportId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: kind, format: format })
    });
    if (!res.ok) {
      alert("Generation failed: " + res.statusText);
      return;
    }
    const data = await res.json();
    alert(`Success! Generated ${data.kind.toUpperCase()} report in ${data.format.toUpperCase()} format.\nOverall Verdict: ${data.overall_verdict.toUpperCase()}`);
    loadArtifacts();
  } catch (err) {
    alert("Generation error: " + err);
  }
}

async function loadArtifacts() {
  if (!currentReportId) return;
  try {
    const res = await fetch(`${API_BASE}/reports/${currentReportId}/artifacts`);
    const artifacts = await res.json();
    const tbody = document.getElementById("artifacts-table-body");
    tbody.innerHTML = "";

    artifacts.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${a.kind.toUpperCase()} Report</b></td>
        <td><span class="badge ${a.format === 'pdf' ? 'badge-failed' : 'badge-passed'}">${a.format.toUpperCase()}</span></td>
        <td><code>${a.file_name}</code></td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${new Date(a.generated_at).toLocaleString()}</td>
        <td>
          <a class="btn-primary" style="padding: 0.3rem 0.75rem; text-decoration: none; font-size: 0.75rem;" href="${a.download_url}" target="_blank">
            Download ${a.format.toUpperCase()}
          </a>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load artifacts", err);
  }
}

// 7. Equipment Register
async function loadEquipment() {
  try {
    const res = await fetch(`${API_BASE}/equipment`);
    const equipment = await res.json();
    const tbody = document.getElementById("equipment-table-body");
    tbody.innerHTML = "";

    equipment.forEach(eq => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${eq.name}</b></td>
        <td>${eq.category}</td>
        <td>${eq.manufacturer || '-'} ${eq.model || ''}</td>
        <td><code>${eq.serial_no || '-'}</code></td>
        <td>${eq.cert_no || '-'}</td>
        <td style="color: var(--status-pass); font-weight: 600;">${eq.cal_valid_until || '-'}</td>
        <td>${eq.traceability || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load equipment", err);
  }
}
