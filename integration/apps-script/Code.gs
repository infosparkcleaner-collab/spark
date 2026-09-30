/**
 * Spark enquiry endpoint
 * ----------------------
 * Paste this whole file into the Apps Script editor and deploy it as a web
 * app. Each enquiry from the website form does two things:
 *
 *   1. it is written to the sheet below, and
 *   2. it is emailed to ADMIN_EMAIL, through the Google account that owns
 *      this script, with Reply-To set to the person who enquired.
 *
 * Nobody who fills in the form is emailed. There is no Mailgun and no
 * Script Property to set. A free Google account can send about 100
 * messages a day this way.
 *
 * Deploy > New deployment > Web app
 *   Execute as:     Me
 *   Who has access: Anyone
 */

/* ========================= CONFIG ========================= */

var SHEET_ID = '14QeG934ncsTFJbg34De3kirlRwQDeZgbfiewtuR7pEs';
var SHEET_TAB = 'Enquiries';

/* Where each new enquiry is emailed. */
var ADMIN_EMAIL = 'info.sparkcleaner@gmail.com';

/* Set the same string as ENQUIRY_TOKEN in js/site.js to stop drive-by
   posting. Left empty, no token is required. */
var FORM_TOKEN = '';

/* ========================================================== */

var HEADERS = [
  'Received', 'Name', 'Email', 'Phone', 'Company', 'Enquiry type', 'Message', 'Source'
];

/** The form posts text/plain so the request stays "simple". Apps Script has
 *  no OPTIONS handler and cannot answer the preflight an application/json
 *  body would trigger. The body is JSON either way. */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (FORM_TOKEN && body.token !== FORM_TOKEN) {
      return reply(403, { ok: false, error: 'bad token' });
    }

    // Bots fill hidden fields; people never see this one.
    if (body.website) return reply(200, { ok: true, skipped: 'honeypot' });

    var enquiry = {
      name: clean(body.name, 120),
      email: clean(body.email, 160),
      phone: cleanPhone(body.phone),
      company: clean(body.company, 160),
      type: clean(body.enquiryType, 60),
      message: clean(body.message, 4000),
      source: clean(body.source, 200)
    };

    if (!enquiry.name || !enquiry.message || !isEmail(enquiry.email)) {
      return reply(400, { ok: false, error: 'name, a valid email and a message are required' });
    }

    appendRow(enquiry);

    // The row is the record of truth. The email is an extra on top, so an
    // email fault is reported but never loses the enquiry.
    return reply(200, { ok: true, mail: notifyAdmin(enquiry) });

  } catch (err) {
    console.error('enquiry failed', err);
    return reply(500, {
      ok: false,
      error: 'could not record the enquiry',
      reason: message(err)
    });
  }
}

/** A GET is only a health check. ?check=1 reports state and never returns
 *  a stored value or any address. */
function doGet(e) {
  if (!(e && e.parameter && e.parameter.check)) {
    return reply(200, { ok: true, service: 'spark-enquiry' });
  }

  var sheet, sheetReady = false;
  try {
    sheet = 'ok: "' + SpreadsheetApp.openById(SHEET_ID).getName() + '"';
    sheetReady = true;
  } catch (err) {
    sheet = 'cannot open: ' + message(err);
  }

  // How many more emails can go out today. Not available until the script
  // has been authorized to send mail (run testAdminEmail once).
  var quotaLeft;
  try { quotaLeft = MailApp.getRemainingDailyQuota(); } catch (err) { quotaLeft = 'not authorized yet'; }

  return reply(200, {
    ok: sheetReady,
    sheetReady: sheetReady,
    sheet: sheet,
    tab: SHEET_TAB,
    adminNotification: 'gmail',
    gmailQuotaLeftToday: quotaLeft
  });
}

/* ---------------------------------------------------------------- sheet */

function appendRow(enquiry) {
  var book = SpreadsheetApp.openById(SHEET_ID);
  var sheet = book.getSheetByName(SHEET_TAB) || book.insertSheet(SHEET_TAB);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Everything but the timestamp is text. Without this Sheets reads a
    // leading + or - as a formula, which is why "+91 98200 11223" landed
    // in the sheet as an error.
    sheet.getRange(2, 2, sheet.getMaxRows() - 1, HEADERS.length - 1)
         .setNumberFormat('@');
  }

  var row = sheet.getLastRow() + 1;

  // Format before writing: the format decides how the value is parsed.
  sheet.getRange(row, 2, 1, HEADERS.length - 1).setNumberFormat('@');
  sheet.getRange(row, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');

  sheet.getRange(row, 1, 1, HEADERS.length).setValues([[
    new Date(),
    enquiry.name,
    enquiry.email,
    enquiry.phone,
    enquiry.company,
    enquiry.type,
    enquiry.message,
    enquiry.source
  ]]);
}

/* ----------------------------------------------------------------- mail */

/** The one email this script sends: a notification to ADMIN_EMAIL.
 *  Returns { sent, error } and never throws. */
function notifyAdmin(enquiry) {
  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      replyTo: enquiry.email,
      name: 'Spark website',
      subject: 'Spark enquiry — ' + enquiry.name + (enquiry.company ? ' (' + enquiry.company + ')' : ''),
      body: [
        'New enquiry from the Spark site. Reply to this mail to answer them directly.',
        '',
        line('Name', enquiry.name),
        line('Email', enquiry.email),
        line('Phone', enquiry.phone),
        line('Company', enquiry.company),
        line('Enquiry', enquiry.type),
        line('Page', enquiry.source),
        '',
        'Message:',
        enquiry.message,
        '',
        '--',
        'All enquiries: https://docs.google.com/spreadsheets/d/' + SHEET_ID
      ].filter(notNull).join('\n')
    });
    return { sent: true, error: null };
  } catch (err) {
    console.error('admin email failed', err);
    return { sent: false, error: message(err) };
  }
}

/* ---------------------------------------------------------------- utils */

function clean(v, max) {
  var out = String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  // A leading = would run if the sheet is exported to CSV or a column is
  // reformatted later, so it is quoted. Plus and minus are left alone:
  // they are ordinary in phone numbers and the text format handles them.
  return /^=/.test(out) ? "'" + out : out;
}

/** Stores the number without its leading sign: +91 98200 11223 becomes
 *  91 98200 11223. The cell stays text-formatted regardless, which keeps a
 *  leading zero and stops a long number turning into scientific notation. */
function cleanPhone(v) {
  return clean(v, 60).replace(/^[+\-\s]+/, '');
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function line(label, value) {
  return value ? label + ': ' + value : null;
}

function notNull(v) {
  return v !== null;
}

function message(err) {
  return String(err && err.message ? err.message : err).slice(0, 300);
}

function reply(status, payload) {
  payload.status = status;
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ----------------------------------------------------------------- test */

/** Run this once from the editor. It writes one row, sends nothing, and
 *  triggers the permission prompt Google shows the first time. */
function testSheet() {
  appendRow({
    name: 'Test row',
    email: 'test@example.com',
    phone: '',
    company: 'Sheet check',
    type: 'technical',
    message: 'Written by testSheet(). Safe to delete.',
    source: 'testSheet()'
  });
  return 'row written to "' + SpreadsheetApp.openById(SHEET_ID).getName() + '"';
}

/** Run this once after pasting the script. It sends one sample notification
 *  to ADMIN_EMAIL and writes nothing to the sheet. It also triggers the
 *  permission prompt for sending mail, which you must approve before
 *  deploying. */
function testAdminEmail() {
  var out = notifyAdmin({
    name: 'Test Enquiry',
    email: ADMIN_EMAIL,
    phone: '',
    company: 'Notification check',
    type: 'technical',
    message: 'Sent by testAdminEmail(). If you can read this, new enquiries will reach you.',
    source: 'testAdminEmail()'
  });
  if (!out.sent) throw new Error(out.error || 'the email was not sent');
  return 'notification sent to ' + ADMIN_EMAIL;
}

/** Writes a row and sends the notification, exactly as a real enquiry does. */
function selfTest() {
  var enquiry = {
    name: 'Test Enquiry',
    email: ADMIN_EMAIL,
    phone: '',
    company: 'Self test',
    type: 'technical',
    message: 'Self test from the Apps Script editor.',
    source: 'selfTest()'
  };
  appendRow(enquiry);
  return notifyAdmin(enquiry);
}
