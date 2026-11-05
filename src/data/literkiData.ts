// Pictures for the activity "Literki" (TypeScript port of js/literki-data.js).
// 32 letters of the Polish alphabet, each with several drawn pictures in a 100x100 viewBox.

export interface LetterPic {
  w: string;
  c?: 1;
  svg: string;
}

export interface LetterEntry {
  u: string;
  l: string;
  pics: readonly LetterPic[];
}

export const LITERKI_DATA: readonly LetterEntry[] = [
  { u: 'A', l: 'a', pics: [
    { w: 'arbuz', svg: '<path d="M8 38A42 42 0 0 0 92 38Z" fill="#9fd4a8"/><path d="M15 38A35 35 0 0 0 85 38Z" fill="#f7a8c9"/><g fill="#5b5675"><ellipse cx="36" cy="52" rx="2.4" ry="4"/><ellipse cx="50" cy="60" rx="2.4" ry="4"/><ellipse cx="64" cy="52" rx="2.4" ry="4"/><ellipse cx="50" cy="47" rx="2.4" ry="4"/></g>' },
    { w: 'ananas', svg: '<ellipse cx="50" cy="64" rx="22" ry="28" fill="#ffd37a"/><path d="M36 56L64 82M64 56L36 82M30 70L52 90M70 70L48 90" stroke="#e8a94f" stroke-width="2.5"/><path d="M50 40L36 12L47 24L50 6L53 24L64 12Z" fill="#9fd4a8"/>' },
  ]},
  { u: 'Ą', l: 'ą', pics: [
    { w: 'ząb', c: 1, svg: '<path d="M26 20Q50 10 74 20Q80 50 68 62Q64 90 56 90Q50 90 50 66Q50 90 44 90Q36 90 32 62Q20 50 26 20Z" fill="#fff" stroke="#d9cfe8" stroke-width="3" stroke-linejoin="round"/>' },
    { w: 'wąż', c: 1, svg: '<path d="M18 80Q40 94 58 76Q80 58 56 46Q34 34 56 24" fill="none" stroke="#9fd4a8" stroke-width="12" stroke-linecap="round"/><circle cx="58" cy="24" r="10" fill="#9fd4a8"/><circle cx="62" cy="21" r="2.4" fill="#5b5675"/><path d="M66 28l10 4" stroke="#e59aa8" stroke-width="2.5" stroke-linecap="round"/>' },
  ]},
  { u: 'B', l: 'b', pics: [
    { w: 'balon', svg: '<ellipse cx="50" cy="40" rx="26" ry="32" fill="#a8d8f0"/><path d="M44 72L56 72L50 80Z" fill="#a8d8f0"/><path d="M50 80Q42 88 52 94" fill="none" stroke="#8a84a8" stroke-width="2.4" stroke-linecap="round"/><path d="M36 26a16 18 0 0 1 10-12" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/>' },
    { w: 'banan', svg: '<path d="M22 26Q18 84 80 80L82 66Q46 66 38 24Z" fill="#ffe08a" stroke="#e8c050" stroke-width="3" stroke-linejoin="round"/><rect x="20" y="16" width="10" height="12" rx="3" fill="#b99a86"/>' },
    { w: 'butelka', svg: '<rect x="40" y="8" width="20" height="12" rx="3" fill="#8f7fa3"/><path d="M42 20h16v18Q74 48 74 66v20Q74 94 66 94H34Q26 94 26 86V66Q26 48 42 38Z" fill="#a9d6f2"/><rect x="30" y="62" width="40" height="16" fill="#fff" opacity=".6"/>' },
  ]},
  { u: 'C', l: 'c', pics: [
    { w: 'cytryna', svg: '<ellipse cx="50" cy="54" rx="34" ry="24" fill="#fff09a" stroke="#f0d060" stroke-width="3"/><path d="M84 54l8-3v6z" fill="#f0d060"/><path d="M12 54l-8-3v6z" fill="#f0d060"/><path d="M58 32Q68 18 80 24Q70 36 58 32Z" fill="#9fd4a8"/>' },
    { w: 'cebula', svg: '<path d="M50 12Q56 30 76 50Q84 86 50 90Q16 86 24 50Q44 30 50 12Z" fill="#e8c0dc" stroke="#c98fbe" stroke-width="2"/><path d="M50 22Q40 56 44 88M50 22Q62 56 56 88" fill="none" stroke="#c98fbe" stroke-width="2"/>' },
  ]},
  { u: 'Ć', l: 'ć', pics: [
    { w: 'ćma', svg: '<ellipse cx="30" cy="46" rx="26" ry="16" transform="rotate(-20 30 46)" fill="#d9cfe8"/><ellipse cx="70" cy="46" rx="26" ry="16" transform="rotate(20 70 46)" fill="#d9cfe8"/><ellipse cx="32" cy="64" rx="16" ry="10" transform="rotate(20 32 64)" fill="#c9bcdc"/><ellipse cx="68" cy="64" rx="16" ry="10" transform="rotate(-20 68 64)" fill="#c9bcdc"/><rect x="45" y="30" width="10" height="48" rx="5" fill="#8a84a8"/><path d="M46 32Q38 18 30 16M54 32Q62 18 70 16" fill="none" stroke="#8a84a8" stroke-width="2.5" stroke-linecap="round"/>' },
    { w: 'kość', c: 1, svg: '<g fill="#fff" stroke="#d9cfe8" stroke-width="3"><circle cx="22" cy="40" r="10"/><circle cx="22" cy="60" r="10"/><circle cx="78" cy="40" r="10"/><circle cx="78" cy="60" r="10"/></g><rect x="22" y="40" width="56" height="20" fill="#fff"/><path d="M22 38H78M22 62H78" stroke="#d9cfe8" stroke-width="3"/>' },
  ]},
  { u: 'D', l: 'd', pics: [
    { w: 'dom', svg: '<rect x="20" y="46" width="60" height="44" rx="5" fill="#f6dcc8"/><path d="M12 50L50 16L88 50Z" fill="#c9a0c0" stroke="#c9a0c0" stroke-width="5" stroke-linejoin="round"/><rect x="43" y="64" width="16" height="26" rx="8" fill="#b99a86"/><rect x="26" y="56" width="12" height="12" rx="2" fill="#ffe9a8"/>' },
    { w: 'dynia', svg: '<g fill="#f7b27a"><ellipse cx="32" cy="58" rx="20" ry="28"/><ellipse cx="68" cy="58" rx="20" ry="28"/><ellipse cx="50" cy="58" rx="20" ry="30" fill="#f9c18f"/></g><path d="M50 28Q50 16 58 12" fill="none" stroke="#7fbf8f" stroke-width="6" stroke-linecap="round"/>' },
    { w: 'drzewo', svg: '<rect x="43" y="56" width="14" height="38" rx="4" fill="#b98f6a"/><circle cx="50" cy="36" r="26" fill="#9fd4a8"/><circle cx="34" cy="48" r="16" fill="#8cc79a"/><circle cx="66" cy="48" r="16" fill="#8cc79a"/>' },
  ]},
  { u: 'E', l: 'e', pics: [
    { w: 'ekran', svg: '<rect x="12" y="14" width="76" height="50" rx="7" fill="#a8d8f0" stroke="#8a84a8" stroke-width="5"/><rect x="44" y="66" width="12" height="14" fill="#8a84a8"/><rect x="28" y="80" width="44" height="7" rx="3" fill="#8a84a8"/>' },
    { w: 'emu', svg: '<ellipse cx="42" cy="66" rx="26" ry="18" fill="#d9b99b"/><path d="M58 56Q76 44 70 24" fill="none" stroke="#d9b99b" stroke-width="9" stroke-linecap="round"/><circle cx="70" cy="20" r="9" fill="#d9b99b"/><path d="M77 20l12 4-12 4z" fill="#f7c27a"/><circle cx="70" cy="18" r="2.2" fill="#5b5675"/><path d="M36 82V94M50 82V94" stroke="#b99a86" stroke-width="4" stroke-linecap="round"/>' },
  ]},
  { u: 'Ę', l: 'ę', pics: [
    { w: 'gęś', c: 1, svg: '<ellipse cx="44" cy="66" rx="30" ry="20" fill="#fff" stroke="#e8e0f2" stroke-width="3"/><path d="M62 56Q80 46 74 26" fill="none" stroke="#e8e0f2" stroke-width="13" stroke-linecap="round"/><path d="M62 56Q80 46 74 26" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><circle cx="74" cy="22" r="9" fill="#fff" stroke="#e8e0f2" stroke-width="3"/><path d="M82 22l12 4-12 4z" fill="#f7c27a"/><circle cx="75" cy="20" r="2.2" fill="#5b5675"/><path d="M38 86V94M52 86V94" stroke="#f7c27a" stroke-width="4" stroke-linecap="round"/>' },
    { w: 'ręka', c: 1, svg: '<g fill="#f7d6b4"><rect x="28" y="16" width="10" height="44" rx="5"/><rect x="40" y="10" width="10" height="50" rx="5"/><rect x="52" y="14" width="10" height="46" rx="5"/><rect x="64" y="24" width="10" height="38" rx="5"/><rect x="26" y="46" width="50" height="42" rx="14"/><rect x="12" y="44" width="10" height="30" rx="5" transform="rotate(-30 17 59)"/></g>' },
  ]},
  { u: 'F', l: 'f', pics: [
    { w: 'flaga', svg: '<rect x="20" y="10" width="5" height="82" rx="2" fill="#b99a86"/><rect x="25" y="14" width="56" height="34" fill="#fff" stroke="#e8e0f2" stroke-width="2"/><rect x="25" y="31" width="56" height="17" fill="#f7a8a8"/>' },
    { w: 'fasola', svg: '<ellipse cx="50" cy="50" rx="42" ry="14" transform="rotate(-35 50 50)" fill="#9fd4a8"/><g fill="#7fbf8f"><circle cx="36" cy="64" r="7"/><circle cx="50" cy="50" r="7"/><circle cx="64" cy="36" r="7"/></g>' },
  ]},
  { u: 'G', l: 'g', pics: [
    { w: 'gruszka', svg: '<circle cx="50" cy="64" r="26" fill="#cfe69a"/><circle cx="50" cy="38" r="16" fill="#cfe69a"/><path d="M50 24Q50 14 56 8" fill="none" stroke="#b99a86" stroke-width="4" stroke-linecap="round"/><path d="M54 16Q68 8 74 18Q62 24 54 16Z" fill="#7fbf8f"/>' },
    { w: 'grzyb', svg: '<rect x="38" y="52" width="24" height="36" rx="9" fill="#f6dcc8"/><path d="M10 56Q10 12 50 12Q90 12 90 56Z" fill="#f7a8a8"/><g fill="#fff"><circle cx="34" cy="34" r="6"/><circle cx="60" cy="28" r="5"/><circle cx="70" cy="46" r="5"/><circle cx="44" cy="46" r="4"/></g>' },
    { w: 'gwiazda', svg: '<path d="M50 8L61 38L92 38L67 57L77 88L50 69L23 88L33 57L8 38L39 38Z" fill="#ffd37a" stroke="#e8a94f" stroke-width="3" stroke-linejoin="round"/>' },
  ]},
  { u: 'H', l: 'h', pics: [
    { w: 'herbata', svg: '<ellipse cx="46" cy="84" rx="38" ry="6" fill="#e8e0f2"/><path d="M18 38H74V58Q74 80 46 80Q18 80 18 58Z" fill="#fff" stroke="#d9cfe8" stroke-width="3"/><path d="M74 44Q94 44 92 60Q90 74 72 70" fill="none" stroke="#d9cfe8" stroke-width="5" stroke-linecap="round"/><ellipse cx="46" cy="40" rx="28" ry="5" fill="#d9a07a"/><path d="M36 28Q30 20 38 12M54 28Q48 20 56 12" fill="none" stroke="#c9d6e8" stroke-width="3" stroke-linecap="round"/>' },
    { w: 'hamburger', svg: '<path d="M14 46Q14 14 50 14Q86 14 86 46Z" fill="#f0b878"/><g fill="#fff3d0"><ellipse cx="36" cy="28" rx="3" ry="1.8"/><ellipse cx="54" cy="22" rx="3" ry="1.8"/><ellipse cx="66" cy="34" rx="3" ry="1.8"/></g><path d="M10 50Q20 44 30 50T50 50T70 50T90 50V58H10Z" fill="#9fd4a8"/><rect x="12" y="60" width="76" height="12" rx="6" fill="#8a6a4a"/><rect x="14" y="74" width="72" height="12" rx="6" fill="#f0b878"/>' },
  ]},
  { u: 'I', l: 'i', pics: [
    { w: 'igła', svg: '<path d="M18 90L76 16" stroke="#c9d6e8" stroke-width="5" stroke-linecap="round"/><ellipse cx="76" cy="18" rx="3" ry="7" transform="rotate(38 76 18)" fill="none" stroke="#8a84a8" stroke-width="2.5"/><path d="M76 18Q98 40 70 54Q42 64 62 92" fill="none" stroke="#f7a8c9" stroke-width="3" stroke-linecap="round"/>' },
    { w: 'imbryk', svg: '<path d="M72 50Q92 42 90 62Q86 76 70 72" fill="none" stroke="#8fc3e0" stroke-width="6" stroke-linecap="round"/><path d="M22 50Q4 40 10 28Q18 44 28 46Z" fill="#a8d8f0"/><ellipse cx="46" cy="60" rx="28" ry="24" fill="#a8d8f0"/><ellipse cx="46" cy="38" rx="18" ry="6" fill="#8fc3e0"/><circle cx="46" cy="30" r="5" fill="#8fc3e0"/>' },
  ]},
  { u: 'J', l: 'j', pics: [
    { w: 'jabłko', svg: '<circle cx="38" cy="58" r="26" fill="#f7a8a8"/><circle cx="62" cy="58" r="26" fill="#f7a8a8"/><path d="M50 34Q50 22 56 14" fill="none" stroke="#b99a86" stroke-width="4" stroke-linecap="round"/><path d="M54 24Q68 14 76 24Q62 30 54 24Z" fill="#7fbf8f"/>' },
    { w: 'jeż', svg: '<path d="M12 72Q10 30 50 24Q90 30 88 72Z" fill="#8a6a4a"/><path d="M16 56L8 50M22 44L16 34M34 34L30 22M48 28L48 14M62 30L68 18M76 38L84 28M84 50L94 46" stroke="#6a5038" stroke-width="4" stroke-linecap="round"/><circle cx="78" cy="62" r="14" fill="#f6dcc8"/><circle cx="82" cy="58" r="2.6" fill="#5b5675"/><circle cx="90" cy="64" r="3.4" fill="#5b5675"/><rect x="28" y="70" width="8" height="14" rx="3" fill="#6a5038"/><rect x="56" y="70" width="8" height="14" rx="3" fill="#6a5038"/>' },
    { w: 'jajko', svg: '<ellipse cx="50" cy="56" rx="26" ry="34" fill="#fdf3e0" stroke="#e6d3b0" stroke-width="3"/><path d="M34 40Q40 28 50 26" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' },
  ]},
  { u: 'K', l: 'k', pics: [
    { w: 'kot', svg: '<path d="M24 46L26 14L46 30ZM76 46L74 14 54 30Z" fill="#f7d6b4"/><circle cx="50" cy="56" r="30" fill="#f7d6b4"/><circle cx="39" cy="52" r="3.6" fill="#5b5675"/><circle cx="61" cy="52" r="3.6" fill="#5b5675"/><ellipse cx="50" cy="62" rx="4" ry="3" fill="#e59aa8"/><path d="M43 69q7 5 14 0" fill="none" stroke="#5b5675" stroke-width="2" stroke-linecap="round"/>' },
    { w: 'kwiat', svg: '<path d="M50 94V52" stroke="#7fbf8f" stroke-width="5" stroke-linecap="round"/><path d="M50 80Q32 80 28 66Q46 66 50 80Z" fill="#9fd4a8"/><g fill="#f7a8c9"><circle cx="50" cy="22" r="13"/><circle cx="72" cy="36" r="13"/><circle cx="64" cy="58" r="13"/><circle cx="36" cy="58" r="13"/><circle cx="28" cy="36" r="13"/></g><circle cx="50" cy="42" r="11" fill="#ffe08a"/>' },
    { w: 'klucz', svg: '<circle cx="32" cy="32" r="20" fill="none" stroke="#e8b84f" stroke-width="9"/><path d="M46 46L88 88M72 72L82 62M80 80L90 70" stroke="#e8b84f" stroke-width="9" stroke-linecap="round"/>' },
  ]},
  { u: 'L', l: 'l', pics: [
    { w: 'lody', svg: '<path d="M32 52L50 94L68 52Z" fill="#e8c9a8"/><circle cx="40" cy="44" r="16" fill="#f7a8c9"/><circle cx="60" cy="42" r="15" fill="#bfe6b4"/><circle cx="50" cy="30" r="14" fill="#ffe9a8"/>' },
    { w: 'lampa', svg: '<path d="M30 18H70L84 54H16Z" fill="#ffe08a"/><rect x="47" y="54" width="6" height="30" fill="#8a84a8"/><ellipse cx="50" cy="86" rx="20" ry="6" fill="#c9a0c0"/>' },
    { w: 'liść', svg: '<path d="M14 86Q10 30 50 14Q90 22 86 62Q70 90 14 86Z" fill="#9fd4a8"/><path d="M14 86Q40 56 72 34" fill="none" stroke="#6fb584" stroke-width="3" stroke-linecap="round"/>' },
  ]},
  { u: 'Ł', l: 'ł', pics: [
    { w: 'łódka', svg: '<path d="M10 62H90L76 84Q74 88 68 88H32Q26 88 24 84Z" fill="#f7a8c9"/><path d="M50 12V62" stroke="#8a6a4a" stroke-width="3"/><path d="M54 14L84 58H54Z" fill="#fff" stroke="#e8e0f2" stroke-width="2" stroke-linejoin="round"/><path d="M6 92q10-6 20 0t20 0t20 0t20 0" fill="none" stroke="#a8d8f0" stroke-width="4" stroke-linecap="round"/>' },
    { w: 'łyżka', svg: '<ellipse cx="50" cy="28" rx="17" ry="22" fill="#c9d6e8" stroke="#a8b6cc" stroke-width="2"/><rect x="45" y="46" width="10" height="46" rx="5" fill="#c9d6e8" stroke="#a8b6cc" stroke-width="2"/>' },
  ]},
  { u: 'M', l: 'm', pics: [
    { w: 'miś', svg: '<circle cx="26" cy="30" r="12" fill="#d9b99b"/><circle cx="74" cy="30" r="12" fill="#d9b99b"/><circle cx="50" cy="54" r="32" fill="#d9b99b"/><ellipse cx="50" cy="64" rx="14" ry="11" fill="#f0d8c4"/><circle cx="39" cy="48" r="3.4" fill="#5b5675"/><circle cx="61" cy="48" r="3.4" fill="#5b5675"/><ellipse cx="50" cy="60" rx="4.5" ry="3.2" fill="#5b5675"/>' },
    { w: 'motyl', svg: '<ellipse cx="28" cy="36" rx="22" ry="20" fill="#f7a8c9"/><ellipse cx="72" cy="36" rx="22" ry="20" fill="#f7a8c9"/><ellipse cx="32" cy="66" rx="16" ry="14" fill="#a8d8f0"/><ellipse cx="68" cy="66" rx="16" ry="14" fill="#a8d8f0"/><rect x="45" y="22" width="10" height="56" rx="5" fill="#8a84a8"/><path d="M47 24Q40 12 34 10M53 24Q60 12 66 10" fill="none" stroke="#8a84a8" stroke-width="2.5" stroke-linecap="round"/>' },
  ]},
  { u: 'N', l: 'n', pics: [
    { w: 'nutka', svg: '<ellipse cx="36" cy="76" rx="16" ry="11" transform="rotate(-20 36 76)" fill="#8f7fd1"/><rect x="48" y="16" width="6" height="60" rx="3" fill="#8f7fd1"/><path d="M54 16Q86 26 72 54Q70 38 54 36Z" fill="#8f7fd1"/>' },
    { w: 'namiot', svg: '<path d="M8 86L50 14L92 86Z" fill="#f7c9a0"/><path d="M50 40L34 86H66Z" fill="#8a6a4a"/><path d="M4 88H96" stroke="#9fd4a8" stroke-width="6" stroke-linecap="round"/>' },
  ]},
  { u: 'Ń', l: 'ń', pics: [
    { w: 'słoń', c: 1, svg: '<ellipse cx="44" cy="62" rx="30" ry="22" fill="#c9d6e8"/><circle cx="74" cy="46" r="16" fill="#c9d6e8"/><path d="M82 56Q96 62 92 84Q90 89 85 86Q87 70 79 62Z" fill="#c9d6e8"/><circle cx="62" cy="46" r="10" fill="#b4c4dc"/><rect x="24" y="74" width="12" height="18" rx="5" fill="#b4c4dc"/><rect x="50" y="74" width="12" height="18" rx="5" fill="#b4c4dc"/><circle cx="78" cy="42" r="2.6" fill="#5b5675"/>' },
    { w: 'koń', c: 1, svg: '<ellipse cx="44" cy="58" rx="28" ry="16" fill="#d9b99b"/><path d="M62 52L74 20L92 26L84 54Z" fill="#d9b99b"/><ellipse cx="88" cy="30" rx="11" ry="8" transform="rotate(20 88 30)" fill="#d9b99b"/><path d="M74 22L68 10L80 18Z" fill="#d9b99b"/><circle cx="86" cy="26" r="2.2" fill="#5b5675"/><path d="M72 22Q62 36 66 52" fill="none" stroke="#8a6a4a" stroke-width="5" stroke-linecap="round"/><path d="M18 52Q8 62 14 82" fill="none" stroke="#8a6a4a" stroke-width="5" stroke-linecap="round"/><g fill="#c4a384"><rect x="24" y="68" width="8" height="24" rx="3"/><rect x="38" y="70" width="8" height="22" rx="3"/><rect x="52" y="70" width="8" height="22" rx="3"/><rect x="64" y="68" width="8" height="24" rx="3"/></g>' },
  ]},
  { u: 'O', l: 'o', pics: [
    { w: 'owca', svg: '<g fill="#fff" stroke="#e8e0f2" stroke-width="2"><circle cx="34" cy="52" r="16"/><circle cx="50" cy="44" r="18"/><circle cx="64" cy="54" r="16"/><circle cx="48" cy="62" r="16"/></g><circle cx="80" cy="46" r="12" fill="#d9cfe8"/><circle cx="83" cy="43" r="2.4" fill="#5b5675"/><rect x="36" y="72" width="6" height="16" rx="3" fill="#d9cfe8"/><rect x="58" y="72" width="6" height="16" rx="3" fill="#d9cfe8"/>' },
    { w: 'ołówek', svg: '<g transform="rotate(-35 50 50)"><rect x="6" y="40" width="12" height="20" rx="4" fill="#f7a8c9"/><rect x="18" y="40" width="54" height="20" fill="#ffd37a"/><path d="M72 40L96 50L72 60Z" fill="#f6dcc8"/><path d="M89 47L96 50L89 53Z" fill="#5b5675"/></g>' },
    { w: 'oko', svg: '<path d="M6 50Q50 8 94 50Q50 92 6 50Z" fill="#fff" stroke="#5b5675" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="50" r="19" fill="#8fc2e6"/><circle cx="50" cy="50" r="9" fill="#5b5675"/><circle cx="45" cy="45" r="3.5" fill="#fff"/>' },
  ]},
  { u: 'Ó', l: 'ó', pics: [
    { w: 'ósemka', svg: '<circle cx="50" cy="30" r="16" fill="none" stroke="#8f7fd1" stroke-width="10"/><circle cx="50" cy="68" r="20" fill="none" stroke="#8f7fd1" stroke-width="10"/>' },
    { w: 'żółw', c: 1, svg: '<g fill="#bfe6b4"><rect x="22" y="66" width="12" height="16" rx="5"/><rect x="58" y="66" width="12" height="16" rx="5"/><circle cx="84" cy="56" r="11"/><path d="M12 70l-8 4 10 2z"/></g><path d="M14 70Q14 26 48 26Q82 26 82 70Z" fill="#9fd4a8"/><path d="M48 26V70M26 50H70M30 36L40 50M66 36L56 50" fill="none" stroke="#7fbf8f" stroke-width="3"/><circle cx="87" cy="53" r="2.2" fill="#5b5675"/>' },
  ]},
  { u: 'P', l: 'p', pics: [
    { w: 'piłka', svg: '<circle cx="50" cy="50" r="40" fill="#f7a8c9"/><path d="M10 44Q50 66 90 44" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="7"/><path d="M24 24a34 34 0 0 1 22-12" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/>' },
    { w: 'pomidor', svg: '<circle cx="50" cy="56" r="34" fill="#f78a8a"/><path d="M50 24L58 36L72 30L64 42L76 48L62 50L56 62L50 52L44 62L38 50L24 48L36 42L28 30L42 36Z" fill="#7fbf8f"/>' },
    { w: 'parasol', svg: '<path d="M8 50A42 42 0 0 1 92 50Z" fill="#f7a8c9"/><path d="M50 50V84Q50 94 40 90" fill="none" stroke="#7a748f" stroke-width="5" stroke-linecap="round"/><path d="M50 8V10" stroke="#7a748f" stroke-width="5" stroke-linecap="round"/>' },
  ]},
  { u: 'R', l: 'r', pics: [
    { w: 'rower', svg: '<g fill="none" stroke="#8f7fd1" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="68" r="18"/><circle cx="76" cy="68" r="18"/><path d="M24 68L42 38H64L76 68M42 38L50 68H24M50 68L64 38M38 30H48M64 38L60 26H70"/></g>' },
    { w: 'ryba', svg: '<path d="M74 50L94 30V70Z" fill="#f7a8c9"/><ellipse cx="46" cy="50" rx="34" ry="22" fill="#a8d8f0"/><path d="M46 28Q56 14 66 24" fill="#8fc3e0"/><circle cx="30" cy="44" r="4" fill="#fff"/><circle cx="29" cy="45" r="2" fill="#5b5675"/><path d="M22 56q4 4 8 0" fill="none" stroke="#5b5675" stroke-width="2" stroke-linecap="round"/>' },
  ]},
  { u: 'S', l: 's', pics: [
    { w: 'słoń', svg: '<ellipse cx="44" cy="62" rx="30" ry="22" fill="#c9d6e8"/><circle cx="74" cy="46" r="16" fill="#c9d6e8"/><path d="M82 56Q96 62 92 84Q90 89 85 86Q87 70 79 62Z" fill="#c9d6e8"/><circle cx="62" cy="46" r="10" fill="#b4c4dc"/><rect x="24" y="74" width="12" height="18" rx="5" fill="#b4c4dc"/><rect x="50" y="74" width="12" height="18" rx="5" fill="#b4c4dc"/><circle cx="78" cy="42" r="2.6" fill="#5b5675"/>' },
    { w: 'sowa', svg: '<path d="M22 34L26 10L42 24ZM78 34L74 10L58 24Z" fill="#c9a98a"/><ellipse cx="50" cy="58" rx="32" ry="34" fill="#c9a98a"/><circle cx="36" cy="46" r="14" fill="#fff"/><circle cx="64" cy="46" r="14" fill="#fff"/><circle cx="37" cy="47" r="6" fill="#5b5675"/><circle cx="63" cy="47" r="6" fill="#5b5675"/><path d="M44 58L50 70L56 58Z" fill="#f7c27a"/><ellipse cx="50" cy="80" rx="16" ry="8" fill="#e8d4bc"/>' },
    { w: 'serce', svg: '<path d="M50 88L12 50A21 21 0 0 1 50 24A21 21 0 0 1 88 50Z" fill="#f48ab0"/><path d="M28 36Q34 28 42 30" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>' },
  ]},
  { u: 'Ś', l: 'ś', pics: [
    { w: 'ślimak', svg: '<path d="M8 78Q10 66 24 68H70Q84 68 84 56V36" fill="none" stroke="#e8c9a8" stroke-width="14" stroke-linecap="round"/><circle cx="84" cy="30" r="9" fill="#e8c9a8"/><path d="M80 24L78 12M88 24L90 12" stroke="#e8c9a8" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="46" r="24" fill="#c9a0c0"/><circle cx="48" cy="46" r="15" fill="none" stroke="#a87fa0" stroke-width="4"/><circle cx="48" cy="46" r="6" fill="none" stroke="#a87fa0" stroke-width="4"/>' },
    { w: 'świeca', svg: '<rect x="34" y="42" width="32" height="48" rx="5" fill="#fff" stroke="#e8e0f2" stroke-width="3"/><path d="M50 42V34" stroke="#5b5675" stroke-width="3" stroke-linecap="round"/><path d="M50 8Q64 24 58 32Q50 38 42 32Q36 24 50 8Z" fill="#ffb74d"/><path d="M50 20Q57 28 54 32Q48 35 46 30Q45 26 50 20Z" fill="#ffe08a"/>' },
  ]},
  { u: 'T', l: 't', pics: [
    { w: 'tulipan', svg: '<path d="M50 94V58" stroke="#7fbf8f" stroke-width="5" stroke-linecap="round"/><path d="M50 82Q30 80 26 62Q44 64 50 82Z" fill="#9fd4a8"/><path d="M50 78Q70 76 74 58Q56 60 50 78Z" fill="#9fd4a8"/><path d="M30 24Q30 62 50 62Q70 62 70 24L60 36L50 18L40 36Z" fill="#f7a8c9" stroke="#f7a8c9" stroke-width="3" stroke-linejoin="round"/>' },
    { w: 'tort', svg: '<rect x="14" y="56" width="72" height="30" rx="6" fill="#f7c9a0"/><rect x="18" y="38" width="64" height="22" rx="6" fill="#f7a8c9"/><path d="M18 46Q26 54 34 46T50 46T66 46T82 46" fill="none" stroke="#fff" stroke-width="4"/><rect x="47" y="22" width="6" height="16" rx="2" fill="#a8d8f0"/><path d="M50 8Q57 16 50 22Q43 16 50 8Z" fill="#ffb74d"/>' },
    { w: 'truskawka', svg: '<path d="M50 90Q14 62 18 40Q24 24 50 30Q76 24 82 40Q86 62 50 90Z" fill="#f2697e"/><path d="M50 30L36 16L50 22L64 16Z" fill="#6fb584"/><g fill="#fff4b0"><ellipse cx="38" cy="46" rx="2" ry="3"/><ellipse cx="60" cy="44" rx="2" ry="3"/><ellipse cx="50" cy="58" rx="2" ry="3"/><ellipse cx="42" cy="68" rx="2" ry="3"/><ellipse cx="60" cy="68" rx="2" ry="3"/></g>' },
  ]},
  { u: 'U', l: 'u', pics: [
    { w: 'ul', svg: '<g fill="#ffd37a" stroke="#e8b84f" stroke-width="2"><rect x="24" y="64" width="52" height="22" rx="9"/><rect x="28" y="44" width="44" height="22" rx="9"/><rect x="32" y="26" width="36" height="20" rx="9"/></g><path d="M36 26Q50 6 64 26Z" fill="#e8b84f"/><ellipse cx="50" cy="75" rx="7" ry="6" fill="#8a6a4a"/>' },
    { w: 'uśmiech', svg: '<circle cx="50" cy="50" r="38" fill="#ffe08a"/><circle cx="36" cy="42" r="4.5" fill="#5b5675"/><circle cx="64" cy="42" r="4.5" fill="#5b5675"/><path d="M30 58Q50 80 70 58" fill="none" stroke="#5b5675" stroke-width="5" stroke-linecap="round"/>' },
  ]},
  { u: 'W', l: 'w', pics: [
    { w: 'wiatrak', svg: '<path d="M36 92L43 46H57L64 92Z" fill="#f6dcc8"/><g fill="#a8d8f0" stroke="#8fc3e0" stroke-width="2"><rect x="46" y="4" width="8" height="38"/><rect x="58" y="42" width="38" height="8"/><rect x="46" y="50" width="8" height="38" transform="translate(0 -6)"/><rect x="4" y="42" width="38" height="8"/></g><circle cx="50" cy="46" r="7" fill="#8a84a8"/>' },
    { w: 'wiadro', svg: '<path d="M22 34H78L70 88H30Z" fill="#a8d8f0"/><ellipse cx="50" cy="34" rx="28" ry="6" fill="#8fc3e0"/><path d="M24 34Q50 -2 76 34" fill="none" stroke="#8a84a8" stroke-width="3.5"/><path d="M34 52H66M32 68H68" stroke="#8fc3e0" stroke-width="3"/>' },
  ]},
  { u: 'Y', l: 'y', pics: [
    { w: 'mydło', c: 1, svg: '<rect x="12" y="46" width="62" height="34" rx="12" fill="#bfe6f4" stroke="#8fc3e0" stroke-width="2"/><g fill="none" stroke="#a8d8f0" stroke-width="3"><circle cx="72" cy="30" r="12"/><circle cx="88" cy="48" r="7"/><circle cx="58" cy="22" r="6"/></g>' },
    { w: 'tygrys', c: 1, svg: '<circle cx="26" cy="26" r="12" fill="#f7c27a"/><circle cx="74" cy="26" r="12" fill="#f7c27a"/><circle cx="50" cy="54" r="36" fill="#f7c27a"/><path d="M50 20V32M32 26L36 36M68 26L64 36M16 50L28 52M84 50L72 52" stroke="#8a6a4a" stroke-width="4" stroke-linecap="round"/><circle cx="38" cy="50" r="3.8" fill="#5b5675"/><circle cx="62" cy="50" r="3.8" fill="#5b5675"/><ellipse cx="50" cy="66" rx="14" ry="10" fill="#fdecc8"/><ellipse cx="50" cy="61" rx="4" ry="3" fill="#e59aa8"/>' },
  ]},
  { u: 'Z', l: 'z', pics: [
    { w: 'zegar', svg: '<circle cx="50" cy="50" r="40" fill="#fff" stroke="#8f7fd1" stroke-width="6"/><path d="M50 14V22M50 78V86M14 50H22M78 50H86" stroke="#5b5675" stroke-width="3" stroke-linecap="round"/><path d="M50 50V28M50 50L66 58" stroke="#5b5675" stroke-width="4" stroke-linecap="round"/>' },
    { w: 'zebra', svg: '<path d="M30 28L26 8L44 20ZM70 28L74 8L56 20Z" fill="#fff" stroke="#e8e0f2" stroke-width="2"/><rect x="30" y="16" width="40" height="70" rx="18" fill="#fff" stroke="#e8e0f2" stroke-width="3"/><path d="M32 30H68M32 42H68M34 54H66" stroke="#5b5675" stroke-width="5"/><ellipse cx="50" cy="74" rx="14" ry="10" fill="#f7c9d6"/><circle cx="40" cy="30" r="0"/><circle cx="42" cy="22" r="0"/>' },
  ]},
  { u: 'Ź', l: 'ź', pics: [
    { w: 'źdźbło', svg: '<path d="M46 94Q44 56 52 22" fill="none" stroke="#7fbf8f" stroke-width="4" stroke-linecap="round"/><g fill="#ffd37a"><ellipse cx="44" cy="34" rx="5" ry="9" transform="rotate(-20 44 34)"/><ellipse cx="60" cy="38" rx="5" ry="9" transform="rotate(20 60 38)"/><ellipse cx="42" cy="50" rx="5" ry="9" transform="rotate(-20 42 50)"/><ellipse cx="58" cy="54" rx="5" ry="9" transform="rotate(20 58 54)"/><ellipse cx="52" cy="18" rx="4.5" ry="9"/></g>' },
    { w: 'źródło', svg: '<path d="M4 94Q30 44 50 44Q70 44 96 94Z" fill="#c9d6e8"/><path d="M50 44Q44 66 56 74T50 94" fill="none" stroke="#a8d8f0" stroke-width="10" stroke-linecap="round"/><path d="M50 8Q60 22 50 30Q40 22 50 8Z" fill="#a8d8f0"/>' },
  ]},
  { u: 'Ż', l: 'ż', pics: [
    { w: 'żaba', svg: '<circle cx="50" cy="62" r="30" fill="#bfe6b4"/><circle cx="34" cy="34" r="12" fill="#bfe6b4"/><circle cx="66" cy="34" r="12" fill="#bfe6b4"/><circle cx="34" cy="34" r="6" fill="#fff"/><circle cx="66" cy="34" r="6" fill="#fff"/><circle cx="35" cy="35" r="3" fill="#5b5675"/><circle cx="65" cy="35" r="3" fill="#5b5675"/><path d="M34 66q16 12 32 0" fill="none" stroke="#5b5675" stroke-width="3" stroke-linecap="round"/>' },
    { w: 'żarówka', svg: '<path d="M32 62Q16 44 22 28Q50 -6 78 28Q84 44 68 62Z" fill="#ffe9a8" stroke="#f0d060" stroke-width="3"/><rect x="36" y="62" width="28" height="22" rx="5" fill="#c9d6e8"/><path d="M36 72H64M40 84Q50 94 60 84" stroke="#a8b6cc" stroke-width="3" fill="none"/><path d="M42 50L46 36L54 36L58 50" fill="none" stroke="#f0b040" stroke-width="3" stroke-linejoin="round"/>' },
  ]},
];
