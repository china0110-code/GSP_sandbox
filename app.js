// =============================================
// 粒度設定
// =============================================
const levelConfig = {
  honbu: {
    label: '本部レベル',
    count: '5〜8件',
    detail: '部門をまたぐ大きな業務領域・機能の単位で列挙してください。個々の作業ではなく「何をする組織か」という視点での機能分類です。'
  },
  buka: {
    label: '部課レベル',
    count: '10〜18件',
    detail: '具体的な業務プロセス・フロー単位で列挙してください。担当者が日常的に行う業務の塊レベルです。'
  },
  tanto: {
    label: '担当レベル',
    count: '20〜30件',
    detail: '個々の作業・タスク単位で細かく列挙してください。担当者が1日の中でこなす具体的な操作・手順レベルです。'
  }
};

const AXES = [
  { key: 'repeatability',   label: '繰り返し性',           desc: '毎回同じ手順・ルールで実行できるか' },
  { key: 'data_readiness',  label: 'データ整備度',         desc: 'データが定型・デジタルで揃っており取得しやすいか' },
  { key: 'judgment',        label: '判断の複雑さ',         desc: 'ルール外の例外判断や裁量が少ないか' },
  { key: 'communication',   label: '対人依存度',           desc: '外部の人との対話・交渉・関係構築が不要か' },
  { key: 'recovery_cost',   label: 'ミスのリカバリコスト', desc: 'ミス発生時の修正・影響対応が軽微か' },
  { key: 'frequency',       label: '年間作業頻度',         desc: '年間の発生回数が多いか（多いほど自動化効果大）' },
  { key: 'volume',          label: '作業ボリューム',       desc: '1回あたりの作業時間・工数が大きいか' },
  { key: 'tacit_knowledge', label: '属人性の低さ',         desc: '特定担当者のスキル・経験・勘への依存が低いか' },
  { key: 'verifiability',   label: '出力の検証しやすさ',   desc: 'AIの出力結果を人間が確認・修正しやすいか' },
  { key: 'compliance',      label: 'コンプライアンス',     desc: 'AIが実行しても法的・規制上の問題が少ないか' },
];

let currentResult = null;

// =============================================
// ユーティリティ
// =============================================
function getSelectedLevel() {
  return document.querySelector('input[name="granularity"]:checked').value;
}
function getScoreColor(score) {
  if (score >= 75) return '#1D9E75';
  if (score >= 50) return '#BA7517';
  if (score >= 25) return '#D85A30';
  return '#888888';
}
function getScoreLabel(score) {
  if (score >= 75) return { text: '高',    bg: '#e8f8f2', color: '#1D9E75' };
  if (score >= 50) return { text: '中',    bg: '#fef6e8', color: '#BA7517' };
  if (score >= 25) return { text: '低',    bg: '#fdf0ee', color: '#D85A30' };
  return              { text: '限定的', bg: '#f5f5f5',  color: '#888888' };
}
function getAxisVal(t, i) {
  if (!t.axes) return 0;
  return t.axes[`axis${i+1}_${AXES[i].key}`] ?? 0;
}

// =============================================
// SVGレーダーチャート生成
// =============================================
function buildRadarSVG(task, size) {
  const n = AXES.length;

  // 左右のラベルが切れないよう viewBox を横方向に広げる
  // チャート本体は正方形(size×size)の中央に描き、
  // 左右にlabelPad分の余白を追加したviewBoxにする
  const labelPad = size * 0.38;       // 左右それぞれの余白
  const vbW = size + labelPad * 2;    // viewBox幅（横に広い）
  const vbH = size;                   // viewBox高さ（縦はそのまま）
  const cx = vbW / 2;                 // チャート中心X（viewBox基準）
  const cy = vbH / 2;                 // チャート中心Y

  const radius = size * 0.28;         // チャート半径
  const labelR = size * 0.42;         // ラベル配置半径
  const levels = 5;
  const color = getScoreColor(task.score);
  const fs = size * 0.046;            // フォントサイズ
  const lineH = fs * 1.35;            // 行間

  function angle(i) { return (Math.PI * 2 * i / n) - Math.PI / 2; }
  function pt(r, i) { return { x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) }; }

  // グリッド
  let gridLines = '';
  for (let l = 1; l <= levels; l++) {
    const r = radius * l / levels;
    const pts = Array.from({length: n}, (_, i) => pt(r, i));
    gridLines += `<polygon points="${pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="${l===levels?'#f9f9f9':'none'}" stroke="#ddd" stroke-width="0.5"/>`;
  }

  // 軸線
  let axisLines = '';
  for (let i = 0; i < n; i++) {
    const p = pt(radius, i);
    axisLines += `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#ccc" stroke-width="0.5"/>`;
  }

  // データポリゴン
  const vals = AXES.map((_, i) => getAxisVal(task, i));
  const dataPts = vals.map((v, i) => pt(radius * v / 10, i));
  const polyPoints = dataPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // ラベル（5文字超は2行に折り返し）
  let labels = '';
  for (let i = 0; i < n; i++) {
    const p = pt(labelR, i);
    const ax = angle(i);
    const cosA = Math.cos(ax);

    // text-anchor：右側はstart、左側はend、上下はmiddle
    let anchor = 'middle';
    if (cosA > 0.25) anchor = 'start';
    if (cosA < -0.25) anchor = 'end';

    // 5文字超は2行に分割
    const labelText = AXES[i].label;
    let lines = labelText.length <= 5
      ? [labelText]
      : [labelText.slice(0, Math.ceil(labelText.length / 2)), labelText.slice(Math.ceil(labelText.length / 2))];

    // 複数行を縦中央に揃える
    const totalH = lines.length * lineH;
    const startY = p.y - totalH / 2 + lineH / 2;

    lines.forEach((line, li) => {
      labels += `<text x="${p.x.toFixed(1)}" y="${(startY + li * lineH).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="${fs}" fill="#333" font-family="sans-serif" font-weight="500">${line}</text>`;
    });
  }

  // データ点
  const dots = dataPts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${color}"/>`).join('');

  // widthはsize固定（カードの幅に合わせる）、viewBoxだけ横に広げてラベルを収める
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}">
    ${gridLines}${axisLines}
    <polygon points="${polyPoints}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.5"/>
    ${dots}${labels}
  </svg>`;
}

// =============================================
// ステップ1：プロンプト生成
// =============================================
function generatePrompt() {
  const company = document.getElementById('company').value.trim();
  const dept    = document.getElementById('dept').value.trim();
  if (!company || !dept) { alert('企業名・業種と部署名を両方入力してください。'); return; }
  const cfg = levelConfig[getSelectedLevel()];
  const axesPrompt = AXES.map((a,i) => `  - axis${i+1}_${a.key}（${a.label}）: 0〜10の整数。${a.desc}`).join('\n');

  const prompt = `あなたは業務分析の専門家です。以下の手順で回答してください。

【入力情報】
企業・業種: ${company}
部署名: ${dept}
洗い出し粒度: ${cfg.label}（${cfg.count}程度）
粒度の指示: ${cfg.detail}

【手順】
STEP1: 上記の企業・部署で日常的に行われていると想定される業務を、抜け漏れなく${cfg.count}程度列挙してください。業務の洗い出しを最優先し、実態に即した具体的な業務名と説明を考えてください。

STEP2: STEP1で洗い出した各業務について、以下の10軸でそれぞれ0〜10点で採点し、合計点を算出してください。
${axesPrompt}

採点基準：各軸10点＝AI導入に非常に有利、0点＝AI導入に非常に不利

【出力形式】
・回答はJSON文字列のみで出力してください
・コードブロック（\`\`\`）、マークダウン、説明文、アーティファクト表示は一切使わないでください
・最初の文字は必ず { で始め、最後の文字は } で終わってください
・以下のスキーマに従ってください（スキーマの説明文は出力しないこと）

スキーマ:
category=業務カテゴリ名の文字列
name=具体的な業務名の文字列
detail=業務の説明30字以内の文字列
axes=各軸のキーと0から10の整数値のオブジェクト（キー名: axis1_repeatability, axis2_data_readiness, axis3_judgment, axis4_communication, axis5_recovery_cost, axis6_frequency, axis7_volume, axis8_tacit_knowledge, axis9_verifiability, axis10_compliance）
score=axesの合計点を表す0から100の整数

出力例の構造（値はダミー）:
{"tasks":[{"category":"カテゴリ","name":"業務名","detail":"説明","axes":{"axis1_repeatability":8,"axis2_data_readiness":7,"axis3_judgment":6,"axis4_communication":9,"axis5_recovery_cost":5,"axis6_frequency":7,"axis7_volume":6,"axis8_tacit_knowledge":8,"axis9_verifiability":7,"axis10_compliance":9},"score":72}]}`;

  document.getElementById('prompt-textarea').value = prompt;
  document.getElementById('prompt-box').classList.add('visible');
  document.getElementById('copy-success').style.display = 'none';
}

function copyPrompt() {
  const ta = document.getElementById('prompt-textarea');
  ta.select(); ta.setSelectionRange(0, 99999);
  try {
    document.execCommand('copy');
    const msg = document.getElementById('copy-success');
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
  } catch(e) { alert('コピーに失敗しました。手動でコピーしてください。'); }
}

function clearStep1() {
  document.getElementById('company').value = '';
  document.getElementById('dept').value = '';
  document.getElementById('prompt-textarea').value = '';
  document.getElementById('prompt-box').classList.remove('visible');
}

// =============================================
// ステップ2：JSON → 表レンダリング
// =============================================
function renderFromPaste() {
  const raw = document.getElementById('paste-area').value.trim();
  if (!raw) { alert('JSONを貼り付けてください。'); return; }
  let parsed;
  try { parsed = JSON.parse(raw.replace(/```json|```/g,'').trim()); }
  catch(e) {
    document.getElementById('output').innerHTML = '<div class="error-msg">JSONの形式が正しくありません。</div>';
    return;
  }
  const tasks = parsed.tasks.map(t => {
    if (!t.score && t.axes) t.score = Object.values(t.axes).reduce((s,v)=>s+v,0);
    return t;
  });
  const company    = document.getElementById('company').value || '（企業名未入力）';
  const dept       = document.getElementById('dept').value    || '（部署名未入力）';
  const cfg        = levelConfig[getSelectedLevel()];
  const avg        = Math.round(tasks.reduce((s,t)=>s+t.score,0)/tasks.length);
  const high       = tasks.filter(t=>t.score>=70).length;
  const categories = [...new Set(tasks.map(t=>t.category))].length;

  currentResult = { tasks, company, dept, cfg, avg, high, categories };
  const sorted = [...tasks].sort((a,b)=>b.score-a.score);

  const rows = sorted.map(t => {
    const lbl = getScoreLabel(t.score);
    const color = getScoreColor(t.score);
    const axesHtml = AXES.map((a,i)=>`<span class="axis-chip" title="${a.desc}">${a.label}：${getAxisVal(t,i)}</span>`).join('');
    return `<tr>
      <td><div class="task-name">${t.name}</div><div class="task-cat">${t.category}</div></td>
      <td><div class="task-detail">${t.detail}</div><div class="axes-wrap">${axesHtml}</div></td>
      <td><div class="score-wrap">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="score-num" style="color:${color}">${t.score}点</span>
          <span class="tag" style="background:${lbl.bg};color:${lbl.color}">${lbl.text}</span>
        </div>
        <div class="score-bar-bg"><div class="score-bar" style="width:${t.score}%;background:${color}"></div></div>
      </div></td>
    </tr>`;
  }).join('');

  document.getElementById('output').innerHTML = `
    <div class="result-header">
      <strong>${company}</strong> ／ <strong>${dept}</strong> の分析結果
      <span class="level-badge">${cfg.label}</span>
    </div>
    <div class="summary-bar">
      <div class="summary-chip">業務数：<span>${tasks.length}件</span></div>
      <div class="summary-chip">平均スコア：<span>${avg}点</span></div>
      <div class="summary-chip">高効果業務（70点以上）：<span>${high}件</span></div>
      <div class="summary-chip">カテゴリ数：<span>${categories}</span></div>
    </div>
    <table>
      <thead><tr><th>業務名</th><th>概要 ／ 評価軸内訳</th><th>AI導入効果</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  document.getElementById('export-bar').classList.add('visible');
}

function clearStep2() {
  document.getElementById('paste-area').value = '';
  document.getElementById('output').innerHTML = '';
  document.getElementById('export-bar').classList.remove('visible');
  currentResult = null;
}

// =============================================
// PDF出力（新ウィンドウ方式）
// =============================================
function exportPDF() {
  if (!currentResult) return;
  const { tasks, company, dept, cfg, avg, high, categories } = currentResult;
  const sorted = [...tasks].sort((a,b)=>b.score-a.score);
  const now = new Date().toLocaleDateString('ja-JP');

  const tableRows = sorted.map(t => {
    const lbl = getScoreLabel(t.score);
    const axesText = AXES.map((a,i)=>`${a.label}：${getAxisVal(t,i)}点`).join('<br>');
    return `<tr>
      <td><strong>${t.name}</strong><br><span style="font-size:9px;color:#888">${t.category}</span><br><span style="font-size:9px;color:#555">${t.detail}</span></td>
      <td style="font-size:9px;line-height:1.8">${axesText}</td>
      <td style="text-align:center;font-weight:700;font-size:13px;color:${getScoreColor(t.score)}">
        ${t.score}点<br><span style="font-size:9px;padding:1px 6px;border-radius:8px;background:${lbl.bg};color:${lbl.color}">${lbl.text}</span>
      </td>
    </tr>`;
  }).join('');

  const chartCards = sorted.map(t => {
    const lbl = getScoreLabel(t.score);
    const svg = buildRadarSVG(t, 280);
    return `<div style="border:1px solid #eee;border-radius:8px;padding:12px 8px;text-align:center;break-inside:avoid;">
      <div style="font-size:10px;font-weight:700;margin-bottom:1px;line-height:1.4">${t.name}</div>
      <div style="font-size:8px;color:#888;margin-bottom:6px">${t.category}</div>
      ${svg}
      <div style="font-size:12px;font-weight:700;color:${getScoreColor(t.score)};margin-top:4px">
        ${t.score}点 <span style="font-size:8px;padding:1px 6px;border-radius:8px;background:${lbl.bg};color:${lbl.color}">${lbl.text}</span>
      </div>
    </div>`;
  }).join('');

  const legendText = AXES.map((a,i)=>`${i+1}. ${a.label}：${a.desc}`).join(' ／ ');

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>AI導入効果分析レポート</title>
<style>
  body { font-family: -apple-system, 'Hiragino Sans', sans-serif; font-size: 10px; color: #1a1a1a; padding: 20px; }
  h2 { font-size: 15px; margin-bottom: 4px; }
  .meta { font-size: 9px; color: #555; margin-bottom: 10px; }
  .summary { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  .chip { font-size: 9px; background: #f5f5f5; padding: 2px 10px; border-radius: 100px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 20px; }
  th { background: #f0f0f0; padding: 5px 7px; text-align: left; border: 1px solid #ccc; font-weight: 600; }
  td { padding: 5px 7px; border: 1px solid #ddd; vertical-align: top; line-height: 1.5; }
  .chart-title { font-size: 13px; font-weight: 700; margin: 24px 0 12px; padding-top: 16px; border-top: 2px solid #eee; }
  .chart-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .legend { margin-top: 16px; font-size: 8px; color: #666; line-height: 2; border-top: 1px solid #eee; padding-top: 10px; }
  @media print {
    body { padding: 10px; }
    .chart-title { page-break-before: always; }
    .chart-grid { page-break-inside: auto; }
  }
</style>
</head>
<body>
<h2>AI導入効果分析レポート</h2>
<div class="meta">${company} ／ ${dept}　｜　粒度：${cfg.label}　｜　出力日：${now}</div>
<div class="summary">
  <span class="chip">業務数：${tasks.length}件</span>
  <span class="chip">平均スコア：${avg}点</span>
  <span class="chip">高効果業務（70点以上）：${high}件</span>
  <span class="chip">カテゴリ数：${categories}</span>
</div>
<table>
  <thead><tr><th style="width:28%">業務名 ／ 概要</th><th style="width:52%">評価軸スコア内訳（各0〜10点）</th><th style="width:20%">AI導入効果（/100点）</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<div class="chart-title">評価軸レーダーチャート（業務別）</div>
<div class="chart-grid">${chartCards}</div>
<div class="legend"><strong>【評価軸の説明】</strong><br>${legendText}</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// =============================================
// Excel出力（Blob方式）
// =============================================
function exportExcel() {
  if (!currentResult) return;
  const { tasks, company, dept, cfg, avg, high, categories } = currentResult;
  const sorted = [...tasks].sort((a,b)=>b.score-a.score);
  const now = new Date().toLocaleDateString('ja-JP');

  // ① サマリーシート
  const summaryData = [
    ['AI導入効果分析レポート'],
    [],
    ['企業名・業種', company],
    ['部署名', dept],
    ['粒度', cfg.label],
    ['出力日', now],
    [],
    ['業務数', tasks.length],
    ['平均スコア', avg + '点'],
    ['高効果業務（70点以上）', high + '件'],
    ['カテゴリ数', categories],
    [],
    ['【評価軸の説明】'],
    ...AXES.map((a,i) => [`${i+1}. ${a.label}`, a.desc]),
  ];

  // ② 業務一覧シート
  const detailHeader = ['業務名','カテゴリ','概要',...AXES.map(a=>a.label),'合計スコア（/100）','評価'];
  const detailRows = sorted.map(t => [
    t.name, t.category, t.detail,
    ...AXES.map((_,i) => getAxisVal(t,i)),
    t.score,
    getScoreLabel(t.score).text
  ]);

  // ③ レーダーチャート用データシート（軸×業務の転置テーブル）
  const chartData = [
    ['※ 下表を選択して「挿入→レーダーチャート」でチャートを作成できます'],
    ['※ 業務ごとに個別チャートを作る場合は各業務列のみ選択してください'],
    [],
    ['評価軸', ...sorted.map(t=>t.name)],
    ...AXES.map((a,i) => [a.label, ...sorted.map(t=>getAxisVal(t,i))]),
    [],
    ['最大値（参考）', ...sorted.map(()=>10)],
  ];

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{wch:28},{wch:40}];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'サマリー');

  const wsDetail = XLSX.utils.aoa_to_sheet([detailHeader,...detailRows]);
  wsDetail['!cols'] = [{wch:24},{wch:16},{wch:28},...AXES.map(()=>({wch:14})),{wch:18},{wch:10}];
  XLSX.utils.book_append_sheet(wb, wsDetail, '業務一覧');

  const wsChart = XLSX.utils.aoa_to_sheet(chartData);
  wsChart['!cols'] = [{wch:20},...sorted.map(()=>({wch:18}))];
  XLSX.utils.book_append_sheet(wb, wsChart, 'レーダーチャート用データ');

  // Blob方式でダウンロード
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI導入効果分析_${dept}_${new Date().toISOString().slice(0,10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
