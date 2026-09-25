/**
 * Spark enquiry endpoint
 * ----------------------
 * Deployed as a Google Apps Script web app. The form POSTs JSON here and
 * this does three things:
 *
 *   1. appends a row to the enquiry sheet
 *   2. sends a confirmation to the person who enquired   (Mailgun)
 *   3. sends a notification to the admin, reply-to the enquirer (Mailgun)
 *
 * Nothing secret lives in this file. Every value is read from Script
 * Properties, so the repository never carries the Mailgun key.
 *
 *   Extensions > Apps Script > Project Settings > Script Properties
 *
 *   MAILGUN_KEY      your Mailgun private API key
 *   MAILGUN_DOMAIN   the sending domain, e.g. mg.example.com
 *   MAILGUN_REGION   us | eu            (default us)
 *   MAIL_FROM        Spark <enquiries@mg.example.com>
 *   ADMIN_EMAIL      ankit.migosys@gmail.com
 *   SHEET_ID         the spreadsheet id from its URL
 *   SHEET_TAB        tab name to append to (default Enquiries)
 *   FORM_TOKEN       shared string the form sends; blocks drive-by posts
 *
 * Deploy > New deployment > Web app
 *   Execute as:       Me
 *   Who has access:   Anyone
 * Copy the /exec URL into ENQUIRY_ENDPOINT in js/site.js.
 */

var PROPS = PropertiesService.getScriptProperties();

var HEADERS = [
  'Received', 'Name', 'Email', 'Phone', 'Company', 'Enquiry type', 'Message', 'Source'
];

/** Apps Script has no OPTIONS hook, so the form posts text/plain to stay a
 *  simple request and avoid a preflight the platform cannot answer. */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    var expected = PROPS.getProperty('FORM_TOKEN');
    if (expected && body.token !== expected) {
      return reply(403, { ok: false, error: 'bad token' });
    }

    // Bots fill hidden fields; people never see this one.
    if (body.website) return reply(200, { ok: true });

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

    // The row is the record of truth. If Mailgun is down the enquiry is
    // still captured, so mail failures are reported but not fatal.
    var mail = { confirmation: false, notification: false, error: null };
    try {
      mail.confirmation = sendConfirmation(enquiry);
      mail.notification = sendNotification(enquiry);
    } catch (mailErr) {
      mail.error = String(mailErr);
      console.error('mail failed', mailErr);
    }

    return reply(200, { ok: true, mail: mail });

  } catch (err) {
    console.error('enquiry failed', err);
    // The reason is returned as well as logged. These are configuration
    // faults such as a missing property or an unauthorised sheet, never
    // anything secret, and without them this is undiagnosable from outside.
    return reply(500, {
      ok: false,
      error: 'could not record the enquiry',
      reason: String(err && err.message ? err.message : err).slice(0, 300)
    });
  }
}

/** A GET is only ever a health check — never returns stored data.
 *  ?check=1 reports which properties are set, as booleans only. It never
 *  returns a value, so the Mailgun key cannot leak through it. */
function doGet(e) {
  var check = e && e.parameter && e.parameter.check;
  if (!check) return reply(200, { ok: true, service: 'spark-enquiry' });

  var forSheet = ['SHEET_ID'];
  var forMail = ['MAILGUN_KEY', 'MAILGUN_DOMAIN', 'MAIL_FROM', 'ADMIN_EMAIL'];
  var optional = ['MAILGUN_REGION', 'SHEET_TAB', 'FORM_TOKEN'];
  var set = {};

  forSheet.concat(forMail, optional).forEach(function (k) {
    set[k] = !!PROPS.getProperty(k);
  });

  var missingSheet = forSheet.filter(function (k) { return !set[k]; });
  var missingMail = forMail.filter(function (k) { return !set[k]; });

  // Prove the sheet is reachable without writing to it.
  var sheet = 'not checked';
  if (set.SHEET_ID) {
    try {
      sheet = 'ok: "' + SpreadsheetApp.openById(PROPS.getProperty('SHEET_ID')).getName() + '"';
    } catch (err) {
      sheet = 'cannot open: ' + String(err).slice(0, 140);
    }
  }

  return reply(200, {
    ok: missingSheet.length === 0,          // the row is what must work
    sheetReady: missingSheet.length === 0,
    mailReady: missingMail.length === 0,
    missingForSheet: missingSheet,
    missingForMail: missingMail,
    propertiesSet: set,
    sheet: sheet
  });
}

/* ---------------------------------------------------------------- sheet */

function appendRow(enquiry) {
  var id = must('SHEET_ID');
  var tab = PROPS.getProperty('SHEET_TAB') || 'Enquiries';
  var book = SpreadsheetApp.openById(id);
  var sheet = book.getSheetByName(tab);

  if (!sheet) {
    sheet = book.insertSheet(tab);
  }
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

function mailgun(fields) {
  var key = must('MAILGUN_KEY');
  var domain = must('MAILGUN_DOMAIN');
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
    throw new Error('Mailgun ' + code + ': ' + res.getContentText());
  }
  return true;
}

function sendConfirmation(enquiry) {
  return mailgun({
    from: must('MAIL_FROM'),
    to: enquiry.name + ' <' + enquiry.email + '>',
    subject: 'We have your enquiry — Spark Brake & Parts Cleaner',
    text: [
      'Hi ' + enquiry.name + ',',
      '',
      'Thanks for getting in touch about Spark. Your enquiry is with us and',
      'we usually reply within two working days.',
      '',
      'What you sent us:',
      '',
      wrapField('Enquiry', enquiry.type),
      wrapField('Company', enquiry.company),
      wrapField('Phone', enquiry.phone),
      '',
      enquiry.message,
      '',
      '--',
      'Spark Brake & Parts Cleaner',
      'Professional strength, 550 ml. Non-chlorinated, low VOC.'
    ].filter(function (l) { return l !== null; }).join('\n')
  });
}

function sendNotification(enquiry) {
  return mailgun({
    from: must('MAIL_FROM'),
    to: must('ADMIN_EMAIL'),
    'h:Reply-To': enquiry.name + ' <' + enquiry.email + '>',
    subject: 'Spark enquiry — ' + enquiry.name + (enquiry.company ? ' (' + enquiry.company + ')' : ''),
    text: [
      'New enquiry from the Spark site. Reply to this mail to answer them directly.',
      '',
      wrapField('Name', enquiry.name),
      wrapField('Email', enquiry.email),
      wrapField('Phone', enquiry.phone),
      wrapField('Company', enquiry.company),
      wrapField('Enquiry', enquiry.type),
      wrapField('Page', enquiry.source),
      '',
      'Message:',
      enquiry.message
    ].filter(function (l) { return l !== null; }).join('\n')
  });
}

/* ---------------------------------------------------------------- utils */

function clean(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function wrapField(label, value) {
  return value ? label + ': ' + value : null;
}

function must(name) {
  var v = PROPS.getProperty(name);
  if (!v) throw new Error('Missing script property: ' + name);
  return v;
}

function reply(status, payload) {
  payload.status = status;
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/* Writes one row and sends nothing. Use this while Mailgun is still to be
   set up: it also triggers the Sheets permission prompt. */
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
  return 'row written to "' + SpreadsheetApp.openById(must('SHEET_ID')).getName() + '"';
}

/* Run once from the editor to check the properties and mail path without
   going near the form. It writes a row and sends both messages. */
function selfTest() {
  var enquiry = {
    name: 'Test Enquiry',
    email: must('ADMIN_EMAIL'),
    phone: '',
    company: 'Self test',
    type: 'technical',
    message: 'Self test from the Apps Script editor.',
    source: 'selfTest()'
  };
  appendRow(enquiry);
  sendConfirmation(enquiry);
  sendNotification(enquiry);
  return 'row written, both mails sent';
}
