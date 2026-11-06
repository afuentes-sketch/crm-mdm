-- "Sent" and "in follow-up" become two statuses: a sent quote moves to
-- follow-up once the salesperson contacts the client about it.
update public.configuration
set config = config || jsonb_build_object(
    'dealStages', '[
        {"value": "to-quote", "label": "Por cotizar"},
        {"value": "to-authorize", "label": "Por autorizar"},
        {"value": "ready-to-send", "label": "Lista para enviar"},
        {"value": "sent", "label": "Enviada"},
        {"value": "follow-up", "label": "En seguimiento"},
        {"value": "paused", "label": "En pausa"},
        {"value": "won", "label": "Ganada (OC)"},
        {"value": "lost", "label": "Perdida"}
    ]'::jsonb
)
where id = 1;

-- Both count as "hot" for the contact status
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
          WHEN d.stage IN ('sent', 'follow-up') THEN 3
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
