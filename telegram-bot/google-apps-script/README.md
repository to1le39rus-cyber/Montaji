# Montaji Telegram Bot — Google Sheets backend

Это основная новая версия бота: Telegram + Google Apps Script + Google Sheets. Supabase больше не нужен для работы бота.

## Что хранится в Google Sheets

Один Google Spreadsheet с листами:

- `Монтажи` — основная база заявок;
- `Магазины` — справочник магазинов;
- `Пользователи` — owner/member и invite;
- `Сессии` — текущие шаги диалога;
- `Напоминания` — защита от повторной отправки.

Исходные магазины взяты из старого проекта Montaji.

## Секреты

В Apps Script → Project Settings → Script Properties добавить:

- `SPREADSHEET_ID` — ID Google-таблицы;
- `TELEGRAM_BOT_TOKEN` — токен от @BotFather;
- `BOT_USERNAME` — username бота без @.

Секреты не коммитить в Git.

## Первый запуск

1. Создать Google Sheet.
2. Открыть Extensions → Apps Script.
3. Перенести `Code.gs` и `appsscript.json`.
4. Добавить Script Properties.
5. Запустить функцию `setup()` один раз и дать разрешения.
6. Убедиться, что созданы 5 листов.
7. Deploy → New deployment → Web app.
8. Execute as: Me.
9. Who has access: Anyone.
10. Вызвать Telegram `setWebhook` на URL `/exec` веб-приложения.

Пример:

`https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WEB_APP_URL>`

## Напоминания

`setup()` создаёт триггер `runReminders` каждые 5 минут.

- 08:00 — список монтажей на сегодня;
- за 1 час — напоминание о конкретном монтаже;
- 20:00 — незакрытые монтажи.

## Совместная работа

Первый пользователь, который нажал `/start`, становится owner. Он может создать ссылку в `👥 Напарник`. Напарник подключается через `/start invite_...` и получает роль member.

Случайный пользователь без приглашения доступа к монтажам не получает.

## Важно

Google Apps Script — хранилище и backend. Telegram является интерфейсом. Таблицу можно открыть в любой момент как резервную копию и рабочий список.

Старый PWA и Supabase-файлы в репозитории не удаляются.
