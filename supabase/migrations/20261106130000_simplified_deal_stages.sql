-- Simplified sales statuses: to quote -> to authorize -> ready to send ->
-- sent (follow-up), plus paused / won / lost. The automatic review after
-- three unanswered attempts is removed.
update public.deals set stage = 'to-quote'
    where stage in ('new', 'gathering-info', 'pending-quote', 'opportunity');
update public.deals set stage = 'ready-to-send'
    where stage = 'quote-ready';
update public.deals set stage = 'sent'
    where stage in ('quote-sent', 'negotiation', 'pending-review', 'proposal-sent', 'in-negociation');
update public.deals set stage = 'paused'
    where stage = 'delayed';

-- The app reads its statuses from the configuration row
update public.configuration
set config = config || jsonb_build_object(
    'dealStages', '[
        {"value": "to-quote", "label": "Por cotizar"},
        {"value": "to-authorize", "label": "Por autorizar"},
        {"value": "ready-to-send", "label": "Lista para enviar"},
        {"value": "sent", "label": "Enviada · en seguimiento"},
        {"value": "paused", "label": "En pausa"},
        {"value": "won", "label": "Ganada (OC)"},
        {"value": "lost", "label": "Perdida"}
    ]'::jsonb,
    'dealPipelineStatuses', '["won"]'::jsonb
)
where id = 1;
