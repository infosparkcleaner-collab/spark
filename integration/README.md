# Enquiry form — sheet and email

The form posts to a Google Apps Script web app. That script writes a row to
the enquiry sheet and sends two messages through Mailgun: a confirmation to
the person who enquired, and a notification to the admin with reply-to set
to the enquirer.

```
form  ──POST (text/plain)──►  Apps Script web app
                                   │
                                   ├─► append row to the Sheet
                                   ├─► Mailgun ─► confirmation to enquirer
                                   └─► Mailgun ─► notification to admin
```

Nothing secret is in this repository or in the page. The Mailgun key lives
in the script's own properties, which only the Google account that owns the
script can read.

## 1. The sheet

Create a Google Sheet, or use an existing one. From its URL take the id:

```
https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
```

The script creates the tab and the header row on the first enquiry, so
there is nothing to set up inside the sheet itself. Columns are:

`Received · Name · Email · Phone · Company · Enquiry type · Message · Source`

## 2. The script

1. Open the sheet → **Extensions › Apps Script**.
2. Delete the placeholder and paste the contents of
   [`apps-script/Code.gs`](apps-script/Code.gs).
3. **Project Settings › Script Properties** → add each of these:

   | Property | Value |
   |---|---|
   | `MAILGUN_KEY` | your Mailgun **private** API key |
   | `MAILGUN_DOMAIN` | the sending domain, e.g. `mg.example.com` |
   | `MAILGUN_REGION` | `us` or `eu` — must match your Mailgun account |
   | `MAIL_FROM` | `Spark <enquiries@mg.example.com>` |
   | `ADMIN_EMAIL` | `ankit.migosys@gmail.com` |
   | `SHEET_ID` | the id from step 1 |
   | `SHEET_TAB` | `Enquiries` (optional) |
   | `FORM_TOKEN` | any random string, e.g. from a password generator |

   Put the Mailgun key **here only**. Never in the page, a commit, or a chat.

4. Run `selfTest` once from the editor. Google will ask for permission the
   first time — it needs the sheet and outbound fetch. It writes one row and
   sends both mails to the admin address, so you can confirm the whole path
   before the form is wired up.
5. **Deploy › New deployment › Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Copy the `/exec` URL.

## 3. The page

In [`js/site.js`](../js/site.js), near the top:

```js
var ENQUIRY_ENDPOINT = '';   // paste the /exec URL here
var ENQUIRY_TOKEN    = '';   // the same string as FORM_TOKEN
```

Left empty, the form still validates and confirms but sends nothing — which
is how it behaves today.

## Notes

**Why `text/plain`.** Apps Script has no `OPTIONS` handler, so it cannot
answer the CORS preflight that an `application/json` body would trigger.
Posting `text/plain` keeps the request "simple", no preflight is sent, and
the script parses the body with `JSON.parse` regardless.

**The row is the record.** If Mailgun fails the enquiry is still written to
the sheet and the visitor still sees the confirmation; the mail error is
reported in the response and logged to the console rather than losing the
enquiry.

**The honeypot.** The form carries a hidden `website` field, off-screen and
out of the tab order. Bots fill it, people never see it. The script accepts
and silently discards anything that arrives with it filled in.

**The token** is visible in the page, so it is a speed bump against drive-by
posting, not authentication. If the endpoint gets abused, rotate
`FORM_TOKEN` and `ENQUIRY_TOKEN` together.

**Mailgun sandbox domains** only deliver to addresses you have verified in
Mailgun. Until the sending domain is a real, verified one, the confirmation
to the enquirer will not arrive. Worth checking before launch.

**Free Google accounts** send roughly 100 mails a day through Apps Script,
but that limit does not apply here — the mail goes out through Mailgun, so
Mailgun's own plan limits are what matter.
