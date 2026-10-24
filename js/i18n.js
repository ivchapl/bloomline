// Строки интерфейса. Английский добавляется вторым словарём с теми же ключами.
const RU = {
  'app.name': 'Bloomline',
  'app.tagline': 'Помол, рецепты и таймер',

  'tab.brew': 'Заварка', 'tab.schemes': 'Схемы', 'tab.journal': 'Журнал', 'tab.guide': 'Справочник', 'tab.settings': 'Настройки',

  'brew.dose': 'Доза', 'brew.temp': 'Температура', 'brew.grind': 'Помол', 'brew.ratio': 'Пропорция', 'brew.brewer': 'Воронка',
  'brew.ready': 'Готов к старту', 'brew.start': 'Старт', 'brew.pause': 'Пауза', 'brew.resume': 'Продолжить',
  'brew.reset': 'Сбросить таймер', 'brew.sound': 'Звук',
  'brew.pourNow': 'Влить сейчас', 'brew.target': 'Цель на весах',
  'brew.stage': 'Этап {n} · {name}', 'brew.stageRange': 'этап 1 · {from}–{to}',
  'brew.untilNext': 'до следующего пролива {s} с', 'brew.lastPour': 'последнее вливание',
  'brew.drawdown': 'Дренаж', 'brew.drawdownHint': 'Вода уходит через таблетку. Когда она уйдёт, нажмите «Сток закончился»',
  'brew.finishTarget': 'цель финиша ≈ {t}', 'brew.drained': 'Сток закончился',
  'brew.done': 'Готово', 'brew.doneSub': 'сток за {t}', 'brew.doneHint': 'Дайте чашке минуту остыть, вкус раскроется полнее',
  'brew.interval': 'Пауза', 'brew.pourTime': 'Пролив', 'brew.finish': 'Финиш',
  'brew.steps': 'Схема проливов', 'brew.total': 'Σ {w} г · {n} {pours}',
  'brew.pour': 'влить', 'brew.onScale': 'на весах',
  'brew.grindSub': '≈{um} мкм', 'brew.calib': 'калибровка {d}', 'brew.doseShift': 'доза {d}', 'brew.brewerShift': 'воронка {d}',
  'brew.ratioSub': '{dose} г → {water} г воды',
  'brew.tempSub': 'стартовая',
  'brew.log': 'Записать заварку',

  'log.title': 'Как получилось?',
  'log.time': 'Время стока', 'log.target': 'цель {t}',
  'log.taste': 'Вкус', 'log.sour': 'Кисло, пусто', 'log.ok': 'В самый раз', 'log.bitter': 'Горько, сушит',
  'log.rating': 'Оценка',
  'log.coffee': 'Кофе', 'log.roaster': 'Обжарщик', 'log.lot': 'Лот', 'log.process': 'Обработка', 'log.roastDate': 'Дата обжарки',
  'log.notes': 'Заметки', 'log.notesPh': 'Вкусовые ноты, что поменять в следующий раз',
  'log.save': 'Сохранить в журнал', 'log.saved': 'Заварка сохранена',
  'log.skip': 'Не сохранять',

  'calib.suggest': 'Совет по помолу',
  'calib.finer': 'Мельче на {n} {unit}: {from} → {to}',
  'calib.coarser': 'Крупнее на {n} {unit}: {from} → {to}',
  'calib.keep': 'Помол оставить как есть: {setting}',
  'calib.apply': 'Применить к кофемолке', 'calib.applied': 'Калибровка обновлена',
  'calib.timeNote': 'Время стока отличается от цели на {d}, но вкус в порядке. Помол не трогаем.',

  'schemes.title': 'Схемы пролива', 'schemes.builtin': 'Базовые схемы', 'schemes.mine': 'Мои схемы',
  'schemes.empty': 'Своих схем пока нет. Скопируйте базовую или создайте новую.',
  'schemes.new': 'Новая схема', 'schemes.use': 'Заварить', 'schemes.edit': 'Изменить', 'schemes.copy': 'Копия',
  'schemes.share': 'Поделиться', 'schemes.delete': 'Удалить', 'schemes.deleted': 'Схема удалена',
  'schemes.confirmDelete': 'Удалить схему «{name}»?',
  'schemes.import': 'Схема по ссылке: «{name}»', 'schemes.importBtn': 'Добавить в мои', 'schemes.imported': 'Схема добавлена',

  'editor.title': 'Редактор схемы', 'editor.name': 'Название', 'editor.ratio': 'Пропорция', 'editor.temp': 'Стартовая температура',
  'editor.grind': 'Помол', 'editor.grindHint': 'на вашей кофемолке при дозе 14 г',
  'editor.bloom': 'Блуминг', 'editor.bloomWater': 'Вода на блуминг, × дозы', 'editor.bloomTime': 'Длительность блуминга, с',
  'editor.pulses': 'Вливания после блуминга', 'editor.interval': 'Интервал между вливаниями, с',
  'editor.dist': 'Распределение воды', 'editor.equal': 'Поровну', 'editor.custom': 'Свои доли',
  'editor.drawdown': 'Дренаж после последнего вливания, с',
  'editor.mode.params': 'По параметрам', 'editor.mode.steps': 'Ручные шаги',
  'editor.preview': 'Шаги при дозе {dose} г', 'editor.start': 'Старт, с', 'editor.water': 'Вода, г', 'editor.stepName': 'Название',
  'editor.addStep': 'Добавить шаг', 'editor.save': 'Сохранить', 'editor.cancel': 'Отмена', 'editor.saved': 'Схема сохранена',
  'editor.sharesHint': 'Доли вливаний в процентах от воды после блуминга. Сумма приводится к 100%.',

  'journal.title': 'Журнал', 'journal.empty': 'Заварок пока нет. После таймера нажмите «Записать заварку».',
  'journal.repeat': 'Повторить', 'journal.delete': 'Удалить', 'journal.deleted': 'Запись удалена',
  'journal.confirmDelete': 'Удалить запись от {date}?',

  'settings.grinder': 'Кофемолка', 'settings.search': 'Найти модель', 'settings.popular': 'Популярные', 'settings.all': 'Все модели',
  'settings.custom': 'Своя кофемолка', 'settings.customHint': 'Если вашей модели нет в списке: задайте две точки на её шкале.',
  'settings.customName': 'Название', 'settings.customFilter': 'Деление для фильтра (ваш рабочий помол)',
  'settings.customEspresso': 'Деление для эспрессо', 'settings.customSave': 'Сохранить свою кофемолку',
  'settings.calibration': 'Калибровка', 'settings.calibHint': 'Укажите деление, на котором у вас получается «Мытая мягкая» при 14 г. Bloomline пересчитает все схемы под вашу кофемолку.',
  'settings.calibNow': 'Сейчас: {v}', 'settings.calibNone': 'без поправки', 'settings.calibSet': 'Задать', 'settings.calibReset': 'Сбросить',
  'settings.brewer': 'Воронка', 'settings.brewerHint': 'Поправка помола для воронки ориентировочная, калибровка её уточнит.',
  'settings.water': 'Вода', 'settings.waterLab': 'Из Water Lab: {name}', 'settings.waterLabMissing': 'Water Lab на этом устройстве ещё не открывали',
  'settings.waterOpen': 'Открыть Water Lab', 'settings.waterPreset': 'Пресет',
  'settings.sound': 'Звуковые сигналы', 'settings.data': 'Данные',
  'settings.export': 'Сохранить резервную копию', 'settings.import': 'Загрузить из копии', 'settings.imported': 'Данные загружены: {n} записей',
  'settings.importError': 'Не получилось прочитать файл. Нужен файл резервной копии Bloomline (.json).',
  'settings.about': 'О приложении',

  'onb.title': 'Настроим Bloomline под вас', 'onb.grinder': 'Какая у вас кофемолка?', 'onb.calib': 'Ваш рабочий помол',
  'onb.calibHint': 'Деление, на котором у вас хорошо получается фильтр при 14 г. Можно пропустить и задать позже.',
  'onb.brewer': 'Воронка', 'onb.done': 'Готово', 'onb.skip': 'Пропустить',

  'share.link': 'Ссылка на схему', 'share.tasty': 'Текст для рецепта на Tasty Coffee', 'share.copy': 'Скопировать', 'share.copied': 'Скопировано',
  'share.send': 'Отправить',

  'common.close': 'Закрыть', 'common.yes': 'Да', 'common.no': 'Нет', 'common.g': 'г', 'common.sec': 'с',
};

const DICTS = { ru: RU };
let lang = 'ru';

export function t(key, vars) {
  let s = (DICTS[lang] && DICTS[lang][key]) ?? RU[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// Русские формы множественного числа: 1 щелчок, 2 щелчка, 5 щелчков
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export const WORDS = {
  click: n => plural(n, 'щелчок', 'щелчка', 'щелчков'),
  step: n => plural(n, 'деление', 'деления', 'делений'),
  pour: n => plural(n, 'вливание', 'вливания', 'вливаний'),
};
