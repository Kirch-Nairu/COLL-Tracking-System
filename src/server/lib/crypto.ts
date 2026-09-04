const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function randomToken(bytes = 32): string {
  return toBase64Url(randomBytes(bytes));
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return toBase64Url(new Uint8Array(digest));
}

export async function hmacSha256(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function deriveMemberQrToken(memberId: string, nonce: string, signingSecret: string): Promise<string> {
  const signature = await hmacSha256(signingSecret, `${memberId}:${nonce}`);
  return `coll.member.${nonce}.${signature}`;
}

export async function createMemberQrIdentity(memberId: string, signingSecret: string) {
  const nonce = randomToken(24);
  const token = await deriveMemberQrToken(memberId, nonce, signingSecret);
  return { nonce, token, tokenHash: await sha256(token) };
}

export async function hashPassword(password: string, salt = randomToken(18), iterations = 210_000) {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { salt, iterations, hash: toBase64Url(new Uint8Array(bits)) };
}

export async function verifyPassword(password: string, salt: string, iterations: number, expectedHash: string) {
  const actual = await hashPassword(password, salt, iterations);
  if (actual.hash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.hash.length; i++) diff |= actual.hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}
