// Regenerate the Chrome Web Store API refresh token via a loopback OAuth flow.
//
// Why this exists: the old `urn:ietf:wg:oauth:2.0:oob` flow documented in
// docsi/PUBLISHING.md was disabled by Google in 2023, and consent screens left
// in "Testing" mode issue refresh tokens that expire after 7 days — both show
// up as `invalid_grant: Token has been expired or revoked` at upload time.
//
// This script runs a tiny local server on a FIXED port, opens Google's consent
// screen with a loopback redirect, captures the auth code on redirect, exchanges
// it for a refresh token, and writes CWS_REFRESH_TOKEN back into .env.
//
// Requires CWS_CLIENT_ID + CWS_CLIENT_SECRET already in .env. The OAuth client
// should be a "Desktop app" type (loopback allowed on any port); if it is a
// "Web application" client, add `http://localhost:42813` to its Authorized
// redirect URIs in Google Cloud Console first.
//
// Run from the repo root:  node scripts/cws-oauth.mjs

import http from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const ENV_PATH = ".env";
const PORT = 42813;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/chromewebstore";

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const raw = readFileSync(ENV_PATH, "utf8");
const env = parseEnv(raw);
const clientId = env.CWS_CLIENT_ID;
const clientSecret = env.CWS_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("ERR: CWS_CLIENT_ID / CWS_CLIENT_SECRET missing from .env");
  process.exit(1);
}

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // force a fresh refresh_token every run
  }).toString();

function writeRefreshToken(token) {
  let next;
  if (/^\s*CWS_REFRESH_TOKEN\s*=/m.test(raw)) {
    next = raw.replace(/^\s*CWS_REFRESH_TOKEN\s*=.*$/m, `CWS_REFRESH_TOKEN=${token}`);
  } else {
    next = raw.replace(/\n*$/, "\n") + `CWS_REFRESH_TOKEN=${token}\n`;
  }
  writeFileSync(ENV_PATH, next);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (!url.searchParams.has("code") && !url.searchParams.has("error")) {
    res.writeHead(404).end();
    return;
  }
  const err = url.searchParams.get("error");
  if (err) {
    res.writeHead(200, { "content-type": "text/html" }).end(
      `<h2>Authorization failed: ${err}</h2><p>You can close this tab.</p>`,
    );
    console.error(`\nERR: Google returned error "${err}".`);
    server.close();
    process.exit(1);
  }
  const code = url.searchParams.get("code");
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT,
        grant_type: "authorization_code",
      }),
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.refresh_token) {
      throw new Error(JSON.stringify(data));
    }
    writeRefreshToken(data.refresh_token);
    res.writeHead(200, { "content-type": "text/html" }).end(
      `<h2>✓ Refresh token saved to .env</h2><p>You can close this tab and return to the terminal.</p>`,
    );
    console.log("\n✓ CWS_REFRESH_TOKEN written to .env. You can re-run `task cws:upload`.");
    server.close();
    process.exit(0);
  } catch (e) {
    res.writeHead(500, { "content-type": "text/html" }).end(
      `<h2>Token exchange failed</h2><pre>${String(e)}</pre>`,
    );
    console.error("\nERR: token exchange failed:\n" + String(e));
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("\nOpen this URL in the browser signed in to the Web Store account:\n");
  console.log(authUrl + "\n");
  // Best-effort auto-open (macOS `open`); harmless if it fails.
  spawn("open", [authUrl], { stdio: "ignore" }).on("error", () => {});
  console.log(`Waiting for the Google redirect on ${REDIRECT} …`);
});
