// Pictures for the Puzzle activity (TypeScript port of js/puzzle-pictures.js).
// 25 simple drawings on a 200x200 canvas.

function sc(bg: string, ground: string, body: string): string {
  return (
    `<rect width="200" height="200" fill="${bg}"/>` +
    (ground ? `<ellipse cx="100" cy="215" rx="140" ry="48" fill="${ground}"/>` : '') +
    body
  );
}

function eye(x: number, y: number, r = 5): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#5b5675"/>`;
}

const smile =
  '<path d="M88 118q12 10 24 0" fill="none" stroke="#5b5675" stroke-width="4" stroke-linecap="round"/>';

export const PUZZLE_PICTURES: readonly string[] = [
  // 1 house
  sc('#cfeaf7', '#b9e0a8', '<circle cx="160" cy="40" r="22" fill="#ffe08a"/><rect x="58" y="92" width="84" height="72" rx="6" fill="#f6dcc8"/>' +
    '<path d="M48 98L100 50l52 48z" fill="#c9a0c0" stroke="#c9a0c0" stroke-width="8" stroke-linejoin="round"/>' +
    '<rect x="86" y="120" width="28" height="44" rx="14" fill="#b99a86"/><rect x="66" y="108" width="16" height="16" rx="3" fill="#ffe9a8"/>' +
    '<rect x="118" y="108" width="16" height="16" rx="3" fill="#ffe9a8"/>'),
  // 2 fish
  sc('#bfe3f2', '#f3e3b8', '<ellipse cx="96" cy="100" rx="52" ry="34" fill="#ffb7a5"/><path d="M142 100l34-26v52z" fill="#ffb7a5"/>' +
    '<circle cx="74" cy="92" r="6" fill="#5b5675"/><path d="M60 110q10 8 20 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="40" cy="50" r="8" fill="#fff" fill-opacity=".7"/><circle cx="58" cy="30" r="5" fill="#fff" fill-opacity=".7"/>' +
    '<path d="M30 200q-10-30 0-50M166 200q10-34 0-56" fill="none" stroke="#7fbf8f" stroke-width="8" stroke-linecap="round"/>'),
  // 3 flower
  sc('#eaf5df', '#b9e0a8', '<path d="M100 190V104" stroke="#7fbf8f" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M100 160q-34-6-36-34 30 2 36 34zM100 150q34-6 36-34-30 2-36 34z" fill="#9fd4a8"/>' +
    '<g fill="#f7a8c9"><circle cx="100" cy="62" r="22"/><circle cx="76" cy="84" r="22"/><circle cx="124" cy="84" r="22"/>' +
    '<circle cx="82" cy="58" r="22"/><circle cx="118" cy="58" r="22"/></g><circle cx="100" cy="76" r="16" fill="#ffe9a8"/>' +
    '<circle cx="30" cy="34" r="14" fill="#ffe08a"/>'),
  // 4 apple
  sc('#fdf0d5', '#c8e6b0', '<path d="M100 72q-6-20 8-30" fill="none" stroke="#9a7b5a" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M104 56q22-14 38-4-14 18-38 4z" fill="#8fcf8f"/><path d="M100 76q-52-22-58 34 4 50 46 54 6 2 12 0 42-4 46-54-6-56-58-34z" fill="#f2877f"/>' +
    '<ellipse cx="74" cy="104" rx="8" ry="14" fill="#fff" fill-opacity=".45" transform="rotate(20 74 104)"/>'),
  // 5 balloons
  sc('#cfeaf7', '#d9efc8', '<g stroke="#8a84a8" stroke-width="3" fill="none"><path d="M70 100Q96 140 100 176M100 92V176M132 100Q106 140 100 176"/></g>' +
    '<ellipse cx="68" cy="78" rx="24" ry="30" fill="#f7a8c9"/><ellipse cx="100" cy="66" rx="24" ry="30" fill="#ffe08a"/>' +
    '<ellipse cx="132" cy="78" rx="24" ry="30" fill="#a8d8f0"/><path d="M96 98h8l-4 8z" fill="#ffe08a"/>' +
    '<ellipse cx="60" cy="68" rx="5" ry="9" fill="#fff" fill-opacity=".6"/><ellipse cx="92" cy="56" rx="5" ry="9" fill="#fff" fill-opacity=".6"/>'),
  // 6 smiling sun
  sc('#cfeaf7', '', '<g stroke="#ffc94d" stroke-width="10" stroke-linecap="round"><path d="M100 28v-0M100 40V30M100 160v10M40 100H30M160 100h10M58 58l-8-8M142 58l8-8M58 142l-8 8M142 142l8 8"/></g>' +
    '<circle cx="100" cy="100" r="46" fill="#ffe08a"/>' + eye(84, 92) + eye(116, 92) + smile +
    '<circle cx="76" cy="110" r="7" fill="#ffb7a5" fill-opacity=".7"/><circle cx="124" cy="110" r="7" fill="#ffb7a5" fill-opacity=".7"/>' +
    '<ellipse cx="40" cy="170" rx="30" ry="9" fill="#fff"/><ellipse cx="160" cy="176" rx="26" ry="8" fill="#fff"/>'),
  // 7 cat
  sc('#f3e6fa', '#e0d4f3', '<path d="M58 70l8-34 30 22zM142 70l-8-34-30 22z" fill="#f6b88a"/><circle cx="100" cy="100" r="46" fill="#f6b88a"/>' +
    '<path d="M66 60l4-14 14 10zM134 60l-4-14-14 10z" fill="#ffd9b8"/>' + eye(82, 94) + eye(118, 94) +
    '<path d="M94 108h12l-6 7z" fill="#e87f8f"/><path d="M100 115q-6 9-14 6M100 115q6 9 14 6" fill="none" stroke="#5b5675" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M60 108l-22-4M60 116l-22 6M140 108l22-4M140 116l22 6" stroke="#8a84a8" stroke-width="3" stroke-linecap="round"/>'),
  // 8 rabbit
  sc('#e4f3d8', '#c8e6b0', '<ellipse cx="78" cy="48" rx="14" ry="34" fill="#f2f0f6"/><ellipse cx="122" cy="48" rx="14" ry="34" fill="#f2f0f6"/>' +
    '<ellipse cx="78" cy="50" rx="7" ry="22" fill="#f7b5c8"/><ellipse cx="122" cy="50" rx="7" ry="22" fill="#f7b5c8"/>' +
    '<circle cx="100" cy="110" r="44" fill="#f2f0f6"/>' + eye(84, 104) + eye(116, 104) + '<ellipse cx="100" cy="118" rx="6" ry="4" fill="#f7a0b8"/>' +
    '<path d="M100 122v8M90 134q10 6 20 0" fill="none" stroke="#5b5675" stroke-width="3" stroke-linecap="round"/>'),
  // 9 bear
  sc('#fdf0d5', '#e8d9b8', '<circle cx="64" cy="64" r="20" fill="#c79a74"/><circle cx="136" cy="64" r="20" fill="#c79a74"/>' +
    '<circle cx="64" cy="64" r="10" fill="#e8c4a2"/><circle cx="136" cy="64" r="10" fill="#e8c4a2"/><circle cx="100" cy="104" r="48" fill="#c79a74"/>' +
    '<ellipse cx="100" cy="120" rx="22" ry="17" fill="#ecd2b6"/>' + eye(82, 96) + eye(118, 96) + '<ellipse cx="100" cy="114" rx="8" ry="6" fill="#5b5675"/>' +
    '<path d="M100 120v6M92 130q8 6 16 0" fill="none" stroke="#5b5675" stroke-width="3" stroke-linecap="round"/>'),
  // 10 duck
  sc('#bfe3f2', '', '<path d="M0 150Q25 138 50 150T100 150T150 150T200 150V200H0z" fill="#8fcbea"/>' +
    '<ellipse cx="96" cy="120" rx="50" ry="32" fill="#ffe08a"/><path d="M52 112q-14-14-6-26 16 8 16 22z" fill="#ffe08a"/>' +
    '<circle cx="124" cy="78" r="26" fill="#ffe08a"/><path d="M146 76q22 2 22 10-14 8-24 2z" fill="#f6a35c"/>' + eye(128, 70) +
    '<ellipse cx="90" cy="120" rx="22" ry="14" fill="#f7cd5c"/><path d="M0 164Q25 154 50 164T100 164T150 164T200 164" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4"/>'),
  // 11 ladybug
  sc('#e4f3d8', '#b9e0a8', '<path d="M70 50q-10-12-4-20M130 50q10-12 4-20" stroke="#5b5675" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="100" cy="68" r="22" fill="#5b5675"/><ellipse cx="100" cy="120" rx="52" ry="48" fill="#ee7a74"/>' +
    '<path d="M100 74v94" stroke="#5b5675" stroke-width="5"/><g fill="#5b5675"><circle cx="76" cy="104" r="9"/><circle cx="124" cy="104" r="9"/>' +
    '<circle cx="82" cy="140" r="8"/><circle cx="118" cy="140" r="8"/></g><circle cx="92" cy="64" r="4" fill="#fff"/><circle cx="108" cy="64" r="4" fill="#fff"/>'),
  // 12 butterfly
  sc('#cfeaf7', '#d9efc8', '<ellipse cx="68" cy="80" rx="32" ry="38" fill="#f7a8c9" transform="rotate(-20 68 80)"/><ellipse cx="132" cy="80" rx="32" ry="38" fill="#f7a8c9" transform="rotate(20 132 80)"/>' +
    '<ellipse cx="74" cy="126" rx="22" ry="26" fill="#c9b8f2" transform="rotate(20 74 126)"/><ellipse cx="126" cy="126" rx="22" ry="26" fill="#c9b8f2" transform="rotate(-20 126 126)"/>' +
    '<circle cx="64" cy="78" r="10" fill="#fff" fill-opacity=".6"/><circle cx="136" cy="78" r="10" fill="#fff" fill-opacity=".6"/>' +
    '<rect x="93" y="64" width="14" height="82" rx="7" fill="#5b5675"/><path d="M96 66q-8-18-16-20M104 66q8-18 16-20" stroke="#5b5675" stroke-width="3" fill="none" stroke-linecap="round"/>'),
  // 13 snail
  sc('#eaf5df', '#b9e0a8', '<path d="M40 160q-4-20 22-20h86q16 0 14 20z" fill="#ffd9b8"/><path d="M52 142q-6-24 2-30" stroke="#ffd9b8" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    '<circle cx="104" cy="106" r="38" fill="#c9a0c0"/><circle cx="104" cy="106" r="26" fill="#e1c4dc"/><circle cx="104" cy="106" r="13" fill="#c9a0c0"/>' +
    '<circle cx="54" cy="108" r="5" fill="#5b5675"/><path d="M48 150q6 5 12 0" fill="none" stroke="#5b5675" stroke-width="3" stroke-linecap="round"/>'),
  // 14 car
  sc('#cfeaf7', '#bdbfc9', '<path d="M34 138V120q0-10 12-12l18-4 14-22q4-6 12-6h32q8 0 12 6l14 22 8 4q10 2 10 12v18z" fill="#f2877f"/>' +
    '<path d="M82 100l8-14h24l12 14z" fill="#d6ecfa"/><path d="M122 100l-8-14h-4v14z" fill="#d6ecfa"/>' +
    '<circle cx="68" cy="140" r="16" fill="#5b5675"/><circle cx="136" cy="140" r="16" fill="#5b5675"/><circle cx="68" cy="140" r="7" fill="#d9d6e6"/><circle cx="136" cy="140" r="7" fill="#d9d6e6"/>' +
    '<circle cx="44" cy="124" r="5" fill="#ffe08a"/><circle cx="40" cy="48" r="16" fill="#ffe08a"/>'),
  // 15 sailboat
  sc('#cfeaf7', '', '<path d="M0 140Q25 128 50 140T100 140T150 140T200 140V200H0z" fill="#8fcbea"/>' +
    '<path d="M100 40V138" stroke="#9a7b5a" stroke-width="6"/><path d="M106 44q40 36 40 82h-40z" fill="#fff"/><path d="M94 60q-30 28-34 66h34z" fill="#ffd98a"/>' +
    '<path d="M54 140h92l-14 22H70z" fill="#f2877f"/><circle cx="160" cy="44" r="16" fill="#ffe08a"/>'),
  // 16 tree
  sc('#cfeaf7', '#b9e0a8', '<rect x="90" y="110" width="20" height="58" rx="6" fill="#a9825f"/><circle cx="100" cy="76" r="38" fill="#8fcf8f"/>' +
    '<circle cx="72" cy="96" r="26" fill="#8fcf8f"/><circle cx="128" cy="96" r="26" fill="#8fcf8f"/>' +
    '<circle cx="86" cy="70" r="7" fill="#f2877f"/><circle cx="116" cy="88" r="7" fill="#f2877f"/><circle cx="76" cy="100" r="7" fill="#f2877f"/>' +
    '<circle cx="150" cy="40" r="14" fill="#ffe08a"/>'),
  // 17 ice cream
  sc('#fbe4ef', '#f6d3e2', '<path d="M68 104h64l-32 72z" fill="#e5b87c"/><path d="M80 112l20 50M92 106l20 54M108 106l-18 54" stroke="#c99a5e" stroke-width="3" fill="none"/>' +
    '<circle cx="100" cy="94" r="36" fill="#f7a8c9"/><circle cx="76" cy="100" r="22" fill="#f7a8c9"/><circle cx="124" cy="100" r="22" fill="#f7a8c9"/>' +
    '<circle cx="100" cy="52" r="26" fill="#bfe6b4"/><circle cx="100" cy="30" r="9" fill="#f2877f"/><path d="M100 22q4-8 10-8" stroke="#7fbf8f" stroke-width="3" fill="none"/>'),
  // 18 cupcake
  sc('#fdf0d5', '#f1e1bd', '<path d="M64 112h72l-10 56H74z" fill="#f6b88a"/><path d="M80 112l4 56M100 112v56M120 112l-4 56" stroke="#e29a68" stroke-width="3"/>' +
    '<path d="M58 112q-6-28 24-30 4-26 26-22 22 2 24 24 28 6 20 28z" fill="#f7a8c9"/><circle cx="100" cy="46" r="11" fill="#f2877f"/>' +
    '<g fill="#fff"><rect x="76" y="92" width="10" height="4" rx="2"/><rect x="108" y="86" width="10" height="4" rx="2"/><rect x="92" y="102" width="10" height="4" rx="2"/></g>'),
  // 19 rocket
  sc('#2f3a66', '', '<g fill="#fff"><circle cx="40" cy="50" r="3"/><circle cx="160" cy="40" r="3"/><circle cx="150" cy="150" r="3"/><circle cx="46" cy="140" r="3"/><circle cx="170" cy="96" r="2"/></g>' +
    '<path d="M100 28q34 28 30 90H70q-4-62 30-90z" fill="#f2f0f6"/><path d="M70 100l-24 36 28-6zM130 100l24 36-28-6z" fill="#f2877f"/>' +
    '<circle cx="100" cy="82" r="14" fill="#8fcbea" stroke="#d6ecfa" stroke-width="4"/><path d="M82 118h36l-18 36z" fill="#ffc94d"/><path d="M92 118h16l-8 22z" fill="#f2877f"/>'),
  // 20 umbrella
  sc('#d8e3f2', '#c3d4e8', '<path d="M100 96v62q0 12-12 12t-12-12" fill="none" stroke="#8a84a8" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M40 96q0-54 60-54t60 54q-14-12-30-4-14-12-30-4-16-8-30 4-16-8-30 4z" fill="#f2877f"/><path d="M100 42v50M70 48q-12 22-10 44M130 48q12 22 10 44" stroke="#fff" stroke-opacity=".6" stroke-width="4" fill="none"/>' +
    '<g fill="#8fcbea"><ellipse cx="50" cy="130" rx="4" ry="8"/><ellipse cx="146" cy="120" rx="4" ry="8"/><ellipse cx="60" cy="168" rx="4" ry="8"/><ellipse cx="150" cy="160" rx="4" ry="8"/></g>'),
  // 21 kite
  sc('#cfeaf7', '#d9efc8', '<path d="M100 150Q80 166 100 176T100 196" fill="none" stroke="#8a84a8" stroke-width="3"/>' +
    '<path d="M100 32l46 52-46 66-46-66z" fill="#f7a8c9"/><path d="M100 32l46 52H54z" fill="#ffe08a"/><path d="M100 32v118M54 84h92" stroke="#fff" stroke-width="3"/>' +
    '<path d="M100 150l-12 10 12 4 12-4z" fill="#a8d8f0"/>'),
  // 22 snowman
  sc('#d6e8f7', '#fff', '<circle cx="100" cy="144" r="34" fill="#fff" stroke="#d6e1ee" stroke-width="3"/><circle cx="100" cy="96" r="26" fill="#fff" stroke="#d6e1ee" stroke-width="3"/>' +
    '<rect x="80" y="52" width="40" height="10" rx="3" fill="#5b5675"/><rect x="88" y="34" width="24" height="22" rx="3" fill="#5b5675"/>' +
    eye(91, 92, 4) + eye(109, 92, 4) + '<path d="M100 98l22 5-22 3z" fill="#f6a35c"/>' +
    '<circle cx="100" cy="128" r="4" fill="#5b5675"/><circle cx="100" cy="144" r="4" fill="#5b5675"/><circle cx="100" cy="160" r="4" fill="#5b5675"/>' +
    '<path d="M76 112h48v8H76z" fill="#f2877f"/>'),
  // 23 turtle
  sc('#bfe3f2', '#f3e3b8', '<ellipse cx="100" cy="124" rx="56" ry="38" fill="#8fcf8f"/><path d="M60 124q40-60 80 0z" fill="#6fb87a"/>' +
    '<path d="M100 88v36M78 98l12 26M122 98l-12 26" stroke="#8fcf8f" stroke-width="4" fill="none"/>' +
    '<circle cx="164" cy="116" r="18" fill="#a8dba0"/>' + eye(168, 110, 4) +
    '<ellipse cx="68" cy="158" rx="12" ry="9" fill="#a8dba0"/><ellipse cx="132" cy="158" rx="12" ry="9" fill="#a8dba0"/><path d="M44 130l-14 8 14 2z" fill="#a8dba0"/>'),
  // 24 mushroom
  sc('#eaf5df', '#b9e0a8', '<path d="M82 100h36l4 62q0 8-8 8H86q-8 0-8-8z" fill="#f6e8d3"/>' +
    '<path d="M36 104q0-62 64-62t64 62q0 6-8 6H44q-8 0-8-6z" fill="#f2877f"/><g fill="#fff"><circle cx="76" cy="76" r="11"/><circle cx="118" cy="66" r="9"/><circle cx="136" cy="94" r="8"/><circle cx="96" cy="94" r="7"/></g>' +
    '<path d="M54 172q-8-14 4-18M148 172q8-16-2-22" fill="none" stroke="#7fbf8f" stroke-width="6" stroke-linecap="round"/>'),
  // 25 owl
  sc('#3d4a7a', '#566395', '<path d="M56 60l12 18h-24zM144 60l-12 18h24z" fill="#a9825f"/><ellipse cx="100" cy="112" rx="50" ry="58" fill="#c79a74"/>' +
    '<ellipse cx="100" cy="132" rx="30" ry="34" fill="#ecd2b6"/><circle cx="78" cy="92" r="20" fill="#fff"/><circle cx="122" cy="92" r="20" fill="#fff"/>' +
    '<circle cx="80" cy="94" r="9" fill="#5b5675"/><circle cx="120" cy="94" r="9" fill="#5b5675"/><path d="M92 106h16l-8 14z" fill="#f6a35c"/>' +
    '<path d="M50 160h100" stroke="#a9825f" stroke-width="8" stroke-linecap="round"/><circle cx="160" cy="42" r="14" fill="#ffe9a8"/>'),
];
