// Browser-side mirror of backend/src/utils/totp.js (RFC 6238) for demo mode,
// where there's no server to generate/verify codes — uses SubtleCrypto
// instead of Node's crypto, same HMAC-SHA1/6-digit/30-second algorithm.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_SECONDS = 30
const WINDOW = 1

function base32Encode(bytes) {
  let bits = 0, value = 0, output = ''
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

function base32Decode(str) {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0, value = 0
  const bytes = []
  for (let i = 0; i < clean.length; i++) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(clean[i])
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(bytes)
}

export function generateSecret() {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

async function hotp(secretBytes, counter) {
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  view.setUint32(4, counter >>> 0)
  view.setUint32(0, Math.floor(counter / 2 ** 32))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf))
  const offset = sig[sig.length - 1] & 0xf
  const code = ((sig[offset] & 0x7f) << 24) | ((sig[offset + 1] & 0xff) << 16) | ((sig[offset + 2] & 0xff) << 8) | (sig[offset + 3] & 0xff)
  return String(code % 1000000).padStart(6, '0')
}

export async function verifyToken(base32Secret, token) {
  if (!/^\d{6}$/.test(String(token || ''))) return false
  const secretBytes = base32Decode(base32Secret)
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS)
  for (let i = -WINDOW; i <= WINDOW; i++) {
    if (await hotp(secretBytes, counter + i) === token) return true
  }
  return false
}

export function otpauthUrl(secret, email, issuer = 'Quant HR') {
  const label = encodeURIComponent(`${issuer}:${email}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`
}
