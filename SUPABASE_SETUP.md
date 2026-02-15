# Supabase Configuration Guide

## Disable Email Confirmation for Development

To allow users to sign up without email confirmation (useful for development):

### Option 1: Using Supabase Dashboard (Recommended for Production)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **Settings**
4. Scroll down to **Email Auth** section
5. Find **Enable email confirmations**
6. Toggle it **OFF** to disable email confirmations
7. Click **Save**

### Option 2: Using Supabase CLI (For Local Development)

If you're running Supabase locally with the CLI:

1. Create or edit `supabase/config.toml` in your project root
2. Add or modify the following section:

```toml
[auth]
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = false
enable_confirmations = false  # Set to false to disable email confirmation
```

3. Restart your Supabase local instance:
```bash
supabase stop
supabase start
```

### Option 3: Using Environment Variables

If using a custom Supabase instance, you can set:

```bash
GOTRUE_MAILER_AUTOCONFIRM=true
```

## Current Implementation

The `Login.tsx` component has been updated to:
- Check if the user is auto-confirmed after signup
- Display appropriate messages based on whether email confirmation is required
- Automatically sign in the user if no confirmation is needed

## Testing

After disabling email confirmations:

1. Visit the login page
2. Click "Sign up"
3. Enter email and password
4. Submit the form
5. You should see "Account created successfully!" instead of "Check your email"
6. The account should be immediately usable without email confirmation

## Security Considerations

**Important:** Disabling email confirmation should only be done in development environments. For production:

- Keep email confirmations enabled to verify user email addresses
- Consider adding additional verification steps
- Implement rate limiting for signup to prevent abuse
- Use CAPTCHA or similar anti-bot measures

## Re-enabling Email Confirmation

To re-enable email confirmations:

1. Go back to **Authentication** → **Settings** in Supabase Dashboard
2. Toggle **Enable email confirmations** back **ON**
3. The app will automatically show the "Check your email" message again
