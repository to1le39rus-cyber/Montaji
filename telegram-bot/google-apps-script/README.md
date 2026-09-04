# Montaji Telegram Bot — Google Sheets backend

Основная новая версия бота: Telegram + Google Apps Script + Google Sheets. Supabase и Cloudflare не нужны для работы новой версии.

## Текущая конфигурация пользователя

- Telegram bot: `@Montaj39_bot`
- Google Spreadsheet: `https://docs.google.com/spreadsheets/d/10IllFL4dx8aOraOVdASIbM0RMURykXNGTv8xGinocA0/edit`
- Spreadsheet ID: `10IllFL4dx8aOraOVdASIbM0RMURykXNGTv8xGinocA0`
- Timezone: `Europe/Kaliningrad`

ID таблицы и username бота не являются секретами. Telegram bot token хранить только в Script Properties и никогда не коммитить.

## Что хранится в Google Sheets

Один Google Spreadsheet с листами:

- `Монтажи` — основная база заявок;
- `Магазины` — справочник магазинов;
- `Пользователи` — owner/member и invite;
- `Сессии` — текущие шаги диалога;
- `Напоминания` — защита от повторной отправки.

Исходные магазины взяты из старого проекта Montaji.

## Script Properties

В Apps Script → Project Settings → Script Properties добавить:

- `SPREADSHEET_ID` = `10IllFL4dx8aOraOVdASIbM0RMURykXNGTv8xGinocA0`
- `TELEGRAM_BOT_TOKEN` = токен от @BotFather
- `BOT_USERNAME` = `Montaj39_bot`

`TELEGRAM_BOT_TOKEN` не добавлять в GitHub, README, исходники или сообщения.

## Первый запуск

1. Открыть указанную Google Таблицу.
2. Открыть **Расширения → Apps Script**.
3. Перенести `telegram-bot/google-apps-script/Code.gs` и `appsscript.json` из репозитория.
4. Добавить Script Properties из раздела выше.
5. Запустить функцию `setup()` один раз и выдать запрошенные Google-разрешения.
6. Убедиться, что созданы 5 листов.
7. Выполнить Deploy → New deployment → Web app.
8. Execute as: Me.
9. Who has access: Anyone.
10. Получить URL Web App, заканчивающийся `/exec`.
11. Выполнить `setWebhook` для Telegram с этим URL.

Пример webhook:

`https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WEB_APP_URL>`

Не публиковать URL вместе с токеном в GitHub.

## Напоминания

`setup()` создаёт триггер `runReminders` каждые 5 минут.

- 08:00 — список монтажей на сегодня;
- за 1 час — напоминание о конкретном монтаже;
- 20:00 — незакрытые монтажи.

Часовой пояс: `Europe/Kaliningrad`.

## Совместная работа

Первый авторизованный пользователь становится owner. Он может создать одноразовую invite-ссылку в `👥 Напарник`. Напарник подключается через `/start invite_...` и получает роль member.

Случайный пользователь без действующего приглашения доступа к монтажам не получает.

## Важно

Google Apps Script — backend и слой доступа к таблице. Telegram — основной интерфейс. Таблица остаётся понятным резервом и доступна с телефона/компьютера через Google Drive.

Старый PWA и исторические Supabase-файлы в репозитории не удаляются.
