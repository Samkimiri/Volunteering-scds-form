const SHEET_ID = "1vS5Waj5oVbVQiTWoIIQ8mdEQxuUy8GSr2ySbL3weNuE";
const ADMIN_EMAIL = "Samcreativegraphics7@gmail.com";
const SHEET_NAME = "Volunteer Applications";

const HEADERS = [
  "Timestamp",
  "First Name",
  "Last Name",
  "Phone",
  "Email",
  "Location",
  "Occupation",
  "Portfolio",
  "Roles",
  "Skills",
  "Experience",
  "Education",
  "Motivation",
  "Availability",
  "Hours/Week",
  "Mode",
  "Start Date",
  "Other Role",
  "Projects",
  "Referral",
  "Status"
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");

    if (payload.action === "updateStatus") {
      return updateStatus_(payload);
    }

    const sheet = getApplicationSheet_();
    const row = buildRow_(payload);

    sheet.appendRow(row);
    sendAdminNotification_(payload);
    sendApplicantConfirmation_(payload);

    return jsonResponse_({ ok: true });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === "admin") {
    return getAdminApplications_(e.parameter.token);
  }

  return jsonResponse_({ ok: true, message: "SCDS volunteer registration endpoint is running." });
}

function getAdminApplications_(token) {
  verifyAdminToken_(token);

  const sheet = getApplicationSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({ ok: true, applications: [] });
  }

  const values = sheet.getRange(1, 1, lastRow, HEADERS.length).getValues();
  const headers = values[0];
  const applications = values.slice(1).map((row, index) => {
    const record = { rowNumber: index + 2 };
    headers.forEach((header, columnIndex) => {
      const value = row[columnIndex];
      record[header] = value instanceof Date ? value.toISOString() : value;
    });
    return record;
  }).reverse();

  return jsonResponse_({ ok: true, applications });
}

function updateStatus_(payload) {
  verifyAdminToken_(payload.token);

  const rowNumber = Number(payload.rowNumber);
  const allowedStatuses = ["New", "In Review", "Accepted", "Declined", "Contacted"];
  const status = clean_(payload.status);

  if (!rowNumber || rowNumber < 2) {
    throw new Error("Invalid row number.");
  }

  if (allowedStatuses.indexOf(status) === -1) {
    throw new Error("Invalid status.");
  }

  const sheet = getApplicationSheet_();
  if (rowNumber > sheet.getLastRow()) {
    throw new Error("Application row was not found.");
  }

  const statusColumn = HEADERS.indexOf("Status") + 1;
  sheet.getRange(rowNumber, statusColumn).setValue(status);

  return jsonResponse_({ ok: true });
}

function verifyAdminToken_(token) {
  const savedToken = PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN");

  if (!savedToken) {
    throw new Error("ADMIN_TOKEN is not configured in Apps Script Properties.");
  }

  if (clean_(token) !== savedToken) {
    throw new Error("Invalid admin token.");
  }
}

function getApplicationSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function buildRow_(payload) {
  return [
    new Date(),
    clean_(payload.firstName),
    clean_(payload.lastName),
    clean_(payload.phone),
    clean_(payload.email),
    clean_(payload.location),
    clean_(payload.occupation),
    clean_(payload.portfolio),
    joinList_(payload.roles),
    clean_(payload.skills),
    clean_(payload.experience),
    clean_(payload.education),
    clean_(payload.motivation),
    joinList_(payload.availability),
    clean_(payload.hoursPerWeek),
    clean_(payload.mode),
    clean_(payload.startDate),
    clean_(payload.otherRole),
    clean_(payload.projects),
    clean_(payload.referral),
    clean_(payload.status) || "New"
  ];
}

function sendAdminNotification_(payload) {
  const name = `${clean_(payload.firstName)} ${clean_(payload.lastName)}`.trim();
  const subject = `New SCDS volunteer application: ${name || "Applicant"}`;
  const body = [
    "A new volunteer application has been submitted.",
    "",
    `Name: ${name}`,
    `Phone: ${clean_(payload.phone)}`,
    `Email: ${clean_(payload.email)}`,
    `Location: ${clean_(payload.location)}`,
    `Occupation: ${clean_(payload.occupation)}`,
    `Portfolio: ${clean_(payload.portfolio)}`,
    `Roles: ${joinList_(payload.roles)}`,
    `Skills: ${clean_(payload.skills)}`,
    `Experience: ${clean_(payload.experience)}`,
    `Education: ${clean_(payload.education)}`,
    `Availability: ${joinList_(payload.availability)}`,
    `Hours/Week: ${clean_(payload.hoursPerWeek)}`,
    `Mode: ${clean_(payload.mode)}`,
    `Start Date: ${clean_(payload.startDate)}`,
    `Other Role: ${clean_(payload.otherRole)}`,
    `Projects: ${clean_(payload.projects)}`,
    `Referral: ${clean_(payload.referral)}`
  ].join("\n");

  MailApp.sendEmail(ADMIN_EMAIL, subject, body);
}

function sendApplicantConfirmation_(payload) {
  const email = clean_(payload.email);
  if (!email) return;

  const firstName = clean_(payload.firstName) || "there";
  const subject = "SCDS volunteer application received";
  const body = [
    `Hello ${firstName},`,
    "",
    "Thank you for offering your time and skills to Sam Creative Design School.",
    "We have received your volunteer application and will contact you after reviewing your details.",
    "",
    "Warm regards,",
    "Sam Creative Design School"
  ].join("\n");

  MailApp.sendEmail(email, subject, body);
}

function joinList_(value) {
  if (Array.isArray(value)) return value.map(clean_).filter(Boolean).join(", ");
  return clean_(value);
}

function clean_(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
