# Deploy the LIFF frontend to Vercel

This project is a pnpm monorepo. Deploy from the repository root so the build can resolve `packages/shared`; do **not** set Vercel's Root Directory to `apps/liff`.

## 1. Apply the configuration

Copy `vercel.json` into the root of `ThunderOAnLiff` (beside `package.json` and `pnpm-workspace.yaml`).

## 2. Deploy from your Windows computer without GitHub

Open Git Bash in the project root and run:

```bash
npx vercel login
npx vercel
```

Follow the prompts to log in, choose your Vercel scope, create a new project, and use `.` as the project directory. The configuration builds only `@thunder/liff` and publishes `apps/liff/dist`.

Once a preview deployment succeeds, promote it to production:

```bash
npx vercel --prod
```

Alternatively, push the project to GitHub and import it at https://vercel.com/new. Keep Root Directory as `.` (repository root). The included `vercel.json` configures install, build, output, and SPA routing.

## 3. Configure the LIFF ID

First deploy can be used to obtain the Vercel HTTPS URL. In LINE Developers Console, open the LINE Login channel and add a LIFF app with the Vercel HTTPS URL as its Endpoint URL. Copy the generated LIFF ID.

In Vercel: Project → Settings → Environment Variables, add:

- `VITE_LIFF_ID` = your actual LIFF ID (do not include the full `https://liff.line.me/` URL)
- `VITE_API_BASE_URL` = your **public HTTPS API URL**, including `/api`, e.g. `https://your-api.example.com/api`

Redeploy after setting build-time environment variables. Vite embeds `VITE_*` values into the static bundle at build time.

## 4. Important: the frontend alone is not the whole system

Do not set `VITE_API_BASE_URL` to `http://localhost:3001/api` for the hosted app. On a phone, `localhost` means the phone itself, and requests from the Vercel HTTPS page to an HTTP local API will not work as intended.

The API must also be reachable over HTTPS from the browser. For a temporary development test, expose the local API with a secure tunnel and set `VITE_API_BASE_URL` to that public tunnel URL, then redeploy. Keep the API process, PostgreSQL, and tunnel running during the test. For a reliable deployment, host the NestJS API and PostgreSQL separately.

When using a public API URL, set the backend `CORS_ORIGINS` to include the exact Vercel origin, e.g. `https://your-project.vercel.app`, restart the API, and ensure the LINE webhook URL can reach the backend over HTTPS.

## 5. Test

1. Open the Vercel HTTPS URL in a normal browser and confirm the app assets load.
2. Open the LIFF URL (`https://liff.line.me/YOUR_LIFF_ID`) inside LINE to test real LIFF initialization.
3. Confirm API requests point to the public API host, not localhost. Use browser DevTools → Network to diagnose failed requests.
4. Test LINE login/account linking, booking, cancellation, notification, and check-in only after the API and LINE Messaging API webhook have been configured.

`VITE_*` values are public frontend configuration, not secrets. Never put database credentials, LINE channel secrets, or Messaging API access tokens in Vercel frontend variables.
