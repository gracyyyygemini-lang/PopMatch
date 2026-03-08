const TENANT = "common";
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const ISSUER_PREFIX = "https://login.microsoftonline.com/";
const ISSUER_SUFFIX = "/v2.0";

interface MicrosoftTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
}

interface MicrosoftUserInfo {
  email: string;
  name: string;
  sub: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = parts[1];
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  const decoded = Buffer.from(padded, "base64").toString("utf-8");
  return JSON.parse(decoded);
}

function validateClaims(payload: Record<string, unknown>, clientId: string): string | null {
  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp as number | undefined;
  if (exp && exp < now) {
    return "Token has expired. Please sign in again.";
  }

  const nbf = payload.nbf as number | undefined;
  if (nbf && nbf > now + 300) {
    return "Token is not yet valid.";
  }

  const aud = payload.aud as string | undefined;
  if (aud && aud !== clientId) {
    return "Token audience mismatch.";
  }

  const iss = payload.iss as string | undefined;
  if (iss && !(iss.startsWith(ISSUER_PREFIX) && iss.endsWith(ISSUER_SUFFIX))) {
    return "Token issuer is not Microsoft.";
  }

  return null;
}

export async function exchangeCodeForUser(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ user: MicrosoftUserInfo } | { error: string }> {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { error: "Microsoft OAuth is not configured on the server." };
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
    scope: "openid profile email User.Read",
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    let errorMsg = "Failed to authenticate with Microsoft.";
    try {
      const errData = await tokenRes.json();
      if (errData.error_description) errorMsg = errData.error_description;
    } catch {}
    console.error("Microsoft token exchange failed:", tokenRes.status, errorMsg);
    return { error: errorMsg };
  }

  const tokenData = (await tokenRes.json()) as MicrosoftTokenResponse;

  if (tokenData.error || !tokenData.id_token) {
    console.error("Microsoft token error:", tokenData.error_description || tokenData.error);
    return { error: tokenData.error_description || "Failed to authenticate with Microsoft." };
  }

  const payload = decodeJwtPayload(tokenData.id_token);

  const claimsError = validateClaims(payload, clientId);
  if (claimsError) {
    console.error("ID token claims validation failed:", claimsError);
    return { error: claimsError };
  }

  const email = (
    (payload.email as string) ||
    (payload.preferred_username as string) ||
    (payload.upn as string) ||
    ""
  ).toLowerCase().trim();

  const name = (payload.name as string) || "";
  const sub = (payload.sub as string) || "";

  if (!email) {
    return { error: "No email address found in your Microsoft account." };
  }

  if (!email.endsWith("@illinois.edu")) {
    return { error: "Only @illinois.edu emails are allowed. Please sign in with your UIUC account." };
  }

  return { user: { email, name, sub } };
}
