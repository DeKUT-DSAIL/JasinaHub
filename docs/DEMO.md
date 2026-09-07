# Demo & Sample Accounts

## Hosted demo

- **Preview**: https://www.dsail-health.vercel.app

## Sample accounts

No shared demo credentials ship with the repository. Create your own via **/signup**, then follow [DATABASE.md → Promoting a user to admin](DATABASE.md#promoting-a-user-to-admin) to grant roles.

Recommended set for a full demo:

| Role | How to create |
|---|---|
| **Volunteer** | Sign up, select *Recording Volunteer*. Admin flips `profiles.verified = true`. |
| **Transcriber** | Sign up, select *Transcriber*. Admin flips `profiles.transcription_approved = true`. |
| **Admin** | Sign up any account, then `INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'admin');` |

If you maintain a public deployment, store demo credentials in your password manager and share them out-of-band — never commit them here.

## Demo dataset

`supabase/seed.sql` creates 3 categories and 6 questions. Record a handful of responses as the Volunteer account to give the Admin panel something to visualize.

## Screenshots / video

Add walk-through screenshots to `docs/media/` and reference them here as you produce them.