-- Начальные магазины
insert into public.stores (name, sort_order) values
  ('База дверей', 10),
  ('Астера', 20),
  ('LAVETRA DOORS - Кирил', 30),
  ('Ферони', 40),
  ('Форпост', 50),
  ('Дом дверей', 60),
  ('Стальная линия', 70),
  ('Фабрика дверей- циган', 80)
on conflict (name) do update
set sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();
