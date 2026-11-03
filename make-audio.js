/* Pre-renders one audio file per phrase into audio/, so the page does not depend on
   whatever voice happens to be installed on the device. Run: node make-audio.js

   The best Japanese voice that is actually installed is picked automatically, so after
   installing a better one in System Settings -> Accessibility -> Spoken Content ->
   System Voice -> Manage Voices -> Japanese, a plain re-run upgrades every file.
   --voice <identifier> overrides the choice. */
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const VOICE_ARG = opt('--voice', null);
const RATE = +opt('--rate', 170);
const SLOW_RATE = +opt('--slow-rate', 135);
const PAUSE = +opt('--pause', 400);
const OUT = path.join(__dirname, opt('--out', 'audio'));

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const code = html.split('<script>')[1].split('</script>')[0];
const ctx = {}; vm.createContext(ctx);
vm.runInContext(code + ';this.t={PHRASES,audioId,speechChunks}', ctx);
const { PHRASES, audioId, speechChunks } = ctx.t;

const tmp = path.join(os.tmpdir(), 'jpt-say.aiff');
const duration = f => {
  const info = execFileSync('afinfo', [f], { encoding: 'utf8' });
  const m = info.match(/estimated duration:\s*([\d.]+)/);
  return m ? +m[1] : 0;
};

/* Best first. say(1) lists voices that are registered but not downloaded, and those
   render ~0.01s of silence instead of failing, so each candidate is measured. */
const CANDIDATES = [
  'com.apple.voice.premium.ja-JP.Kyoko',
  'com.apple.voice.premium.ja-JP.Otoya',
  'com.apple.ttsbundle.siri_Hattori_ja-JP_premium',
  'com.apple.ttsbundle.siri_O-ren_ja-JP_premium',
  'com.apple.voice.enhanced.ja-JP.Kyoko',
  'com.apple.voice.enhanced.ja-JP.Otoya',
  'com.apple.voice.compact.ja-JP.Kyoko'
];

function speaks(voice) {
  try {
    execFileSync('say', ['-v', voice, '-o', tmp, 'テスト'], { stdio: 'ignore' });
    const ok = duration(tmp) >= 0.3;
    fs.unlinkSync(tmp);
    return ok;
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    return false;
  }
}

const VOICE = VOICE_ARG || CANDIDATES.find(speaks);
if (!VOICE) {
  console.error('No usable Japanese voice. Install one in System Settings -> Accessibility\n' +
    '-> Spoken Content -> System Voice -> Manage Voices -> Japanese.');
  process.exit(1);
}

function render(text, rate, file) {
  execFileSync('say', ['-v', VOICE, '-r', String(rate), '-o', tmp, text]);
  const d = duration(tmp);
  if (d < 0.3) {
    fs.unlinkSync(tmp);
    throw new Error(`voice "${VOICE}" rendered ${d.toFixed(2)}s of silence. It is listed ` +
      `but not installed - download it in System Settings -> Accessibility -> Spoken Content.`);
  }
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '32000', '--mix', '-c', '1', tmp, file]);
  fs.unlinkSync(tmp);
  return d;
}

fs.mkdirSync(OUT, { recursive: true });
let bytes = 0;
try {
  for (const p of PHRASES) {
    const id = audioId(p), chunks = speechChunks(p);
    const takes = [
      [chunks.join(''), RATE, `${id}.m4a`],
      [chunks.join(` [[slnc ${PAUSE}]] `), SLOW_RATE, `${id}.slow.m4a`]
    ];
    const out = [];
    for (const [text, rate, name] of takes) {
      const file = path.join(OUT, name);
      const d = render(text, rate, file);
      bytes += fs.statSync(file).size;
      out.push(`${name} ${d.toFixed(1)}s`);
    }
    console.log(p.k.padEnd(16), out.join('  '));
  }
} catch (e) {
  console.error('\n' + e.message);
  process.exit(1);
}
console.log(`\n${PHRASES.length * 2} files, ${(bytes / 1024).toFixed(0)} KB, voice ${VOICE}`);
if (/compact/.test(VOICE)) {
  console.log('\nThis is the basic voice that ships with macOS. For a much better one, install\n' +
    'Kyoko (Premium) in System Settings -> Accessibility -> Spoken Content -> System\n' +
    'Voice -> Manage Voices -> Japanese, then run this again. No flag needed.');
}
