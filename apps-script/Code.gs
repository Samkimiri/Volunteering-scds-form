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
    const payload = parsePayload_(e);

    if (payload.action === "updateStatus") {
      return jsonResponse_(updateStatus_(payload));
    }

    return jsonResponse_(submitApplication_(payload));
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function parsePayload_(e) {
  const contents = e && e.postData ? e.postData.contents || "" : "";

  if (e && e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  try {
    return JSON.parse(contents || "{}");
  } catch (error) {
    if (contents.indexOf("payload=") === 0) {
      return JSON.parse(decodeURIComponent(contents.slice("payload=".length).replace(/\+/g, " ")));
    }

    throw error;
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === "submit") {
    return jsonResponse_(submitApplication_(parsePayload_(e)), e.parameter.callback);
  }

  if (e && e.parameter && e.parameter.action === "admin") {
    return jsonResponse_(getAdminApplications_(e.parameter.token), e.parameter.callback);
  }

  if (e && e.parameter && e.parameter.action === "updateStatus") {
    return jsonResponse_(updateStatus_(e.parameter), e.parameter.callback);
  }

  return jsonResponse_({ ok: true, message: "SCDS volunteer registration endpoint is running." }, e && e.parameter && e.parameter.callback);
}

function submitApplication_(payload) {
  const sheet = getApplicationSheet_();
  validateApplication_(payload);
  const row = buildRow_(payload);

  sheet.appendRow(row);
  sendAdminNotification_(payload);
  sendApplicantConfirmation_(payload);

  return { ok: true };
}

function getAdminApplications_(token) {
  verifyAdminToken_(token);

  const sheet = getApplicationSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: true, applications: [] };
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

  return { ok: true, applications };
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
  const rowValues = sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const application = rowToRecord_(rowValues);

  sheet.getRange(rowNumber, statusColumn).setValue(status);
  sendApplicantStatusUpdate_(application, status);

  return { ok: true };
}

function rowToRecord_(row) {
  const record = {};
  HEADERS.forEach((header, columnIndex) => {
    record[header] = row[columnIndex];
  });
  return record;
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

function validateApplication_(payload) {
  const requiredFields = {
    firstName: "First name is required.",
    lastName: "Last name is required.",
    phone: "Phone is required.",
    email: "Email is required.",
    location: "Town / county is required.",
    occupation: "Occupation is required.",
    skills: "Key skills are required.",
    experience: "Experience is required.",
    education: "Education is required.",
    motivation: "Motivation is required.",
    hoursPerWeek: "Hours per week is required.",
    mode: "Online / in-person preference is required.",
    startDate: "Start date is required.",
    referral: "Referral source is required."
  };

  Object.keys(requiredFields).forEach((field) => {
    if (!clean_(payload[field])) {
      throw new Error(requiredFields[field]);
    }
  });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean_(payload.email))) {
    throw new Error("Enter a valid email address.");
  }

  if (!joinList_(payload.roles)) {
    throw new Error("Select at least one volunteer area.");
  }

  if (!joinList_(payload.availability)) {
    throw new Error("Select at least one availability option.");
  }
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

function sendApplicantStatusUpdate_(application, status) {
  const email = clean_(application.Email);
  if (!email) return;

  const firstName = clean_(application["First Name"]) || "there";
  const roles = clean_(application.Roles);
  const statusMessage = getStatusMessage_(status, firstName, roles);
  const subject = `SCDS volunteer application update: ${status}`;
  const body = [
    statusMessage.greeting,
    "",
    statusMessage.message,
    "",
    statusMessage.nextStep,
    "",
    "Thank you again for your interest in supporting Sam Creative Design School.",
    "",
    "Warm regards,",
    "Sam Creative Design School"
  ].join("\n");

  MailApp.sendEmail(email, subject, body);
}

function getStatusMessage_(status, firstName, roles) {
  const roleText = roles ? ` for ${roles}` : "";

  if (status === "Accepted") {
    return {
      greeting: `Congratulations ${firstName},`,
      message: `We are happy to let you know that your volunteer application${roleText} has been accepted. Your skills, motivation, and willingness to serve stood out, and we believe you can make a meaningful contribution to our learners and creative community.`,
      nextStep: "Our team will contact you with the next steps, including orientation details, scheduling, and how we can best align your strengths with current school activities."
    };
  }

  if (status === "In Review") {
    return {
      greeting: `Hello ${firstName},`,
      message: `Your volunteer application${roleText} is now in review. We are taking time to look through your background, availability, and the areas where you would like to support Sam Creative Design School.`,
      nextStep: "We will share another update once the review is complete. Thank you for your patience while we make sure each applicant is considered carefully."
    };
  }

  if (status === "Contacted") {
    return {
      greeting: `Hello ${firstName},`,
      message: `We have marked your volunteer application${roleText} as contacted. This means our team has reached out, or will be reaching out shortly, to continue the conversation about your application.`,
      nextStep: "Please check your email, phone, or messages for communication from us and respond when you are available."
    };
  }

  if (status === "Declined") {
    return {
      greeting: `Hello ${firstName},`,
      message: `Thank you for applying to volunteer with Sam Creative Design School. After reviewing your application${roleText}, we are not able to move forward with it at this time.`,
      nextStep: "This decision does not take away from the value of your willingness to serve. We encourage you to keep developing your skills and to apply again when another opportunity better matches our current needs."
    };
  }

  return {
    greeting: `Hello ${firstName},`,
    message: `Your volunteer application${roleText} has been updated to New. This means it is in our application list and ready for the next stage of review.`,
    nextStep: "We will contact you when there is another update. Thank you for your interest in supporting our students and creative programs."
  };
}

function joinList_(value) {
  if (Array.isArray(value)) return value.map(clean_).filter(Boolean).join(", ");
  return clean_(value);
}

function clean_(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function jsonResponse_(payload, callback) {
  const json = JSON.stringify(payload);
  const cleanCallback = clean_(callback);

  if (cleanCallback && /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(cleanCallback)) {
    return ContentService
      .createTextOutput(`${cleanCallback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
