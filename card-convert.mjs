// 원고의 장 본문(번호 목록 · "- 이름: 설명" 목록)을 카드 본문으로 바꾼다. 사용: node card-convert.mjs 3-12 3-13
import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('슬라이드-원고.md', import.meta.url);
let s = readFileSync(file, 'utf8');
for (const id of process.argv.slice(2)) {
  const a = s.indexOf(`## ${id}.`); if (a < 0) { console.log('없음', id); continue; }
  const rest = s.slice(a + 4); const b = a + 4 + rest.search(/\n## |\n---\n/);
  let blk = s.slice(a, b).replace(/^- 이미지: .*$/m, '- 이미지: (없음)').replace(/^- 배치: .*\n/m, '');
  const bi = blk.search(/^- 본문/m); const ai = blk.search(/^- (발표 메모|애니메이션)/m);
  const lines = blk.slice(bi, ai > bi ? ai : undefined).split('\n').slice(1).filter((l) => /^  (\d+\.|-) /.test(l));
  const cards = lines.map((l) => {
    let m = l.match(/^  (\d+)\. (.+?) — (.+)$/); if (m) return `  - **${m[1].padStart(2, '0')} · ${m[2]}** — ${m[3]}`;
    m = l.match(/^  (\d+)\. (.+)$/); if (m) return `  - **${m[1].padStart(2, '0')} · ${m[2]}**`;
    m = l.match(/^  - ([^:]{1,30}): (.+)$/); if (m) return `  - **${m[1]}** — ${m[2]}`;
    return l;
  });
  blk = blk.slice(0, bi) + '- 배치: 카드\n- 본문 (카드):\n' + cards.join('\n') + '\n' + (ai > bi ? blk.slice(ai) : '');
  s = s.slice(0, a) + blk + s.slice(b);
  console.log(id, cards.length);
}
writeFileSync(file, s);
