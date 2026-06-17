# SwasthyaTrack AI Supabase Email Templates

Use these in Supabase Dashboard > Authentication > Emails.

## Confirm Signup

Subject:

```text
Confirm your SwasthyaTrack AI account
```

Body:

```html
<h2>Confirm your SwasthyaTrack AI account</h2>
<p>Welcome to SwasthyaTrack AI. Confirm your email to activate your secure healthcare monitoring workspace.</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 18px;background:#4f9c8d;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">
    Verify email
  </a>
</p>
<p>If you did not create this account, you can safely ignore this email.</p>
```

## Reset Password

Subject:

```text
Reset your SwasthyaTrack AI password
```

Body:

```html
<h2>Reset your SwasthyaTrack AI password</h2>
<p>We received a request to reset your password. Use the secure link below to create a new password.</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 18px;background:#4f9c8d;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">
    Create new password
  </a>
</p>
<p>This link should only be used by you. If you did not request a reset, ignore this email.</p>
```

## Redirect URLs To Allow

Add these in Supabase Authentication > URL Configuration:

```text
http://localhost:3001
http://localhost:3001/?verified=true
http://localhost:3001/?reset=true
http://localhost:3001/?auth=google
```
