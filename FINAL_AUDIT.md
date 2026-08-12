# МОНТАЖИ АА — финальный аудит

## Роли проверки

### 1. Стратег
- Один production-контур.
- Один источник истины: Cloud Firestore `appData/shared`.
- Нет второй базы на телефоне.
- Offline не является режимом работы с данными: при отсутствии связи старая информация не показывается, новые изменения не принимаются.

### 2. Архитектор / логик
- Убрана local-first схема и периодический push localStorage → Firestore.
- Приложение читает сервер через `getDocFromServer`.
- Realtime — `onSnapshot`.
- Запись/редактирование/удаление — через `runTransaction`.
- При потере связи состояние очищается.

### 3. Безопасность
- Убрана анонимная production-авторизация.
- Firebase Authentication: email/password + подтверждение email.
- Firestore Rules требуют неанонимного пользователя и `email_verified == true`.
- Конфигурация Auth вынесена в `firebase.json`.

### 4. Дизайн / UX
- Сохранена мобильная структура приложения.
- Добавлен отдельный экран входа.
- Статус общей базы явно показывает онлайн/отсутствие связи.
- Устаревшая локальная копия не показывается.

### 5. Программист
Production оставлен в минимальном контуре:
- `index.html`
- `app.js`
- `styles.css`
- `final.css`
- `firebase-config.js`
- `firestore.rules`
- `firebase.json`
- `manifest.json`
- `icon.svg`

Старые `app-v*`, `firebase-sync.js`, `firebase-shared-config.js`, `archive.js`, `core.js`, Supabase и альтернативные secure-app версии удалены из ветки.

### 6. Тестировщик
Добавлен `tests/final-architecture.test.mjs`.

Локальный прогон Node.js 22:
- 6 тестов
- 6 passed
- 0 failed

Проверены:
1. Единственный production JS-модуль.
2. Отсутствие localStorage/sessionStorage в рабочем `app.js`.
3. Server read + realtime + transaction.
4. Поведение при offline.
5. Firestore security rules.
6. Отсутствие legacy script wiring.

GitHub Actions настроен на тот же тестовый набор. На push 12.08.2026 GitHub не запустил job из-за блокировки аккаунта по billing issue; это инфраструктурная проблема GitHub, а не падение тестов. Локальный прогон выполнен успешно.

## Важное перед запуском

Для production необходимо один раз применить Firebase Authentication/Rules/Hosting configuration. Firebase CLI поддерживает управление Email/Password provider через `firebase.json` и deployment через `firebase deploy --only auth`.

После этого создаются/подтверждаются два пользовательских email-доступа для двух телефонов.

Дата аудита: 2026-08-12.
