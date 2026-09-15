# МОНТАЖИ АА — UI/UX SYSTEM

> **Каноническая дизайн-система и UX-контракт приложения.**
>
> Источник истины для будущих UI/UX-изменений, включая новые AI-чаты. Перед работой с интерфейсом читать `UI-UX-INVENTORY.md`, `UI-UX-SYSTEM.md`, `PROJECT-CONTRACT.md`, `BUSINESS-SEMANTICS.md` и релевантный UX-контракт.
>
> **Статус:** design direction + implementation contract. Не является разрешением на изменение production.

## Визия

«Монтажи АА» должен ощущаться как premium mobile product: **красивый, ясный, быстрый, живой, спокойный и полезный**.

Не типичный dashboard и не Dribbble-концепт. Это рабочий инструмент, которым приятно пользоваться каждый день.

**Красота усиливает рабочий UX.** Каждая деталь должна помогать понять, выбрать или сделать. Мы не боимся красоты, но не жертвуем скоростью и ясностью ради декоративности.

## Creative direction

**Premium × Mobile × Operations × Delight.**

Много воздуха, выразительная типографика, чистые поверхности, мягкая глубина, точечные акценты, качественные иконки, компактные карточки и живые микровзаимодействия.

Формула: **минимально по количеству элементов, максимально по качеству ощущения.**

## Архитектура UI

```text
Business semantics
        ↓
Data / state
        ↓
View model
        ↓
Canonical components
        ↓
Screens / sheets
        ↓
Motion + feedback
```

UI не является источником истины.

Запрещено переносить бизнес-логику в CSS, принимать бизнес-решения по DOM-тексту/классам, дублировать сущности независимыми UI-реализациями, использовать MutationObserver/timer вместо нормального lifecycle, делать runtime source rewriting/Blob/CDN обходы или оставлять временные UI-патчи без migration plan.

## Design tokens

Финальные значения утверждаются после visual audit. Реализация использует семантические токены:

```text
color.*
type.*
space.*
radius.*
shadow.*
motion.*
z.*
control.*
```

Минимальная цветовая семантика: `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-surface-muted`, `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-border`, `--color-accent`, `--color-accent-soft`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info`.

Компонент не придумывает локальные цвета, если существует токен.

## Typography

Семантическая шкала: `Display / H1 / H2 / H3 / Body / Body Small / Label / Caption / Numeric-KPI`.

Большие цифры используются только для действительно важных показателей. Вторичный текст не конкурирует с действием. Не создаём визуальные стены текста.

## Spacing / radius / depth

```text
4  micro
8  tight
12 compact
16 base
20 comfortable
24 section
32 major
40+ hero
```

Радиусы: `sm / md / lg / xl / pill`. Глубина создаётся тонким border, мягкой тенью и разницей surface. Blur — точечный инструмент.

## Canonical components

### Job Card

Одна сущность — одна базовая карточка. Варианты плотности: Today / primary, Day Sheet / compact, History / compact, Client context, Detail.

Иерархия: Client → Time/type/source → Status/amount → Comment preview → Secondary information.

Комментарий к монтажу — рабочая информация. В компактной карточке используется аккуратный expandable preview.

### Buttons

`Primary / Secondary / Tertiary / Danger / Icon`.

Один главный CTA на поверхности. Destructive action визуально отличается. Icon-only допустим только для очевидного действия.

### Fields

Один field system: `default / focused / filled / invalid / disabled / saving / saved`. Дата, сумма, телефон и текст — вариации общей системы.

### Status / Chips

`planned / active / completed / cancelled / warning / error`. Смысл не передаётся только цветом.

### Toast

Короткий результат: **что произошло + при необходимости следующий шаг**.

## Unified Modal / Bottom Sheet System

Все sheets используют единый shell:

```text
Backdrop
↓
Sheet
 ├─ Handle
 ├─ Header
 ├─ Content
 └─ Actions
```

Едиными остаются geometry, handle, backdrop, close behavior, safe area, typography hierarchy, vertical rhythm и motion.

Типы: `Detail Sheet / Form Sheet / Action Sheet / Day Sheet / Confirm Sheet`.

**Один shell, разные purpose.**

### Detail ≠ Edit

Подробнее — read-only информация и быстрые действия. Изменить — form, validation, save. Пользователь всегда понимает, смотрит он данные или меняет их.

## Навигация

Bottom navigation — единый глобальный компонент с одинаковой геометрией, active state и tap feedback.

FAB — глобальное создание, если оно доступно текущему контексту/роли. Он не конкурирует с главным CTA экрана.

## Screen UX

### Сегодня

За несколько секунд ответить: что сегодня, сколько монтажей, что с деньгами, есть ли проблема и что дальше.

### График

Сразу понять нагрузку и выбрать день. **3 окна — плановые пресеты, не capacity limit. 4/5/6+ допустимы. `3/3` как потолок запрещён.**

### Деньги

Доход, расход, чистый результат, дополнительные источники и долги должны быть различимы. Количество монтажей и доход — разные метрики.

### Клиенты

Быстрый поиск человека и его контекста.

### Ещё

Системные действия без визуального шума.

## Motion system

Motion — часть продукта. Принцип: **Fast first, delightful second.**

Категории: `Tap / Enter / Exit / Expand / Collapse / State change / Success / Error / Loading / Navigation`.

Ориентиры:

```text
Micro feedback: 80–140 ms
Small transition: 160–220 ms
Sheet: 220–320 ms
Large state: 250–400 ms
```

Вау создают хороший easing, небольшой transform/opacity, мягкое раскрытие, приятный success и физичное поведение sheet.

Запрещены бесконечные loops без смысла, постоянные timers, тяжёлый blur, сложный parallax, WebGL/canvas ради обычного UI, массовые layout-triggering animations и motion, блокирующее действие.

Всегда уважать `prefers-reduced-motion`.

## Performance

Предпочтительно: CSS transitions, transform/opacity, минимальные DOM mutations, event delegation, lazy rendering, CSS variables, reuse компонентов.

Особенно контролируем backdrop-filter, большие blur/shadow surfaces, сложные SVG filters, layout-triggering animation, повторные Firestore listeners и observers, вызывающие сами себя через DOM mutations.

**Если эффект можно сделать проще без потери ощущения качества — делаем проще.**

## States

Каждый интерактивный компонент имеет: `initial / loading / loaded / empty / saving / saved / error / offline / disabled / cancelled / completed / conflict / permission-denied`.

Loading не должен выглядеть как пустой экран. Empty объясняет причину и следующий шаг. Error объясняет проблему и действие. Offline — полноценное состояние продукта.

## Accessibility

Обязательны достаточный контраст, focus states, keyboard support где применимо, aria-label для icon-only, понятные ошибки, комфортные touch targets, reduced motion и передача смысла не только цветом.

## Mobile-first

Приоритет: iPhone Safari/PWA → Android mobile → desktop/tablet enhancement.

Учитываем safe areas, keyboard, scroll и iOS gestures. Не проектируем desktop и потом «ужимаем».

## Data/UI boundary

```text
Firestore / canonical state
        ↓
Business rules
        ↓
View model
        ↓
UI
```

Комментарий карточки должен идти к canonical state/render path. Долгосрочная цель — убрать presentation/data bridges, когда это можно сделать безопасно.

## Business semantics, обязательные для UI

- 3 монтажных окна — пресеты, не лимит;
- 4/5/6+ монтажей валидны;
- нельзя блокировать новый монтаж после трёх;
- нельзя показывать `3/3` как потолок;
- доход и количество монтажей — независимые метрики;
- дополнительные монтажи существуют отдельно от плановых окон;
- комментарий к монтажу — операционно значим.

## Roles

Роли описаны отдельно в `ROLE-UX-CONTRACT.md`. Сейчас роль-модель документирована, но role UI не активируется этим этапом. UI не является security boundary.

## Visual QA

Проверяем layout на narrow iPhone, standard mobile, desktop, long content, keyboard и safe area.

Проверяем states: loading, empty, error, offline, saving, completed, cancelled, conflict, permission denied.

Проверяем interaction: tap, scroll, sheet open/close, back gesture, keyboard, repeated tap, rapid navigation.

Проверяем motion: no jank, no layout jumps, no blocked action, reduced motion works.

## Definition of Done

- [ ] фича есть в UI inventory;
- [ ] паттерн определён в UI/UX system;
- [ ] используется существующий component/shell либо документировано расширение;
- [ ] нет дублирующего visual pattern;
- [ ] состояния определены;
- [ ] mobile-first проверен;
- [ ] motion проверен;
- [ ] reduced motion учтён;
- [ ] accessibility проверена;
- [ ] performance не ухудшена;
- [ ] business semantics не изменены случайно;
- [ ] Firebase Rules/data не затронуты без отдельного разрешения;
- [ ] production не изменён без approval;
- [ ] проверки пройдены.

## Правило для AI

Новый AI-чат обязан прочитать `PROJECT-CONTRACT.md`, `BUSINESS-SEMANTICS.md`, `UI-UX-INVENTORY.md`, `UI-UX-SYSTEM.md` и релевантный UX-контракт; проверить существующий component/pattern; не придумывать новую модалку/card/button без необходимости; не использовать UI как security boundary; не менять production/Firebase Rules/data без approval; при конфликте сверяться с canonical contract.

> **Не изобретай интерфейс заново. Развивай систему.**

## Creative north star

Мы не делаем приложение скучным ради «удобства». Мы не делаем его перегруженным ради «вау».

**Функция должна ощущаться красиво, а красота — естественно.**

Пользователь нажал — приложение ответило. Пользователь открыл день — всё понятно. Пользователь сохранил выезд — есть ощущение завершения. Пользователь увидел график — сразу понял картину. Пользователь открыл деньги — сразу увидел главное.

**И всё это работает быстро.**
