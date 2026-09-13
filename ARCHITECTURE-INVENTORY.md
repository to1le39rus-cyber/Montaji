# ARCHITECTURE INVENTORY — Монтажи АА

Дата аудита: 2026-09-13  
Каноническая ветка: `Astera-smart`  
Исходный baseline: `d43ccb9cab809b4178e745e3c299e046abb3af8d`

## 1. Целевая схема

```text
index.html
   ↓
app.js / canonical modules
   ↓
Firebase Auth + Firestore
```

Все остальные runtime/patch layers должны либо стать обычными модулями, либо быть признаны legacy и удалены после проверки.

## 2. Фактический root runtime

| Файл | Фактическая роль сейчас | Целевое решение |
|---|---|---|
| `index.html` | основной UI shell; запускает `boot.js` | сохранить, после Step 2 запускать canonical runtime |
| `app.js` | основное бизнес-ядро + UI | сохранить как canonical source, постепенно модульнизировать |
| `boot.js` | loader + runtime source patching + Blob imports | убрать постоянную бизнес-логику; тонкий entrypoint или прямой `app.js` |
| `firebase-config.js` | Firebase config | сохранить; security review отдельно |
| `firebase.json` | Firebase Hosting/Auth config | сохранить, проверить в security step |
| `firestore.rules` | access control | сохранить, отдельный аудит |
| `manifest.json` | PWA manifest | сохранить, улучшить icons отдельно |
| `styles.css` | базовая дизайн-система | сохранить как canonical base |

`boot.js` сейчас загружает `app.js`, меняет его исходник через несколько `source.replace(...)`, создаёт `Blob` и импортирует получившийся код; затем тем же способом подмешивает notes/money/debt runtime. Это подтверждает, что runtime patching — реальная часть запуска, а не только исторический артефакт. fileciteturn49file0L1-L7

## 3. Root HTML/CSS graph

`index.html` подключает `styles.css`, `ux-upgrades.css`, `premium-field-tech.css`, `montaji-design-v2.css`, а в конце запускает `boot.js`. Сам shell уже содержит основные экраны Today / Calendar / Money / Clients / More, форму выезда, FAB и нижнюю навигацию. fileciteturn50file0L1-L7

Следствие: Step 2 нельзя делать простым удалением `boot.js`; сначала нужно встроить его полезные patches в canonical source и проверить все feature layers.

## 4. Data layer

`app.js` использует два Firestore-документа:

- `appData/shared` — общие рабочие данные;
- `appData/notes` — заметки.

Операции: `getDocFromServer`, `onSnapshot`, `runTransaction`. При отсутствии сети/ошибке серверной загрузки состояние сбрасывается, чтобы старые данные не выдавались за актуальные. `saveShared()` и `saveNotes()` используют транзакции. fileciteturn51file0L1-L2

**В рамках Step 1/2 Firebase data не трогаем.**

## 5. `secure-app/` — второй runtime

`secure-app/index.html` — отдельный dynamic loader. Он:

1. тянет `index.html`, CSS, `boot.js` и config со старого CDN commit `a467a5e...`;
2. добавляет множество локальных CSS layers;
3. добавляет отдельные JS runtime layers;
4. переписывает HTML и `boot.js` строковыми replacement-операциями;
5. создаёт итоговый module script динамически.

То есть это не альтернативный чистый `index.html → app.js`, а отдельное поколение runtime. Его нельзя использовать как canonical production path. Фактическая схема подтверждена loader. fileciteturn55file0L1-L7

## 6. Release wiring

В репозитории найдено CDN-направление через `jsdelivr` внутри `secure-app`, включая старый commit. Также обнаружено Vercel rewrite-направление на `secure-app/index.html` и CDN assets. Следовательно, release path исторически мог обходить canonical root runtime. Это нужно закрыть отдельным release audit до production cleanup. fileciteturn60file0L1-L24

## 7. Feature layers / поколения

### Root/feature

- `money-ui.js` и `money-ui-v2.js` — несколько поколений Money UI;
- `debt-ui.js` — отдельный debt UI;
- `notes-ui.js` — отдельный notes runtime.

### Secure/preview

Наблюдаются слои для archive/delete, auth polish, important notes, Today, calendar windows, Day Sheet, clients, history, quick add, task UI/projection, date fields и feedback.

Пока они классифицируются как **legacy/secondary until proven canonical**. Нельзя удалять их только из-за названия `*-final`, `*-polish` или `*-fix`: часть реально подключается secure loader.

## 8. Business hotspots

### 3/3 — исправляем семантику

В коде есть отображение `c/3` и визуальная шкала до 100% на третьем монтаже. В текущем контракте это **не лимит**:

- 3 — средний ориентир загрузки;
- 3+ — допустимо;
- три слота — планировочные пресеты;
- `freeSlot()` помогает планированию, но отсутствие свободного preset-слота не должно блокировать создание работы;
- фактическое количество монтажей, средняя нагрузка, свободные окна и деньги должны быть отдельными метриками.

### Финансы

`effectiveIncome()` учитывает только завершённые и неотменённые работы. `totals()` отдельно считает income / expenses / unpaid. Это сохраняем как основу и проверяем на 3+ монтажах и дополнительном доходе.

### Замеры

Замер — отдельный тип; стоимость, paid/credit и `convertedToJobId` должны сохраняться.

## 9. Tests / CI

`package.json` запускает `node --check app.js`, `node --check boot.js` и `tests/final-architecture.test.mjs`. fileciteturn61file0L1-L7

Тесты сейчас частично фиксируют старую архитектуру:

- требуют `boot.js` как production entry;
- требуют hardcoded operator emails;
- называют три окна `daily capacity`;
- одновременно проверяют уже правильные свойства: Firestore source of truth, realtime, transactions, отсутствие localStorage/sessionStorage, maps и финансовую семантику. fileciteturn59file0L1-L7

Следовательно, Step 2 должен не только менять runtime, но и обновлять contract tests — иначе CI будет защищать старый дизайн.

## 10. Classification matrix

| Узел | Статус | Следующее действие |
|---|---|---|
| `index.html` | active | canonicalize entry |
| `app.js` | canonical core | integrate missing patches |
| `boot.js` | patch-loader | extract then remove/simplify |
| `firebase-config.js` | canonical config | preserve |
| `styles.css` | canonical base | preserve |
| `ux-upgrades.css` | active polish layer | consolidate later |
| `premium-field-tech.css` | active polish layer | consolidate later |
| `montaji-design-v2.css` | active polish layer | consolidate later |
| `secure-app/index.html` | legacy/preview loader | remove from release path after proof |
| CDN `a467a5e...` | stale runtime snapshot | eliminate from release path |
| `money-ui*` | duplicate generations | compare + integrate |
| `debt-ui.js` | secondary runtime | compare + integrate |
| `notes-ui.js` | secondary runtime | compare + integrate |
| `day-sheet-*` / `task-*` / `date-*` | secondary feature layers | dependency + behavior audit |
| `final-architecture.test.mjs` | partially stale | rewrite during Step 2 |

## 11. What is safe / unsafe now

### Safe now
- documentation and dependency mapping;
- static source inspection;
- adding regression tests;
- building a preview branch;
- extracting logic without changing Firestore data schema.

### Not safe yet
- deleting legacy files by filename;
- changing Firestore Rules without security audit;
- changing/migrating Firestore documents;
- switching production alias blindly;
- treating `3/3` as a hard capacity constraint.

## 12. Step 2 execution plan

1. Freeze this branch as rollback point.
2. Extract every **behaviorally relevant** patch from `boot.js` into canonical `app.js`/modules.
3. Remove source rewriting and Blob imports.
4. Make `index.html → app.js` deterministic.
5. Integrate notes/money/debt behavior without changing Firestore structure.
6. Rewrite stale architecture tests to enforce the project contract, including explicit `3+` scenarios.
7. Run static/behavior checks.
8. Create a fresh preview deployment tied to the exact commit.
9. Only after preview passes, continue with CSS/legacy cleanup.

**Inventory is complete enough to begin Step 2. No deletion or Firebase migration is authorized by this document.**
