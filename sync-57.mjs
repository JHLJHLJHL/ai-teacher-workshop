// 번호-57장.md 의 "현재" 열을 원고 장 이름으로 다시 맞춘다(57장 화면 번호는 고정).
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('.', import.meta.url);
const src = readFileSync(new URL('슬라이드-원고.md', dir), 'utf8');
const cur = new Map([...src.matchAll(/^## (\d+-\d+)\. (.+)$/gm)].map((m) => [m[2], m[1]]));
const order = [...src.matchAll(/^## (\d+-\d+)\. (.+)$/gm)].map((m) => m[2]);
const file = new URL('번호-57장.md', dir);
const rows = readFileSync(file, 'utf8').split('\n').filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.split('|').map((c) => c.trim()).filter(Boolean));
const out = ['# 57장 기준 번호 (사용자 지시 기준, 화면 번호 고정)', '', '| 57장 번호 | 장 이름(57장 당시) | 지금 원고 | 지금 화면 번호 |', '|---|---|---|---|'];
for (const r of rows) {
  const [num, , name] = r.length >= 4 ? [r[0], r[1], r[1]] : [r[0], r[1], r[2]];
  const title = r.length >= 4 ? r[1] : r[2];
  const id = cur.get(title);
  out.push(`| ${num} | ${title} | ${id || '(삭제·합침)'} | ${id ? order.indexOf(title) + 1 : '-'} |`);
}
writeFileSync(file, out.join('\n') + '\n');
console.log('synced', rows.length);
