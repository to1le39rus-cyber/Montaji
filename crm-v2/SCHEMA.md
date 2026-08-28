# МОНТАЖИ АА — Схема данных CRM v2 (Спринт 1)

Заменяет монолитный `appData/shared.jobs[]` на коллекции. Существующие данные не удаляются —
переносятся скриптом-миграцией (см. `migrate-jobs.mjs`), старый документ остаётся как read-only
архив на время переходного периода.

---

## users/{uid}
Роль и профиль пользователя. Создаётся автоматически при первом входе (Cloud Function `onCreate`
триггер на Auth) со значением по умолчанию `role: "pending"` — до тех пор пользователь не имеет
доступа ни к чему, кроме собственного профиля. Роль назначает менеджер вручную (или вы — через
консоль на первое время).

```
{
  uid: string,
  email: string,
  role: "installer" | "manager" | "store" | "pending",
  storeId: string | null,      // заполнено только для role="store"
  displayName: string,
  fcmTokens: string[],          // токены устройств для push, добавляются при логине
  createdAt: timestamp,
  active: boolean               // менеджер может деактивировать доступ без удаления аккаунта
}
```

## stores/{storeId}
Профиль магазина-партнёра.

```
{
  id: string,
  name: string,               // "ASTERA", "LAVETRA DOORS"
  contactPhone: string,
  contactPerson: string,
  active: boolean,
  createdAt: timestamp
}
```

## jobs/{jobId}
Один монтаж/замер = один документ (было полем массива в общем документе).

```
{
  id: string,
  date: string,               // YYYY-MM-DD
  slot: "1" | "2" | "3",
  time: string | null,
  type: "Монтаж" | "Замер" | "Рекламация" | "Доставка" | "Сервис" | "Доп. доход",
  client: string,
  phone: string,
  price: number,
  address: string,
  store: string,               // текстовое поле, как сейчас (человекочитаемое)
  storeId: string | null,      // связь на stores/{id}, новое поле
  comment: string,
  status: "Запланирован" | "Подтверждён" | "В пути" | "На объекте" | "Выполнен" | "Перенос" | "Отменён",
  paid: boolean,
  completedDate: string | null,
  measurePrice: number | null,
  measurePaid: boolean | null,
  measureCredit: number | null,
  convertedToJobId: string | null,
  convertedFromMeasureId: string | null,
  createdVia: "manual" | "storePortal",   // новое поле — источник записи
  bookedByStore: boolean,                  // новое поле
  assignedInstallerUid: string | null,     // новое поле — на будущее (мультибригадность)
  createdBy: string,           // uid
  createdAt: timestamp,
  updatedAt: timestamp,
  updatedBy: string
}
```

Бизнес-инварианты 1–8, 9–15 из вашего исходного handoff-документа переносятся один в один —
меняется только физическое место хранения (документ на коллекцию), не бизнес-логика.

## expenses/{expenseId}
Аналогично — переезжает из массива в коллекцию, для симметрии и той же причины
(масштабируемость + точечные права доступа при необходимости в будущем).

## notes/{noteId}
Единая система заметок (заменяет три параллельные реализации, найденные в аудите).

```
{
  id: string,
  ownerUid: string,                      // автор
  visibility: "private" | "public" | "urgent",
  targetUids: string[],                  // для urgent: конкретные монтажники; ["all"] — все
  title: string,
  text: string,
  dueDate: string | null,
  priority: "normal" | "high",
  linkedJobId: string | null,            // deep-link на карточку монтажа
  linkedStoreId: string | null,          // если заметка создана магазином (рекламация)
  status: "open" | "in_progress" | "done" | "reassigned",
  reassignedTo: string | null,
  reassignHistory: [{ from, to, at, comment }],
  archived: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

Правило видимости (реализовано в `firestore.rules.v2`):
- `private` — читает/пишет только `ownerUid`.
- `public` — читают/пишут все `installer`/`manager`.
- `urgent` — читают все `installer`/`manager` + `store`, если `linkedStoreId` совпадает с их `storeId`;
  пишет создатель, менеджер, либо тот, на кого переадресовано.

## publicSlots/{date}_{slot}
Санитизированная витрина для магазинов. Никаких клиентских данных — только факт занятости.
Обновляется Cloud Function-триггером при любом изменении `jobs/*`.

```
{
  date: string,
  slot: string,
  status: "free" | "booked",
  storeId: string | null   // если забронировано конкретным магазином — виден только ему
}
```

## bookingRequests/{id}
Заявка магазина на свободный слот. Не создаёт `jobs/*` напрямую.

```
{
  id: string,
  storeId: string,
  date: string,
  slot: string,
  contactComment: string,
  status: "pending" | "confirmed" | "rejected",
  createdAt: timestamp,
  resolvedBy: string | null,
  resolvedAt: timestamp | null,
  resultingJobId: string | null
}
```

## controls/{id}
Переносится из текущего `appData/control` без изменений структуры — уже нормальная отдельная
сущность, трогать не нужно.

---

## Миграция — принцип

1. Новые коллекции создаются **параллельно** со старым `appData/shared`.
2. Скрипт `migrate-jobs.mjs` читает существующий массив `jobs`/`expenses` и создаёт по документу
   на каждый элемент в новых коллекциях, сохраняя оригинальный `id`.
3. Старый документ `appData/shared` не трогается и не удаляется — служит резервной копией и
   позволяет откатиться, если что-то пойдёт не так.
4. Приложение переключается на чтение из новых коллекций отдельным релизом, после проверки, что
   все данные перенеслись 1:1 (скрипт выводит сверку количества и сумм на выходе).
