from pathlib import Path

path = Path('app.js')
s = path.read_text()

old_late = "late=state.jobs.filter(j=>!isCancelled(j)&&!isDone(j)&&j.date<d).length"
new_late = "late=state.jobs.filter(j=>j?.type==='Монтаж'&&j?.status==='Перенос').length"

old_open = "const d=today();const list=state.jobs.filter(j=>!isCancelled(j)&&!isDone(j)&&j.date<d).sort((a,b)=>a.date.localeCompare(b.date));"
new_open = "const list=state.jobs.filter(j=>j?.type==='Монтаж'&&j?.status==='Перенос').sort((a,b)=>a.date.localeCompare(b.date));"

if old_late not in s:
    raise SystemExit('Expected renderToday overdue expression not found')
if old_open not in s:
    raise SystemExit('Expected openOverdueJobs filter not found')

s = s.replace(old_late, new_late, 1)
s = s.replace(old_open, new_open, 1)
path.write_text(s)
print('Patched overdue logic in app.js')
