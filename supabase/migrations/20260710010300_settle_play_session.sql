-- Settling a paid pass has to be all-or-nothing: claim the pass, credit its
-- minutes to the ledger, and mark the payment paid. Split across three
-- round-trips from the webhook handler, a crash between them leaves a player
-- either charged with no minutes or holding minutes nobody paid for.
--
-- `for update` + the pending_payment guard also make it idempotent: a payment
-- provider that delivers the same webhook twice credits the minutes once (L3).

create or replace function public.settle_play_session(
  p_reference text,
  p_provider_ref text,
  p_valid_until timestamptz
)
returns table (
  reference_code text,
  status public.play_session_status,
  minutes_credited integer,
  changed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.play_sessions;
begin
  select * into v_session
  from public.play_sessions ps
  where ps.reference_code = p_reference
  for update;

  if not found then
    raise exception 'pass % not found', p_reference using errcode = 'PB404';
  end if;

  -- Already settled (or cancelled/expired): acknowledge without touching money.
  if v_session.status <> 'pending_payment' then
    return query select v_session.reference_code, v_session.status, 0, false;
    return;
  end if;

  update public.play_sessions ps
  set status = 'active',
      activated_at = now(),
      valid_until = p_valid_until,
      expires_at = null
  where ps.id = v_session.id;

  insert into public.play_credit_ledger (player_id, play_session_id, minutes_delta, reason)
  values (v_session.player_id, v_session.id, v_session.minutes_total, 'purchase');

  update public.payments pm
  set status = 'paid',
      provider_ref = p_provider_ref,
      paid_at = now()
  where pm.play_session_id = v_session.id
    and pm.status = 'pending';

  return query select
    v_session.reference_code,
    'active'::public.play_session_status,
    v_session.minutes_total,
    true;
end;
$$;

-- Server-only: the webhook handler runs as service_role. Revoking from `public`
-- also strips service_role's implicit grant, hence the explicit grant back.
revoke execute on function public.settle_play_session(text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.settle_play_session(text, text, timestamptz)
  to service_role;
