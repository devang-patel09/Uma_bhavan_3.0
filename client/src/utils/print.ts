/**
 * Print helpers.
 *
 * Instead of calling window.print() on the live app (which prints the
 * navbar, modals, backdrop blur, etc.), each helper builds a standalone,
 * styled HTML document and prints it from a hidden iframe.
 */

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const dash = (v: unknown): string => (v === null || v === undefined || v === '' ? '—' : esc(v));

const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+', A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+', B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+', AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+', O_NEGATIVE: 'O-',
  UNKNOWN: '—',
};

const titleCase = (v: string | null | undefined): string =>
  v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : '—';

const formatDate = (d: string | Date | null | undefined): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const PRINT_CSS = `
  /* Zero page margin removes the browser's own header/footer (title, URL, date,
     page number in the corners). Spacing is restored by .page-top/.page-bottom,
     which repeat on every printed page via thead/tfoot, plus body side padding. */
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0 12mm;
    font-family: 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 11pt;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 3px solid #c2410c; padding-bottom: 8px; margin-bottom: 16px;
  }
  .org { font-size: 18pt; font-weight: 800; letter-spacing: 0.5px; color: #9a3412; }
  .org-sub { font-size: 9pt; color: #64748b; margin-top: 2px; }
  .doc-meta { text-align: right; font-size: 9pt; color: #64748b; }
  .doc-title { font-size: 13pt; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
  .code { font-family: 'Consolas', 'Courier New', monospace; font-weight: 700; color: #c2410c; }
  .badge {
    display: inline-block; padding: 1px 8px; border-radius: 999px;
    font-size: 8.5pt; font-weight: 700; border: 1px solid;
  }
  .badge-permanent { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
  .badge-nominal { color: #1d4ed8; background: #eff6ff; border-color: #bfdbfe; }
  table.page { width: 100%; border-collapse: collapse; position: relative; z-index: 1; }
  table.page > thead > tr > td, table.page > tfoot > tr > td, table.page > tbody > tr > td { padding: 0; border: 0; }
  .page-top { height: 14mm; }
  .page-bottom { height: 12mm; }
  .watermark {
    position: fixed; top: 50%; left: 50%; width: 150mm; transform: translate(-50%, -50%);
    opacity: 0.07; z-index: 0; pointer-events: none;
  }
  .details {
    display: grid; grid-template-columns: 1fr 1fr;
    border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 16px;
  }
  /* Grid lines drawn with shadows so cells stay transparent (watermark shows through);
     overflow:hidden on .details clips the outer edges. */
  .details .field { padding: 7px 10px; box-shadow: 1px 0 0 #e2e8f0, 0 1px 0 #e2e8f0; }
  .details .field.full { grid-column: 1 / -1; }
  .label { font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.4px; }
  .value { font-size: 10.5pt; font-weight: 600; margin-top: 2px; }
  table.data { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  table.data thead { display: table-header-group; }
  table.data th {
    background: rgba(255, 247, 237, 0.85); color: #9a3412; text-align: left; font-size: 8.5pt;
    text-transform: uppercase; letter-spacing: 0.3px; padding: 6px 8px; border: 1px solid #fdba74;
  }
  table.data td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
  table.data tbody tr:nth-child(even) td { background: rgba(248, 250, 252, 0.7); }
  table.data tr { page-break-inside: avoid; break-inside: avoid; }
  .num { text-align: center; }
  .muted { color: #94a3b8; }
  .section-title { font-size: 11pt; font-weight: 700; margin: 18px 0 8px; color: #0f172a; }
  .summary { margin-top: 10px; font-size: 9pt; color: #475569; }
  .doc-footer {
    margin-top: 28px; padding-top: 6px; border-top: 1px solid #e2e8f0;
    font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between;
  }
  .signature { margin-top: 48px; display: flex; justify-content: flex-end; }
  .signature div { border-top: 1px solid #475569; padding-top: 4px; width: 200px; text-align: center; font-size: 9pt; }
`;

function wrap(title: string, body: string): string {
  const printedOn = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
  <img class="watermark" src="${esc(window.location.origin)}/logo.png" alt="" />
  <table class="page">
  <thead><tr><td><div class="page-top"></div></td></tr></thead>
  <tfoot><tr><td><div class="page-bottom"></div></td></tr></tfoot>
  <tbody><tr><td>
  <div class="doc-header">
    <div>
      <div class="org">UMA BHAVAN</div>
      <div class="org-sub">Community Management System • Anand, Gujarat (388001)</div>
    </div>
    <div class="doc-meta">Printed on<br/><strong>${esc(printedOn)}</strong></div>
  </div>
  ${body}
  <div class="doc-footer">
    <span>Uma Bhavan Community Management System</span>
    <span>${esc(title)}</span>
  </div>
  </td></tr></tbody>
  </table>
</body>
</html>`;
}

/** Prints a full HTML document via a hidden iframe so the app UI is untouched. */
export function printHtml(title: string, body: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(wrap(title, body));
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener('afterprint', cleanup);

  // Wait for images (the watermark) to load, then give layout a tick before printing.
  const imagesReady = Promise.all(
    Array.from(doc.images).map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((resolve) => { img.onload = img.onerror = () => resolve(); })
    )
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
  void Promise.race([imagesReady, timeout]).then(() => {
    setTimeout(() => {
      win.focus();
      win.print();
      // Fallback for browsers that don't fire afterprint on iframes.
      setTimeout(() => iframe.isConnected && iframe.remove(), 60_000);
    }, 150);
  });
}

const typeBadge = (t: string | undefined | null) =>
  t === 'NOMINAL'
    ? '<span class="badge badge-nominal">Nominal</span>'
    : '<span class="badge badge-permanent">Permanent</span>';

// ── Firms ───────────────────────────────────────────────────────────────────

export interface PrintableFirm {
  firmCode: string;
  firmName: string;
  firmType: 'PERMANENT' | 'NOMINAL';
  familyHeadName: string | null;
  areaName: string;
  subAreaName: string | null;
  pincode: string;
  address: string;
  familiesCount: number;
}

export function printFirm(f: PrintableFirm): void {
  const body = `
    <h1 class="doc-title">Firm Details — <span class="code">${esc(f.firmCode)}</span></h1>
    <div class="details">
      <div class="field"><div class="label">Firm Code</div><div class="value code">${esc(f.firmCode)}</div></div>
      <div class="field"><div class="label">Firm Type</div><div class="value">${typeBadge(f.firmType)}</div></div>
      <div class="field"><div class="label">Firm Name</div><div class="value">${esc(f.firmName)}</div></div>
      <div class="field"><div class="label">Family Head</div><div class="value">${dash(f.familyHeadName)}</div></div>
      <div class="field"><div class="label">Area</div><div class="value">${dash(f.areaName)}</div></div>
      <div class="field"><div class="label">Sub-Area</div><div class="value">${dash(f.subAreaName)}</div></div>
      <div class="field"><div class="label">Pincode</div><div class="value">${dash(f.pincode)}</div></div>
      <div class="field"><div class="label">Associated Families</div><div class="value">${esc(f.familiesCount)}</div></div>
      <div class="field full"><div class="label">Address</div><div class="value">${dash(f.address)}</div></div>
    </div>
    <div class="signature"><div>Authorised Signature</div></div>`;
  printHtml(`Firm ${f.firmCode}`, body);
}

export function printFirmList(firms: PrintableFirm[], filterLabel?: string): void {
  const rows = firms
    .map(
      (f, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="code">${esc(f.firmCode)}</td>
        <td>${typeBadge(f.firmType)}</td>
        <td><strong>${esc(f.firmName)}</strong></td>
        <td>${dash(f.familyHeadName)}</td>
        <td>${dash(f.areaName)}${f.subAreaName ? `<br/><span class="muted">${esc(f.subAreaName)}</span>` : ''}</td>
        <td>${dash(f.address)}${f.pincode ? ` – ${esc(f.pincode)}` : ''}</td>
        <td class="num">${esc(f.familiesCount)}</td>
      </tr>`
    )
    .join('');
  const permanent = firms.filter((f) => f.firmType === 'PERMANENT').length;
  const body = `
    <h1 class="doc-title">Firm Master — List${filterLabel ? ` <span class="muted">(${esc(filterLabel)})</span>` : ''}</h1>
    <table class="data">
      <thead>
        <tr><th class="num">#</th><th>Code</th><th>Type</th><th>Firm Name</th><th>Head</th><th>Area / Sub-Area</th><th>Address</th><th class="num">Families</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="8" class="num muted">No firms to display.</td></tr>'}</tbody>
    </table>
    <div class="summary">Total firms: <strong>${firms.length}</strong> &nbsp;•&nbsp; Permanent: <strong>${permanent}</strong> &nbsp;•&nbsp; Nominal: <strong>${firms.length - permanent}</strong></div>`;
  printHtml('Firm Master List', body);
}

// ── Families ────────────────────────────────────────────────────────────────

export interface PrintableMember {
  name: string;
  dob: string;
  age: number;
  gender: string;
  mobile: string;
  bloodGroup: string;
  maritalStatus: string;
  parentalSurname?: string;
}

export interface PrintableFamily {
  memberCode: string;
  memberType: 'PERMANENT' | 'NOMINAL';
  familyId: string;
  familyHeadName: string;
  surname?: string;
  firmCode?: string;
  firmName?: string;
  homeAddress: string;
  male18PlusCount: number;
  members: PrintableMember[];
}

export function printFamily(fam: PrintableFamily): void {
  const members = fam.members ?? [];
  const rows = members
    .map(
      (m, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td><strong>${esc(m.name)}</strong></td>
        <td>${formatDate(m.dob)}</td>
        <td class="num">${esc(m.age)}</td>
        <td>${titleCase(m.gender)}</td>
        <td class="num">${esc(BLOOD_GROUP_LABELS[m.bloodGroup] ?? m.bloodGroup)}</td>
        <td>${titleCase(m.maritalStatus)}</td>
        <td>${dash(m.parentalSurname)}</td>
        <td>${dash(m.mobile)}</td>
      </tr>`
    )
    .join('');
  const firm = fam.firmName ? `${esc(fam.firmName)}${fam.firmCode ? ` (<span class="code">${esc(fam.firmCode)}</span>)` : ''}` : '—';
  const body = `
    <h1 class="doc-title">Family Record — <span class="code">${esc(fam.memberCode)}</span></h1>
    <div class="details">
      <div class="field"><div class="label">Member Code</div><div class="value code">${esc(fam.memberCode)}</div></div>
      <div class="field"><div class="label">Type</div><div class="value">${typeBadge(fam.memberType)}</div></div>
      <div class="field"><div class="label">Family ID</div><div class="value">${esc(fam.familyId)}</div></div>
      <div class="field"><div class="label">Surname</div><div class="value">${dash(fam.surname)}</div></div>
      <div class="field"><div class="label">Family Head</div><div class="value">${esc(fam.familyHeadName)}</div></div>
      <div class="field"><div class="label">Firm</div><div class="value">${firm}</div></div>
      <div class="field"><div class="label">Total Members</div><div class="value">${members.length}</div></div>
      <div class="field"><div class="label">18+ Males</div><div class="value">${esc(fam.male18PlusCount)}</div></div>
      <div class="field full"><div class="label">Home Address</div><div class="value">${dash(fam.homeAddress)}</div></div>
    </div>
    <div class="section-title">Family Members</div>
    <table class="data">
      <thead>
        <tr><th class="num">#</th><th>Name</th><th>Date of Birth</th><th class="num">Age</th><th>Gender</th><th class="num">Blood</th><th>Marital Status</th><th>Parental Surname</th><th>Mobile</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="9" class="num muted">No members added yet.</td></tr>'}</tbody>
    </table>
    <div class="signature"><div>Authorised Signature</div></div>`;
  printHtml(`Family ${fam.memberCode}`, body);
}
