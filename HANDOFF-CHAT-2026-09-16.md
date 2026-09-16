# HANDOFF — Montaji AA / Монтажи АА

Дата: 16.09.2026
Ветка: `design/today-v2`
Репозиторий: `to1le39rus-cyber/Montaji`

> ВАЖНО: это временный handoff-файл для передачи контекста следующему чату. Репозиторий публичный, поэтому здесь НЕТ паролей, токенов, приватных ключей или иных секретов. После переноса контекста файл нужно удалить из GitHub. Сам факт удаления файла из текущего Git-дерева не означает удаления его из истории GitHub.

---

## 1. ЦЕЛЬ ПРОЕКТА

Montaji AA / «Монтажи АА» — рабочее мобильное приложение для управления выездами/монтажами.

Главная цель текущего этапа:
- сохранить реально работающую Firebase-базу и существующую бизнес-логику;
- сделать интерфейс уровня современного premium mobile product;
- приблизить приложение к утверждённому визуальному референсу;
- не превращать 3 плановых окна в лимит;
- не использовать runtime-костыли;
- довести проект через аудит → CI → Preview → smoke → release.

Production пока НЕ менять без явного разрешения пользователя.

---

## 2. ЧТО ПОЛЬЗОВАТЕЛЬ ХОЧЕТ ОТ НОВОГО ЧАТА

Пользователь хочет продолжить работу без повторного объяснения истории.

Ключевое ожидание:
1. Новый чат должен прочитать этот файл.
2. Сразу понять текущую архитектуру, бизнес-семантику, командный процесс, проблемы и решения.
3. Не гонять пользователя по кругу одинаковыми диагностическими действиями.
4. Если нужен Preview для проверки — давать конкретную ссылку и конкретный короткий smoke-check.
5. Не утверждать, что что-то исправлено, пока это реально не проверено.
6. Production не трогать без явного approval.
7. Не откатывать рабочую Firebase-загрузку ради косметических изменений.

Пользователь любит прямой рабочий стиль и быстрый темп. Уместно: «Погнали 🔥».

---

# 3. БИЗНЕС-СЕМАНТИКА — КРИТИЧЕСКИ ВАЖНО

## 3.1. Три монтажных окна — НЕ лимит

Это самое важное правило проекта.

Есть три плановых пресета:
- `1` → `10:00–12:00`
- `2` → `14:00–16:00`
- `3` → `3-й слот / резерв`

Они нужны для планирования.

Они НЕ означают:
- максимум 3 монтажа в день;
- блокировку четвёртого монтажа;
- закрытие дня после 3 заявок.

Валидны 4, 5, 6 и более монтажей в один день.

Нельзя возвращать логику вида:
`c >= 3` → запрет нового монтажа.

Нельзя использовать `freeSlot()` как блокирующий capacity-check.

Дополнительный монтаж должен иметь возможность существовать без планового окна:
`Дополнительный монтаж · без планового окна`.

---

## 3.2. Фактическая нагрузка и плановые окна — разные сущности

Нужно отдельно показывать:
- фактическое количество монтажей за день;
- среднюю нагрузку;
- свободные плановые окна;
- фактический доход;
- дополнительный доход;
- расходы;
- долги;
- отмены;
- переносы;
- выполненные монтажи.

Средняя плановая нагрузка ориентировочно: около 3 монтажей/день.

Канонический `modules/planning.js`:

```js
export const PLANNING_SLOTS = Object.freeze({
  '1': '10:00–12:00',
  '2': '14:00–16:00',
  '3': '3-й слот / резерв',
});

const active = job => job?.status !== 'Отменён';

export function actualMontageCount(jobs = [], date) {
  return jobs.filter(job => active(job) && job.type === 'Монтаж' && job.date === date).length;
}

export function averageMontageLoad(jobs = [], dates = []) {
  if (!dates.length) return 0;
  const total = dates.reduce((sum, date) => sum + actualMontageCount(jobs, date), 0);
  return total / dates.length;
}

export function freePlanningSlots(jobs = [], date) {
  const used = new Set(
    jobs.filter(job => active(job) && job.type === 'Монтаж' && job.date === date)
      .map(job => String(job.slot || ''))
  );
  return Object.keys(PLANNING_SLOTS).filter(slot => !used.has(slot));
}

export function workloadLabel(count, average = 3) {
  if (count <= 0) return 'Свободный день';
  if (count < average) return `Нагрузка ниже средней · ${count}`;
  if (count === average) return `Средняя нагрузка · ${count}`;
  return `Выше средней · ${count}`;
}
```

`planning-view.js`:

```js
export function planningViewModel(jobs = [], date, average = 3) {
  const count = actualMontageCount(jobs, date);
  const freeSlots = freePlanningSlots(jobs, date);
  return {
    date,
    actualCount: count,
    averageLoad: average,
    workload: workloadLabel(count, average),
    freeSlots,
    planningSlots: PLANNING_SLOTS,
    hasFreePresetSlot: freeSlots.length > 0,
    overAverage: count > average,
    unlimited: true,
  };
}
```

Completed jobs count toward actual daily montage metric. Cancelled jobs do not.

---

# 4. РОЛИ

Канонические роли:

```js
export const ROLES = Object.freeze({
  MANAGER: 'manager',
  INSTALLER: 'installer',
  STORE: 'store',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.MANAGER]: 'Менеджер',
  [ROLES.INSTALLER]: 'Монтажник',
  [ROLES.STORE]: 'Магазин',
});
```

Права:

### manager
- все заявки;
- свои заявки;
- планирование;
- деньги;
- свои деньги;
- заявки магазинов;
- внутренние детали.

### installer
- свои выезды;
- свои деньги.

### store
- планирование;
- заявки магазина.

Unknown/inactive profile не получает privileged fallback.

Store должен быть scoped через `storeId`.

UI не является security boundary.

Role UI пока не полностью активирован; модель уже есть.

---

# 5. FIREBASE / SECURITY

Firebase project: `montaj-39`.

Основная рабочая база:
- `/appData/shared`
- `/appData/notes`

Firestore — source of truth.

Нельзя использовать localStorage/sessionStorage как рабочую БД.

Текущие Rules содержат compatibility-доступ для двух операторских аккаунтов. Это временный слой и его нельзя самовольно удалять/менять до проверки UID/profile.

Важный факт о владельцах операторских аккаунтов из текущего проекта:
- `tkrp@bk.ru` — Анатолий/Толя, основной создатель/admin;
- `titoworld@bk.ru` — партнёр.

Не публиковать эти адреса дополнительно в UI/документации без необходимости.

Нельзя ослаблять Rules до «любой авторизованный пользователь может читать всё».

Целевая архитектура security:
Auth → UID → user profile → role/store scope → Firestore Rules.

---

# 6. ПРОБЛЕМА FIREBASE, КОТОРАЯ БЫЛА ПОЧИНЕНА

Была серия Preview, где приложение показывало:
`Не удалось получить общую базу · ошибка`

После forensic-аудита выяснилось, что это не обязательно была сама Firestore ошибка: текущий `loadServer()` смешивал в одном try/catch:
- Firestore read;
- normalize;
- render.

Поэтому локальная ошибка UI могла маскироваться как ошибка базы.

Кроме того, в `design/today-v2` был regression относительно `step6-ui-system`:
- `getDocFromServer()` был заменён на `getDoc()`;
- чтение notes было отделено;
- изменился порядок bootstrap/realtime.

Рабочее решение было вернуть серверное чтение и разделить error boundaries.

Также использовалось принудительное обновление Auth token перед Firestore read как защитная мера.

Важно: не утверждать, что token race был доказан единственной первопричиной. Точный forensic вывод был: ошибка была в runtime/bootstrap/error boundary, а текущий рабочий Preview подтвердил восстановление data path.

---

# 7. ФАКТИЧЕСКОЕ ПОДТВЕРЖДЕНИЕ, ЧТО FIREBASE РАБОТАЕТ

Пользователь открыл Preview на iPhone и получил реальные данные.

На экране были:
- `2 монтажа` сегодня;
- клиент `Сухорукова Алиса Андреевна`;
- `10 400 ₽`;
- клиент `Вячеслав`;
- `11 500 ₽`;
- неделя `58 270 ₽`;
- месяц `228 272 ₽`;
- ближайшие дни с реальными значениями;
- заметка `Срочно купить мешки для пылесоса`.

Это является фактическим smoke-доказательством, что:
Firebase Auth → Firestore → state → Today → UI
работает в Preview.

---

# 8. CURRENT UI / APPROVED VISUAL DIRECTION

Пользователь прислал визуальный референс Montaji AA.

Референс показывает premium mobile app в тёмно-зелёной/olive эстетике:

### Today
- dark hero;
- greeting/avatar/bell;
- крупный доход;
- фактическая нагрузка;
- монтажи карточками;
- телефон/карта/подробности;
- расходы;
- заметки;
- ближайшие дни;
- нижняя навигация.

### Schedule / График
- календарь месяца;
- визуальная загрузка дней;
- монтажи по времени;
- свободное плановое окно;
- `+ Добавить монтаж`.

### Money / Деньги
- период;
- чистый доход;
- доход/расход/долги;
- разбивка по источникам;
- график.

### Clients / Клиенты
- поиск;
- фильтры магазинов;
- список клиентов;
- количество выездов;
- история.

### More / Ещё
- Excel-база;
- резервная копия JSON;
- восстановление JSON;
- настройки;
- аккаунт;
- помощь;
- feedback;
- версия.

### New Job
- единый modal/sheet;
- типы: монтаж / замер / другое;
- клиент;
- дата/время;
- адрес;
- комментарий;
- сохранить.

### Job Detail
- статус;
- время;
- клиент;
- телефон;
- адрес;
- комментарий;
- фото;
- checklist;
- завершение монтажа.

---

# 9. ВАЖНАЯ ПРЕТЕНЗИЯ ПОЛЬЗОВАТЕЛЯ К UI

После первых визуальных итераций пользователь прямо сказал:

> «Пока вообще не похоже на референс».

Это надо воспринимать буквально.

Текущий UI функционально работает, но визуально всё ещё недостаточно близок к референсу.

Нельзя делать очередной проход в стиле «чуть подкрутили CSS» и объявлять его готовым.

Нужна работа именно по композиции экранов:
- размеры блоков;
- вертикальный ритм;
- иерархия;
- hero;
- навигация;
- карточки;
- sheets;
- графики;
- density;
- premium visual language.

Пользователь согласовал направление: брать присланный референс как визуальную основу, но не копировать его буквально и не ломать бизнес-логику.

---

# 10. КРИТИЧЕСКАЯ ОШИБКА, КОТОРАЯ УЖЕ ИСПРАВЛЕНА

При одной из визуальных итераций `profile-ui.js` заменил DOM target `#topDate`, а `app.js` продолжал обращаться к нему.

На iPhone возникало:
`null is not an object (evaluating $('#topDate').textContent=...)`

Исправление сохранило canonical `#topDate` target.

После этого пользователь получил рабочий Today с реальными данными.

Не повторять паттерн: визуальный модуль не должен ломать DOM contracts основного app.js.

---

# 11. CURRENT PROJECT ARCHITECTURE

Canonical runtime:

`index.html → boot.js → app.js/modules → Firebase`

`boot.js` должен оставаться намеренно простым.

Текущий принцип:
- никаких source rewriting;
- никаких Blob imports;
- никаких CDN snapshots;
- никаких runtime patch loaders;
- никаких `source.replace()` hacks;
- никаких новых «fix.js» для обхода архитектуры.

Есть исторические/legacy CSS layers:
- `ux-upgrades.css` — deprecated marker;
- `premium-field-tech.css` — deprecated marker.

Canonical visual layer:
`montaji-design-v2.css`

Но следующий UI pass должен идти к цельной композиции, а не бесконечно добавлять CSS patches.

---

# 12. CANONICAL UX CONTRACT

Primary surface Today/Calendar должен быть простым и operational.

Операционные действия должны открываться в Day Sheet / Details.

Job card должна быть компактной.

На Today не надо превращать каждую карточку в панель управления.

Кнопка `Подробнее` ведёт в detail sheet.

Detail sheet содержит:
- client;
- time/type/store;
- status;
- amount;
- address;
- phone;
- comment;
- Yandex/2GIS;
- call;
- share address;
- `✓ Выполнено`, если доступно;
- `Изменить данные`.

Legacy statuses `В пути` / `На объекте` нормализуются в `Запланирован`.

---

# 13. COMMENTS / TEST DATA

Комментарии должны быть видны компактно в карточках, максимум примерно 2 строки с `Показать полностью`.

Есть legacy enhancer `job-card-enhancer.js`.

Он:
- добавляет комментарии;
- использует realtime retry после Firebase init;
- умеет определять test records по `/тест/i` в client/comment;
- позволяет удалять только test-labelled records;
- обычные jobs остаются archive-only.

Был исправлен MutationObserver infinite loop / iPhone freeze.

В будущем комментарии желательно перенести в canonical `jobCard()` и убрать duplicate listener, но не делать это одновременно с критическим Firebase/release фиксами без необходимости.

---

# 14. NOTES

Notes находятся в Firestore:
`/appData/notes`

Они realtime через `onSnapshot`.

Сохранение — transaction.

Notes не должны ломать загрузку общей базы, если чтение notes упало.

Пользователь отдельно спрашивал, настоящие ли заметки из DB. Ответ: да, рабочая модель использует Firestore, а не localStorage.

---

# 15. CURRENT BRANCH / PR HISTORY

Основная текущая ветка визуальной работы:
`design/today-v2`

PR #25:
`Design: Today v2 visual direction`

Base:
`step6-ui-system`

Head на одной из последних проверок менялся несколько раз; Vercel автоматически создаёт Preview для branch.

Важные исторические PR:

### PR #21
`Step 3: canonical unlimited montage planning`
Head:
`ccb58107ee13d0bb4dc132be717783387898b142`

### PR #22
`Step 5A: canonical role model`
Head:
`a7f13fed2adf890cc75887b8e465ab639c7e7fac`

### PR #23
`Step 6A: canonical UI/UX inventory`
Head:
`4af2ee6afdf59eca56aec127372330306a5f63c`

### PR #24
`Step 6B: canonical UI/UX design system`
Head:
`f0b16642f18bdca25f2b6900253ab99ba8df463d`

### PR #25
`Design: Today v2 visual direction`
Preview-only; no Firebase Rules/data changes; no production deployment.

---

# 16. IMPORTANT COMMITS / FIXES

`dbfba21b7b1f56ec20efeda68b37a9f51a04295a`
`fix(firebase): start realtime sync before bootstrap read`

`bb60f41cda27c5927ef5cb67d8e629e17fe85725`
`fix(today): separate upcoming planner columns`

`0c1f8b17f4bfd2f4c880f4b1ebbea3add5cc9664`
`fix(firebase): remove bootstrap/realtime race`

`b076fe7928e2d588c0f16fce24e9ba82482b8757`
Message claimed token refresh, but the actual change was cache-busting only. DO NOT describe it as a functional token-refresh fix.

`6201517c69c51e59630e202ce936b913935ef4fd`
`fix(firebase): restore server bootstrap and isolate render errors`

`eb43bd2b74b0036b8b5c18967dd1744e5969f7ed`
`fix(profile): preserve canonical top date target`

`b12d7ac19dadf299e735e50183d469c0316d5a7a`
`design(today): bring premium mobile visual system closer to approved concept`

---

# 17. VERCEL

Correct Vercel project:
- project: `montaji`
- connected repo: `to1le39rus-cyber/Montaji`
- root directory was corrected from legacy `secure-app` to repository root.

Do NOT touch unrelated Vercel projects.

Latest known READY deployment at time of this handoff:
- commit `b12d7ac19dadf299e735e50183d469c0316d5a7a`
- branch `design/today-v2`
- deployment URL: `montaji-ifl5kjnkh-to1le39us-3814s-projects.vercel.app`

Previous confirmed working Firebase/UI deployment:
- commit `eb43bd2b74b0036b8b5c18967dd1744e5969f7ed`
- deployment URL: `montaji-o2rfmjdat-to1le39us-3814s-projects.vercel.app`

A Preview share URL may expire. Prefer fresh deployment URL when checking.

---

# 18. CI

Workflow:
`.github/workflows/validate.yml`

Intended checks:
- `npm test`;
- production wiring;
- Russian map routing;
- Firestore Rules presence;
- no legacy production wiring.

At one point GitHub Actions was failing before executing steps:
`steps: []` / job infrastructure failure.

Therefore:
- do not claim CI green without a real successful run;
- distinguish app/runtime success from CI runner success.

Production deployment workflow:
`.github/workflows/deploy.yml`

It deploys Hosting + Firestore rules from `Astera-smart` to project `montaj-39`.

Do not change production workflow casually.

---

# 19. QA MATRIX / RELEASE GATE

Release must cover at minimum:

### Business
- 0 montage day;
- 1 montage;
- 2 montage;
- 3 montage;
- 4 montage;
- 5 montage;
- 6+ montage;
- additional montage without planning slot;
- cancelled montage;
- completed montage;
- rescheduled montage;
- income independent from montage count;
- expenses;
- debts;
- notes;
- history.

### Roles
- manager;
- installer;
- store;
- unknown/inactive.

### Devices
- iPhone Safari;
- Android if available;
- two phones / realtime;
- offline/reconnect;
- PWA.

### UX
- Today;
- Calendar;
- Money;
- Clients;
- More;
- New Job;
- Job Detail;
- Day Sheet;
- notes;
- expense sheet;
- notifications/profile.

### Security
- UI cannot bypass Rules;
- role scope enforced server-side;
- no broad signed-in access;
- no working data in localStorage/sessionStorage.

---

# 20. WHAT IS CURRENTLY GREEN / YELLOW / RED

## GREEN
- Firebase real data loading in Preview;
- Auth path;
- Today data rendering;
- actual montage count;
- 3/3 is not hard limit;
- 4–6+ business model;
- comments;
- notes;
- upcoming days;
- canonical planning model;
- no runtime Blob/source replacement architecture;
- profile top-date DOM regression fixed.

## YELLOW
- full visual parity with approved reference;
- Calendar redesign;
- Money redesign;
- Clients redesign;
- More redesign;
- New Job sheet visual implementation;
- Job Detail visual implementation;
- role-specific UI;
- security migration from compatibility email layer to UID/profile;
- cleanup of legacy visual/enhancer layers.

## RED / NOT RELEASE-CLOSED
- CI must be genuinely green;
- final full smoke test;
- production release approval.

---

# 21. TEAM OPERATING SYSTEM

Команда должна работать как мини product team:

1. Canonical contract first.
2. Architecture inventory.
3. Business semantics.
4. Runtime/Firebase.
5. UX contract.
6. UI system.
7. Role/security.
8. QA.
9. Release.
10. Audit.

Правило для следующего чата:

**Не отдавать пользователю работу по поиску причины, если её можно установить по репозиторию, CI, Vercel или коду.**

Пользователь должен получать только:
- что сделано;
- что реально подтверждено;
- ссылку на Preview, если нужна его проверка;
- короткий список действий.

---

# 22. ПОСЛЕДНИЕ СКРИНШОТЫ / ФАКТИЧЕСКОЕ СОСТОЯНИЕ

Последний пользовательский screenshot показал рабочий Today:
- приветствие `Привет, Анатолий! 👋`;
- дата `среда, 16 сентября`;
- `2 монтажа`;
- сегодня `0 ₽` чистыми;
- неделя `58 270 ₽`;
- месяц `228 272 ₽`;
- блок `Что важно`;
- `Завтра одно плановое монтажное окно свободно`;
- две карточки сегодняшних монтажей;
- расходы сегодня;
- ближайшие дни;
- заметка `Срочно купить мешки для пылесоса`;
- нижняя навигация.

Пользователь после этого сравнил экран с референсом и сказал:
`Пока вообще не похоже на референс`.

Следовательно, следующий основной фокус — **не Firebase, а серьёзная композиционная переработка UI под референс при сохранении рабочего runtime.**

---

# 23. РЕФЕРЕНС — КАКОЕ ОЩУЩЕНИЕ НУЖНО ПОЛУЧИТЬ

Не просто:
`тот же экран + другой CSS`.

Нужно ощущение одного цельного продукта:
- тёмный premium hero;
- deep olive / graphite;
- крупная типографика;
- выразительные цифры;
- мягкие rounded surfaces;
- controlled contrast;
- визуальный фокус на сегодняшнем дне;
- компактные operational cards;
- аккуратная нижняя навигация;
- большие touch targets;
- sheets/modals в том же языке;
- календарь и деньги как полноценные product screens.

При этом референс — направление, а не источник для выдумывания данных.

---

# 24. ЧТО НЕ ДЕЛАТЬ

НЕ:
- менять Firebase Rules без approval;
- менять production без approval;
- возвращать лимит 3 монтажа;
- блокировать 4-й монтаж;
- использовать localStorage как рабочую базу;
- добавлять runtime source-replace/Blob/CDN patch;
- плодить `fix-v2`, `fix-final`, `fix-final2` modules;
- считать красивый screenshot доказательством backend;
- считать Vercel READY доказательством Firebase;
- считать CI зелёным, если job не выполнился;
- ломать существующие DOM IDs при визуальной переработке;
- переделывать сразу Firebase + security + UI без промежуточной проверки.

---

# 25. РЕКОМЕНДУЕМЫЙ СЛЕДУЮЩИЙ ШАГ

1. Прочитать этот файл целиком.
2. Проверить актуальный `design/today-v2` HEAD и diff относительно `step6-ui-system`.
3. Зафиксировать текущий working Firebase runtime как baseline.
4. Сделать UI overhaul экран за экраном:
   - Today;
   - Calendar;
   - Money;
   - Clients;
   - More;
   - New Job;
   - Job Detail.
5. После каждого крупного блока проверять, что data/DOM contracts не сломались.
6. Запустить `npm test` и CI.
7. Сделать fresh Vercel Preview.
8. Самостоятельно провести максимально полный static/code audit.
9. Только после этого дать пользователю ссылку на smoke-check.
10. Production — только после явного approval.

---

# 26. ПЕРЕДАЧА НОВОМУ ЧАТУ — КОРОТКО

**Если нужно понять проект за 30 секунд:**

> Montaji AA — мобильное приложение монтажников. Firebase уже реально подключён и отдаёт реальные данные в Preview. Главная бизнес-ошибка, которую нельзя допустить: 3 плановых окна ≠ лимит 3 монтажа. 4–6+ монтажей валидны. Сейчас главная задача — довести UI до визуального уровня присланного premium reference, не ломая Firebase, бизнес-логику, роли и security. Production не трогать. CI пока не считать зелёным без реального успешного run. Работать через canonical architecture, без runtime-костылей. Пользователя не гонять по кругу — команда сама делает audit и даёт только нужные проверки.

---

# 27. ПРИМЕЧАНИЕ О ПОЛНОМ ТЕКСТЕ ПРЕДЫДУЩЕГО ЧАТА

Этот файл — не машинная стенограмма каждого сообщения слово-в-слово. Он представляет собой максимально подробный структурированный handoff, собранный из доступного контекста проекта, решений, технических проверок, коммитов, ошибок, пользовательских требований и последних состояний.

Если следующему чату нужен именно дословный архив каждого сообщения, его следует экспортировать отдельно из истории ChatGPT. Этот файл предназначен прежде всего для того, чтобы новый чат мог продолжить инженерную работу без потери решений и контекста.
