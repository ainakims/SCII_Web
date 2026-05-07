# @otp-lib/authenticator

> TOTP (Time-based) and HOTP (HMAC-based) One-Time Password library

[![Node.js CI](https://github.com/Unknown-Robot/otp-lib/actions/workflows/nodejs.yml/badge.svg)](https://github.com/Unknown-Robot/otp-lib/actions/workflows/nodejs.yml)
[![codecov](https://codecov.io/github/Unknown-Robot/otp-lib/graph/badge.svg?token=I7U2VPEJ6Q&flag=authenticator)](https://codecov.io/github/Unknown-Robot/otp-lib/tree/main/packages%2Fauthenticator%2Fsrc)
[![npm](https://img.shields.io/npm/v/@otp-lib/authenticator.svg)](https://www.npmjs.com/package/@otp-lib/authenticator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## About

`@otp-lib/authenticator` is designed to build **Multi-Factor Authentication (MFA)**, **Two-Factor Authentication (2FA)** systems or **Authenticator** applications.

It wraps the [`otp-lib/core`](https://www.npmjs.com/package/@otp-lib/core) logic with **Account Context** (Issuers, Account Names) and ensuring full compatibility with the **Key URI Format** `otpauth://` used by apps like Google Authenticator, Authy, Microsoft Authenticator, or Yubico Authenticator.

## Features

* **Secure :** Uses the native **Web Crypto API** (`crypto.subtle`) for cryptographic operations.
* **Isomorphic :** Works in **Node.js**, **Bun**, **Deno**, **Browsers**, and **Cloudflare Workers**.
* **Type-Safe :** Written in strict **TypeScript** with full type definitions included.
* **Zero Dependencies :** No external **overhead**. Lightweight and fast.
* **Compliant :** Strict implementations of the IETF standards :
    * **[RFC 4226](https://tools.ietf.org/html/rfc4226) :** HMAC-Based One-Time Password (HOTP).
    * **[RFC 6238](https://tools.ietf.org/html/rfc6238) :** Time-Based One-Time Password (TOTP).
    * **[RFC 4648](https://tools.ietf.org/html/rfc4648) :** Base32 and Base64 Data Encodings.

## Install

### Node.js

```bash
npm install @otp-lib/authenticator @otp-lib/core
```

### Bun

```bash
bun add @otp-lib/authenticator @otp-lib/core
```

### Deno

```bash
deno install npm:@otp-lib/authenticator npm:@otp-lib/core
```

### Browser (ESM)

For modern browsers, you can import the ECMAScript Module (ESM) directly from unpkg.

```html
<script type="module">
  import { Secret } from "https://unpkg.com/@otp-lib/authenticator/dist/otp-auth.esm.min.js";

  const secret = Secret.create();
  console.log(secret.toBase32());
</script>
```

### Browser (UMD)

For legacy usage without a bundler, you can use the minified script from unpkg.

```html
<script src="https://unpkg.com/@otp-lib/authenticator/dist/otp-auth.iife.min.js"></script>

<script>
  const secret = OTPAuth.Secret.create();
  console.log(secret.toBase32());
</script>
```

## Quick Start

### Secret Management
The Secret class is the entry point. It is immutable and handles secure encoding/decoding of keys.

**Supported encodings :** Hex, Base32, Base64, Base64URL, Latin1, ASCII, UTF-8.

```typescript
import { Secret } from "@otp-lib/authenticator";

// Generate a random cryptographically secure secret (20 bytes)
const secret = Secret.create();

// OR import from an existing string (e.g., from your configuration)
const secretFromBase32 = Secret.fromBase32("JBSWY3DPEHPK3PXP");
const secretFromHex = Secret.fromHex("48656c6c6f21deadbeef");

// Export for storage or display
console.log(secret.toBase32()); // "JBSWY3DPEHPK3PXP"
console.log(secret.toHex());    // "4865..."
```

### HOTP (HMAC-Based OTP)

Implements the HMAC-Based algorithm where codes are generated from an **incrementing counter**.

```typescript
import { HOTP } from "@otp-lib/authenticator";

const hotp = new HOTP({ 
    account: "test@example.com",
    issuer: "My Application",
    counter: 0,      // Current counter state
    lookAhead: 3    // Allow validating 3 steps ahead (resync)
});

// Generate
const token = await hotp.generate(); 

// Verify and Resync
// verifyDelta returns the difference if valid, or null if invalid
const delta = await hotp.verifyDelta("123456"); 

if(delta !== null) {
    // Success! Update your database with the new counter
    const newCounter = hotp.getCounter() + delta + 1;
    // saveToDb(newCounter);
}

// Get URI for QR Code
console.log(hotp.toURI());
// otpauth://hotp/My%20Application:test%40example.com?secret=...
```

### TOTP (Time-Based OTP)

Implements the Time-Based algorithm where codes are generated based on the **current system time**.

```typescript
import { TOTP, Secret } from "@otp-lib/authenticator";

const secret = Secret.fromBase32("JBSWY3DPEHPK3PXP");
const totp = new TOTP({
    account: "test@example.com",
    issuer: "My Application",
    secret
});

// Generate a token
const token = await totp.generate();
console.log(token); // e.g. "123456"

// Verify a token
// Returns true if the token is valid within the current window
const isValid = await totp.verify("123456");

// Get URI for QR Code
console.log(totp.toURI());
// otpauth://totp/My%20Application:test%40example.com?secret=...
```

## References

### Authenticator Options

> `HOTP` and `TOTP` accept the following Authenticator options.

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| account | string | **Required** | The user account name (e.g. test@example.com). |
| issuer | string \| null | null | The provider or service associated with the account (e.g. My Application). |
| algorithm | HashAlgorithms | SHA-1 | The HMAC hashing algorithm (SHA-1, SHA-256, SHA-384, SHA-512). |
| digits | number | 6 | The length of the generated code. |
| secret | Secret | Secret.create() | The shared secret key instance. |

### HOTP Options

> Extends **Authenticator Options**.

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| lookAhead | number | 0 | The number of future codes to check during validation (Resynchronization window). |
| counter | number | 0 | The initial counter value. |

### TOTP Options

> Extends **Authenticator Options**.

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| window | number \|<br/> [number, number] | [0, 0] | The validation window to tolerate clock drift or latency.<br>• **Number :** Symmetric window (e.g., `1` = ±1 step).<br>• **Tuple :** `[past, future]` steps (e.g., `[1, 0]` allows 1 step back, 0 forward). |
| period | number | 30 | The time step in seconds. |

## License

MIT © [Unknown-Robot](https://github.com/Unknown-Robot)