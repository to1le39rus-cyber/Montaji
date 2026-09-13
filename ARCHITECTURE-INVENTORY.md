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

## 2. Root runtime

| Файл | Роль сейчас | Целевое решение |
|---|---|---|
| `index.html` | основной UI shell | сохранить |
| `app.js` | основное бизнес-ядро + UI | сохранить как canonical source, постепенно модульнизировать |
| `boot.js` | loader + runtime source patching | превратить в тонкий entrypoint или убрать |
| `firebase-config.js` | Firebase config | сохранить |
| `firebase.json` | Firebase Hosting/Auth config | сохранить, проверить в security step |
| `firestore.rules` | access control | сохранить, отдельный аудит |
| `manifest.json` | PWA manifest | сохранить, улучшить icons отдельно |
| `styles.css` | базовая дизайн-система | сохранить как canonical base |
| `icons.css` | icons | сохранить/проверить использование |

## 3. Feature layers

| Файл/каталог | Наблюдение | Решение |
|---|---|---|
| `money-ui.js` | старая версия money UI | сравнить с v2; не удалять вслепую |
| `money-ui-v2.js` | более новая money UI | кандидат на canonical integration |
| `debt-ui.js` | отдельный debt UI | интегрировать после проверки |
| `notes-ui.js` | отдельный notes runtime | интегрировать без изменения Firestore данных |
| `secure-app/` | второй loader/runtime + patch layers | legacy/preview; inventory → migration → removal |

## 4. `secure-app/` legacy inventory

В каталоге есть отдельные layers для:
- archive/delete;
- auth polish;
- calendar window;
- clients;
- date field system;
- day sheet hero/density/recomposition/balance/actions;
- task projection/UI;
- quick add;
- другие UX polish/fix layers.

Проблема не в самом существовании модулей, а в способе их доставки: `secure-app/index.html` использует старый CDN snapshot и накладывает runtime patches.

Целевой принцип: полезная логика должна жить в обычных canonical modules и импортироваться напрямую.

## 5. Дубликаты и поколения

Явно обнаружены поколения:
- `money-ui.js` / `money-ui-v2.js`;
- root runtime / `secure-app` runtime;
- root CSS / многочисленные `*-final`, `*-polish`, `*-fix` layers;
- текущий canonical commit / старый CDN commit внутри secure loader.

Удаление разрешается только после проверки ссылок, поведения и regression tests.

## 6. Бизнес-логика, требующая особого внимания

### 3/3

В runtime встречается `c/3`, а `boot.js` патчит календарь. Это несовместимо с контрактом.

После canonicalization:
- 3 — средний ориентир;
- 3+ — допустимо;
- свободное окно — планировочный показатель;
- отсутствие свободного окна не означает запрет создать выезд.

### Доход

Доход считается отдельно от количества монтажей. Дополнительный доход не должен теряться из-за логики загрузки.

### Долги

Выполненная неоплаченная работа — доход + долг.

### Расходы

Отдельный поток финансовых данных.

## 7. Data layer

Canonical documents:
- `appData/shared`;
- `appData/notes`.

Canonical operations:
- server-backed initial load;
- `onSnapshot` realtime;
- `runTransaction` for writes.

Нельзя в рамках inventory:
- менять Firebase data;
- выполнять миграции;
- менять Rules;
- удалять данные.

## 8. Release layer

`Astera-smart` → GitHub Actions validation → Firebase Hosting + Firestore Rules.

Vercel — preview/QA only.

Любой preview должен быть привязан к конкретному commit SHA.

## 9. Следующий технический шаг

Перед изменением `boot.js` необходимо:
1. получить полный текст всех runtime layers;
2. построить dependency map;
3. определить, какие patches уже присутствуют в `app.js`;
4. перенести отсутствующую полезную логику в canonical source;
5. написать regression tests для затронутого поведения;
6. только затем удалить runtime patching.

**Inventory не является разрешением на удаление файлов.**
