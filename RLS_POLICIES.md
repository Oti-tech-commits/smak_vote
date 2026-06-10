# Row Level Security (RLS) Policies Documentation

## Overview

Row Level Security (RLS) is enabled on all tables to ensure data isolation and security. Each policy restricts access based on user role and relationship to the data.

## Policies by Table

### profiles

**Purpose:** Store user account information and roles

**Policies:**

1. **profiles_self (SELECT)**
   - Users can view their own profile
   - Admins can view all profiles
   ```sql
   auth.uid() = id OR (
     SELECT EXISTS(
       SELECT 1 FROM profiles p 
       WHERE p.id = auth.uid() AND p.role = 'admin'
     )
   )
   ```

2. **profiles_self_update (UPDATE)**
   - Users can update their own profile
   - Admins can update any profile
   ```sql
   auth.uid() = id OR (
     SELECT EXISTS(
       SELECT 1 FROM profiles p 
       WHERE p.id = auth.uid() AND p.role = 'admin'
     )
   )
   ```

3. **profiles_insert_admin (INSERT)**
   - Only admins can create profiles (except during registration)
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role = 'admin'
   )
   ```

**Student Access:** Limited to own profile only
**Admin Access:** Full access to all profiles

---

### elections

**Purpose:** Store election metadata

**Policies:**

1. **elections_public (SELECT)**
   - All authenticated users can view elections
   ```sql
   TRUE
   ```

2. **elections_admin (INSERT, UPDATE, DELETE)**
   - Only admins can manage elections
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role = 'admin'
   )
   ```

**Student Access:** Read-only
**Admin Access:** Full CRUD

---

### positions

**Purpose:** Store candidate positions

**Policies:**

1. **positions_public (SELECT)**
   - All users can view positions
   ```sql
   TRUE
   ```

2. **positions_admin (INSERT, UPDATE, DELETE)**
   - Only admins can manage positions
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role = 'admin'
   )
   ```

**Student Access:** Read-only
**Admin Access:** Full CRUD

---

### candidates

**Purpose:** Store candidate information

**Policies:**

1. **candidates_public (SELECT)**
   - All users can view candidates
   ```sql
   TRUE
   ```

2. **candidates_admin (INSERT, UPDATE, DELETE)**
   - Admins and officers can manage candidates
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role IN ('admin', 'officer')
   )
   ```

**Student Access:** Read-only
**Admin/Officer Access:** Full CRUD

---

### votes

**Purpose:** Store anonymous votes

**Policies:**

1. **votes_no_select (SELECT)**
   - No one can directly query votes
   ```sql
   FALSE
   ```

2. **votes_insert_admin (INSERT)**
   - Only admins and officers (via stored procedure) can insert votes
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role IN ('admin', 'officer')
   )
   ```

**Student Access:** NO ACCESS (votes are anonymous)
**Admin/Officer Access:** INSERT only (via stored procedure)
**Selection:** Direct queries impossible - ensures vote anonymity

---

### voter_status

**Purpose:** Track if student has voted

**Policies:**

1. **voter_status_student (SELECT)**
   - Students can view their own voter status
   ```sql
   auth.uid() = student_id
   ```

2. **voter_status_admin (INSERT, UPDATE)**
   - Admins and officers manage voter status
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role IN ('admin', 'officer')
   )
   ```

**Student Access:** View own voting status only
**Admin/Officer Access:** Manage all records

---

### audit_logs

**Purpose:** Immutable record of all actions

**Policies:**

1. **audit_logs_public (SELECT)**
   - Admins and officers can view audit logs
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role IN ('admin', 'officer')
   )
   ```

2. **audit_logs_admin (INSERT)**
   - Only server-side functions can create audit logs
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role = 'admin'
   )
   ```

**Student Access:** NO ACCESS
**Admin/Officer Access:** Read-only

---

### voting_tokens

**Purpose:** Single-use voting tokens

**Policies:**

1. **voting_tokens_admin_select (SELECT)**
   - Only admins can view tokens
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role = 'admin'
   )
   ```

2. **voting_tokens_admin_write (INSERT, UPDATE, DELETE)**
   - Only admins can manage tokens
   ```sql
   EXISTS(
     SELECT 1 FROM profiles p 
     WHERE p.id = auth.uid() AND p.role = 'admin'
   )
   ```

**Student Access:** NO ACCESS
**Admin Access:** Full CRUD

---

## Authentication Flow

### Service Role Key

- Used by **server-side** functions only (routes in `/api/`)
- Bypasses RLS policies
- Never exposed to client
- Used for admin operations and vote submissions

### Anon Key

- Used by **client-side** (browser) code
- Subject to RLS policies
- Can only access data permitted by policies
- Used for login and data queries

## Vote Anonymity

The system ensures vote anonymity through:

1. **votes table RLS:** `SELECT` policy is `FALSE`
   - Votes cannot be directly queried by anyone
   - Only the `cast_ballot` function can create votes
   
2. **voter_status vs votes separation:**
   - `voter_status` tracks WHO voted (visible to student)
   - `votes` table is completely hidden (anonymous)
   - No way to link vote to voter

3. **Anonymous vote structure:**
   - Vote contains: election_id, position_id, candidate_id
   - Vote does NOT contain: user_id, student_id, or any identifier
   - Timestamp only for audit purposes

## Testing RLS Policies

### Test Student Access

```sql
-- As student with auth.uid() = 'student-123'

-- Should work
SELECT * FROM profiles WHERE id = 'student-123';

-- Should fail (no access to other students)
SELECT * FROM profiles WHERE id != 'student-123';

-- Should work (public elections)
SELECT * FROM elections;

-- Should fail (no votes visible)
SELECT * FROM votes;

-- Should work (own voter status)
SELECT * FROM voter_status WHERE student_id = 'student-123';
```

### Test Admin Access

```sql
-- As admin with auth.uid() = 'admin-123'

-- Should work
SELECT * FROM profiles;
SELECT * FROM elections;
SELECT * FROM positions;
SELECT * FROM candidates;

-- Should NOT work directly (use stored procedure)
SELECT * FROM votes;

-- Should work (audit logs)
SELECT * FROM audit_logs;

-- Should work (tokens)
SELECT * FROM voting_tokens;
```

## Updating RLS Policies

To modify RLS policies:

1. **Enable policy editing:**
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

2. **Create/update policy:**
   ```sql
   CREATE POLICY policy_name ON table_name
   FOR operation
   TO role
   USING (condition);
   ```

3. **Test with SQL Editor** using the appropriate role

4. **Deploy via migration** with timestamp

## Troubleshooting

### "401 Unauthorized" errors

- User may not have permission for operation
- Check user role in `profiles` table
- Verify RLS policy matches user's role

### "No rows found" errors

- RLS policy may be filtering all rows
- Check that policy condition matches user's identity
- Try with admin role to verify data exists

### Performance Issues

- RLS policies can impact query performance
- Add indexes on frequently filtered columns:
  ```sql
  CREATE INDEX idx_profiles_id ON profiles(id);
  CREATE INDEX idx_voter_status_student_id ON voter_status(student_id);
  ```

### Audit Log Issues

- Verify `cast_ballot` function creates log entries
- Check that user is admin when creating logs
- Ensure audit_logs table is properly configured
