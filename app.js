// ポケモン10問
//
// 2^10 = 1024 < 1025 なので、Yes/No の質問 10 回では 1025 匹から 1 匹には絞りきれない。
// このサイトは「残り候補がちょうど 2 匹」で 10 問目を終えるように質問を選び、最後は 2 択を当てずっぽうで答える。
//
// 不変条件: 残り k 問のとき、候補数 m は 2 <= m <= 2^(k+1)。
// 質問を選ぶときは「はい」側・「いいえ」側のどちらに答えられても、次の候補数がこの範囲に収まるものだけを使う。
// 「ちょうど X ならどちらでも」型の質問では境界上のポケモンが両側に残るので、奇数の候補も 2 つに分けられる。

const TOTAL_QUESTIONS = 10;
const ALL = window.POKEMON;

const TYPE = {
  1: "ノーマル", 2: "かくとう", 3: "ひこう", 4: "どく", 5: "じめん", 6: "いわ",
  7: "むし", 8: "ゴースト", 9: "はがね", 10: "ほのお", 11: "みず", 12: "くさ",
  13: "でんき", 14: "エスパー", 15: "こおり", 16: "ドラゴン", 17: "あく", 18: "フェアリー",
};
const GEN = {
  1: "赤・緑", 2: "金・銀", 3: "ルビー・サファイア", 4: "ダイヤモンド・パール", 5: "ブラック・ホワイト",
  6: "X・Y", 7: "サン・ムーン", 8: "ソード・シールド", 9: "スカーレット・バイオレット",
};
const SHAPE = { 8: "4本足で歩く", 12: "人のような姿をしている", 9: "翼がある", 2: "ヘビのように細長い", 1: "ほぼ頭（顔）だけの姿だ" };

// どちらに答えても候補が減らない「引き伸ばし」用の質問
const STALL = [
  "そのポケモンのこと、好きですか？",
  "そのポケモンは強いと思いますか？",
  "そのポケモンを手持ちに入れたことがありますか？",
  "そのポケモン、かわいいと思いますか？",
  "そのポケモンのぬいぐるみがあったら欲しいですか？",
  "そのポケモンの鳴き声を思い出せますか？",
  "今、ちょっとお腹が空いていますか？",
];

// 画像は scripts/build-sprites.py で作る 1 枚のスプライトシート（32 列 × 96px）から切り出す。
// artifact などでは外部画像を読めないため、ページと同じ場所に置いた sprites.png だけを使う。
const SHEET_COLS = 32;
const SHEET_ROWS = Math.ceil(ALL.length / SHEET_COLS);
function sprite(p, className = "") {
  const el = document.createElement("div");
  el.className = `sprite ${className}`.trim();
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", p.name);
  const i = p.id - 1;
  el.style.backgroundPosition =
    `${((i % SHEET_COLS) / (SHEET_COLS - 1)) * 100}% ${(Math.floor(i / SHEET_COLS) / (SHEET_ROWS - 1)) * 100}%`;
  el.style.backgroundSize = `${SHEET_COLS * 100}% ${SHEET_ROWS * 100}%`;
  return el;
}
const no = (id) => `No.${String(id).padStart(4, "0")}`;
const meters = (dm) => `${(dm / 10).toFixed(1)}m`;
const collator = new Intl.Collator("ja");

// ---- 名前の性質 ----

const ROWS = [
  ["ア行", "アイウエオ"], ["カ行", "カキクケコ"], ["サ行", "サシスセソ"], ["タ行", "タチツテト"], ["ナ行", "ナニヌネノ"],
  ["ハ行", "ハヒフヘホ"], ["マ行", "マミムメモ"], ["ヤ行", "ヤユヨ"], ["ラ行", "ラリルレロ"], ["ワ行", "ワヲン"],
];
const SMALL = { ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ", ャ: "ヤ", ュ: "ユ", ョ: "ヨ", ッ: "ツ", ヮ: "ワ" };
const rowOf = (ch) => {
  const base = SMALL[ch] ?? ch.normalize("NFD")[0];
  return ROWS.findIndex(([, chars]) => chars.includes(base));
};
const NAME_CACHE = new Map();
function nameInfo(p) {
  let info = NAME_CACHE.get(p.id);
  if (!info) {
    const chars = [...p.name];
    const decomposed = p.name.normalize("NFD");
    const noBar = chars.filter((c) => c !== "ー");
    info = {
      dakuten: decomposed.includes("\u3099"),
      handakuten: decomposed.includes("\u309A"),
      small: /[ァィゥェォャュョヮ]/.test(p.name),
      sokuon: p.name.includes("ッ"),
      n: p.name.includes("ン"),
      repeat: new Set(noBar).size < noBar.length,
      row: rowOf(chars[0]),
      last: chars.at(-1),
    };
    NAME_CACHE.set(p.id, info);
  }
  return info;
}
const NAME_FEATURES = [
  ["名前に濁点のつく字（ガ・ザ・ダ・バ行など）が入っていますか？", (p) => nameInfo(p).dakuten],
  ["名前にパ行（パピプペポ）の字が入っていますか？", (p) => nameInfo(p).handakuten],
  ["名前に小さい「ャ・ュ・ョ・ァ・ィ・ゥ・ェ・ォ」が入っていますか？", (p) => nameInfo(p).small],
  ["名前に小さい「ッ」が入っていますか？", (p) => nameInfo(p).sokuon],
  ["名前に「ン」が入っていますか？", (p) => nameInfo(p).n],
  ["名前に同じ字が2回以上出てきますか？（伸ばし棒は数えない）", (p) => nameInfo(p).repeat],
];

// ---- 質問の候補 ----
// test(p) は true（はい）/ false（いいえ）/ null（どちらでもよい）を返す。

function* candidateQuestions(pool, target) {
  const has = (f) => pool.some(f);

  for (const [id, name] of Object.entries(TYPE)) {
    if (has((p) => p.types.includes(+id)))
      yield { family: "type", cost: 0, text: `${name}タイプを持っていますか？`, test: (p) => p.types.includes(+id) };
  }
  yield { family: "dual", cost: 0.2, text: "タイプを2つ持っていますか？", test: (p) => p.types.length === 2 };
  // 2つのタイプのどちらか（組み合わせが多いので、ちょうどいい分け方が見つかりやすい）
  const typeIds = Object.keys(TYPE).map(Number);
  for (const a of typeIds) {
    for (const b of typeIds) {
      if (a < b)
        yield {
          family: "type2", cost: 0.3,
          text: `${TYPE[a]}タイプか${TYPE[b]}タイプを持っていますか？`,
          test: (p) => p.types.includes(a) || p.types.includes(b),
        };
    }
  }

  for (const [g, title] of Object.entries(GEN)) {
    yield { family: "gen", cost: 0.1, text: `初登場は第${g}世代（『${title}』）ですか？`, test: (p) => p.gen === +g };
    if (+g > 1)
      yield { family: "gen", cost: 0.1, text: `初登場は第${g}世代（『${title}』）以降ですか？`, test: (p) => p.gen >= +g };
  }

  for (const [s, desc] of Object.entries(SHAPE)) {
    yield { family: "shape", cost: 0.3, text: `そのポケモンは${desc}？`, test: (p) => p.shape === +s };
  }

  yield { family: "legend", cost: 0, text: "伝説または幻のポケモンですか？", test: (p) => p.legendary || p.mythical };
  yield { family: "legend", cost: 0.1, text: "幻のポケモンですか？", test: (p) => p.mythical };
  yield { family: "evo", cost: 0, text: "まだ進化を残していますか？", test: (p) => p.evolves };
  yield { family: "evo", cost: 0, text: "何かのポケモンから進化した姿ですか？", test: (p) => p.evolved };
  yield { family: "evo", cost: 0.1, text: "進化しないポケモン（進化前も進化後もいない）ですか？", test: (p) => !p.evolves && !p.evolved };
  yield { family: "evo", cost: 0.2, text: "タマゴから生まれる「ベイビィポケモン」ですか？", test: (p) => p.baby };
  yield { family: "evo", cost: 0.1, text: "3段階に進化する系統のポケモンですか？（ヒトカゲ→リザード→リザードンのような）", test: (p) => p.chainStages === 3 };
  yield { family: "evo", cost: 0.1, text: "1回だけ進化した姿（進化の2段階目）ですか？", test: (p) => p.stage === 2 };
  yield { family: "gender", cost: 0.2, text: "性別不明のポケモンですか？", test: (p) => p.genderless };

  // 高さ（だいたいで答えられるよう、キリのいい値だけ。境界付近はどちらでもよい）
  yield* thresholds(pool, "height", 0.6, (p) => p.height, HEIGHTS, (v) => `高さは ${meters(v)} より高いですか？（だいたい ${meters(v)} ならどちらでも）`);

  // 名前の文字の性質。名前さえ知っていれば答えられる。
  for (const [text, test] of NAME_FEATURES) yield { family: "namefeat", cost: 0.2, text, test };
  for (const ch of new Set(pool.map((p) => nameInfo(p).last))) {
    const label = ch === "ー" ? "伸ばし棒「ー」" : `「${ch}」`;
    yield { family: "nameend", cost: 0.4, text: `名前は${label}で終わりますか？`, test: (p) => nameInfo(p).last === ch };
  }
  for (let i = 0; i < ROWS.length; i++) {
    const [row, chars] = ROWS[i];
    yield {
      family: "namerow", cost: 0.3,
      text: `名前は${row}（${chars}）で始まりますか？（濁点・半濁点は気にしない）`,
      test: (p) => nameInfo(p).row === i,
    };
    if (i > 0 && i < ROWS.length - 1)
      yield {
        family: "namerow", cost: 0.3,
        text: `名前は「ア」から「${ROWS[i][1].at(-1)}」までのどれかで始まりますか？（濁点・半濁点は気にしない）`,
        test: (p) => nameInfo(p).row <= i,
      };
  }

  // 名前
  const lens = [...new Set(pool.map((p) => [...p.name].length))];
  for (const n of lens) {
    yield { family: "namelen", cost: 0.5, text: `名前は ${n} 文字以上ですか？`, test: (p) => [...p.name].length >= n };
  }
  const chars = new Set(pool.flatMap((p) => [...p.name]));
  for (const ch of chars) {
    if (ch === "ー") {
      yield { family: "namechar", cost: 0.5, text: "名前に伸ばし棒「ー」が入っていますか？", test: (p) => p.name.includes(ch) };
    } else if (/[ァ-ヴ]/.test(ch)) {
      yield { family: "namechar", cost: 0.8, text: `名前に「${ch}」の字が入っていますか？`, test: (p) => p.name.includes(ch) };
    }
  }
  for (const ch of new Set(pool.map((p) => p.name[0]))) {
    yield { family: "namehead", cost: 0.7, text: `名前は「${ch}」から始まりますか？`, test: (p) => p.name[0] === ch };
  }

  // 最終手段: 図鑑番号と五十音順。どんな分け方もできるので必ず質問が見つかる。
  // 全部の位置を試すと遅いので、目標の候補数あたりで切れる位置だけ試す。
  const m = pool.length;
  const goal = Math.round(target);
  const cuts = new Set();
  for (const c of [goal, m - goal, Math.floor(m / 2), Math.ceil(m / 2)]) {
    for (let d = -1; d <= 1; d++) if (c + d >= 1 && c + d < m) cuts.add(c + d);
  }
  const byId = [...pool].sort((a, b) => a.id - b.id);
  const byKana = [...pool].sort((a, b) => KANA_RANK.get(a.id) - KANA_RANK.get(b.id));
  for (const i of cuts) {
    const t = byId[i];
    yield { family: "dex", cost: 1.4, text: `全国図鑑の番号は ${no(t.id)} 以降ですか？`, test: (p) => p.id >= t.id };
    yield {
      family: "dex", cost: 1.6,
      text: `全国図鑑の番号は ${no(t.id)} より後ですか？（${no(t.id)} ならどちらでも）`,
      test: (p) => (p.id === t.id ? null : p.id > t.id),
    };
    const k = byKana[i], r = KANA_RANK.get(k.id);
    yield {
      family: "kana", cost: 1.2,
      text: `名前を五十音順に並べると「${k.name}」より後ですか？（「${k.name}」ならどちらでも）`,
      test: (p) => (p.id === k.id ? null : KANA_RANK.get(p.id) > r),
    };
  }

  for (const text of STALL) yield { family: "stall", cost: 0.8, text, test: () => null };
}

// 高さのしきい値候補（デシメートル）
const HEIGHTS = [5, 10, 20];

// 「だいたい v」= v の ±5% 以内はどちらと答えてもよい
function* thresholds(pool, family, cost, get, values, text) {
  for (const v of values) {
    const lo = v * 0.95, hi = v * 1.05;
    yield { family, cost, text: text(v), test: (p) => (get(p) >= lo && get(p) <= hi ? null : get(p) > v) };
  }
}

// 五十音順の順位（比較のたびに Collator を呼ぶと遅いので先に計算しておく）
const KANA_RANK = new Map(
  [...ALL].sort((a, b) => collator.compare(a.name, b.name)).map((p, i) => [p.id, i]),
);

function split(pool, q) {
  const yes = [], no = [];
  for (const p of pool) {
    const r = q.test(p);
    if (r !== false) yes.push(p);
    if (r !== true) no.push(p);
  }
  return { yes, no };
}

// 残り k 問（この質問のあと）で候補数 s から最後ちょうど 2 匹にできるか
const feasible = (s, k) => s >= 2 && s <= 2 ** (k + 1);

function chooseQuestion(pool, questionsLeftAfter, asked, lastFamily) {
  const m = pool.length;
  const k = questionsLeftAfter;
  // 候補数を 2 に向けて等比的に減らしていく目標値
  const target = 2 * (m / 2) ** (k / (k + 1));
  const scored = [];
  for (const q of candidateQuestions(pool, target)) {
    if (asked.has(q.text)) continue;
    const { yes, no } = split(pool, q);
    if (!feasible(yes.length, k) || !feasible(no.length, k)) continue;
    const dev = Math.max(Math.abs(Math.log(yes.length / target)), Math.abs(Math.log(no.length / target)));
    const score = dev + q.cost * 0.25 + (q.family === lastFamily ? 0.15 : 0) + Math.random() * 0.12;
    scored.push({ q, yes, no, score });
  }
  scored.sort((a, b) => a.score - b.score);
  // 上位からランダムに選んで毎回少し違う質問になるようにする
  const best = scored[0].score;
  const top = scored.filter((s) => s.score <= best + 0.05).slice(0, 4);
  return top[Math.floor(Math.random() * top.length)];
}

// ---- UI ----

const $ = (sel) => document.querySelector(sel);
const state = { pool: ALL, history: [], current: null };

function buildGrid() {
  const grid = $("#grid");
  const frag = document.createDocumentFragment();
  for (const p of ALL) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.id = p.id;
    cell.title = `${no(p.id)} ${p.name}`;
    cell.append(sprite(p));
    frag.append(cell);
  }
  grid.append(frag);
}

// 候補一覧の更新は 2 段階で行う。
// 1. 脱落したアイコンをその場でフェードアウトさせる（並びはまだ変えない）
// 2. フェードが終わったら並びとサイズを確定し、残ったアイコンを元の位置から新しい位置へスライドさせる
function renderGrid(pool, prevPool) {
  const grid = $("#grid");
  const alive = new Set(pool.map((p) => p.id));
  const wasAlive = new Set(prevPool.map((p) => p.id));
  let dropping = false;
  for (const cell of grid.children) {
    const id = +cell.dataset.id;
    const drop = wasAlive.has(id) && !alive.has(id);
    cell.classList.toggle("just-out", drop);
    dropping ||= drop;
  }
  $("#count").textContent = pool.length;
  const dropped = prevPool.length - pool.length;
  $("#dropped").textContent = dropped > 0 ? `（今の質問で ${dropped} 匹脱落）` : prevPool === pool ? "" : "（今の質問では脱落なし）";

  const settle = () =>
    slideLayout(() => {
      for (const cell of grid.children) {
        cell.classList.toggle("out", !alive.has(+cell.dataset.id));
        cell.classList.remove("just-out");
      }
      // 残りが少ないほどアイコンを大きくする
      const n = pool.length;
      grid.style.setProperty("--cell", n > 300 ? "40px" : n > 60 ? "56px" : n > 16 ? "72px" : "96px");
    });
  clearTimeout(state.dropTimer);
  if (dropping && !reducedMotion()) state.dropTimer = setTimeout(settle, 600);
  else settle();
}

// mutate でレイアウトが変わる前後の位置を比べ、各アイコンを元の位置から新しい位置へ動かす（FLIP）。
// 新しく現れたアイコンはふわっと出す。
function slideLayout(mutate) {
  const grid = $("#grid");
  const cells = [...grid.children];
  const gridHeight = grid.getBoundingClientRect().height;
  const before = new Map();
  for (const cell of cells) {
    const r = cell.getBoundingClientRect();
    if (r.width) before.set(cell, r);
  }
  mutate();
  if (reducedMotion()) return;
  // 枠の高さも徐々に変えて、ページ全体がカクっとずれないようにする
  const newHeight = grid.getBoundingClientRect().height;
  if (Math.abs(newHeight - gridHeight) > 1)
    grid.animate([{ height: `${gridHeight}px`, overflow: "hidden" }, { height: `${newHeight}px`, overflow: "hidden" }], {
      duration: 550,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    });
  for (const cell of cells) {
    const r = cell.getBoundingClientRect();
    if (!r.width) continue;
    const b = before.get(cell);
    if (!b) {
      cell.animate([{ opacity: 0, transform: "scale(0.4)" }, { opacity: 1, transform: "none" }], { duration: 400, easing: "ease-out" });
      continue;
    }
    const dx = b.left - r.left, dy = b.top - r.top, scale = b.width / r.width;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(scale - 1) < 0.01) continue;
    cell.animate(
      [
        { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transformOrigin: "0 0", transform: "none" },
      ],
      { duration: 550, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }
}

function renderHistory() {
  $("#history").innerHTML = "";
  for (const h of state.history) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="q"></span><span class="a ${h.answer ? "yes" : "no"}" aria-label="${h.answer ? "はい" : "いいえ"}">${h.answer ? "◯" : "✕"}</span><span class="n">${h.after}匹</span>`;
    li.querySelector(".q").textContent = h.text;
    $("#history").append(li);
  }
}

function show(screen) {
  for (const el of document.querySelectorAll(".screen")) el.hidden = el.id !== screen;
}

function nextQuestion() {
  const n = state.history.length;
  if (n >= TOTAL_QUESTIONS) return finale();
  const asked = new Set(state.history.map((h) => h.text));
  const lastFamily = state.history.at(-1)?.family;
  state.current = chooseQuestion(state.pool, TOTAL_QUESTIONS - n - 1, asked, lastFamily);
  $("#qnum").textContent = `第${n + 1}問`;
  $("#pips").replaceChildren(
    ...Array.from({ length: TOTAL_QUESTIONS }, (_, i) => {
      const li = document.createElement("li");
      if (i < n) li.className = "done";
      if (i === n) li.className = "now";
      return li;
    }),
  );
  $("#question").textContent = state.current.q.text;
  $("#back").disabled = n === 0;
  show("ask");
}

function answer(yes) {
  const c = state.current;
  const prev = state.pool;
  state.pool = yes ? c.yes : c.no;
  state.history.push({ text: c.q.text, family: c.q.family, answer: yes, before: prev, after: state.pool.length });
  renderGrid(state.pool, prev);
  renderHistory();
  nextQuestion();
}

function back() {
  const h = state.history.pop();
  if (!h) return;
  const prev = state.pool;
  state.pool = h.before;
  renderGrid(state.pool, prev);
  renderHistory();
  nextQuestion();
}

// ---- 最後の 2 択 ----
// 2 匹を暗い舞台に並べ、くっきりした円のスポットライトを舞台じゅうに動かしてから片方で止める。

const SPOT_R = 104;
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function setSpot(x, y, r = SPOT_R) {
  const stage = $("#stage");
  stage.style.setProperty("--x", `${x}px`);
  stage.style.setProperty("--y", `${y}px`);
  stage.style.setProperty("--r", `${r}px`);
}

// points を順にたどってスポットライトを動かす。durations[i] は points[i] までの所要時間
function moveSpot(from, points, durations, done) {
  let seg = 0, segStart = performance.now(), prev = from;
  const frame = (now) => {
    const t = Math.min(1, (now - segStart) / durations[seg]);
    const [x0, y0] = prev, [x1, y1] = points[seg];
    const e = ease(t);
    setSpot(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e);
    if (t < 1) return (state.spotFrame = requestAnimationFrame(frame));
    prev = points[seg++];
    segStart = now;
    if (seg < points.length) state.spotFrame = requestAnimationFrame(frame);
    else done();
  };
  state.spotFrame = requestAnimationFrame(frame);
}

function contenderCenter(i) {
  const stage = $("#stage").getBoundingClientRect();
  const r = $("#contenders").children[i].getBoundingClientRect();
  return [r.left + r.width / 2 - stage.left, r.top + r.height / 2 - stage.top];
}

function finale() {
  const pair = [...state.pool].sort((a, b) => a.id - b.id);
  state.pair = pair;
  state.pick = Math.floor(Math.random() * 2);
  $("#contenders").replaceChildren(
    ...pair.map((p) => {
      const fig = document.createElement("figure");
      fig.className = "contender";
      const cap = document.createElement("figcaption");
      cap.textContent = p.name;
      fig.append(sprite(p), cap);
      return fig;
    }),
  );
  const stage = $("#stage");
  stage.classList.remove("decided", "lit");
  $("#guess-answer").textContent = "";
  $("#wrong").hidden = true;
  $("#again").hidden = true;
  show("guess");

  const { width: w, height: h } = stage.getBoundingClientRect();
  const end = contenderCenter(state.pick);
  if (reducedMotion()) {
    stage.classList.add("lit");
    setSpot(...end);
    return reveal(state.pick);
  }
  // 舞台のあちこちをランダムにめぐる。最初は速く、だんだんゆっくり。途中で両方の上も通る。
  const rand = () => [SPOT_R * 0.6 + Math.random() * (w - SPOT_R * 1.2), SPOT_R * 0.6 + Math.random() * (h - SPOT_R * 1.2)];
  const points = [rand(), contenderCenter(1 - state.pick), rand(), rand(), contenderCenter(state.pick), rand(), rand(), contenderCenter(1 - state.pick), end];
  const durations = [260, 280, 300, 330, 380, 440, 520, 650, 900];
  const start = rand();
  setSpot(...start);
  state.finaleTimer = setTimeout(() => {
    stage.classList.add("lit");
    moveSpot(start, points, durations, () => reveal(state.pick));
  }, 500);
}

function reveal(i) {
  const stage = $("#stage");
  stage.dataset.pick = i;
  stage.classList.add("decided");
  [...$("#contenders").children].forEach((el, j) => el.classList.toggle("chosen", i === j));
  $("#guess-answer").textContent = `${state.pair[i].name} ですね！`;
  $("#wrong").hidden = i !== state.pick; // 「ちがう」は 1 回目の答えにだけ出す
  $("#again").hidden = false;
  confetti();
}

// 「ちがう」と言われたら、もう一方へスポットライトを移す
function wrong() {
  const other = 1 - state.pick;
  $("#stage").classList.remove("decided");
  $("#guess-answer").textContent = "じゃあ……";
  $("#wrong").hidden = true;
  $("#again").hidden = true;
  const from = contenderCenter(state.pick), to = contenderCenter(other);
  if (reducedMotion()) {
    setSpot(...to);
    return reveal(other);
  }
  moveSpot(from, [to], [700], () => reveal(other));
}

// ---- 紙吹雪 ----

function confetti() {
  if (reducedMotion()) return;
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  const dpr = devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ["#e8443a", "#f6c445", "#3d8fe0", "#4cbb6c", "#f08ac0", "#ffffff"];
  const origin = $("#stage").getBoundingClientRect();
  const pieces = Array.from({ length: 160 }, () => ({
    x: origin.left + origin.width / 2 + (Math.random() - 0.5) * origin.width * 0.6,
    y: origin.top + origin.height * 0.4,
    vx: (Math.random() - 0.5) * 14,
    vy: -6 - Math.random() * 12,
    w: 6 + Math.random() * 6,
    h: 3 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const started = performance.now();
  cancelAnimationFrame(state.confettiFrame);
  const frame = (now) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const age = now - started;
    for (const p of pieces) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / 3200);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, (-p.h / 2) * Math.cos(p.rot * 3), p.w, p.h * Math.cos(p.rot * 3));
      ctx.restore();
    }
    if (age < 3200) state.confettiFrame = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  };
  state.confettiFrame = requestAnimationFrame(frame);
}

function start() {
  clearTimeout(state.finaleTimer);
  cancelAnimationFrame(state.spotFrame);
  const prev = state.pool;
  state.pool = ALL;
  state.history = [];
  renderGrid(state.pool, prev === ALL ? ALL : prev);
  $("#dropped").textContent = "";
  renderHistory();
  nextQuestion();
}

buildGrid();
renderGrid(ALL, ALL);
$("#total").textContent = ALL.length;
$("#start").onclick = start;
$("#yes").onclick = () => answer(true);
$("#no").onclick = () => answer(false);
$("#back").onclick = back;
$("#again").onclick = start;
$("#wrong").onclick = wrong;
$("#toggle-all").onclick = () => {
  let on;
  slideLayout(() => (on = $("#grid").classList.toggle("show-all")));
  $("#toggle-all").setAttribute("aria-pressed", on);
  $("#toggle-all").textContent = on ? "残りだけ表示" : "全部表示";
};
