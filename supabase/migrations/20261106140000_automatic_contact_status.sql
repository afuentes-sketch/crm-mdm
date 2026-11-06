-- The contact status (cold / warm / hot / in contract) follows the contact's
-- deals instead of being chosen by hand. The most advanced deal wins:
--   won (purchase order)                     -> in-contract
--   sent, in follow-up                       -> hot
--   to quote, to authorize, ready to send    -> warm
--   no active deal (none, paused, lost)      -> cold
-- Archived deals only count when they were won.

CREATE OR REPLACE FUNCTION "public"."refresh_contact_status"("target_contact_ids" bigint[]) RETURNS void
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  WITH computed AS (
    SELECT c.id,
      CASE coalesce(max(
        CASE
          WHEN d.stage = 'won' THEN 4
          WHEN d.archived_at IS NOT NULL THEN 1
          WHEN d.stage = 'sent' THEN 3
          WHEN d.stage IN ('to-quote', 'to-authorize', 'ready-to-send') THEN 2
          ELSE 1
        END), 1)
        WHEN 4 THEN 'in-contract'
        WHEN 3 THEN 'hot'
        WHEN 2 THEN 'warm'
        ELSE 'cold'
      END AS status
    FROM public.contacts c
    LEFT JOIN public.deals d ON c.id = ANY(d.contact_ids)
    WHERE c.id = ANY(target_contact_ids)
    GROUP BY c.id
  )
  UPDATE public.contacts c
  SET status = computed.status
  FROM computed
  WHERE c.id = computed.id
    AND c.status IS DISTINCT FROM computed.status;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_deal_contact_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM public.refresh_contact_status(
    coalesce(CASE WHEN TG_OP <> 'INSERT' THEN OLD.contact_ids END, '{}'::bigint[])
    || coalesce(CASE WHEN TG_OP <> 'DELETE' THEN NEW.contact_ids END, '{}'::bigint[])
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

revoke all on function public.refresh_contact_status(bigint[]) from public, anon;
grant execute on function public.refresh_contact_status(bigint[]) to authenticated, service_role;
revoke all on function public.handle_deal_contact_status() from public, anon;
grant execute on function public.handle_deal_contact_status() to authenticated, service_role;

create or replace trigger on_deal_changed_refresh_contact_status
    after insert or delete or update of stage, contact_ids, archived_at on public.deals
    for each row execute function public.handle_deal_contact_status();

-- New contacts start cold; existing contacts get their computed status
alter table public.contacts alter column status set default 'cold';
select public.refresh_contact_status(array(select id from public.contacts));
