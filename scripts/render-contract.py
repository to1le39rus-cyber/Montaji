"""Deterministic design reference, not an alternate application runtime."""
from pathlib import Path
from html import escape
import subprocess
out=Path('docs/astra/renders');out.mkdir(parents=True,exist_ok=True)
BG='#F5F4EF';INK='#1C251F';MUTED='#566258';GREEN='#365747';BORDER='#DDE2D9'
class Screen:
 def __init__(self,title,kicker='СУББОТА, 19 СЕНТЯБРЯ',back=False,tab=0):
  self.parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844"><rect width="390" height="844" fill="{BG}"/>'];self.tab=tab;self.y=156
  self.text(20,29,'9:41',14,700);self.text(311,29,'▰ 100%',12);self.text(20,76,('‹  НАЗАД' if back else 'MONTAJI  /  AA'),12,700,GREEN);self.text(20,109,title,32,700);self.text(20,136,kicker,11,500,MUTED)
 def text(self,x,y,t,size=16,weight=400,color=INK):self.parts.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans,sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}">{escape(str(t))}</text>')
 def rect(self,x,y,w,h,fill='white',r=16):self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"/>')
 def label(self,t):self.text(20,self.y+22,t,18,700);self.y+=38
 def row(self,title,sub,amount='',badge=''):
  self.rect(20,self.y,350,84);self.text(36,self.y+28,title,16,600);self.text(36,self.y+52,sub,12,400,MUTED)
  if amount:self.text(36,self.y+72,amount,13,600,GREEN)
  self.text(344,self.y+44,'›',24,400,MUTED);self.y+=96
 def hero(self,label,value,sub):
  self.rect(20,self.y,350,146,GREEN,20);self.text(40,self.y+30,label,14,500,'#E7EDDF');self.text(40,self.y+80,value,40,700,'white');self.text(40,self.y+118,sub,13,400,'#E7EDDF');self.y+=164
 def button(self,t,secondary=False):
  self.rect(20,self.y,350,48,'#E7EDDF' if secondary else GREEN,10);self.text(36,self.y+30,t,15,600,GREEN if secondary else 'white');self.y+=60
 def input(self,label,value,large=False):
  self.text(20,self.y+14,label,13,500,MUTED);self.rect(20,self.y+24,350,80 if large else 48);self.text(34,self.y+54,value,16);self.y+=116 if large else 84
 def nav(self):
  self.rect(0,758,390,86,'white',0)
  for i,t in enumerate(['Сегодня','Календарь','Деньги','Клиенты','Ещё']):
   x=39+i*78;self.rect(x-12,772,24,24,GREEN if i==self.tab else '#E7EDDF',7);self.text(x-24,818,t,10,600,GREEN if i==self.tab else MUTED)
  self.rect(132,835,126,4,INK,2)
 def save(self,name,nav=True):
  if nav:self.nav()
  self.parts.append('</svg>');p=out/f'{name}.svg';p.write_text(''.join(self.parts));subprocess.run(['inkscape',str(p),'--export-type=png',f'--export-filename={out/name}.png'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)

s=Screen('Сегодня');s.hero('Начислено сегодня','6 000 ₽','2 работы выполнены · расход 850 ₽');s.label('Дальше по плану');s.row('10:00  Алексей · демо','Монтаж · Примерная улица, 18','18 500 ₽  ·  не оплачено');s.row('14:00  Мария · демо','Замер · Учебный проспект, 7','1 500 ₽');s.label('Не забыть');s.row('Уточнить доставку','Сегодня · срочная заметка');s.save('01-today')
s=Screen('Календарь','СЕНТЯБРЬ 2026',tab=1)
for i,t in enumerate(['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС']):s.text(26+i*50,178,t,11,600,MUTED)
for n in range(1,31):
 x=20+((n)%7)*50;y=198+((n)//7)*44
 if n==19:s.rect(x,y-22,40,38,GREEN,12)
 s.text(x+8,y,n,16,600,'white' if n==19 else INK)
s.y=432;s.label('Суббота, 19 сентября');s.row('10:00  Монтаж','Алексей · демо','18 500 ₽');s.row('14:00  Замер','Мария · демо','1 500 ₽');s.save('02-calendar')
s=Screen('19 сентября','3 РАБОТЫ · СУББОТА',True,1);s.row('10:00–12:00  Монтаж','Алексей · Примерная улица, 18','18 500 ₽');s.row('14:00–16:00  Замер','Мария · Учебный проспект, 7','1 500 ₽');s.row('Резерв  Сервис','Илья · выполнено','4 200 ₽ · оплачено');s.button('Добавить на этот день');s.save('03-day')
s=Screen('Деньги','СЕНТЯБРЬ 2026',tab=2);s.hero('Результат за месяц','28 050 ₽','Начислено − расходы');s.row('Начислено','Выполненные работы','30 100 ₽');s.row('Расходы','Транспорт, материалы','2 050 ₽');s.row('Все долги','За всё время · 1 работа','24 600 ₽');s.button('Добавить расход',True);s.save('04-money')
s=Screen('Клиенты','ВСЯ ИСТОРИЯ РАБОТ',tab=3);s.input('Поиск','Имя или телефон');s.row('Алексей · демо','2 работы · последняя сегодня','18 500 ₽ · запланировано');s.row('Мария · демо','2 работы · есть отменённые');s.row('София · демо','1 выполненная работа','Долг 24 600 ₽');s.save('05-clients')
s=Screen('Алексей','КЛИЕНТ · ДЕМО',True,3);s.hero('История сотрудничества','2 работы','Замер → монтаж');s.button('Создать заявку');s.row('Ближайшая работа','Сегодня · монтаж','18 500 ₽');s.row('История клиента','Все работы, включая отменённые');s.save('06-client')
s=Screen('История','АЛЕКСЕЙ · ВСЕ РАБОТЫ',True,3);s.row('19 сентября · Монтаж','Запланирован','18 500 ₽');s.row('14 сентября · Замер','Выполнен · оплачен','1 500 ₽');s.save('07-history')
s=Screen('Монтаж','СЕГОДНЯ · 10:00–12:00',True);s.hero('Алексей · демо','18 500 ₽','Запланирован · не оплачено');s.row('Примерная улица, 18','Квартира 42 · открыть маршрут');s.row('Лес и форма','Источник на момент создания');s.label('Что сделать');s.text(20,s.y+16,'Кухня 3,2 м. Столешница на месте.',14);s.y+=48;s.button('Отметить выполнение');s.button('Редактировать',True);s.save('08-job')
for name,title in [('09-create','Новая заявка'),('10-edit','Редактирование')]:
 s=Screen(title,'МОНТАЖ · ДАННЫЕ ЗАЯВКИ',True);s.input('Клиент','Алексей · демо' if name.startswith('10') else 'Имя клиента');s.input('Телефон','+7 (___) ___-__-__');s.input('Дата','19.09.2026');s.input('Время','10:00–12:00');s.input('Стоимость, ₽','18 500');s.button('Сохранить заявку');s.save(name,False)
s=Screen('Заметки','ВАЖНОЕ ДЛЯ РАБОТЫ',True,4);s.button('Новая заметка');s.row('Уточнить доставку','Сегодня · срочно');s.row('Пополнить расходники','Завтра');s.button('Открыть архив',True);s.save('11-notes')
s=Screen('Ещё','MONTAJI AA · ASTRA',tab=4)
for a,b in [('Заметки','Задачи, сроки и приоритеты'),('Магазины','Источники и контакты'),('Архив заявок','Отмена с сохранением истории'),('Экспорт данных','Заявки, расходы и заметки'),('Настройки DEV','Только вымышленные данные')]:s.row(a,b)
s.save('12-settings')
s=Screen('Магазины','СПРАВОЧНИК ИСТОЧНИКОВ',True,4);s.button('Добавить магазин');s.row('Лес и форма','Учебный проспект, 12');s.row('Линия кухни','Тестовая улица, 8');s.label('История сохранится');s.text(20,s.y+18,'Переименование не меняет старые заявки.',13,400,MUTED);s.save('13-stores')
s=Screen('Магазин','СОЗДАНИЕ / РЕДАКТИРОВАНИЕ',True,4);s.input('Название','Лес и форма');s.input('Адрес','Учебный проспект, 12');s.input('Контактное лицо','Демо-менеджер');s.input('Телефон','');s.button('Сохранить магазин');s.save('14-store-edit',False)
s=Screen('Расход','ДЕНЬГИ → НОВЫЙ РАСХОД',True,2);s.input('Сумма, ₽','850');s.input('Дата','19.09.2026');s.input('Категория','Транспорт');s.input('Комментарий','Топливо',True);s.button('Сохранить расход');s.save('15-expense',False)
s=Screen('Доп. доход','ВЫПОЛНЕННАЯ РАБОТА',True,2);s.input('Описание','Дополнительная работа');s.input('Сумма, ₽','1 800');s.input('Дата выполнения','19.09.2026');s.input('Оплата','Получена');s.button('Сохранить доход');s.save('16-income',False)
s=Screen('Оплата','СОФИЯ · ВЫПОЛНЕННЫЙ МОНТАЖ',True,2);s.hero('Ожидаем оплату','24 600 ₽','Долг за выполненную работу');s.button('Отметить оплаченным');s.row('Важно','Подтверждается вся сумма заявки');s.save('17-payment')
s=Screen('Сегодня','ПОДКЛЮЧЕНИЕ')
for y,h in [(156,146),(354,84),(450,84)]:s.rect(20,y,350,h,'#E7E9E1');s.rect(36,y+20,170,14,'#DDE2D9',6)
s.save('18-loading')
s=Screen('Заметки','АКТИВНЫЕ',True,4);s.y=290;s.label('Пока всё спокойно');s.text(20,s.y+18,'Сохраните то, что важно не забыть.',14,400,MUTED);s.y+=60;s.button('Создать заметку');s.save('19-empty')
s=Screen('Сегодня','НЕТ СЕТИ · ПОКАЗАН ПОСЛЕДНИЙ СНИМОК');s.rect(20,156,350,72,'#F8EBCF');s.text(36,183,'Вы не в сети',16,600);s.text(36,207,'Изменения не отправлены. Форма сохранена.',12);s.y=248;s.row('10:00  Алексей · демо','Монтаж · данные могут быть устаревшими');s.save('20-offline')
s=Screen('Редактирование','ИЗМЕНЕНИЯ НЕ СОХРАНЕНЫ',True);s.input('Стоимость, ₽','25 000');s.rect(20,248,350,156,'#F8EBCF');s.text(36,278,'Стоимость уже изменена',17,600);s.text(36,308,'На другом устройстве: 22 000 ₽',14);s.text(36,338,'Ваш вариант: 25 000 ₽',14);s.y=428;s.button('Повторить с моим значением');s.button('Вернуться к актуальной заявке',True);s.save('21-error-conflict',False)
s=Screen('Магазины','СПРАВОЧНИК',True,4);s.row('Лес и форма','Учебный проспект, 12');s.parts.append('<rect width="390" height="844" fill="#1C251F" opacity="0.35"/>');s.rect(20,290,350,258);s.text(40,332,'Убрать магазин?',24,700);s.text(40,368,'Он исчезнет из новых заявок.',14);s.text(40,394,'История останется без изменений.',14);s.y=420;s.button('Убрать в архив');s.button('Оставить',True);s.save('22-confirm',False)
s=Screen('Сегодня');s.hero('Начислено сегодня','6 000 ₽','2 работы выполнены');s.rect(20,677,350,52,GREEN);s.text(36,709,'Заявка сохранена',16,600,'white');s.save('23-success')
s=Screen('Сегодня');s.hero('Начислено сегодня','6 000 ₽','2 работы выполнены');s.parts.append('<rect width="390" height="844" fill="#1C251F" opacity="0.35"/>');s.rect(0,414,390,430);s.text(24,459,'Добавить',26,700);s.y=480
for a,b in [('Заявку','Монтаж, замер, сервис'),('Расход','Материалы, транспорт'),('Доп. доход','Другие выполненные работы')]:s.row(a,b)
s.save('24-sheet',False)
s=Screen('Новая заявка','КЛИЕНТ',True);s.input('Имя клиента','Алексей');s.input('Телефон','');s.y=350;s.button('Продолжить');s.rect(0,535,390,309,'#D8DADF',0)
for r,line in enumerate(['ЙЦУКЕНГШЩЗХ','ФЫВАПРОЛДЖЭ','ЯЧСМИТЬБЮ']):
 for i,c in enumerate(line):s.rect(4+i*35,562+r*48,31,40,'white',5);s.text(10+i*35,590+r*48,c,16)
s.rect(60,714,270,44,'white',6);s.text(150,743,'пробел',14);s.save('25-keyboard',False)
files=sorted(out.glob('*.svg'))
(out/'index.html').write_text('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Montaji · Design contract</title><style>body{background:#e7e9e1;font:16px system-ui;margin:24px;color:#1c251f}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,390px));gap:24px}img{width:100%;border-radius:24px}h1{font-size:28px}figcaption{padding:12px 0}figure{margin:0}</style><h1>Montaji / Astra · 390 × 844</h1><p>Контракт экранов и состояний. Все данные вымышлены.</p><main>'+''.join(f'<figure><img src="{p.name}" alt="{p.stem}"><figcaption>{p.stem}</figcaption></figure>' for p in files)+'</main></html>')
from PIL import Image,ImageOps,ImageDraw
board=Image.new('RGB',(4*234,7*534),'#e7e9e1')
for i,p in enumerate(sorted(out.glob('*.png'))):
 im=Image.open(p).convert('RGB').resize((234,506));x=(i%4)*234;y=(i//4)*534;board.paste(im,(x,y));ImageDraw.Draw(board).text((x+8,y+510),p.stem,fill=INK)
board.save(out/'board.jpg')
