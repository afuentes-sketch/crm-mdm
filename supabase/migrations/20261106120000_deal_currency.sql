-- Each deal is quoted in pesos or dollars; amounts are never mixed.
alter table public.deals
    add column currency text not null default 'MXN',
    add constraint deals_currency_check check (currency in ('MXN', 'USD'));
