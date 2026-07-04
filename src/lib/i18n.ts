export type Lang =
  | "en"
  | "ru"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "tr"
  | "uk"
  | "pl"
  | "nl"
  | "sv"
  | "ar"
  | "hi"
  | "zh"
  | "ja"
  | "ko"
  | "id"
  | "vi"
  | "th";

export const LANGUAGES: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Portuguese", native: "Português", flag: "🇵🇹" },
  { code: "tr", label: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "uk", label: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "pl", label: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "nl", label: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "sv", label: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "ar", label: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "zh", label: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "ja", label: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", label: "Thai", native: "ไทย", flag: "🇹🇭" },
];

const en = {
  appName: "TalkMe",
  tagline: "Anonymous chat, real people.",
  online: "online now",
  start: "Start chatting",
  yourGender: "Your gender",
  male: "Male",
  female: "Female",
  yourAge: "Your age",
  lookingFor: "Looking for",
  any: "Any",
  ageRange: "Age range",
  findPartner: "Find a partner",
  searching: "Looking for a partner…",
  cancel: "Cancel",
  settings: "Settings",
  language: "Language",
  buttonColor: "Button color",
  white: "White",
  pink: "Pink",
  blue: "Blue",
  back: "Back",
  typeMessage: "Type a message…",
  send: "Send",
  partnerLeft: "Your partner left the chat.",
  youLeft: "You left the chat.",
  leave: "Leave",
  newChat: "New chat",
  connected: "Connected. Say hi 👋",
  you: "You",
  stranger: "Stranger",
  home: "Home",
  chatTab: "Chat",
  voiceTab: "Voice",
  voiceTitle: "Voice call",
  voiceHint: "Talk live with a stranger.",
  startCall: "Start call",
  voiceSearching: "Connecting a call…",
  feedback: "Feedback",
  sound: "Sound",
  vibration: "Vibration",
  connecting: "Connecting…",
  noConnection: "No Connection",
  loadingMessages: "Loading messages…",
  appearance: "Appearance",
  theme: "Theme",
  dark: "Dark",
  light: "Light",
  chooseLanguage: "Choose language",
  chooseColor: "Choose color",
} as const;

const ru: typeof en = {
  ...en,
  tagline: "Анонимный чат с живыми людьми.",
  online: "сейчас онлайн",
  start: "Начать общение",
  yourGender: "Ваш пол",
  male: "Мужской",
  female: "Женский",
  yourAge: "Ваш возраст",
  lookingFor: "Ищу",
  any: "Любой",
  ageRange: "Диапазон возраста",
  findPartner: "Найти собеседника",
  searching: "Ищем собеседника…",
  cancel: "Отмена",
  settings: "Настройки",
  language: "Язык",
  buttonColor: "Цвет кнопок",
  white: "Белый",
  pink: "Розовый",
  blue: "Голубой",
  back: "Назад",
  typeMessage: "Введите сообщение…",
  send: "Отправить",
  partnerLeft: "Собеседник покинул чат.",
  youLeft: "Вы покинули чат.",
  leave: "Выйти",
  newChat: "Новый чат",
  connected: "Соединено. Поздоровайтесь 👋",
  you: "Вы",
  stranger: "Незнакомец",
  home: "Главная",
  chatTab: "Чат",
  voiceTab: "Звонок",
  voiceTitle: "Голосовой вызов",
  voiceHint: "Поговорите вживую с незнакомцем.",
  startCall: "Начать звонок",
  voiceSearching: "Соединяем звонок…",
  feedback: "Уведомления",
  sound: "Звук",
  vibration: "Вибрация",
  connecting: "Подключение…",
  noConnection: "Нет соединения",
  loadingMessages: "Загрузка сообщений…",
  appearance: "Внешний вид",
  theme: "Тема",
  dark: "Тёмная",
  light: "Светлая",
  chooseLanguage: "Выберите язык",
  chooseColor: "Выберите цвет",
};

export const translations: Record<Lang, typeof en> = {
  en, ru,
  es: en, fr: en, de: en, it: en, pt: en, tr: en, uk: ru, pl: en,
  nl: en, sv: en, ar: en, hi: en, zh: en, ja: en, ko: en, id: en, vi: en, th: en,
};

export type TKey = keyof typeof en;
