# МОНТАЖИ АА v5 — финальный аудит

Дата: 12.08.2026

## Важная честная оговорка про «агентов»

В этом рабочем окружении нет отдельного runtime, который позволяет запустить внешние OpenHands/SWE-agent/browser-use автономно на этом репозитории и получить их независимые execution logs. Поэтому я не выдаю имитацию ролей за внешний запуск агентов.

В качестве профессиональных внешних эталонов были просмотрены GitHub-проекты OpenHands, SWE-agent и browser-use; их подходы использованы как чек-листы для независимых проходов. Сам код затем прошёл последовательные роли: стратег → продуктовый логик → security → UX/UI → программист → тестировщик.

## 1. Стратегический проход

- Приложение превращено из простого журнала в рабочий центр: график + деньги + клиенты + контроль долгов.
- Добавлены автоматические подсказки: просроченные выезды, загрузка следующего дня, неоплаченные работы.
- Сведено к одному production-контру.

## 2. Архитектор / логик

- Единственный источник истины: Firestore `appData/shared`.
- Server-first чтение через `getDocFromServer`.
- Realtime через `onSnapshot`.
- Конкурентная запись через `runTransaction`.
- При offline состояние очищается; старая браузерная копия не используется.
- Версия данных нормализуется с `version: 5`.

## 3. Security-проход

- Anonymous production access запрещён.
- Email/password authentication.
- Email verification обязательна до доступа к рабочим данным.
- Firestore Rules требуют verified non-anonymous user.
- Резервная копия является экспортом, а не локальной рабочей базой.

## 4. UX/UI-проход

- Новый визуальный язык: тёплый светлый фон, olive/graphite акцент, крупная типографика, компактные карточки.
- Адаптив под мобильный экран.
- Светлая и тёмная темы.
- Главный экран сразу показывает оборот, загрузку, чистый результат и умные подсказки.
- В карточке адреса две российские карты: Яндекс и 2ГИС.
- В деньгах отдельный показатель долгов.

## 5. Программист

Production v5 использует:
- `index.html`
- `app.js`
- `styles.css`
- `firebase-config.js`
- `firestore.rules`
- `firebase.json`
- `manifest.json`
- `icon.svg`

Старые production-версии и legacy-модули не подключаются индексом.

## 6. Финансовая логика

У выезда появился статус оплаты:
- оплачено;
- не оплачено / долг.

Финансовый экран считает:
- доход;
- расходы;
- чистый результат;
- долг.

## 7. Карты

Google Maps удалён из production-логики.

Используются:
- Яндекс Карты — поиск адреса;
- 2ГИС — поиск адреса.

## 8. Тестировщик

Добавлен `tests/final-architecture.test.mjs`.

Тесты покрывают:
1. один production JS-модуль;
2. отсутствие localStorage/sessionStorage;
3. server-first Firestore + realtime + transaction;
4. email/password + email verification;
5. security rules;
6. Яндекс/2ГИС вместо Google Maps;
7. долги и оплату;
8. smart insights;
9. responsive/light/dark visual system;
10. отсутствие legacy wiring.

GitHub Actions обновлён для ветки `v5-final`.

## 9. Ограничение CI

GitHub Actions в предыдущем запуске не стартовал из-за billing lock аккаунта GitHub. Это не следует интерпретировать как ошибку тестов: job физически не был запущен.

Поэтому перед live-деплоем обязательно выполнить локально:

```bash
node --check app.js
node --test tests/final-architecture.test.mjs
```

## 10. Firebase перед запуском

В Firebase Console:

1. Authentication → Sign-in method → Email/Password = ON.
2. Anonymous = OFF.
3. Firestore Database должен быть создан.
4. Применить `firestore.rules`.
5. Hosting должен указывать на корень проекта.
6. Создать два email/password аккаунта и подтвердить оба email.

Подробная инструкция находится в `V5-SETUP-RU.md`.
