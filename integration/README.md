# Enquiry form: sheet and admin email

The form posts to a Google Apps Script web app. For each enquiry the script

1. writes a row to the enquiry sheet, and
2. emails a notification to the admin address, with Reply-To set to the person
   who enquired.

Nobody who fills in the form is emailed. There is no Mailgun and nothing to
configure beyond the two values at the top of `Code.gs`.

```
form  ──POST (text/plain)──►  Apps Script web app
                                   │
                                   ├─► append row to the Sheet
                                   └─► email to ADMIN_EMAIL (Gmail)
```

The email is sent by the Google account that owns the script, so keep the script
in the same account as the sheet. A free Google account can send about 100
emails a day this way (more on Google Workspace).

## 1. The sheet

Use the enquiry sheet ("Spark WebSite Leads") and take its id from the URL:

```
https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
```

The script creates the tab and the header row on the first enquiry. Columns:

`Received · Name · Email · Phone · Company · Enquiry type · Message · Source`

## 2. The script

1. Open the sheet > **Extensions > Apps Script**, signed in as the account that
   owns the sheet.
2. Replace the contents of `Code.gs` with
   [`apps-script/Code.gs`](apps-script/Code.gs) and save (Ctrl+S). Check the
   config at the top: `SHEET_ID`, `SHEET_TAB`, `ADMIN_EMAIL`, `FORM_TOKEN`.
3. Pick **`testAdminEmail`** in the function menu and Run. Approve the
   permission prompt (it adds "send email as you"). One test message arrives at
   `ADMIN_EMAIL`; check spam the first time. Nothing is written to the sheet.
4. **Deploy > New deployment > Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Copy the `/exec` URL.

## 3. The page

In [`js/site.js`](../js/site.js), near the top:

```js
var ENQUIRY_ENDPOINT = '';   // paste the /exec URL here
var ENQUIRY_TOKEN    = '';   // the same string as FORM_TOKEN, if you set one
```

Left empty, the form still validates and confirms but sends nothing.

## Updating a script that is already deployed

A deployment keeps running the version it was created with. Saving code in the
editor does **not** update it.

- Either **Deploy > Manage deployments >** pencil on the deployment **> Version:
  New version > Deploy**. The `/exec` URL stays the same.
- Or make a **New deployment** and put its URL in `ENQUIRY_ENDPOINT`.

Then check it: open `<exec URL>?check=1`. The current script reports
`"adminNotification":"gmail"` and a number for `gmailQuotaLeftToday`. An older
script answers with only `{"ok":true,"service":"spark-enquiry"}` or an older
list of settings.

## Notes

**Why `text/plain`.** Apps Script has no `OPTIONS` handler, so it cannot answer
the CORS preflight that an `application/json` body would trigger. Posting
`text/plain` keeps the request "simple", no preflight is sent, and the script
parses the body with `JSON.parse` regardless.

**The row is the record.** If the email fails (for example the daily limit is
reached) the enquiry is still written to the sheet and the visitor still sees
the confirmation on the page. The reply carries `mail.sent: false` and the error,
and the page logs it to the console.

**The honeypot.** The form carries a hidden `website` field, off-screen and out
of the tab order. Bots fill it, people never see it. The script accepts and
silently discards anything that arrives with it filled in.

**The token** is visible in the page, so it is a speed bump against drive-by
posting, not authentication. If the endpoint gets abused, change `FORM_TOKEN`
and `ENQUIRY_TOKEN` together.

**Who the email is from.** It comes from the owning Google account, under the
name "Spark website". If that is the same mailbox as `ADMIN_EMAIL`, the
notification is mail to yourself: it arrives in the inbox and Reply still goes to
the enquirer.
