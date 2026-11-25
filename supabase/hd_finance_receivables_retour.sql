-- Désactivation réversible : conserver tous les prêts et remboursements, ne rien supprimer.
revoke execute on function seneve.hd_finance_receivables_get(uuid),seneve.hd_finance_receivable_add(uuid,uuid,text,numeric,text,date,date),seneve.hd_finance_receivable_payment_add(uuid,uuid,uuid,numeric,date),seneve_private.hd_finance_receivables_get(uuid),seneve_private.hd_finance_receivable_add(uuid,uuid,text,numeric,text,date,date),seneve_private.hd_finance_receivable_payment_add(uuid,uuid,uuid,numeric,date) from authenticated;
notify pgrst,'reload schema';
