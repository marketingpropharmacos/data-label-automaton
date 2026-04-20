DELETE FROM public.saved_rotulos
WHERE (nr_requisicao = '10236' OR nr_requisicao = '010236')
  AND item_id LIKE '%-4-%';