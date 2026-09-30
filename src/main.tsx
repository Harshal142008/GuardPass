import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, Award, BookOpen, Check, CheckCircle2, ClipboardCheck, Copy, Eye, EyeOff, ExternalLink, Info, LayoutDashboard, Lightbulb, LockKeyhole, LogIn, Menu, RefreshCw, Shield, ShieldCheck, Sparkles, Target, UserRound, X } from 'lucide-react';
import './style.css';

const common = ['123456', 'password', '123456789', '12345', 'qwerty', '12345678', '111111', '123123', 'abc123', 'admin', 'welcome', 'letmein', 'monkey', 'dragon', 'football', 'iloveyou', 'master', 'login', 'princess', 'sunshine', 'password1', 'admin123', 'welcome123', 'qwerty123', 'password123'];
const words = ['password', 'admin', 'welcome', 'login', 'letmein', 'qwerty', 'dragon', 'football', 'princess', 'sunshine', 'master', 'monkey', 'hello', 'computer', 'summer', 'winter', 'secret'];
const subs: Record<string, string> = { '@': 'a', '4': 'a', '$': 's', '5': 's', '0': 'o', '1': 'i', '!': 'i', '3': 'e', '7': 't', '+': 't', '8': 'b' };

type PatternType = 'common' | 'word' | 'keyboard' | 'sequence' | 'repeat' | 'block' | 'numeric' | 'year' | 'leet' | 'structure' | 'excessive';
type Pattern = { type: PatternType; title: string; detail: string; penalty?: number };
type Segment = { value: string; label: string; tone: 'word' | 'number' | 'symbol' | 'pattern' | 'neutral' };
type Factor = { label: string; amount: number; detail: string };
type Policy = { minLength: number; uppercase: boolean; lowercase: boolean; number: boolean; symbol: boolean; common: boolean; repeated: boolean; predictable: boolean };
const defaultPolicy: Policy = { minLength: 12, uppercase: true, lowercase: true, number: true, symbol: true, common: true, repeated: true, predictable: true };

function norm(value: string) { return [...value.toLowerCase()].map((char) => subs[char] ?? char).join(''); }
function hasSequential(value: string) { return /1234|4321|abcd|dcba/i.test(value) || /(?:0123|9876)/.test(value); }
function hasKeyboard(value: string) { return /qwerty|asdfgh|zxcvbn|qazwsx|wsxedc|1qaz2wsx/i.test(value); }
function hasRepeated(value: string) { return /(.)\1\1/.test(value); }
function hasRepeatedBlock(value: string) { return /(.{2,4})\1/i.test(value); }
function hasLeetSubstitution(value: string) { return /[a-z][@$0457318][a-z]/i.test(value); }
function getWord(value: string) { return words.find((word) => norm(value).includes(word)); }
function getNumericSuffix(value: string) { return value.match(/[0-9]{3,}(?=[^a-zA-Z0-9]*$)/)?.[0] ?? ''; }
function getYearSuffix(value: string) { return value.match(/(?:19|20)\d{2}(?=[^a-zA-Z0-9]*$)/)?.[0] ?? ''; }

function buildPatterns(password: string): Pattern[] {
  const n = norm(password), exact = common.includes(n), variant = !exact && common.some((item) => n.startsWith(item) && n.length - item.length <= 4), word = getWord(password), numeric = getNumericSuffix(password), year = getYearSuffix(password);
  const patterns: Pattern[] = [];
  if (exact || variant) patterns.push({ type: 'common', title: exact ? 'Common password' : 'Common password variant', detail: exact ? 'This password appears in common-password lists.' : 'It resembles a common password with a small mutation.', penalty: exact ? 55 : 35 });
  if (word) patterns.push({ type: 'word', title: 'Dictionary/common word', detail: `The familiar word “${word}” can be prioritized by guessing tools.`, penalty: 14 });
  if (hasKeyboard(password)) patterns.push({ type: 'keyboard', title: 'Keyboard pattern', detail: 'A keyboard walk is easy to enumerate.', penalty: 22 });
  if (hasSequential(password)) patterns.push({ type: 'sequence', title: 'Sequential characters', detail: 'Ordered characters such as 1234 or abcd are predictable.', penalty: 18 });
  if (hasRepeated(password)) patterns.push({ type: 'repeat', title: 'Repeated characters', detail: 'Runs of the same character reduce effective variety.', penalty: 22 });
  if (hasRepeatedBlock(password)) patterns.push({ type: 'block', title: 'Repeated block', detail: 'A repeated chunk creates a recognizable structure.', penalty: 12 });
  if (numeric) patterns.push({ type: 'numeric', title: 'Predictable numeric suffix', detail: `The ending “${numeric}” is a common human-chosen pattern.`, penalty: 8 });
  if (year) patterns.push({ type: 'year', title: 'Year-like suffix', detail: `The ending “${year}” may be tested as a likely personal date.` });
  if (hasLeetSubstitution(password)) patterns.push({ type: 'leet', title: 'Leetspeak substitution', detail: 'Familiar substitutions such as @, 0 or 3 are included in modern guesses.', penalty: 6 });
  if (word && numeric) patterns.push({ type: 'structure', title: 'Word + number structure', detail: 'Combining a familiar word with a number is a frequently tried construction.' });
  if (patterns.filter((pattern) => ['common', 'word', 'keyboard', 'sequence', 'numeric', 'year', 'leet', 'structure'].includes(pattern.type)).length >= 2) patterns.push({ type: 'excessive', title: 'Predictable overall structure', detail: 'Several familiar ingredients make the password easier to prioritize.' });
  return patterns;
}

function buildSegments(password: string): Segment[] {
  const result: Segment[] = []; let index = 0;
  const push = (value: string, label: string, tone: Segment['tone']) => { if (value) result.push({ value, label, tone }); };
  while (index < password.length) {
    const rest = password.slice(index), numeric = rest.match(/^\d+/)?.[0];
    if (numeric) { const suffix = index + numeric.length === password.length || /^[^a-zA-Z0-9]*$/.test(password.slice(index + numeric.length)); push(numeric, hasSequential(numeric) || suffix ? 'Sequence / number' : 'Number', 'number'); index += numeric.length; continue; }
    const symbol = rest.match(/^[^a-zA-Z0-9]+/)?.[0];
    if (symbol) { push(symbol, 'Symbol', 'symbol'); index += symbol.length; continue; }
    const matchedWord = words.filter((word) => norm(rest).startsWith(word)).sort((a, b) => b.length - a.length)[0];
    if (matchedWord) { push(password.slice(index, index + matchedWord.length), 'Common word', 'word'); index += matchedWord.length; continue; }
    const keyboard = rest.match(/^(qwerty|asdfgh|zxcvbn|qazwsx)/i)?.[0];
    if (keyboard) { push(keyboard, 'Keyboard pattern', 'pattern'); index += keyboard.length; continue; }
    let end = index + 1; while (end < password.length && /[a-zA-Z]/.test(password[end]) && !words.some((word) => norm(password.slice(end)).startsWith(word))) end += 1;
    push(password.slice(index, end), 'Mixed text', 'neutral'); index = end;
  }
  return result;
}

function analyze(password: string) {
  if (!password) return { score: 0, label: 'Very Weak', resistance: 'Extremely Low', entropy: 0, theoretical: 0, findings: ['Enter a password to begin analysis.'], patterns: [] as Pattern[], positive: [] as Factor[], negative: [] as Factor[], segments: [] as Segment[], suggestions: [] as { priority: string; text: string }[] };
  const lower = /[a-z]/.test(password), upper = /[A-Z]/.test(password), digit = /\d/.test(password), symbol = /[^a-zA-Z0-9\s]/.test(password), charset = Math.max((lower ? 26 : 0) + (upper ? 26 : 0) + (digit ? 10 : 0) + (symbol ? 32 : 0), 1);
  const patterns = buildPatterns(password);
  const isPassphrase = password.trim().split(/\s+/).length >= 3 && password.length >= 16;
  const positive: Factor[] = [{ label: 'Length contribution', amount: Math.round(Math.min(32, password.length * 3.2)), detail: password.length >= 12 ? 'Longer than the recommended baseline.' : `${password.length} characters provides limited search space.` }, { label: 'Character-type diversity', amount: [lower, upper, digit, symbol].filter(Boolean).length * 6, detail: `${[lower, upper, digit, symbol].filter(Boolean).length} of 4 character groups used.` }, { label: 'Character variety', amount: Math.round(Math.min(10, new Set([...password]).size / password.length * 10)), detail: 'Unique characters add a modest amount of variety.' }, ...(isPassphrase ? [{ label: 'Passphrase length bonus', amount: 18, detail: 'Several words create a longer, memorable passphrase.' }] : [])];
  const negative: Factor[] = patterns.filter((pattern) => (pattern.penalty ?? 0) > 0).map((pattern) => ({ label: pattern.title, amount: pattern.penalty ?? 0, detail: pattern.detail }));
  if (password.length < 12) negative.push({ label: 'Below recommended length', amount: 20, detail: 'Aim for at least 12 characters.' });
  const score = Math.max(0, Math.min(100, Math.round(positive.reduce((sum, factor) => sum + factor.amount, 0) - negative.reduce((sum, factor) => sum + factor.amount, 0))));
  const theoretical = Math.round(password.length * Math.log2(charset) * 10) / 10, practical = patterns.some((pattern) => pattern.type === 'common' && pattern.penalty === 55) ? Math.min(4, theoretical) : Math.round(theoretical * (patterns.some((pattern) => pattern.type === 'common') ? .25 : 1) * (hasKeyboard(password) ? .55 : 1) * (hasSequential(password) ? .6 : 1) * 10) / 10;
  const label = score < 20 ? 'Very Weak' : score < 40 ? 'Weak' : score < 60 ? 'Moderate' : score < 80 ? 'Strong' : 'Very Strong', resistance = score < 20 || practical < 20 ? 'Extremely Low' : score < 40 || practical < 35 ? 'Low' : score < 60 || practical < 55 ? 'Moderate' : score < 80 || practical < 75 ? 'High' : 'Very High';
  const findings = patterns.map((pattern) => pattern.detail); if (password.length < 12) findings.push('Length is below the recommended 12+ characters.'); if (!findings.length) findings.push('No obvious common or structural weakness detected.');
  const suggestions: { priority: string; text: string }[] = [];
  if (password.length < 12) suggestions.push({ priority: 'Critical', text: 'Increase the password length. Aim for a longer unique password or passphrase.' });
  if (patterns.some((pattern) => pattern.type === 'common' || pattern.type === 'word')) suggestions.push({ priority: 'High', text: 'Avoid commonly used passwords, dictionary words or familiar phrases.' });
  if (patterns.some((pattern) => pattern.type === 'keyboard')) suggestions.push({ priority: 'High', text: 'Avoid predictable keyboard sequences such as QWERTY-style patterns.' });
  if (patterns.some((pattern) => pattern.type === 'numeric' || pattern.type === 'year' || pattern.type === 'sequence')) suggestions.push({ priority: 'Medium', text: 'Avoid predictable endings such as years, sequential numbers or ordered letters.' });
  if (patterns.some((pattern) => pattern.type === 'repeat' || pattern.type === 'block')) suggestions.push({ priority: 'Medium', text: 'Avoid repeated character or repeated-block patterns.' });
  if (patterns.some((pattern) => pattern.type === 'leet')) suggestions.push({ priority: 'Good practice', text: 'Do not rely on familiar leetspeak substitutions as the main source of complexity.' });
  if (!suggestions.length) suggestions.push({ priority: 'Good practice', text: '✓ No major improvements required. Keep it unique and never reuse it across services.' });
  return { score, label, resistance, entropy: practical, theoretical, findings, patterns, positive, negative, segments: buildSegments(password), suggestions };
}

function secureInt(max: number) { if (!crypto?.getRandomValues) throw new Error('Secure randomness unavailable'); const array = new Uint32Array(1); const limit = 0xffffffff - (0xffffffff % max); do crypto.getRandomValues(array); while (array[0] >= limit); return array[0] % max; }
function generate(length: number) { const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+'; let output = ''; while (output.length < length) output += pool[secureInt(pool.length)]; return output; }

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const pointer = { x: 0, y: 0, active: false };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let devicePixelRatio = 1;
    let particles: { x: number; y: number; vx: number; vy: number; radius: number; alpha: number }[] = [];
    let frame = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      const count = Math.min(96, Math.max(34, Math.round((width * height) / 20000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: 0.8 + Math.random() * 1.7,
        alpha: 0.18 + Math.random() * 0.38,
      }));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        if (!reducedMotion) {
          particle.x += particle.vx;
          particle.y += particle.vy;
          if (particle.x < -10) particle.x = width + 10;
          if (particle.x > width + 10) particle.x = -10;
          if (particle.y < -10) particle.y = height + 10;
          if (particle.y > height + 10) particle.y = -10;
        }

        const distanceToPointer = pointer.active ? Math.hypot(pointer.x - particle.x, pointer.y - particle.y) : Infinity;
        if (distanceToPointer < 155) {
          const intensity = (1 - distanceToPointer / 155) * 0.2;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(pointer.x, pointer.y);
          context.strokeStyle = `rgba(125, 211, 252, ${intensity})`;
          context.lineWidth = 0.7;
          context.stroke();
        }

        const glow = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 6);
        glow.addColorStop(0, `rgba(224, 242, 254, ${particle.alpha})`);
        glow.addColorStop(0.35, `rgba(125, 211, 252, ${particle.alpha * 0.68})`);
        glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * 6, 0, Math.PI * 2);
        context.fill();
      }
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };

    const handlePointerMove = (event: PointerEvent) => { pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true; };
    const handlePointerLeave = () => { pointer.active = false; };
    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="particleCanvas" aria-hidden="true" />;
}

function AttackPatternVisualization({ analysis }: { analysis: ReturnType<typeof analyze> }) { return <section className="panel featurePanel"><div className="sectionTitle"><AlertTriangle size={18} /> Attack pattern analysis</div>{analysis.patterns.length ? <><div className="segments" aria-label="Password pattern segments">{analysis.segments.map((segment, index) => <div className={`segment ${segment.tone}`} key={`${segment.value}-${index}`}><span>{segment.value}</span><small>{segment.label}</small></div>)}</div><div className="patternList">{analysis.patterns.map((pattern) => <div className="pattern" key={pattern.type}><span className="patternBadge">{pattern.title}</span><span>{pattern.detail}</span></div>)}</div><p className="callout"><Info size={16} /> Attackers often prioritize familiar combinations of words, numbers and substitutions before attempting less structured guesses.</p></> : <div className="emptyState"><CheckCircle2 size={20} /> No major predictable patterns detected</div>}</section>; }

function PasswordPolicyTester({ password, analysis, policy, setPolicy }: { password: string; analysis: ReturnType<typeof analyze>; policy: Policy; setPolicy: React.Dispatch<React.SetStateAction<Policy>> }) {
  const checks = [{ key: 'minLength', label: `Minimum length (${policy.minLength})`, enabled: true, pass: password.length >= policy.minLength, control: <input className="minLength" type="number" min="8" max="64" value={policy.minLength} onChange={(event) => setPolicy((current) => ({ ...current, minLength: Math.max(8, Math.min(64, Number(event.target.value) || 8)) }))} /> }, { key: 'uppercase', label: 'Uppercase required', enabled: policy.uppercase, pass: /[A-Z]/.test(password) }, { key: 'lowercase', label: 'Lowercase required', enabled: policy.lowercase, pass: /[a-z]/.test(password) }, { key: 'number', label: 'Number required', enabled: policy.number, pass: /\d/.test(password) }, { key: 'symbol', label: 'Symbol required', enabled: policy.symbol, pass: /[^a-zA-Z0-9\s]/.test(password) }, { key: 'common', label: 'Disallow common passwords', enabled: policy.common, pass: !analysis.patterns.some((pattern) => pattern.type === 'common') }, { key: 'repeated', label: 'Disallow repeated characters', enabled: policy.repeated, pass: !analysis.patterns.some((pattern) => pattern.type === 'repeat' || pattern.type === 'block') }, { key: 'predictable', label: 'Disallow predictable sequences', enabled: policy.predictable, pass: !analysis.patterns.some((pattern) => ['keyboard', 'sequence', 'numeric', 'year', 'structure', 'excessive'].includes(pattern.type)) }];
  const enabledChecks = checks.filter((check) => check.enabled), passed = enabledChecks.filter((check) => check.pass).length;
  return <section className="panel featurePanel"><div className="sectionTitle"><Shield size={18} /> Password policy</div><p className="subtle">Tune the baseline requirements used for this local check.</p><div className="policyRows">{checks.map((check) => <div className="policyRow" key={check.key}><span>{check.label} {check.key !== 'minLength' && <input type="checkbox" checked={check.enabled} onChange={(event) => setPolicy((current) => ({ ...current, [check.key]: event.target.checked }))} aria-label={`Enable ${check.label}`} />}</span>{check.enabled ? <span className={check.pass ? 'pass' : 'fail'}>{check.pass ? <Check size={16} /> : <X size={16} />} {check.pass ? 'Passed' : 'Failed'}</span> : <span className="notRequired">— Not required</span>}{check.control}</div>)}</div><div className="compliance"><b>Policy compliance: {passed} / {enabledChecks.length}</b><span className="miniBar"><i style={{ width: `${enabledChecks.length ? passed / enabledChecks.length * 100 : 0}%` }} /></span></div></section>;
}

function ScoreExplanation({ analysis }: { analysis: ReturnType<typeof analyze> }) { return <section className="panel featurePanel"><div className="sectionTitle"><Sparkles size={18} /> Why this score?</div><div className="explanationHeader"><b>Heuristic security score</b><strong>{analysis.score} <small>/ 100</small></strong></div><div className="factorColumns"><div><h3 className="positiveHeading">Positive factors</h3>{analysis.positive.map((factor) => <div className="factor" key={factor.label}><span>+{factor.amount}</span><div><b>{factor.label}</b><small>{factor.detail}</small></div></div>)}</div><div><h3 className="negativeHeading">Negative factors</h3>{analysis.negative.length ? analysis.negative.map((factor) => <div className="factor" key={factor.label}><span>−{factor.amount}</span><div><b>{factor.label}</b><small>{factor.detail}</small></div></div>) : <div className="subtle">No score penalties detected.</div>}</div></div><p className="scoreNarrative">Your password received <b>{analysis.score}/100</b> because its positive length and diversity contributions are offset by the weaknesses detected above. This is an estimated resistance score, not a probability of being cracked.</p></section>; }
function ImprovementSuggestions({ analysis }: { analysis: ReturnType<typeof analyze> }) { return <section className="panel featurePanel"><div className="sectionTitle"><Sparkles size={18} /> Improve your password</div><div className="suggestions">{analysis.suggestions.map((suggestion, index) => <div className={`suggestion ${suggestion.priority.toLowerCase().replace(' ', '-')}`} key={`${suggestion.priority}-${index}`}><span className="priority">{suggestion.priority}</span><span>{suggestion.text}</span></div>)}</div></section>; }

type Lesson = { id: string; title: string; minutes: number; body: string; tip: string };
type Course = { id: string; title: string; category: string; icon: string; description: string; lessons: Lesson[]; quiz: { question: string; options: string[]; answer: number; explanation: string } };

const courses: Course[] = [
  { id: 'password-security', title: 'Password Security', category: 'Account safety', icon: '🔐', description: 'Build passwords that resist guessing, stuffing and everyday mistakes.', lessons: [
    { id: 'passphrases', title: 'Long, memorable passphrases', minutes: 6, body: 'Length is one of the strongest practical improvements you can make. A passphrase made from unrelated words is easier to remember and harder to enumerate than a short password with a predictable symbol swap.', tip: 'Use a password manager to create a unique passphrase for every important account.' },
    { id: 'mfa', title: 'Multi-factor authentication', minutes: 5, body: 'MFA adds another proof of identity beyond a password. Prefer an authenticator app or security key when available, and store recovery codes somewhere safe.', tip: 'Turn on MFA first for email, banking and your password manager.' },
    { id: 'stuffing', title: 'Credential stuffing and reuse', minutes: 7, body: 'Credential stuffing uses leaked username/password pairs against other services. Unique passwords limit the blast radius of a breach.', tip: 'If a service is breached, change its password and any reused password immediately.' },
  ], quiz: { question: 'Which action best limits the impact of a password breach?', options: ['Use the same strong password everywhere', 'Use a unique password for each service', 'Change one character every month', 'Hide the password in a browser tab'], answer: 1, explanation: 'Unique passwords stop attackers from reusing one leaked credential across your other accounts.' } },
  { id: 'personal-data', title: 'Personal Data Protection', category: 'Privacy basics', icon: '🛡️', description: 'Understand what personal data reveals and share only what is necessary.', lessons: [
    { id: 'pii', title: 'What counts as personal data?', minutes: 5, body: 'Names, addresses, phone numbers, identifiers, location history and combinations of seemingly harmless details can identify or profile a person.', tip: 'Before sharing, ask what the recipient really needs and how long they will keep it.' },
    { id: 'minimize', title: 'Data minimization', minutes: 4, body: 'Data minimization means collecting, storing and sharing the smallest amount of information needed for a clear purpose.', tip: 'Treat optional form fields as optional—do not fill them automatically.' },
    { id: 'profiles', title: 'Public profile risks', minutes: 6, body: 'Public posts can reveal routines, relationships, answers to security questions and clues about where you live or work.', tip: 'Review old posts and remove sensitive details from public profiles.' },
  ], quiz: { question: 'What is data minimization?', options: ['Deleting every file', 'Collecting only the data needed for a specific purpose', 'Sharing data with more people', 'Using a longer password'], answer: 1, explanation: 'Minimization reduces exposure by limiting collection and retention to a clear purpose.' } },
  { id: 'phishing', title: 'Phishing & Social Engineering', category: 'Threat awareness', icon: '🎣', description: 'Spot manipulation, fake urgency and malicious links before they become incidents.', lessons: [
    { id: 'signals', title: 'Spot the warning signs', minutes: 6, body: 'Unexpected urgency, mismatched domains, unusual payment requests and requests for secrets are common phishing signals.', tip: 'Pause. Verify through a trusted channel instead of replying to the message.' },
    { id: 'links', title: 'Check links safely', minutes: 5, body: 'Hover or long-press to inspect a destination. Look for lookalike domains, added words and suspicious URL paths.', tip: 'Open the service using a bookmark or typed address rather than a surprise link.' },
    { id: 'impersonation', title: 'Resist impersonation', minutes: 5, body: 'Attackers may pretend to be a manager, friend or support agent. A familiar name is not proof of identity.', tip: 'Use a second channel and a known number to confirm unusual requests.' },
  ], quiz: { question: 'What should you do with an unexpected urgent payment request?', options: ['Pay immediately', 'Reply with your password', 'Verify through a trusted channel', 'Forward it to everyone'], answer: 2, explanation: 'Independent verification breaks the attacker’s control of the original conversation.' } },
  { id: 'devices', title: 'Device & Account Security', category: 'Everyday defense', icon: '💻', description: 'Harden the devices and accounts that hold your most important information.', lessons: [
    { id: 'updates', title: 'Updates close doors', minutes: 4, body: 'Operating-system, browser and app updates often include fixes for known vulnerabilities. Delaying updates leaves a known opening exposed.', tip: 'Enable automatic updates and restart when prompted.' },
    { id: 'backups', title: 'Backups and recovery', minutes: 6, body: 'A tested backup helps you recover from device loss, ransomware or accidental deletion. Keep at least one backup separate from the device.', tip: 'Practice restoring a small file so your backup is more than a promise.' },
    { id: 'wifi', title: 'Safer networks', minutes: 5, body: 'Use WPA2/WPA3 at home, change default router credentials and avoid sensitive actions on unknown public Wi-Fi.', tip: 'Use mobile data or a trusted hotspot for high-risk account changes.' },
  ], quiz: { question: 'Why are software updates important?', options: ['They make passwords visible', 'They often fix known security vulnerabilities', 'They remove all privacy risks', 'They replace backups'], answer: 1, explanation: 'Updates frequently patch vulnerabilities that attackers already know how to exploit.' } },
  { id: 'privacy', title: 'Safe Browsing & Online Privacy', category: 'Digital habits', icon: '🌐', description: 'Make informed choices about browsers, permissions, tracking and public Wi-Fi.', lessons: [
    { id: 'https', title: 'What HTTPS does—and does not do', minutes: 5, body: 'HTTPS encrypts traffic between your browser and a site, but it does not make a malicious site trustworthy or protect a compromised account.', tip: 'Check the domain name, not only the lock icon.' },
    { id: 'permissions', title: 'Review permissions', minutes: 4, body: 'Apps and sites should not automatically get access to your camera, microphone, location or contacts.', tip: 'Review permissions regularly and remove access an app no longer needs.' },
    { id: 'tracking', title: 'Cookies and tracking', minutes: 6, body: 'Cookies and other identifiers can support sessions, personalization and tracking. Privacy controls reduce unnecessary collection.', tip: 'Use browser privacy controls and clear data on shared devices.' },
  ], quiz: { question: 'What does HTTPS primarily protect?', options: ['The site’s honesty', 'The confidentiality of traffic in transit', 'Your account after a breach', 'All tracking'], answer: 1, explanation: 'HTTPS encrypts the connection, but it does not guarantee the site itself is safe.' } },
  { id: 'data-management', title: 'Data Management Basics', category: 'Responsible handling', icon: '🗂️', description: 'Classify, retain, share and delete information with less risk.', lessons: [
    { id: 'classify', title: 'Classify information', minutes: 5, body: 'Classify data by sensitivity and impact. Public, internal, confidential and highly sensitive information need different controls.', tip: 'When unsure, handle information as sensitive until its owner clarifies.' },
    { id: 'retention', title: 'Retention and secure deletion', minutes: 6, body: 'Keeping data forever increases exposure. Define a purpose, retention period and secure deletion method.', tip: 'Schedule a monthly cleanup for downloads, shared links and old exports.' },
    { id: 'sharing', title: 'Safer file sharing', minutes: 5, body: 'Use least privilege, expiry dates and named recipients. Avoid public links for confidential files.', tip: 'Check who can view, edit or download before sending a link.' },
  ], quiz: { question: 'Which file-sharing choice follows least privilege?', options: ['A public edit link', 'A named recipient with view-only access', 'An unprotected attachment', 'Posting it publicly'], answer: 1, explanation: 'Named, view-only access gives the recipient only the access they need.' } },
];

const checklistGroups = [
  { title: 'Account safety', icon: <ShieldCheck size={18} />, items: ['Use unique passwords', 'Use a password manager', 'Enable MFA on important accounts', 'Secure your recovery email', 'Store recovery codes safely'] },
  { title: 'Device safety', icon: <Target size={18} />, items: ['Enable automatic updates', 'Use a device lock', 'Enable encryption', 'Keep a separate backup', 'Review installed apps'] },
  { title: 'Privacy habits', icon: <ClipboardCheck size={18} />, items: ['Review social profile visibility', 'Audit app permissions', 'Limit location sharing', 'Remove unnecessary public details', 'Delete unused accounts'] },
];

function readProgress(): Record<string, boolean> { try { return JSON.parse(localStorage.getItem('guardpass-progress') || '{}'); } catch { return {}; } }
function writeProgress(progress: Record<string, boolean>) { localStorage.setItem('guardpass-progress', JSON.stringify(progress)); }

function LearningHub({ progress, setProgress }: { progress: Record<string, boolean>; setProgress: React.Dispatch<React.SetStateAction<Record<string, boolean>>> }) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const completedLessons = Object.values(progress).filter(Boolean).length;
  const markComplete = (lesson: Lesson) => { const next = { ...progress, [lesson.id]: true }; setProgress(next); writeProgress(next); };
  return <main><div className="hero learningHero"><div className="eyebrow"><BookOpen size={16} /> SECURITY LEARNING PLATFORM</div><h1>Build safer digital habits, one lesson at a time.</h1><p>Short, practical lessons about passwords, privacy, phishing and responsible data management.</p><div className="learningSummary"><strong>{completedLessons} / {courses.reduce((sum, course) => sum + course.lessons.length, 0)} lessons complete</strong><div className="bar"><i style={{ width: `${completedLessons / 18 * 100}%` }} /></div><span>Free to explore • Educational and defensive use only</span></div></div>{selectedCourse ? <section className="panel courseDetail"><button className="textButton" onClick={() => { setSelectedCourse(null); setSelectedLesson(null); setQuizAnswer(null); }}>← All courses</button><div className="courseHeading"><span className="courseIcon">{selectedCourse.icon}</span><div><span className="eyebrow">{selectedCourse.category}</span><h2>{selectedCourse.title}</h2><p>{selectedCourse.description}</p></div></div><div className="lessonList">{selectedCourse.lessons.map((lesson, index) => <button className={`lessonItem ${progress[lesson.id] ? 'complete' : ''} ${selectedLesson?.id === lesson.id ? 'selected' : ''}`} onClick={() => setSelectedLesson(lesson)} key={lesson.id}><span className="lessonNumber">{progress[lesson.id] ? <Check size={16} /> : index + 1}</span><span><b>{lesson.title}</b><small>{lesson.minutes} min read</small></span><ExternalLink size={16} /></button>)}</div>{selectedLesson && <article className="lessonContent"><div className="eyebrow">LESSON {selectedCourse.lessons.findIndex((lesson) => lesson.id === selectedLesson.id) + 1}</div><h3>{selectedLesson.title}</h3><p>{selectedLesson.body}</p><div className="tipBox"><Lightbulb size={18} /><span><b>Practical tip</b>{selectedLesson.tip}</span></div><button className="primary" onClick={() => markComplete(selectedLesson)}>{progress[selectedLesson.id] ? <><Check size={17} /> Completed</> : <>Mark lesson complete <Check size={17} /></>}</button></article>}<div className="quizCard"><div className="sectionTitle"><Award size={18} /> Quick knowledge check</div><h3>{selectedCourse.quiz.question}</h3><div className="quizOptions">{selectedCourse.quiz.options.map((option, index) => <button className={quizAnswer === index ? (index === selectedCourse.quiz.answer ? 'correct' : 'incorrect') : ''} onClick={() => setQuizAnswer(index)} key={option}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>{quizAnswer !== null && <p className={quizAnswer === selectedCourse.quiz.answer ? 'quizFeedback good' : 'quizFeedback bad'}>{quizAnswer === selectedCourse.quiz.answer ? 'Correct! ' : 'Not quite. '}{selectedCourse.quiz.explanation}</p>}</div></section> : <div className="courseGrid">{courses.map((course) => { const done = course.lessons.filter((lesson) => progress[lesson.id]).length; return <button className="courseCard panel" onClick={() => setSelectedCourse(course)} key={course.id}><span className="courseIcon">{course.icon}</span><span className="courseCategory">{course.category}</span><h2>{course.title}</h2><p>{course.description}</p><div className="courseMeta"><span>{done}/{course.lessons.length} lessons</span><span>{course.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)} min</span></div><div className="miniBar"><i style={{ width: `${done / course.lessons.length * 100}%` }} /></div><span className="courseLink">Start learning <ExternalLink size={15} /></span></button>})}</div>}</main>;
}

function Dashboard({ progress, onLearn, onSecurity }: { progress: Record<string, boolean>; onLearn: () => void; onSecurity: () => void }) {
  const total = courses.reduce((sum, course) => sum + course.lessons.length, 0), completed = Object.values(progress).filter(Boolean).length, completedCourses = courses.filter((course) => course.lessons.every((lesson) => progress[lesson.id])).length;
  return <main><div className="hero"><div className="eyebrow"><LayoutDashboard size={16} /> YOUR SECURITY DASHBOARD</div><h1>Keep your security knowledge moving forward.</h1><p>Your progress stays in this browser in demo mode. Connect Supabase later to sync it across devices.</p></div><div className="dashboardStats"><section className="panel statCard"><span className="statIcon"><Target size={20} /></span><b>{Math.round(completed / total * 100)}%</b><span>Learning progress</span></section><section className="panel statCard"><span className="statIcon"><BookOpen size={20} /></span><b>{completed}</b><span>Lessons completed</span></section><section className="panel statCard"><span className="statIcon"><Award size={20} /></span><b>{completedCourses}</b><span>Courses completed</span></section></div><div className="dashboardGrid"><section className="panel"><div className="sectionTitle"><Lightbulb size={18} /> Recommended next step</div><h2>{completed ? 'Keep your momentum going' : 'Start with Password Security'}</h2><p>{completed ? 'Choose a short lesson below to strengthen another part of your digital life.' : 'Learn why unique passwords and MFA matter before revisiting your analyzer score.'}</p><button className="primary" onClick={onLearn}>Explore lessons <BookOpen size={17} /></button></section><section className="panel"><div className="sectionTitle"><ClipboardCheck size={18} /> Security Center</div><h2>Turn knowledge into habits</h2><p>Use practical checklists for accounts, devices and privacy. Nothing here is a guarantee—just a helpful starting point.</p><button className="secondary" onClick={onSecurity}>Open checklists <ShieldCheck size={17} /></button></section></div><section className="panel"><div className="sectionTitle"><Award size={18} /> Your milestones</div><div className="milestones"><div className={completed >= 1 ? 'milestone earned' : 'milestone'}><span>🌱</span><b>First lesson</b><small>Complete one lesson</small></div><div className={completed >= 3 ? 'milestone earned' : 'milestone'}><span>🧭</span><b>Security explorer</b><small>Complete three lessons</small></div><div className={completedCourses >= 1 ? 'milestone earned' : 'milestone'}><span>🏆</span><b>Course finisher</b><small>Complete a course</small></div></div></section></main>;
}

function SecurityCenter() {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('guardpass-checklist') || '{}'); } catch { return {}; } });
  const [message, setMessage] = useState('');
  const toggle = (item: string) => { const next = { ...checks, [item]: !checks[item] }; setChecks(next); localStorage.setItem('guardpass-checklist', JSON.stringify(next)); };
  const phishingSignals = message ? ['urgent', 'verify', 'payment', 'password', 'click', 'invoice', 'gift'].filter((word) => message.toLowerCase().includes(word)) : [];
  const completed = Object.values(checks).filter(Boolean).length;
  return <main><div className="hero"><div className="eyebrow"><ShieldCheck size={16} /> SECURITY CENTER</div><h1>Practical checks for a safer digital life.</h1><p>Use these checklists as a starting point. Security is a process, not a score or a guarantee.</p><div className="learningSummary"><strong>{completed} checklist items complete</strong><div className="bar"><i style={{ width: `${completed / 15 * 100}%` }} /></div><span>Saved locally in this browser</span></div></div><div className="checklistGrid">{checklistGroups.map((group) => <section className="panel checklistCard" key={group.title}><div className="sectionTitle">{group.icon} {group.title}</div>{group.items.map((item) => <label className="checkItem" key={item}><input type="checkbox" checked={Boolean(checks[item])} onChange={() => toggle(item)} /><span>{item}</span>{checks[item] && <CheckCircle2 size={16} />}</label>)}</section>)}</div><section className="panel phishingTool"><div className="sectionTitle"><AlertTriangle size={18} /> Local phishing message check</div><p className="subtle">Paste a suspicious message to inspect common warning signs. The text is analyzed locally and is never saved or sent.</p><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Paste message text here…" rows={5} />{message && <div className={`toolResult ${phishingSignals.length >= 2 ? 'warning' : 'good'}`}><b>{phishingSignals.length >= 2 ? 'Pause and verify this message' : 'No obvious keyword signals found'}</b><span>{phishingSignals.length ? `Signals detected: ${phishingSignals.join(', ')}. Check the sender and destination independently.` : 'Keyword checks are limited; inspect the sender, link and request context too.'}</span></div>}</section></main>;
}

type DemoUser = { email: string; firstLogin: string; lastLogin: string; logins: number };
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'admin123@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
function readDemoUsers(): DemoUser[] { try { return JSON.parse(localStorage.getItem('guardpass-users') || '[]'); } catch { return []; } }
function AccountPanel({ onAdmin }: { onAdmin: () => void }) {
  const [email, setEmail] = useState('');
  const [sessionEmail, setSessionEmail] = useState(() => localStorage.getItem('guardpass-session') || '');
  const [status, setStatus] = useState('');
  const login = () => {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setStatus('Enter a valid email address.'); return; }
    const now = new Date().toISOString(); const users = readDemoUsers(); const current = users.find((user) => user.email === normalized);
    const nextUsers = current ? users.map((user) => user.email === normalized ? { ...user, lastLogin: now, logins: user.logins + 1 } : user) : [...users, { email: normalized, firstLogin: now, lastLogin: now, logins: 1 }];
    localStorage.setItem('guardpass-users', JSON.stringify(nextUsers)); localStorage.setItem('guardpass-login-events', JSON.stringify([{ email: normalized, at: now, success: true }, ...JSON.parse(localStorage.getItem('guardpass-login-events') || '[]')].slice(0, 100))); localStorage.setItem('guardpass-session', normalized); setSessionEmail(normalized); setStatus('Signed in for this local preview.');
  };
  return <main><div className="hero"><div className="eyebrow"><UserRound size={16} /> ACCOUNT & SYNC</div><h1>Your learning data, under your control.</h1><p>Use passwordless email login in this preview. Production account security is handled by Supabase Auth; GuardPass never stores your account password or analyzed passwords.</p></div><section className="panel accountPanel"><div className="sectionTitle"><LogIn size={18} /> Email login</div>{sessionEmail ? <div className="signedIn"><CheckCircle2 size={19} /><span>Signed in as <b>{sessionEmail}</b><small>Learning progress and checklist state are currently local demo data.</small></span><button className="secondary" onClick={() => { localStorage.removeItem('guardpass-session'); setSessionEmail(''); setStatus('Signed out.'); }}>Sign out</button></div> : <><label htmlFor="login-email">Email address</label><div className="emailLogin"><input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /><button className="primary" onClick={login}><LogIn size={16} /> Send sign-in link</button></div><p className="subtle">Demo mode signs in locally. No password is requested or saved.</p></>}{status && <div className="toolResult good">{status}</div>}<div className="accountFeatures"><span><ShieldCheck size={16} /> Supabase Auth for production sign-in and password reset</span><span><ClipboardCheck size={16} /> Row-level security for user progress and quiz attempts</span><span><BookOpen size={16} /> Courses remain readable without storing analyzed passwords</span></div><div className="privacy"><ShieldCheck size={18} /><span><b>Privacy promise.</b> GuardPass never stores or transmits passwords entered into the analyzer.</span></div></section><section className="panel adminEntry"><div className="sectionTitle"><LockKeyhole size={18} /> Administrator access</div><p>Administrators can review user emails and login events in a protected console. The local preview uses a clearly labeled demo gate; production access must use Supabase roles and RLS.</p><button className="secondary" onClick={onAdmin}>Open admin login <ExternalLink size={16} /></button></section></main>;
}

function AdminPanel() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [showPassword, setShowPassword] = useState(false); const [access, setAccess] = useState(false); const [error, setError] = useState('');
  const users = readDemoUsers(); let events: { email: string; at: string; success: boolean }[] = []; try { events = JSON.parse(localStorage.getItem('guardpass-login-events') || '[]'); } catch { events = []; }
  const login = () => { if (!ADMIN_PASSWORD) { setError('Admin access is not configured. Set VITE_ADMIN_PASSWORD in your local environment.'); return; } if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) { setError('The admin email or password is incorrect.'); return; } setError(''); setAccess(true); };
  if (!access) return <main><div className="hero"><div className="eyebrow"><LockKeyhole size={16} /> ADMIN CONSOLE</div><h1>Manage learning insights responsibly.</h1><p>This protected preview requires the authorized admin email and password before showing user email records.</p></div><section className="panel adminLogin"><div className="sectionTitle"><LogIn size={18} /> Admin login</div><label htmlFor="admin-email">Admin email</label><input id="admin-email" className="standaloneInput" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={ADMIN_EMAIL} autoComplete="username" /><label htmlFor="admin-password">Admin password</label><div className="inputWrap adminPasswordField"><input id="admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter admin password" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide admin password' : 'Show admin password'}>{showPassword ? <EyeOff /> : <Eye />}</button></div><p className="subtle">Authorized email: <b>{ADMIN_EMAIL}</b>. The password is read from <code>VITE_ADMIN_PASSWORD</code> and is never displayed or stored.</p><button className="primary" onClick={login}>Open admin records <LayoutDashboard size={16} /></button>{error && <div className="toolResult warning">{error}</div>}</section></main>;
  return <main><div className="hero"><div className="eyebrow"><LayoutDashboard size={16} /> ADMIN CONSOLE</div><h1>Users and login activity</h1><p>These records are local demo data. Supabase should enforce administrator access and audit storage in production.</p></div><div className="dashboardStats"><section className="panel statCard"><span className="statIcon"><UserRound size={20} /></span><b>{users.length}</b><span>Known users</span></section><section className="panel statCard"><span className="statIcon"><LogIn size={20} /></span><b>{events.length}</b><span>Login events</span></section><section className="panel statCard"><span className="statIcon"><ShieldCheck size={20} /></span><b>RLS</b><span>Production access model</span></section></div><section className="panel adminTable"><div className="sectionTitle"><UserRound size={18} /> Registered emails</div>{users.length ? <div className="tableWrap"><table><thead><tr><th>Email</th><th>First login</th><th>Last login</th><th>Logins</th></tr></thead><tbody>{users.map((user) => <tr key={user.email}><td>{user.email}</td><td>{new Date(user.firstLogin).toLocaleString()}</td><td>{new Date(user.lastLogin).toLocaleString()}</td><td>{user.logins}</td></tr>)}</tbody></table></div> : <div className="emptyState">No local users have signed in yet.</div>}</section><section className="panel adminTable"><div className="sectionTitle"><ClipboardCheck size={18} /> Recent login events</div>{events.length ? <div className="tableWrap"><table><thead><tr><th>Email</th><th>Time</th><th>Status</th></tr></thead><tbody>{events.slice(0, 20).map((event, index) => <tr key={`${event.email}-${event.at}-${index}`}><td>{event.email}</td><td>{new Date(event.at).toLocaleString()}</td><td><span className="statusPill">{event.success ? 'Successful' : 'Failed'}</span></td></tr>)}</tbody></table></div> : <div className="emptyState">No login events have been recorded yet.</div>}</section></main>;
}


function App() {
  const [password, setPassword] = useState(''), [show, setShow] = useState(false), [tab, setTab] = useState('analyzer'), [length, setLength] = useState(20), [generated, setGenerated] = useState(''), [toast, setToast] = useState(''), [policy, setPolicy] = useState<Policy>(defaultPolicy), [progress, setProgress] = useState<Record<string, boolean>>(() => readProgress()), [mobileNav, setMobileNav] = useState(false);
  const analysis = useMemo(() => analyze(password), [password]);
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); setToast('Copied'); window.setTimeout(() => setToast(''), 1200); };
  const navigate = (next: string) => { setTab(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const navItems = [['analyzer', 'Analyzer', <LockKeyhole size={15} />], ['learn', 'Learn', <BookOpen size={15} />], ['dashboard', 'Dashboard', <LayoutDashboard size={15} />], ['security', 'Security Center', <ShieldCheck size={15} />], ['generator', 'Generator', <RefreshCw size={15} />], ['about', 'About', <Info size={15} />]] as const;
  return <div className="app"><ParticleField /><header><div className="brand"><span className="logo"><ShieldCheck /></span><span>GUARDPASS</span></div><button className="mobileMenu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></button><nav className={mobileNav ? 'open' : ''}>{navItems.map(([id, label, icon]) => <button className={tab === id ? 'active' : ''} onClick={() => navigate(id)} key={id}>{icon}{label}</button>)}<button className={`accountButton ${tab === 'account' ? 'active' : ''}`} onClick={() => navigate('account')}><UserRound size={15} /> Account</button></nav></header>
    {tab === 'analyzer' && <main><div className="hero"><div className="eyebrow"><LockKeyhole size={16} /> LOCAL-FIRST SECURITY ANALYSIS</div><h1>Understand your password's resistance to guessing.</h1><p>Analyze length, diversity, common-password patterns, sequences, repetition and more — entirely in your browser.</p></div><section className="panel"><label>Password to analyze</label><div className="inputWrap"><input type={show ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Type a password…" autoComplete="off" /><button onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff /> : <Eye />}</button></div><div className="privacy"><ShieldCheck size={18} /><span><b>Privacy first.</b> Your password stays in this browser and is not stored or sent to a server.</span></div></section>{password && <><div className="grid"><section className="panel"><div className="score"><div className="circle">{analysis.score}<small>/100</small></div><div><span>Security score</span><h2>{analysis.label}</h2><div className="bar"><i style={{ width: `${analysis.score}%` }} /></div></div></div><div className="stats"><div><span>Guessing resistance</span><b>{analysis.resistance}</b></div><div><span>Practical estimate</span><b>{analysis.entropy} bits</b></div><div><span>Theoretical entropy</span><b>{analysis.theoretical} bits</b></div></div></section><section className="panel"><div className="sectionTitle"><AlertTriangle size={18} /> Security findings</div>{analysis.findings.map((finding, index) => <div className="finding" key={`${finding}-${index}`}><AlertTriangle size={16} /><span>{finding}</span></div>)}</section></div><div className="featureGrid"><AttackPatternVisualization analysis={analysis} /><PasswordPolicyTester password={password} analysis={analysis} policy={policy} setPolicy={setPolicy} /></div><ScoreExplanation analysis={analysis} /><ImprovementSuggestions analysis={analysis} /></>}</main>}
    {tab === 'generator' && <main><div className="hero"><div className="eyebrow"><Shield size={16} /> SECURE GENERATOR</div><h1>Create a stronger, unique password.</h1><p>Passwords are generated locally with the browser's cryptographically secure random number generator.</p></div><section className="panel generator"><label>Length: <b>{length}</b></label><input type="range" min="12" max="64" value={length} onChange={(event) => setLength(+event.target.value)} /><div className="generated">{generated || 'Click generate to create a password'}{generated && <button onClick={() => copy(generated)} aria-label="Copy generated password"><Copy /></button>}</div><button className="primary" onClick={() => setGenerated(generate(length))}><RefreshCw size={17} /> Generate password</button></section></main>}
    {tab === 'learn' && <LearningHub progress={progress} setProgress={setProgress} />}
    {tab === 'dashboard' && <Dashboard progress={progress} onLearn={() => navigate('learn')} onSecurity={() => navigate('security')} />}
    {tab === 'security' && <SecurityCenter />}
    {tab === 'account' && <AccountPanel onAdmin={() => navigate('admin')} />}
    {tab === 'admin' && <AdminPanel />}
    {tab === 'about' && <main><div className="hero"><div className="eyebrow"><ShieldCheck size={16} /> ABOUT GUARDPASS</div><h1>Privacy-first cybersecurity education.</h1><p>GuardPass combines local password analysis with practical lessons that help people protect accounts, devices and personal data.</p></div><section className="panel aboutPanel"><div className="sectionTitle"><LogIn size={18} /> Account sync is optional</div><h2>Start locally, connect securely later</h2><p>The learning demo saves progress and checklists in this browser. The included Supabase migration adds authenticated profiles, courses, lessons, quizzes and row-level security when you are ready to configure a backend.</p><div className="aboutPills"><span><ShieldCheck size={15} /> No analyzed passwords stored</span><span><BookOpen size={15} /> 6 learning paths</span><span><Target size={15} /> Practical checklists</span></div></section></main>}
    <footer>GuardPass performs analysis locally in your browser. Defensive and educational use only. <span>Learning progress is local demo data until Supabase is configured.</span></footer>{toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}</div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
