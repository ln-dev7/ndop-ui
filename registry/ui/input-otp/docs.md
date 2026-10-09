---
keywords: otp, one-time code, verification code, 2fa, two-factor, pin, sms code, passcode
---

An OTP input takes a one-time code, such as a verification code sent by
text message, drawing each character in its own slot. It's one real
input underneath, so screen readers read one field, the phone's keyboard
offers the code from a message (`autocomplete="one-time-code"`), and
pasting fills every slot at once. It keeps digits only by default; set
`allow` for letters. Codes read left to right in every language, so its
slots don't mirror.

## Do

- Name it with a label, such as "Verification code".
- Submit the code from the `completed` output, so people don't have to
  press a button.
- Tell people where the code was sent, and how to get a new one.

## Don't

- Don't use it for passwords or PINs people choose; use an Input.
- Don't split the code into several inputs.
