# App Store Connect listing copy

The public name is **Blair County Services**. Paste the copy below into App Store Connect after the first build uploads.

## Remaining commands (run in your own terminal)

These need an Apple ID + 2FA prompt, so they cannot be completed from this agent shell.

```bash
cd agency-app
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --profile production
```

On first submit, let EAS create the App Store Connect app. Use:

- Name: Blair County Services
- Bundle ID: `com.jdellape.blaircountyagencies`
- SKU: `blair-county-services`

Then host `privacy.html` and `support.html` (GitHub Pages, Vercel, or any static host) and paste those URLs into the listing.

## App information

- Name: Blair County Services
- Subtitle: Find local help and services
- Bundle ID: `com.jdellape.blaircountyagencies`
- SKU: `blair-county-services`
- Primary language: English (U.S.)
- Category: Reference
- Price: Free

## Description

Blair County Services is a simple directory of social service agencies in Blair County, Pennsylvania.

Choose a service — such as food, housing, or health — to see agencies that offer it. Each listing includes the agency name, address, phone number, and a short description when one is available.

No account is required. There are no in-app purchases.

## Keywords

Blair County,agencies,services,directory,Altoona,Pennsylvania,help,211

## Promotional text

Find Blair County social service agencies by the help you need.

## Support URL

Host `store/support.html` (GitHub Pages, Vercel, or any static host), then paste that URL here.

Suggested local files:

- `agency-app/store/support.html`
- `agency-app/store/privacy.html`

## Privacy Policy URL

Host `store/privacy.html` and paste that URL here.

Privacy Nutrition Labels: Data Not Collected (confirm this still matches FastAPI server logging before submit).

## Age rating

Answer the questionnaire honestly. This directory should rate 4+.

## Copyright

2026 John Dellape

## App Review notes

Public directory of Blair County social service agencies. Choose a service to see matching agencies. No account, no in-app purchases, no admin or editing features in this build.

## Review contact

- Email: dellapejw@gmail.com
- First name: John
- Last name: Dellape

## Screenshots

Use the 6.7" iPhone images in `store/screenshots/` (1290 x 2796). Replace them with device captures from TestFlight if you prefer photos of the real binary.
