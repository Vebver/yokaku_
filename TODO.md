# Plan: Fix Login Error Message Not Displaying

## Information Gathered
- **LoginSection.jsx**: The `error` state is only displayed inside the attempts-remaining banner which requires `attemptsRemaining > 0 && attemptsRemaining < 4`. There is no generic error message display.
- **authController.js**: Returns `attemptsRemaining` on failed login attempts properly.
- **Login flow**: When `attemptsRemaining` defaults to `4` (due to missing field), the banner condition `attemptsRemaining < 4` fails and no error shows.

## Plan
1. ✅ **Add a generic error message display** in the login form that shows whenever `error` is not empty - regardless of `attemptsRemaining` value.
2. ✅ **Update the lockout banner** to also display the `{error}` message text instead of hardcoded text.
3. ✅ This ensures the error message is always visible to the user.

## Files Edited
- `frontend/src/components/LoginSection.jsx`

## Changes Made
1. **Replaced** the old `Remaining Attempts Warning` block (which required `attemptsRemaining > 0 && attemptsRemaining < 4`) with a **Generic Error Message** block that shows whenever `error` is non-empty and `!isAccountLocked`.
2. **Updated** the `Account Lockout Warning` banner to show `{error || "Too many failed login attempts..."}` - so the actual server error message appears.
3. Both changes ensure the error message is **always visible** to the user regardless of the `attemptsRemaining` value.

## Follow-up Steps
- Test the fix by causing a failed login and verifying the error message appears.

