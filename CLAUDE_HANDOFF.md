# МОНТАЖИ AA — HANDOFF FOR CLAUDE / PRODUCTION TAKEOVER

Дата handoff: 20.08.2026

## 0. РОЛЬ CLAUDE

Ты принимаешь существующий production-проект «МОНТАЖИ AA» как senior engineering/product team уровня production.

Не относись к проекту как к учебному прототипу и не начинай переписывать его с нуля.

Твоя задача — самостоятельно:

1. изучить весь репозиторий и историю/структуру проекта;
2. понять реальные бизнес-процессы монтажников;
3. проверить текущий runtime и deployment;
4. найти ВСЕ существующие ошибки, регрессии, архитектурные долги, UX-проблемы, security-проблемы и несоответствия документации коду;
5. исправлять найденное самостоятельно, а не ждать от Product Owner список ошибок;
6. после каждого существенного изменения добавлять/обновлять regression tests;
7. не ломать существующие реальные данные Firestore;
8. довести продукт до состояния ежедневного production-инструмента, которым можно пользоваться каждый день на двух телефонах.

Главный принцип:

**Не чини симптом. Найди нарушенный контракт, исправь источник проблемы и добавь проверку, которая не позволит ей вернуться.**

---

# 1. ПРОДУКТ

Название: **МОНТАЖИ AA**.

Это рабочее PWA-приложение для монтажной команды Анатолий / Александр.

Основная ценность:

**запланировал → приехал → выполнил → получил деньги → сохранил историю.**

Приложение должно быть быстрее и проще обычного телефона/таблицы, а не превращаться в CRM-монстра.

Это внутренний рабочий продукт сейчас, но архитектура должна быть достаточно качественной, чтобы в будущем его можно было масштабировать/продавать.

---

# 2. ЧТО ДОЛЖНО БЫТЬ В ПРОДУКТЕ

Основные разделы:

- Сегодня / Dashboard
- График / календарь
- Выезды
- Новый выезд
- Замеры
- Клиенты
- Деньги
- Расходы
- Долги
- История
- Общие заметки
- Архив заметок
- Backup / Restore
- Быстрые действия

Типы выездов:

- Монтаж
- Замер
- Рекламация
- Доставка
- Сервис
- Доп. доход

Карточка выезда должна давать быстрые действия:

- открыть Яндекс.Карты;
- открыть 2ГИС;
- позвонить;
- отправить адрес;
- В пути;
- Выполнено;
- Оплачено для выполненного неоплаченного выезда.

---

# 3. БИЗНЕС-ИНВАРИАНТЫ — НЕ НАРУШАТЬ

1. Отменённый выезд никогда не считается доходом.
2. Невыполненный выезд никогда не считается доходом.
3. Выполненная, но не оплаченная работа остаётся доходом и одновременно формирует долг.
4. Долг НЕ вычитается из дохода.
5. Расход уменьшает чистый результат.
6. Чистыми = доход − расходы.
7. История не уничтожается физическим удалением.
8. Отмена — архивное состояние, а не hard delete.
9. Количество монтажей в день НЕ должно искусственно ограничиваться тремя.
10. Слоты 10:00–12:00, 14:00–16:00 и третий слот — пресеты времени, а не бизнес-лимит количества монтажей.
11. Выполненный монтаж продолжает занимать своё фактическое окно в истории дня.
12. Замер — самостоятельная сущность/история.
13. Замер имеет собственное время, стоимость и статус оплаты.
14. Замер может быть явно перенесён в монтаж.
15. При конвертации сохраняется связь `convertedToJobId` / `convertedFromMeasureId`.
16. Оплаченный замер может быть зачтён в будущий монтаж через `measureCredit`.
17. Исходная запись замера никогда не должна исчезать при конвертации.
18. Ошибка notes не должна делать shared-базу недоступной.
19. Ошибка сети не должна показываться пользователю как «пустая актуальная база».
20. Два телефона должны видеть один source of truth.
21. Повторное нажатие на бизнес-действие не должно удваивать деньги/создавать дубликаты.
22. После перезагрузки данные должны оставаться корректными.
23. Любая новая функция обязана учитывать существующие данные.

---

# 4. DATA / FIREBASE

Основной backend: Firebase / Cloud Firestore.

Firebase project:

`montaj-39`

`.firebaserc` указывает:

`projects.default = montaj-39`

Основной source of truth:

`appData/shared`

Отдельный bounded dataset для заметок:

`appData/notes`

Firestore rules сейчас построены вокруг `request.auth != null`.

Текущий репозиторий содержит Firebase client config в `firebase-config.js`.

ВАЖНО: реальные production-данные не мигрировать, не очищать и не заменять новой Firebase project без крайней необходимости и явного согласования.

Рабочая архитектура должна использовать:

- Firestore как source of truth;
- `onSnapshot` для realtime;
- `runTransaction` для конкурентно безопасных записей;
- server-backed загрузку (`getDocFromServer` с корректным fallback), если это предусмотрено текущей реализацией;
- отсутствие localStorage/sessionStorage как рабочей БД.

Проверь реальный код, а не доверяй этому документу на слово.

---

# 5. АВТОРИЗАЦИЯ — ОСОБО ПРОВЕРИТЬ

В репозитории есть признаки перехода/изменения auth-архитектуры:

- `firebase.json` сейчас указывает `emailPassword: true`, `anonymous: false`;
- старые operating/audit документы описывают Anonymous Auth;
- текущий UI уже показывает Email + Password login;
- на мобильном Safari пользователь наблюдал проблему: после ввода корректных данных и нажатия «Войти» страница обновляется/возвращается к форме входа вместо открытия приложения;
- недавние commits прямо касались auth/mobile boot.

**Не предполагай причину. Самостоятельно исследуй полный auth lifecycle:** initialization → auth listener → UI binding → submit → persistence → Firestore access → redirect/render → reload → mobile Safari.

Найди первопричину и исправь её архитектурно.

После исправления обязательно проверить:

- правильный логин;
- неправильный пароль;
- повторный submit;
- refresh;
- закрытие/открытие Safari;
- второй телефон;
- отсутствие гонки между auth и UI/data initialization;
- отсутствие ложного logout;
- отсутствие бесконечного boot/loading;
- отсутствие потери данных.

---

# 6. ТЕКУЩИЙ FRONTEND / CODEBASE

Репозиторий:

`to1le39rus-cyber/Montaji`

GitHub:

`https://github.com/to1le39rus-cyber/Montaji`

Production branch:

`Astera-smart`

Default branch:

`Astera-smart`

Основные файлы:

- `index.html` — основной entry;
- `app.js` — основной application runtime, большой монолитный JS;
- `boot.js` — текущий compatibility/boot layer; требует архитектурного аудита;
- `styles.css` — основной UI;
- `ux-upgrades.css` — дополнительные UX/UI улучшения;
- `firebase-config.js` — Firebase client config;
- `firebase.json` — Firebase hosting/auth config;
- `firestore.rules` — Firestore rules;
- `.firebaserc` — Firebase project binding;
- `manifest.json` — PWA manifest;
- `icon.svg` — app icon;
- `sync-recovery.js` — sync/recovery helper;
- `secure-app/index.html` — отдельный/защитный loader, который также требует аудита;
- `tests/final-architecture.test.mjs` — regression architecture tests;
- `.github/workflows/deploy.yml` — CI/deploy workflow;
- `.github/workflows/validate.yml` — validation workflow;
- `README.md` — project architecture;
- `MONTAZHI-AA-OPERATING.md` — operating rules;
- `TEAM-OPERATING-SYSTEM.md` — roles/release discipline;
- `QA-MATRIX.md` — QA matrix;
- `FINAL_AUDIT.md` — previous production audit.

Package scripts:

`npm test`

currently runs:

- `node --check app.js`
- `node --check boot.js`
- `node --test tests/final-architecture.test.mjs`

---

# 7. CURRENT GIT STATE

Current production branch:

`Astera-smart`

Current latest commit observed:

`61c75a4783e884a3b4e6e8fd0d96c38cc29e96e7`

Commit message:

`fix: update Vercel secure-app root loader`

The recent history contains multiple emergency/stabilization changes around:

- mobile auth;
- Vercel secure-app loader;
- Firebase Hosting alignment;
- deterministic production boot;
- shared database preservation;
- scheduling capacity;
- QA wrapper loading;
- runtime patches.

This means the project needs an actual architectural audit, not another blind patch.

Inspect git history, diffs, current branch and workflows before making substantial changes.

---

# 8. VERCEL

Vercel team:

`to1le39rus-3814's projects`

Team ID:

`team_AqURv7o5lGiBp2T1wCdtK6xz`

Vercel project:

`montaji`

Project ID:

`prj_2n1QbRxgGsBGlwwIRTwltDQii551`

Known domains:

- `https://montaji.vercel.app`
- `https://montaji-to1le39rus-3814s-projects.vercel.app`

A recent READY production deployment was:

`dpl_92WNofss9Jx6VEEi5S8xcNZ3nv64`

Deployment URL:

`https://montaji-p9l42gu2r-to1le39rus-3814s-projects.vercel.app`

There was also a recent ERROR deployment, so deployment history must be checked rather than assuming green means the whole chain is healthy.

IMPORTANT ARCHITECTURE QUESTION:

The repository documentation says Firebase Hosting is the intended production channel, while the actual current Vercel project is actively used for preview/production-like QA and the current mobile login issue was observed there.

Do not blindly choose one platform. Inspect:

- GitHub Actions;
- Firebase Hosting config;
- Vercel project/deployments;
- current entrypoints/loaders;
- production vs preview behavior;
- whether Vercel is acting as QA, production, or wrapper.

Then make the deployment contract explicit and reliable.

---

# 9. CURRENT DEPLOYMENT HISTORY / IMPORTANT RECENT CHANGES

Recent Vercel deployments included commits/messages around:

- `fix: update Vercel secure-app root loader`
- `fix: bind auth before UI to prevent mobile login reload`
- `fix: make auth failure visible on mobile`
- `fix: repair secure Vercel wrapper script parsing`
- `fix: inline QA CSS in Vercel wrapper`
- `fix: load app.js from QA raw source`
- `fix: make Vercel QA wrapper load current QA app and CSS`
- `test: open final production QA gate`
- `docs: align release gate with Firebase Hosting`
- `docs: align production architecture and deployment contract`
- `test: enforce unlimited scheduling and deterministic boot`
- `fix: make production boot deterministic and preserve shared database`
- `fix: stabilize database boot and remove montage cap`

Treat this history as evidence that the project has been through several stabilization passes. Find the underlying architecture and remove unnecessary temporary layers instead of adding more.

---

# 10. KNOWN CURRENT USER-OBSERVED ISSUE

On iPhone Safari:

1. Open app.
2. Login screen appears.
3. User enters valid email and password.
4. Presses `Войти`.
5. Page appears to refresh / returns to login instead of reliably entering the application.

There have also been moments where the page appeared as almost completely unstyled HTML, suggesting an entrypoint/loader/CSS/runtime loading problem in at least one deployment path.

The user does NOT want to dictate a patch.

**You must reproduce, diagnose and fix the problem yourself.**

Also audit the whole application for similar hidden problems.

---

# 11. USER'S PRODUCT EXPECTATION

The owner wants a product that:

- works every day;
- is fast on iPhone;
- is reliable on two phones simultaneously;
- never silently loses data;
- never invents empty data when the database is unavailable;
- makes daily work obvious in seconds;
- handles money correctly;
- keeps history;
- has strong error states;
- survives reloads;
- is maintainable by another engineer;
- can later become a polished product rather than a pile of patches.

Do not optimize for showing a pretty screenshot while breaking business logic.

Do not optimize for passing static tests while live mobile usage is broken.

---

# 12. TEAM ROLES YOU MUST SIMULATE

Operate as an independent production team, not as a single code generator.

### Product Owner
Protect the single product goal and prevent features from destroying the daily workflow.

### Chief Product Strategist
Translate real work into the flow:

`график → выезд → выполнение → деньги → история`.

For every change ask:

- зачем это монтажнику;
- экономит ли время;
- создаёт ли новый путь ошибки;
- что произойдёт с existing data.

### Principal Software Architect
Own:

- source of truth;
- data model;
- concurrency;
- auth lifecycle;
- deployment architecture;
- removal of hidden data stores;
- migration safety.

### Principal Frontend Engineer
Own:

- code quality;
- lifecycle correctness;
- DOM safety;
- event handling;
- maintainability;
- elimination of runtime patching;
- elimination of duplicated business logic.

Red flags:

- permanent runtime patching;
- duplicate functions;
- dead UI;
- missing DOM references;
- silent catches;
- destructive writes without confirmation;
- business rules hidden in random event handlers.

### Staff UX / Interaction Designer
Make the app:

- one obvious main task per screen;
- large touch targets;
- minimum text;
- fast card actions;
- obvious loading/success/error states;
- keyboard-safe on iPhone.

### Visual Director
Audit:

- typography;
- hierarchy;
- contrast;
- CTA;
- light/dark theme;
- safe-area;
- iPhone Safari viewport;
- visual noise.

### QA Lead / Test Engineer
Every critical feature gets:

1. happy path;
2. invalid input;
3. network/database failure;
4. repeated action;
5. two-device conflict;
6. reload;
7. Safari mobile;
8. Chrome mobile/desktop.

### Security Engineer
Audit:

- Firebase Auth;
- Firestore Rules;
- access control;
- backup/restore;
- client exposure;
- future App Check/roles;
- no server secrets in client code.

### Technical Writer
Keep project docs truthful and synchronized with actual code.

### Release Manager
Before release:

- tests green;
- deployment green;
- no temporary repair workflow left behind;
- no accidental untracked production files;
- business invariants documented;
- live smoke test on Safari + Chrome;
- two-device realtime checked.

---

# 13. WORKING RULES

Before editing:

1. inspect repository tree;
2. inspect current branch;
3. inspect recent commits;
4. inspect workflows;
5. inspect app.js / boot.js / index.html / styles;
6. inspect Firebase config and rules;
7. inspect tests;
8. inspect current deployment;
9. reproduce the observed issue;
10. identify root cause.

Then change the minimum necessary architecture, but do not preserve a bad architecture merely because it is old.

If runtime patching can be removed safely, remove it.

If a loader is unnecessary, simplify it.

If auth initialization is racing UI initialization, fix the lifecycle rather than adding a timeout.

If business logic is duplicated, centralize it.

If documentation contradicts code, determine the intended contract from the actual working product and then update documentation.

Do not create `app-v2`, `app-v3`, `v4`, etc. as a substitute for fixing architecture.

Do not create a second Firebase project.

Do not create a second database.

Do not silently migrate or delete existing production data.

Do not use localStorage/sessionStorage as the primary working database.

Do not mask errors with fake empty states.

Do not stop at the first visible bug. Perform a broad production audit.

---

# 14. REQUIRED DELIVERABLES FROM CLAUDE

At the end of the takeover, provide:

### A. Audit
A concise list of:

- bugs found;
- root causes;
- architecture debts;
- security issues;
- UX issues;
- deployment issues;
- documentation inconsistencies.

### B. Changes
For each change:

- what changed;
- why;
- files changed;
- regression test added/updated.

### C. Verification
Report:

- `npm test` result;
- syntax checks;
- critical business scenario checks;
- auth checks;
- realtime/two-device checks;
- Safari mobile checks;
- Chrome checks;
- deployment checks.

### D. Remaining risks
Explicitly list anything that cannot be verified from the available environment.

### E. Production decision
State one of:

- READY FOR PRODUCTION
- READY WITH KNOWN NON-BLOCKING RISKS
- NOT READY

Never claim READY based only on static tests.

---

# 15. DO NOT ASK THE OWNER TO FIND THE BUGS FOR YOU

The owner has already provided the product goal and the observed symptom.

From here, **you are expected to investigate the repository, deployment and runtime yourself.**

Do not respond with:

- «пришлите код»;
- «какой файл исправить?»;
- «какая именно ошибка?»;
- «что именно мне изменить?»

The repository and deployment context are the starting point.

Ask the owner only when a genuinely product-level decision cannot be inferred safely.

---

# 16. SOURCE DOCUMENTS ALREADY IN REPOSITORY

Read these before coding:

- `README.md`
- `MONTAZHI-AA-OPERATING.md`
- `TEAM-OPERATING-SYSTEM.md`
- `QA-MATRIX.md`
- `FINAL_AUDIT.md`

Important: these documents are context, not unquestionable truth. If they conflict with the actual code/runtime, identify the conflict and resolve it deliberately.

---

# 17. FINAL PRODUCT STANDARD

The finished product should feel like a serious internal tool built by a strong engineering/product team:

**быстро. надёжно. понятно. без сюрпризов.**

A montage worker should be able to open the app, understand today in seconds, open a job, navigate/call/message, mark status, record payment/expense, and move on — without thinking about the underlying technology.

Technology exists to protect that workflow, not the other way around.
