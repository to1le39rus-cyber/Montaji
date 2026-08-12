# МОНТАЖИ АА v5 — запуск и авторизация

## 1. Firebase Console

Проект: `montaj-39`.

Откройте Firebase Console → Authentication → Sign-in method.

Включите:
- Email/Password — ON
- Anonymous — OFF

Не включайте открытые/анонимные способы входа для production.

## 2. Подтверждение email

Authentication → Settings → User account management.

Оставьте email verification обязательным. Приложение само проверяет `user.emailVerified` и не пускает неподтверждённый аккаунт в рабочую базу.

## 3. Firestore

Firebase Console → Firestore Database → Create database.

Если база уже создана, ничего создавать заново не нужно.

Rules должны быть такими:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function verifiedUser() {
      return request.auth != null
        && request.auth.token.firebase.sign_in_provider != 'anonymous'
        && request.auth.token.email_verified == true;
    }

    match /appData/shared {
      allow read, write: if verifiedUser();
    }
  }
}
```

## 4. Первый пользователь

1. Откройте приложение.
2. Нажмите `Создать доступ`.
3. Введите рабочий email и пароль от 6 символов.
4. Откройте письмо Firebase.
5. Подтвердите email.
6. Вернитесь в приложение.
7. Войдите.

Для второго телефона создайте отдельный подтверждённый аккаунт. Оба аккаунта будут видеть один документ `appData/shared`.

## 5. Если вход не работает

Ошибка `Email/Password is not enabled` → включите Email/Password в Authentication.

Ошибка `permission-denied` → проверьте Firestore Rules и подтверждение email.

После регистрации, но до подтверждения email приложение специально не показывает рабочую базу.

## 6. Карты

В карточке адреса доступны две кнопки:
- Яндекс — открывает поиск адреса в Яндекс Картах;
- 2ГИС — открывает поиск адреса в 2ГИС.

Google Maps в production не используется.

## 7. Деньги и долги

При создании/редактировании выезда есть поле `Оплата`:
- `Оплачено`;
- `Не оплачено · долг`.

Финансовый экран показывает:
- доход;
- расходы;
- чистыми;
- долги.

На главном экране приложение автоматически подсказывает неоплаченные работы, просроченные выезды и загрузку следующего дня.

## 8. Резервная копия

`Ещё → JSON` — скачать резервную копию.

Восстановление заменяет общую серверную базу только после подтверждения.

Резервная копия не является рабочей базой: текущие данные всегда читаются из Firestore.

## 9. Важное правило эксплуатации

Не добавлять `app-v6`, `app-v7`, `sync-v2` и новые параллельные базы.

Меняем только production `app.js`, `index.html`, `styles.css` и тесты. После каждого изменения запускаются syntax/regression/security проверки.
