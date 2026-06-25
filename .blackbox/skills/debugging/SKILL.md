---
name: debugging
description: Advanced diagnostic engine for troubleshooting TypeScript, Next.js, Supabase RLS, and Cloudflare Workers in a Windows development environment. Use this whenever code throws errors, tests fail, database sync fails, or the application exhibits unintended behavior.
---

# Debugging

## Instructions
When a bug or error is reported, follow these exact diagnostic steps:

1. **Isolate the Failure Point:** Analyze the error stack trace to bypass framework noise. Pinpoint the exact file, line number, and character where the code breaks.
2. **Examine Local State:** Use the Filesystem MCP to read the target file and its imports. Never attempt to rewrite a function without reading its surrounding context first.
3. **Verify Database Integration:** If the bug involves data persistence, user auth, or missing rows, use the Supabase MCP to inspect the current table schema and Row Level Security (RLS) policies.
4. **Enforce Environment Constraints:** Remember that this system runs on Windows. Do not attempt to run manual CLI background processes or server diagnostics that might lock network ports (like port 28491) or trigger execution syntax errors in PowerShell.
5. **Surgical Patching:** Write targeted code modifications that resolve the localized root cause without altering adjacent operational logic or changing unrelated file schemas.

## Examples

### Example 1: Resolving a Supabase Payload or RLS Error
**User Input:** `Error: insert into voters violated Row Level Security policy`
**Agent Action:** * The agent refrains from guessing a code fix.
* It checks the `voters` table configuration using the Supabase MCP tool.
* It verifies if the JWT auth token is being appended correctly in the client payload header.
* It outputs:
  > 🔍 ROOT CAUSE: The API route attempted to insert a voter record before the Supabase user session was fully initialized, failing the RLS authentication check.
  > 🛠️ THE FIX: Wrapped the insert call in an `await supabase.auth.getSession()` check to guarantee authentication state before write execution.

### Example 2: Handling Next.js Hydration Failures
**User Input:** `Unhandled Runtime Error: Text content does not match server-rendered HTML.`
**Agent Action:**
* The agent reads the local file using the Filesystem MCP.
* It identifies dynamic date formatting or window object operations happening directly in the component markup.
* It outputs:
  > 🔍 ROOT CAUSE: The voting countdown timer uses `new Date()` directly in the component body, generating different timestamps on the server side vs. the client side.
  > 🛠️ THE FIX: Moved the date state assignment inside a `useEffect` hook so it only mounts and executes on the client browser.

  