-- Yukyu Studio MVP seed
-- 공개적으로 확인 가능한 실측 도면이 아니라 MVP용 표준화 대표 평면입니다.

insert into public.apartments (id, brand, name, location, published) values
  ('raemian-one-bailey', '래미안', '래미안 원베일리', '서울 서초구 반포동', true),
  ('xi-dh-honors-hills', '자이', '디에이치 아너힐즈', '서울 강남구 개포동', true),
  ('hillstate-songdo', '힐스테이트', '힐스테이트 송도 더스카이', '인천 연수구 송도동', true)
on conflict (id) do update set
  brand = excluded.brand,
  name = excluded.name,
  location = excluded.location,
  published = excluded.published;

insert into public.apartment_units (id, apartment_id, name, area, bedrooms, bathrooms, plan, published) values
  (
    'rb-59a', 'raemian-one-bailey', '59㎡ A타입', 59, 3, 2,
    '{"width":10.4,"depth":8.2,"rooms":[{"id":"living","name":"거실","x":0,"z":0,"width":5.8,"depth":4.2,"height":2.4,"kind":"living"},{"id":"kitchen","name":"주방","x":5.8,"z":0,"width":4.6,"depth":3.1,"height":2.4,"kind":"kitchen"},{"id":"bed-1","name":"안방","x":0,"z":4.2,"width":4,"depth":4,"height":2.4,"kind":"bedroom"},{"id":"bed-2","name":"침실 2","x":4,"z":4.2,"width":3.2,"depth":4,"height":2.4,"kind":"bedroom"},{"id":"bath","name":"욕실","x":7.2,"z":3.1,"width":3.2,"depth":2.5,"height":2.4,"kind":"bathroom"},{"id":"utility","name":"다용도실","x":7.2,"z":5.6,"width":3.2,"depth":2.6,"height":2.4,"kind":"utility"}]}'::jsonb, true
  ),
  (
    'rb-84a', 'raemian-one-bailey', '84㎡ A타입', 84, 3, 2,
    '{"width":12.8,"depth":9.2,"rooms":[{"id":"living","name":"거실","x":0,"z":0,"width":7,"depth":4.8,"height":2.45,"kind":"living"},{"id":"kitchen","name":"주방","x":7,"z":0,"width":5.8,"depth":3.5,"height":2.45,"kind":"kitchen"},{"id":"bed-1","name":"안방","x":0,"z":4.8,"width":4.8,"depth":4.4,"height":2.45,"kind":"bedroom"},{"id":"bed-2","name":"침실 2","x":4.8,"z":4.8,"width":3.8,"depth":4.4,"height":2.45,"kind":"bedroom"},{"id":"bed-3","name":"침실 3","x":8.6,"z":3.5,"width":4.2,"depth":3.2,"height":2.45,"kind":"bedroom"},{"id":"bath","name":"욕실","x":8.6,"z":6.7,"width":2.1,"depth":2.5,"height":2.45,"kind":"bathroom"},{"id":"utility","name":"다용도실","x":10.7,"z":6.7,"width":2.1,"depth":2.5,"height":2.45,"kind":"utility"}]}'::jsonb, true
  ),
  (
    'xi-84a', 'xi-dh-honors-hills', '84㎡ 4Bay', 84, 3, 2,
    '{"width":13.2,"depth":8.8,"rooms":[{"id":"living","name":"거실","x":0,"z":0,"width":7.4,"depth":4.5,"height":2.5,"kind":"living"},{"id":"kitchen","name":"주방","x":7.4,"z":0,"width":5.8,"depth":3.3,"height":2.5,"kind":"kitchen"},{"id":"bed-1","name":"안방","x":0,"z":4.5,"width":4.5,"depth":4.3,"height":2.5,"kind":"bedroom"},{"id":"bed-2","name":"침실 2","x":4.5,"z":4.5,"width":4.1,"depth":4.3,"height":2.5,"kind":"bedroom"},{"id":"bed-3","name":"침실 3","x":8.6,"z":3.3,"width":4.6,"depth":3.2,"height":2.5,"kind":"bedroom"},{"id":"bath","name":"욕실","x":8.6,"z":6.5,"width":2.3,"depth":2.3,"height":2.5,"kind":"bathroom"},{"id":"utility","name":"다용도실","x":10.9,"z":6.5,"width":2.3,"depth":2.3,"height":2.5,"kind":"utility"}]}'::jsonb, true
  ),
  (
    'hs-84a', 'hillstate-songdo', '84㎡ A타입', 84, 3, 2,
    '{"width":12.5,"depth":9.4,"rooms":[{"id":"living","name":"거실","x":0,"z":0,"width":7.2,"depth":4.7,"height":2.45,"kind":"living"},{"id":"kitchen","name":"주방","x":7.2,"z":0,"width":5.3,"depth":3.6,"height":2.45,"kind":"kitchen"},{"id":"bed-1","name":"안방","x":0,"z":4.7,"width":4.5,"depth":4.7,"height":2.45,"kind":"bedroom"},{"id":"bed-2","name":"침실 2","x":4.5,"z":4.7,"width":3.6,"depth":4.7,"height":2.45,"kind":"bedroom"},{"id":"bed-3","name":"침실 3","x":8.1,"z":3.6,"width":4.4,"depth":3.4,"height":2.45,"kind":"bedroom"},{"id":"bath","name":"욕실","x":8.1,"z":7,"width":2.2,"depth":2.4,"height":2.45,"kind":"bathroom"},{"id":"utility","name":"다용도실","x":10.3,"z":7,"width":2.2,"depth":2.4,"height":2.45,"kind":"utility"}]}'::jsonb, true
  )
on conflict (id) do update set
  apartment_id = excluded.apartment_id,
  name = excluded.name,
  area = excluded.area,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  plan = excluded.plan,
  published = excluded.published;
