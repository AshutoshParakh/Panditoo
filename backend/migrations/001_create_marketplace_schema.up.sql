CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preferred_language') THEN
    CREATE TYPE preferred_language AS ENUM ('en', 'hi');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prepaid_status') THEN
    CREATE TYPE prepaid_status AS ENUM ('pending', 'paid', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE payout_status AS ENUM ('pending', 'paid');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_request_status') THEN
    CREATE TYPE booking_request_status AS ENUM ('pending', 'won', 'lost', 'expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
    CREATE TYPE payment_type AS ENUM ('prepayment', 'pandit_payout');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('created', 'paid', 'failed', 'refunded');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rated_by_type') THEN
    CREATE TYPE rated_by_type AS ENUM ('user', 'pandit');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM ('superadmin', 'support');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  preferred_language preferred_language NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pandits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  total_ratings_count INTEGER NOT NULL DEFAULT 0,
  specializations TEXT[] NOT NULL DEFAULT '{}',
  service_radius_km INTEGER NOT NULL DEFAULT 15,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  address TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  bank_account_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pandits_rating_range CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT pandits_total_ratings_count_non_negative CHECK (total_ratings_count >= 0),
  CONSTRAINT pandits_service_radius_positive CHECK (service_radius_km > 0)
);

CREATE TABLE IF NOT EXISTS pooja_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(255) NOT NULL,
  name_hi VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_hi TEXT,
  base_price NUMERIC(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  samagri_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pooja_types_name_en_unique UNIQUE (name_en),
  CONSTRAINT pooja_types_base_price_non_negative CHECK (base_price >= 0),
  CONSTRAINT pooja_types_duration_positive CHECK (duration_minutes > 0)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  pooja_type_id UUID NOT NULL REFERENCES pooja_types(id) ON DELETE RESTRICT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  status booking_status NOT NULL DEFAULT 'pending',
  current_batch INTEGER NOT NULL DEFAULT 1,
  current_radius_km INTEGER NOT NULL DEFAULT 15,
  total_price NUMERIC(10, 2) NOT NULL,
  prepaid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  prepaid_status prepaid_status NOT NULL DEFAULT 'pending',
  confirmed_pandit_id UUID REFERENCES pandits(id) ON DELETE SET NULL,
  pandit_payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pandit_payout_status payout_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_current_batch_positive CHECK (current_batch > 0),
  CONSTRAINT bookings_current_radius_positive CHECK (current_radius_km > 0),
  CONSTRAINT bookings_total_price_non_negative CHECK (total_price >= 0),
  CONSTRAINT bookings_prepaid_amount_non_negative CHECK (prepaid_amount >= 0),
  CONSTRAINT bookings_pandit_payout_amount_non_negative CHECK (pandit_payout_amount >= 0)
);

CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pandit_id UUID NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  status booking_request_status NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_requests_batch_positive CHECK (batch_number > 0),
  CONSTRAINT booking_requests_unique_request UNIQUE (booking_id, pandit_id, batch_number)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  type payment_type NOT NULL,
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  status payment_status NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_amount_positive CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  rated_by rated_by_type NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ratings_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT ratings_one_per_actor UNIQUE (booking_id, rated_by)
);

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role admin_role NOT NULL DEFAULT 'support',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pandits_latitude_longitude ON pandits (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_booking_status ON booking_requests (booking_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pooja_type_id ON bookings (pooja_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmed_pandit_id ON bookings (confirmed_pandit_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_pandit_id ON booking_requests (pandit_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments (booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id_unique
  ON payments (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_order_id_unique
  ON payments (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ratings_booking_id ON ratings (booking_id);
