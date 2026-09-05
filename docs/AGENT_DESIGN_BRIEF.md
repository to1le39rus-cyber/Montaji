# МОНТАЖИ АА — DESIGN AGENT MASTER BRIEF

## 0. Миссия

Пересобрать интерфейс мобильного приложения «Монтажи АА» до уровня премиального iOS-продукта / award-level product design, **не меняя бизнес-логику, данные, Firebase и рабочие сценарии**.

Это не cosmetic redesign и не «накинуть новый CSS». Нужно провести полноценную UX/UI, interaction и visual-system переработку и затем внедрить её в реально работающую версию приложения.

Главный экран Today уже имеет согласованный порядок и этот порядок НЕ менять:

1. Деньги / мотивация
2. Период: неделя / месяц
3. Что важно
4. Сегодня
5. Расходы сегодня
6. Ближайшие дни
7. Заметки
8. FAB / нижняя навигация

Первый финансовый блок остаётся первым и является эмоциональным якорем.

---

# 1. Команда агентов

## AGENT 01 — Principal Product Designer / UX Strategist

Роль: главный продуктовый дизайнер и владелец UX-решений.

Уровень: 15+ лет product design, mobile-first, field-service / logistics / fintech / productivity apps.

Задача:
- изучить существующий продукт и код до проектирования;
- определить реальные задачи монтажника в течение рабочего дня;
- переработать информационную и визуальную иерархию без нарушения утверждённого порядка Today;
- убрать ощущение CRM / Excel / административной панели;
- проектировать прежде всего для одной руки, движения, улицы, солнца, плохого интернета и быстрых действий;
- каждый экран проектировать через сценарии, а не через декоративные блоки.

Deliverables:
- UX principles;
- user journeys;
- hierarchy map;
- component/state inventory;
- wireframe-level решения;
- список решений, которые нельзя ломать;
- final design direction.

Запрещено: самостоятельно менять бизнес-правила или структуру Firebase.

---

## AGENT 02 — Staff/Senior Mobile UI Designer / Visual Director

Роль: арт-директор интерфейса.

Уровень: топовая mobile product design studio, Apple-quality visual discipline, Behance/Awwwards-level craft.

Задача:
- создать собственную визуальную систему приложения;
- не копировать существующий CSS;
- не использовать шаблонные dashboard patterns;
- создать типографическую шкалу;
- spacing system;
- color system;
- elevation / surface system;
- iconography;
- button hierarchy;
- state colors;
- motion principles;
- light/dark mode.

Цель: пользователь должен почувствовать «дорогой рабочий инструмент», а не веб-таблицу.

Особенно переработать:
- financial hero;
- period metrics;
- attention layer;
- today's job;
- action hierarchy;
- expenses;
- upcoming timeline;
- notes;
- FAB;
- bottom navigation.

Не использовать дизайн ради дизайна. Любой визуальный приём должен улучшать скорость понимания или действия.

---

## AGENT 03 — Interaction / Motion Designer

Роль: interaction designer.

Задача:
- определить pressed / active / disabled / loading / success / error states;
- продумать раскрытия карточек;
- bottom sheets;
- переходы между Today / Schedule / Money / Clients / More;
- feedback после «Выполнено», «Оплачено», добавления расхода и заметки;
- micro-interactions без визуального шума.

Motion должен быть коротким, функциональным и iOS-like.

Никаких тяжёлых web-анимаций, которые тормозят старые iPhone.

---

## AGENT 04 — Design Systems Engineer

Роль: Senior Frontend / Design Systems Engineer.

Задача:
- реализовать дизайн через устойчивую систему компонентов;
- не превращать CSS в бесконечный набор override;
- не ломать существующие DOM hooks без необходимости;
- вынести токены в понятную систему;
- обеспечить адаптацию 320–430 px и более широких экранов;
- сохранить safe-area;
- сохранить touch targets минимум 44 px;
- обеспечить keyboard / modal / bottom-sheet behaviour.

Предпочтение: минимально необходимое изменение HTML, максимальная системность CSS/JS.

---

## AGENT 05 — Senior Frontend / Integration Engineer

Роль: человек, который отвечает за то, чтобы новый дизайн реально работал.

Задача:
- интегрировать новый UI в текущую рабочую версию;
- сохранить все существующие event handlers;
- сохранить Firebase auth;
- сохранить Firestore reads/writes/realtime;
- сохранить расчёты денег;
- сохранить заметки;
- сохранить календарь;
- сохранить экспорт и backup;
- сохранить ссылки карт / звонка / отправки адреса;
- не допускать расхождения двух телефонов.

Нельзя переписывать data layer только ради удобства дизайна.

---

## AGENT 06 — QA / Regression Engineer

Роль: беспощадный regression tester.

После каждого существенного изменения проверять:

### Auth
- login;
- logout;
- registration;
- password reset.

### Firebase
- initial load;
- realtime update;
- offline state;
- save transaction;
- notes transaction;
- data recovery.

### Today
- today's income;
- today's expenses;
- weekly net;
- monthly net;
- unpaid debt;
- montage load 0/3, 1/3, 2/3, 3/3;
- overdue transfers;
- completed visits;
- important insights.

### Jobs
- create;
- edit;
- delete/archive;
- change status;
- mark route;
- mark completed;
- mark paid;
- phone;
- Yandex Maps;
- 2GIS;
- share address;
- measure → montage conversion.

### Money
- add expense;
- categories;
- date filters;
- history;
- debt list;
- Excel export.

### Notes
- create;
- edit;
- archive;
- restore;
- delete;
- urgent;
- follow-up.

### Responsive
Test at minimum:
- 320×568;
- 375×667;
- 390×844;
- 393×852;
- 430×932.

---

# 2. Текущая техническая архитектура

## Repository

`to1le39rus-cyber/Montaji`

Рабочая ветка: `Astera-smart`

Production: `montaji.vercel.app`

## Current stable application source

Основное приложение находится в `index.html` + `app.js` + CSS modules.

Stable source commit used by production wrapper:

`7276a4a41ece02ce32d28bc0ee0778735775186b`

## Core files

- `index.html` — DOM structure всех экранов и modal forms.
- `app.js` — application logic, Firebase, rendering, calculations, events.
- `styles.css` — base styles.
- `ux-upgrades.css` — previous UX improvements.
- `premium-field-tech.css` — previous field-service styling.
- `boot.js` — application bootstrap.
- `firebase-config.js` — original Firebase config module.
- `secure-app/index.html` — production wrapper / integration layer.

Не удалять рабочие файлы только потому, что они не нужны визуально.

---

# 3. Firebase / data contract

Firebase project:

`montaj-39`

Firestore documents:

- `appData/shared`
- `appData/notes`

Shared data shape:

```text
{
  jobs: [],
  expenses: [],
  version: 5
}
```

Notes document contains:

```text
{
  notes: []
}
```

### Неприкосновенные правила

1. Не менять Firestore document paths.
2. Не менять data schema без отдельного согласования.
3. Не менять meaning существующих status/type/paid fields.
4. Не менять Firebase project.
5. Не добавлять mock data в production.
6. Не заменять realtime Firestore на localStorage.
7. Не отключать transaction writes.
8. Не делать silent fallback на пустую базу при ошибке сети, если это меняет пользовательское восприятие данных.

---

# 4. Job model

Каждый job нормализуется примерно с такими полями:

```text
id
date
slot
type
client
price
status
paid
completedDate
time
measurePrice
measurePaid
measureCredit
convertedToJobId
source
phone
address
store
comment
```

Основные type:

- Монтаж
- Замер
- Рекламация
- Доставка
- Сервис
- Доп. доход

Основные status:

- Запланирован
- Подтверждён
- В пути
- На объекте
- Выполнен
- Перенос
- Отменён

---

# 5. Money logic

`effectiveIncome(job)` учитывает только завершённые и не отменённые работы.

Для обычного монтажа используется `price`.

Для замера используется `measurePrice || price`.

Expenses учитываются только если `cancelled !== true`.

Today показывает:

- net = income - expenses;
- gross income;
- expenses;
- unpaid;
- montage load.

Week/month используют activity date:

- completed job → `completedDate || date`;
- otherwise job date.

**Никакой redesign не должен менять эти расчёты.**

---

# 6. Today — UX contract

## Согласованный порядок

```text
HEADER
↓
MONEY / MOTIVATION
↓
WEEK + MONTH
↓
WHAT MATTERS
↓
TODAY JOBS
↓
TODAY EXPENSES
↓
UPCOMING DAYS
↓
NOTES
↓
FAB
↓
BOTTOM NAV
```

Этот порядок является продуктовым решением. Не переставлять блоки ради «лучшего dashboard layout».

## Money hero

Должен отвечать за 1–2 секунды:

- сколько заработано чистыми сегодня;
- сколько было дохода;
- сколько потрачено;
- сколько монтажей выполнено / запланировано.

Он должен мотивировать, но не выглядеть как банковский dashboard.

## What matters

Это attention layer, а не список настроек.

Туда могут попадать:

- просроченные переносы;
- важные unpaid;
- важная загрузка завтра;
- срочные notes.

Каждый item должен иметь ясную причину существования и действие.

## Today job

Карточка должна быстро отвечать:

`КТО → КОГДА → КУДА → ЗА СКОЛЬКО → ЧТО ДЕЛАТЬ`

Primary action должен быть очевиден.

Не показывать 5–6 равноправных кнопок одинакового визуального веса.

## Upcoming

Не таблица.

Предпочтение: timeline / chronological rhythm.

## Notes

Не отдельный «CRM module».

Должны восприниматься как lightweight shared work memory.

---

# 7. Visual direction

## Desired feeling

- premium;
- calm;
- precise;
- masculine / technical, но не грубый;
- iOS-native;
- modern European product;
- field-service tool, которым приятно пользоваться каждый день.

## Avoid

- old-school CRM;
- Excel;
- Bootstrap cards everywhere;
- excessive borders;
- excessive rounded rectangles;
- gradients ради градиентов;
- giant typography without purpose;
- generic purple SaaS aesthetic;
- decorative labels;
- tiny unreadable text;
- too many equal-weight buttons;
- giant empty areas;
- floating UI that overlaps content accidentally.

---

# 8. Interaction safety

Любой новый компонент обязан сохранять существующий semantic hook или корректно обновлять JS bindings.

Перед изменением DOM найти в `app.js` все:

- `querySelector`;
- `getElementById`;
- event listeners;
- delegated click handlers;
- data attributes;
- IDs referenced from forms.

Нельзя переименовывать ID без полного обновления bindings и regression test.

Особенно критичны:

```text
#todayScreen
#todayIncome
#todayGross
#todayExpense
#todayLoad
#todayProgress
#todayWeek
#todayMonth
#insights
#todayList
#todayExpenses
#upcoming
#activeNotes
#archivedNotes
#addBtn
#themeBtn
#syncStatus
```

---

# 9. Production safety protocol

## BEFORE WORK

1. Создать git checkpoint.
2. Зафиксировать production baseline.
3. Не работать напрямую на stable source без возможности rollback.
4. Проверить, что production login и Firebase работают.

## DURING WORK

Каждый логический этап = отдельный commit.

Пример:

```text
chore: checkpoint before design
feat: introduce design tokens
feat: redesign Today money hierarchy
feat: redesign job interaction
feat: redesign upcoming timeline
feat: redesign notes
fix: mobile safe-area regression
```

## AFTER WORK

1. Run regression.
2. Deploy preview.
3. Test preview.
4. Only after successful test → production.
5. Production URL must return HTTP 200.
6. Login must work.
7. Firestore must load real data.

Нельзя делать несколько больших архитектурных изменений одним непрозрачным commit.

---

# 10. Definition of Done

Работа считается готовой только если одновременно выполнено всё:

### Design
- интерфейс визуально не напоминает старый CRM;
- есть единая design system;
- hierarchy очевидна;
- Today выглядит как один продукт, а не набор карточек;
- actions имеют чёткую priority;
- typography readable;
- 44px+ touch targets;
- iOS safe areas соблюдены;
- light/dark mode выглядят намеренно.

### UX
- основные действия выполняются быстрее, чем в baseline;
- монтажник понимает состояние дня за 2–3 секунды;
- невозможно случайно нажать destructive action;
- важные проблемы видны сразу;
- Upcoming читается как время, а не таблица.

### Engineering
- Firebase работает;
- realtime работает;
- данные не исчезают;
- существующая схема не изменена;
- существующие actions работают;
- no console-breaking errors;
- no broken imports;
- no production-only hacks.

### QA
- все критические flows пройдены;
- iPhone widths проверены;
- production deployment проверен;
- rollback возможен одним commit.

---

# 11. Главная инструкция для команды

**Не пытайтесь сделать существующий экран «красивее».**

Сначала ответьте на вопрос:

> «Если бы мы сегодня проектировали Монтажи АА с нуля для двух монтажников, которые весь день ездят по объектам, что должно быть самым лёгким в понимании и самым быстрым в действии?»

После этого создайте новый UX/UI слой и только затем интегрируйте его в существующую рабочую систему.

Красота = следствие хорошей структуры, типографики, spacing, interaction и product thinking.

Не ломать то, что работает.
Не менять то, что не просили менять.
Но всё, что относится к визуальному и interaction design, **можно переосмыслить радикально**.
