# SCDS Volunteer Registration

A responsive volunteer registration web app for Sam Creative Design School. The app is built with Vite, plain HTML, CSS, and vanilla JavaScript in a single `index.html` file.

## Files

- `index.html` - the complete form UI and submit logic.
- `apps-script/Code.gs` - Google Apps Script Web App backend.
- `vercel.json` - Vercel build and routing configuration.
- `.env` - local Apps Script endpoint setting.

## Google Sheet

The Apps Script writes to this spreadsheet:

`1vS5Waj5oVbVQiTWoIIQ8mdEQxuUy8GSr2ySbL3weNuE`

It creates or uses a sheet named `Volunteer Applications` with these columns:

`Timestamp, First Name, Last Name, Phone, Email, Location, Occupation, Portfolio, Roles, Skills, Experience, Education, Motivation, Availability, Hours/Week, Mode, Start Date, Other Role, Projects, Referral, Status`

## Apps Script Setup

1. Open [Google Apps Script](https://script.google.com/).
2. Create a new project.
3. Replace the default code with the contents of `apps-script/Code.gs`.
4. Confirm the `SHEET_ID` and `ADMIN_EMAIL` values are correct.
5. Click **Deploy** > **New deployment**.
6. Choose **Web app**.
7. Set **Execute as** to **Me**.
8. Set **Who has access** to **Anyone**.
9. Click **Deploy** and authorize the required permissions.
10. Copy the Web App URL.

## Admin Dashboard

The site includes a protected admin dashboard at `/admin`.

The dashboard can:

- Load volunteer applications from the Google Sheet.
- Show totals for total, new, in-review, and accepted applications.
- Update the `Status` column for each applicant.

To keep the application data private, set an Apps Script property:

1. Open the Apps Script project.
2. Go to **Project Settings**.
3. Under **Script Properties**, add:

```bash
ADMIN_TOKEN=choose-a-long-private-token
```

4. Deploy a new Web App version after updating `Code.gs`.

Only someone with that token can load or update admin data from `/admin`. Do not place the admin token in Vercel environment variables or frontend code.

## Local Setup

Create or update `.env`:

```bash
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxnfzmX51wo0vYICqaVVmDGDMZFbDkrKbanIAZeXajlZAbs5MmXMsibl5b7Ecdx0RJxbg/exec
```

Install dependencies and run locally:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Vercel Deployment

1. Push this project to a Git repository.
2. Import the repository in Vercel.
3. Add an environment variable:

```bash
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxnfzmX51wo0vYICqaVVmDGDMZFbDkrKbanIAZeXajlZAbs5MmXMsibl5b7Ecdx0RJxbg/exec
```

4. Deploy. Vercel will run `npm run build` and publish the `dist` directory.

After deploying, visit `/admin` on your Vercel domain and enter the `ADMIN_TOKEN` you saved in Apps Script.

## Notes

- Public form submissions use a hidden form post to the Apps Script endpoint to avoid browser CORS issues with Google Apps Script Web Apps.
- The admin dashboard uses a JSONP callback for loading applications and updating applicant status, so `/admin` can read Apps Script responses from the Vercel domain.
- The Apps Script sends an admin notification to `Samcreativegraphics7@gmail.com` and a confirmation email to the applicant.
