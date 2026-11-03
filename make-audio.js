/* Pre-renders one audio file per phrase and voice into audio/<voice>/, so the page does
   not depend on whatever voice happens to be installed on the device.
     node make-audio.js                 every voice in VOICES
     node make-audio.js --voice otoya   just one (the `id` from VOICES)

   Per voice, the first identifier in its `say` list that actually renders is used, so
   installing a better voice in System Settings -> Accessibility -> Read & Speak ->
   System Voice -> Manage Voices -> Japanese and re-running upgrades the files. A voice
   with none installed is skipped with a warning and its old files are left alone. */
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const ONLY = opt('--voice', null);
const RATE = +opt('--rate', 170);
const SLOW_RATE = +opt('--slow-rate', 135);
const PAUSE = +opt('--pause', 400);
const OUT = path.join(__dirname, opt('--out', 'audio'));

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const code = html.split('<script>')[1].split('</script>')[0];
const ctx = {}; vm.createContext(ctx);
vm.runInContext(code + ';this.t={PHRASES,VOICES,audioId,speechChunks}', ctx);
const { PHRASES, VOICES, audioId, speechChunks } = ctx.t;

const voices = ONLY ? VOICES.filter(v => v.id === ONLY) : VOICES;
if (!voices.length) {
  console.error(`No voice "${ONLY}". Known: ${VOICES.map(v => v.id).join(', ')}`);
  process.exit(1);
}

const tmp = path.join(os.tmpdir(), 'jpt-say.aiff');
const duration = f => {
  const info = execFileSync('afinfo', [f], { encoding: 'utf8' });
  const m = info.match(/estimated duration:\s*([\d.]+)/);
  return m ? +m[1] : 0;
};

/* say(1) accepts the identifier of a voice that is registered but not downloaded and
   renders ~0.01s of silence instead of failing, so every candidate is measured. */
function speaks(voice) {
  try {
    execFileSync('say', ['-v', voice, '-o', tmp, 'テスト'], { stdio: 'ignore' });
    return duration(tmp) >= 0.3;
  } catch (e) {
    return false;
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
}

function render(voice, text, rate, file) {
  execFileSync('say', ['-v', voice, '-r', String(rate), '-o', tmp, text]);
  const d = duration(tmp);
  if (d < 0.3) {
    fs.unlinkSync(tmp);
    throw new Error(`voice "${voice}" rendered ${d.toFixed(2)}s of silence for "${text}".`);
  }
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '32000', '--mix', '-c', '1', tmp, file]);
  fs.unlinkSync(tmp);
  return d;
}

let failed = false;
for (const v of voices) {
  const say = v.say.find(speaks);
  if (!say) {
    console.warn(`\n${v.name}: none of ${v.say.join(', ')} is installed, skipped.`);
    failed = true;
    continue;
  }
  console.log(`\n${v.name} (${say})`);
  const dir = path.join(OUT, v.id);
  fs.mkdirSync(dir, { recursive: true });
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
        const file = path.join(dir, name);
        const d = render(say, text, rate, file);
        bytes += fs.statSync(file).size;
        out.push(`${d.toFixed(1)}s`);
      }
      console.log('  ' + p.k.padEnd(16), out.join('  '));
    }
  } catch (e) {
    console.error('\n' + e.message);
    failed = true;
    continue;
  }
  console.log(`  ${PHRASES.length * 2} files, ${(bytes / 1024).toFixed(0)} KB`);
}
if (failed) process.exitCode = 1;
