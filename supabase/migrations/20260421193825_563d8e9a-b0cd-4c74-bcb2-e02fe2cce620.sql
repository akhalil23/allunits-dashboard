-- Idempotent seeding of 41 board_member accounts using a DO block.
-- Uses the same pattern as Supabase auth: bcrypt password via pgcrypto's crypt() with bf salt.

DO $$
DECLARE
  i INTEGER;
  v_username TEXT;
  v_email TEXT;
  v_user_id UUID;
  v_password TEXT := 'ChangeMe!2026';
  v_existing UUID;
BEGIN
  FOR i IN 1..41 LOOP
    v_username := 'exec' || LPAD(i::TEXT, 2, '0');
    v_email := v_username || '@sp-dashboard.internal';

    -- Skip if username already exists in profiles
    SELECT user_id INTO v_existing FROM public.profiles WHERE username = v_username LIMIT 1;
    IF v_existing IS NOT NULL THEN
      CONTINUE;
    END IF;

    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', v_username),
      false,
      '',
      '',
      '',
      ''
    );

    -- Insert identity row (required for password sign-in in newer GoTrue)
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );

    -- Insert profile (lowercase username for lookup)
    INSERT INTO public.profiles (user_id, username, auth_email)
    VALUES (v_user_id, v_username, v_email);

    -- Assign board_member role
    INSERT INTO public.user_roles (user_id, role, unit_id, is_active)
    VALUES (v_user_id, 'board_member'::app_role, NULL, true);
  END LOOP;
END $$;
