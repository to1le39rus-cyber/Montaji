# МОНТАЖИ АА — UI/UX SYSTEM

> **Каноническая дизайн-система и UX-контракт приложения.** Источник истины для будущих UI/UX-изменений, включая новые AI-чаты.

Перед работой с интерфейсом читать `PROJECT-CONTRACT.md`, `BUSINESS-SEMANTICS.md`, `UI-UX-INVENTORY.md`, этот документ и релевантный UX-контракт.

## Визия

**Premium × Mobile × Operations × Delight.**

«Монтажи АА» — не типичный dashboard и не Dribbble-концепт. Это рабочий продукт, которым хочется пользоваться каждый день: красивый, ясный, быстрый, живой, спокойный и полезный.

**Красота усиливает рабочий UX.** Каждая деталь помогает понять, выбрать или сделать. Мы не боимся wow-эффекта, но не жертвуем скоростью и ясностью.

## Архитектура

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

UI не является источником истины. Запрещены бизнес-логика в CSS, решения по DOM-тексту/классам, независимые дубли сущностей, MutationObserver/timer вместо нормального lifecycle, runtime source rewriting/Blob/CDN обходы и временные UI-патчи без migration plan.

## Visual language

Много воздуха, выразительная типографика, чистые поверхности, мягкая глубина, точечные акценты, качественные иконки, компактные карточки и деликатная анимация.

Формула: **минимально по количеству элементов, максимально по качеству ощущения.**

### Tokens

Используем единый semantic token system:

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

Цветовая семантика: `bg / surface / surface-raised / surface-muted / text / text-secondary / text-muted / border / accent / accent-soft / success / warning / danger / info`.

Spacing rhythm: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40+`.

Radius: `sm / md / lg / xl / pill`.

Глубина — border + мягкая shadow + surface. Blur только точечно.

### Typography

`Display / H1 / H2 / H3 / Body / Body Small / Label / Caption / Numeric-KPI`.

Большие цифры только для действительно важных показателей. Вторичный текст не конкурирует с действием.

## Canonical components

### Job Card

Одна сущность — одна базовая карточка. Варианты плотности: Today / primary, Day Sheet / compact, History / compact, Client context, Detail.

Иерархия: Client → Time/type/source → Status/amount → Comment preview → Secondary information.

Комментарий к монтажу — рабочая информация. В compact используется expandable preview.

### Buttons

`Primary / Secondary / Tertiary / Danger / Icon`. Один главный CTA на поверхности. Destructive action визуально отличается.

### Fields

Один field system: `default / focused / filled / invalid / disabled / saving / saved`. Дата, сумма, телефон и текст — вариации общей системы.

### Status / Chips

`planned / active / completed / cancelled / warning / error`. Смысл не передаётся только цветом.

### Toast

Короткий результат: **что произошло + при необходимости следующий шаг.**

## Unified Modal / Bottom Sheet System

Все sheets используют один shell:

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

Patterns: `Detail Sheet / Form Sheet / Action Sheet / Day Sheet / Confirm Sheet`.

**Один shell, разные purpose.**

### Detail ≠ Edit

Подробнее — read-only информация и быстрые действия.

Изменить — form, validation, save.

## Навигация

Bottom navigation — единый компонент с одинаковой геометрией, active state и tap feedback.

FAB — глобальное создание, если доступно текущему контексту/роли; не конкурирует с CTA экрана.

## Screen UX

**Сегодня:** за несколько секунд понять день, монтажи, деньги, проблемы и следующий шаг.

**График:** сразу понять нагрузку и выбрать день. 3 окна — плановые пресеты, не лимит. 4/5/6+ допустимы. `3/3` как потолок запрещён.

**Деньги:** доход, расход, чистый результат, дополнительные источники и долги различимы. Количество монтажей и доход — независимые метрики.

**Клиенты:** быстрый поиск человека и контекста.

**Ещё:** системные действия без визуального шума.

## Motion system

Принцип: **Fast first, delightful second.**

Категории: `Tap / Enter / Exit / Expand / Collapse / State change / Success / Error / Loading / Navigation`.

Ориентиры: micro 80–140 ms, small 160–220 ms, sheet 220–320 ms, large state 250–400 ms.

Wow создают хороший easing, небольшой transform/opacity, мягкое раскрытие, приятный success и физичное поведение sheet.

Запрещены бесконечные loops без смысла, постоянные timers, тяжёлый blur, сложный parallax, WebGL/canvas ради обычного UI, массовые layout-triggering animations и motion, блокирующее действие.

Всегда уважать `prefers-reduced-motion`.

## Performance

Предпочтительно: CSS transitions, transform/opacity, минимальные DOM mutations, event delegation, lazy rendering, CSS variables, reuse компонентов.

Контролируем backdrop-filter, большие blur/shadow surfaces, сложные SVG filters, layout-triggering animation, повторные Firestore listeners и self-triggering observers.

**Если эффект можно сделать проще без потери ощущения качества — делаем проще.**

## States

Каждый интерактивный компонент имеет: `initial / loading / loaded / empty / saving / saved / error / offline / disabled / cancelled / completed / conflict / permission-denied`.

Loading не должен выглядеть пустым. Empty объясняет причину и следующий шаг. Error объясняет проблему и действие. Offline — полноценное состояние продукта.

## Accessibility

Контраст, focus states, keyboard support где применимо, aria-label для icon-only, понятные ошибки, комфортные touch targets, reduced motion и смысл не только цветом.

## Mobile-first

Приоритет: iPhone Safari/PWA → Android mobile → desktop/tablet enhancement.

Учитываем safe areas, keyboard, scroll и iOS gestures. Не проектируем desktop и потом ужимаем.

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

Комментарий карточки должен идти к canonical state/render path. Долгосрочная цель — убрать presentation/data bridges, когда это безопасно.

## Business rules для UI

- 3 окна — пресеты, не лимит;
- 4/5/6+ монтажей валидны;
- нельзя блокировать новый монтаж после трёх;
- нельзя показывать `3/3` как потолок;
- доход и количество монтажей независимы;
- дополнительные монтажи отдельны от плановых окон;
- комментарий операционно значим.

## Roles

Роли описаны в `ROLE-UX-CONTRACT.md`. Сейчас role UI не активируется этим этапом. UI не является security boundary.

## Visual QA

Проверяем narrow iPhone, standard mobile, desktop, long content, keyboard, safe area; все основные states; tap/scroll/sheets/back gesture; no jank/no layout jumps/no blocked action; reduced motion.

## Definition of Done

- [ ] фича есть в UI inventory;
- [ ] паттерн определён здесь;
- [ ] переиспользован canonical component/shell или документировано расширение;
- [ ] нет дублирующего visual pattern;
- [ ] состояния определены;
- [ ] mobile-first проверен;
- [ ] motion и reduced motion проверены;
- [ ] accessibility проверена;
- [ ] performance не ухудшена;
- [ ] business semantics не изменены случайно;
- [ ] Firebase Rules/data не затронуты без approval;
- [ ] production не изменён без approval;
- [ ] проверки пройдены.

## Правило для AI

Новый AI-чат обязан прочитать canonical документы, проверить существующий component/pattern и **не изобретать интерфейс заново — развивать систему**. При конфликте документации сначала сверяться с canonical contract. Новая модалка/card/button появляется только после фиксации в inventory/system.

## Creative north star

Мы не делаем приложение скучным ради удобства и не перегружаем его ради вау.

**Функция должна ощущаться красиво, а красота — естественно.**

Пользователь нажал — приложение ответило. Открыл день — всё понятно. Сохранил выезд — есть ощущение завершения. Открыл график — сразу понял картину. Открыл деньги — сразу увидел главное.

**И всё это работает быстро.**
