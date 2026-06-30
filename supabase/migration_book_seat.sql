-- Atomic booking function with row-level locking to prevent race conditions
-- Usage: SELECT * FROM book_seat(p_date, p_time, p_seats, p_name, p_email, p_phone, p_format, p_notes, p_status);

CREATE OR REPLACE FUNCTION book_seat(
  p_date text,
  p_time text,
  p_seats int,
  p_name text,
  p_email text,
  p_phone text,
  p_format text,
  p_notes text DEFAULT NULL,
  p_status text DEFAULT 'pending'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity int := 10;
  v_used int;
  v_reservation jsonb;
BEGIN
  -- Lock the relevant rows to prevent concurrent reads
  SELECT coalesce(sum(seats), 0) INTO v_used
  FROM reservations
  WHERE date = p_date
    AND time = p_time
    AND status IN ('pending', 'confirmed')
  FOR UPDATE;

  IF v_used + p_seats > v_capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce créneau est complet. Choisissez un autre horaire.');
  END IF;

  INSERT INTO reservations (name, email, phone, seats, format, date, time, notes, status)
  VALUES (p_name, p_email, p_phone, p_seats, p_format, p_date, p_time, p_notes, p_status)
  RETURNING to_jsonb(reservations.*) INTO v_reservation;

  RETURN jsonb_build_object('success', true, 'reservation', v_reservation);
END;
$$;
