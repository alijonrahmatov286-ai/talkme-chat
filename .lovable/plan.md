
## Идея

Сейчас проект — анонимный рулетка‑чат. Расширяем его до полноценного мессенджера с постоянными аккаунтами (`@nickname`), списком чатов, друзьями и поиском людей. Анонимный чат остаётся отдельной вкладкой ("Roulette").

## Пользовательский флоу

1. Первый вход → экран онбординга: пользователь вводит `@ник` (только `a–z`, `0–9`, `_`, 3–20 символов, автоматически в lower‑case, проверка на уникальность).
2. Опционально: имя (display name), пол, возраст, аватар (эмодзи из палитры, без загрузки файлов на первом этапе).
3. После онбординга — главный экран с нижней навигацией:
   - **Chats** — список личных диалогов (последнее сообщение, время, непрочитанные, свайп для удаления).
   - **People** — поиск по `@нику`, список друзей, кнопка "Add".
   - **Roulette** — текущий анонимный рулетка‑чат (то что уже есть).
   - **Settings** — существующие настройки + профиль.

## Экраны

- **Onboarding** (`/onboarding`) — создание `@ника`, живой чек доступности.
- **Chats list** (`/`) — список чатов, пустое состояние с CTA "Find people".
- **Chat** (`/chat/$nickname`) — переписка, шапка с ником/онлайн‑статусом, инпут, "печатает…".
- **People** (`/people`) — поиск + друзья.
- **Profile** (`/u/$nickname`) — публичный профиль (ник, имя, аватар, кнопки "Message" / "Add friend").
- **Settings** (`/settings`) — язык, цвет, тема, тема + новая секция "Profile" (ник read‑only, имя, аватар, выйти/сменить ник).
- **Roulette** (`/roulette`) — прежний анонимный поиск и чат.

## Данные (Lovable Cloud)

Новые таблицы в `public` (все с GRANT + RLS):

- `profiles` — `id uuid PK` (= `auth.users.id`), `nickname citext unique`, `display_name`, `avatar_emoji`, `gender`, `age`, `bio`, `created_at`, `last_seen`.
- `friendships` — `user_id`, `friend_id`, `status` (`pending|accepted|blocked`), `created_at`, unique `(user_id, friend_id)`.
- `conversations` — `id`, `user_a`, `user_b` (upper/lower по сортировке uuid, уникальная пара), `last_message_at`.
- `dm_messages` — `id`, `conversation_id`, `sender_id`, `content`, `created_at`, `read_at`.
- `typing_status` — `conversation_id`, `user_id`, `updated_at`.

RLS: пользователь видит только свои профили/чаты/сообщения. `profiles` — публичный `SELECT` для поиска по нику (без `email`/чувствительных полей). Realtime включаем для `dm_messages` и `typing_status`.

Auth: анонимная сессия Supabase (`signInAnonymously`) при первом заходе — чтобы не заставлять регистрироваться, но иметь стабильный `auth.uid()` для профиля и RLS. `@ник` привязывается к этой сессии.

## Технические детали

- Роуты TanStack Start в `src/routes/`: `onboarding.tsx`, `index.tsx` (список чатов), `chat.$nickname.tsx`, `people.tsx`, `u.$nickname.tsx`, `roulette.tsx`. Существующий рулетка‑UI переезжает в `roulette.tsx`.
- Auth‑гейт: если нет профиля с ником → редирект на `/onboarding`. Реализуем через `beforeLoad` в `__root.tsx` (клиентский, `ssr: false` внутри лэйаута для приватных секций не нужен — используем анонимную сессию + локальный чек ника).
- Server functions (`createServerFn` + `requireSupabaseAuth`):
  - `claimNickname({ nickname })` — валидация + insert в `profiles`.
  - `searchUsers({ query })` — поиск по `nickname ILIKE query%`.
  - `openConversation({ otherUserId })` — найти/создать conversation.
  - `sendMessage({ conversationId, content })`.
  - `sendFriendRequest`, `acceptFriendRequest`.
- Realtime: подписки на `dm_messages` в открытом чате и на `conversations` для списка (обновление `last_message_at`).
- Typing indicator: upsert в `typing_status` с debounce 1.5s, показываем "печатает…" если `updated_at` < 3s.
- Online: `last_seen` обновляем каждые 20s пока вкладка активна; "online" если < 45s.
- Стиль: используем существующие токены (card‑soft, btn‑ghost‑pill, тени, iOS‑анимации, haptics из `feedback.ts`). Никаких новых цветовых схем.
- i18n: добавляем ключи (`onboarding.*`, `chats.*`, `people.*`, `profile.*`, `chat.typing`, `chat.online`) во все 20 языков, следуя существующему `TranslationDict`.

## Настройки — что добавляем

- Секция **Profile**: ник (read‑only с кнопкой "изменить"), display name, аватар‑эмодзи, bio, пол, возраст.
- Секция **Privacy**: "Кто может писать" (все / только друзья), "Показывать онлайн‑статус" (toggle).
- Кнопка **Logout / Reset account** (стирает локальную сессию).

## Порядок реализации

1. Миграция БД (`profiles`, `friendships`, `conversations`, `dm_messages`, `typing_status`) + RLS + GRANT + realtime publication.
2. Анонимная auth + хук `useProfile()`.
3. Onboarding экран + `claimNickname` server fn.
4. Нижняя навигация + перенос рулетки в `/roulette`, новый `/` = список чатов (пустое состояние пока).
5. People (поиск + друзья) + профиль `/u/$nickname`.
6. DM‑чат: `openConversation`, `sendMessage`, realtime подписка, typing, online.
7. Расширение Settings (Profile / Privacy / Logout).
8. i18n ключи для всех 20 языков.
9. Прогон build + визуальная проверка Playwright.

## Что НЕ делаем в этой итерации

- Голосовые сообщения, вложения/фото, звонки, групповые чаты, push‑уведомления, загрузка аватаров файлом (только эмодзи), email/пароль‑регистрация. Их можно добавить отдельными итерациями.

Подтвердишь — начну с миграции БД и онбординга.
