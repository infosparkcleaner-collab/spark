/**
 * Spark enquiry endpoint
 * ----------------------
 * Paste this whole file into the Apps Script editor, deploy as a web app,
 * and it works. The sheet id is set below, so no Script Properties are
 * needed to start recording enquiries.
 *
 * Email is optional and stays off until you configure it. Add these in
 * Project Settings > Script Properties whenever Mailgun is ready and mail
 * starts sending with no change to this file:
 *
 *   MAILGUN_KEY      Mailgun private API key
 *   MAILGUN_DOMAIN   sending domain, e.g. mg.example.com
 *   MAILGUN_REGION   us | eu            (default us)
 *   MAIL_FROM        Spark <enquiries@mg.example.com>
 *   ADMIN_EMAIL      where the notification goes
 *
 * The Mailgun key belongs in Script Properties, never in this file.
 *
 * Deploy > New deployment > Web app
 *   Execute as:     Me
 *   Who has access: Anyone
 */

/* ========================= CONFIG ========================= */

var SHEET_ID = '14QeG934ncsTFJbg34De3kirlRwQDeZgbfiewtuR7pEs';
var SHEET_TAB = 'Enquiries';

/* Set the same string as ENQUIRY_TOKEN in js/site.js to stop drive-by
   posting. Left empty, no token is required. */
var FORM_TOKEN = '';

/* ========================================================== */

var PROPS = PropertiesService.getScriptProperties();

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
      phone: clean(body.phone, 60),
      company: clean(body.company, 160),
      type: clean(body.enquiryType, 60),
      message: clean(body.message, 4000),
      source: clean(body.source, 200)
    };

    if (!enquiry.name || !enquiry.message || !isEmail(enquiry.email)) {
      return reply(400, { ok: false, error: 'name, a valid email and a message are required' });
    }

    appendRow(enquiry);

    // The row is the record of truth. Mail is an extra on top, so a mail
    // fault is reported but never loses the enquiry.
    return reply(200, { ok: true, mail: sendMail(enquiry) });

  } catch (err) {
    console.error('enquiry failed', err);
    return reply(500, {
      ok: false,
      error: 'could not record the enquiry',
      reason: message(err)
    });
  }
}

/** A GET is only a health check. ?check=1 reports configuration state as
 *  booleans and never returns a stored value, so no key can leak. */
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

  var need = ['MAILGUN_KEY', 'MAILGUN_DOMAIN', 'MAIL_FROM', 'ADMIN_EMAIL'];
  var set = {};
  need.concat(['MAILGUN_REGION']).forEach(function (k) { set[k] = !!PROPS.getProperty(k); });
  var missingMail = need.filter(function (k) { return !set[k]; });

  return reply(200, {
    ok: sheetReady,
    sheetReady: sheetReady,
    sheet: sheet,
    tab: SHEET_TAB,
    mailReady: missingMail.length === 0,
    missingForMail: missingMail,
    mailProperties: set
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
  }

  sheet.appendRow([
    new Date(),
    enquiry.name,
    enquiry.email,
    enquiry.phone,
    enquiry.company,
    enquiry.type,
    enquiry.message,
    enquiry.source
  ]);
}

/* ----------------------------------------------------------------- mail */

/** Sends nothing and says why until Mailgun is configured. */
function sendMail(enquiry) {
  var key = PROPS.getProperty('MAILGUN_KEY');
  var domain = PROPS.getProperty('MAILGUN_DOMAIN');
  var from = PROPS.getProperty('MAIL_FROM');
  var admin = PROPS.getProperty('ADMIN_EMAIL');

  if (!key || !domain || !from || !admin) {
    return { sent: false, skipped: 'mailgun not configured' };
  }

  var out = { sent: false, confirmation: false, notification: false, error: null };
  try {
    mailgun(key, domain, {
      from: from,
      to: enquiry.name + ' <' + enquiry.email + '>',
      subject: 'We have your enquiry — Spark Brake & Parts Cleaner',
      text: [
        'Hi ' + enquiry.name + ',',
        '',
        'Thanks for getting in touch about Spark. Your enquiry is with us and',
        'we usually reply within two working days.',
        '',
        line('Enquiry', enquiry.type),
        line('Company', enquiry.company),
        line('Phone', enquiry.phone),
        '',
        enquiry.message,
        '',
        '--',
        'Spark Brake & Parts Cleaner',
        'Professional strength, 550 ml. Non-chlorinated, low VOC.'
      ].filter(notNull).join('\n')
    });
    out.confirmation = true;

    mailgun(key, domain, {
      from: from,
      to: admin,
      'h:Reply-To': enquiry.name + ' <' + enquiry.email + '>',
      subject: 'Spark enquiry — ' + enquiry.name + (enquiry.company ? ' (' + enquiry.company + ')' : ''),
      text: [
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
        enquiry.message
      ].filter(notNull).join('\n')
    });
    out.notification = true;
    out.sent = true;

  } catch (err) {
    out.error = message(err);
    console.error('mail failed', err);
  }
  return out;
}

function mailgun(key, domain, fields) {
  var host = (PROPS.getProperty('MAILGUN_REGION') || 'us').toLowerCase() === 'eu'
    ? 'api.eu.mailgun.net'
    : 'api.mailgun.net';

  var res = UrlFetchApp.fetch('https://' + host + '/v3/' + domain + '/messages', {
    method: 'post',
    headers: { Authorization: 'Basic ' + Utilities.base64Encode('api:' + key) },
    payload: fields,
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Mailgun ' + code + ': ' + res.getContentText().slice(0, 200));
  }
  return true;
}

/* ---------------------------------------------------------------- utils */

function clean(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
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

/** Once Mailgun is configured, this writes a row and sends both messages. */
function selfTest() {
  var admin = PROPS.getProperty('ADMIN_EMAIL');
  if (!admin) throw new Error('Set ADMIN_EMAIL in Script Properties first');

  var enquiry = {
    name: 'Test Enquiry',
    email: admin,
    phone: '',
    company: 'Self test',
    type: 'technical',
    message: 'Self test from the Apps Script editor.',
    source: 'selfTest()'
  };
  appendRow(enquiry);
  return sendMail(enquiry);
}
