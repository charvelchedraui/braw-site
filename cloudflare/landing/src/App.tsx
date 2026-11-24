import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAnimationFrame, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, useVelocity } from 'motion/react';
import { STORE, reducedMotion, saveData, splitWords, startSmoothScroll, useInView, useMotionOK, useProgress } from './motion';
import type { Language, PageData, Strings } from './types';

const pathOf = (code: string) => `/${code}/`;

/** "[[text]]" in a string becomes a link to `href`; everything else stays plain text. */
function linked(text: string, href: string): ReactNode {
  return text.split(/(\[\[.+?\]\])/).map((part, i) => {
    const m = /^\[\[(.+)\]\]$/.exec(part);
    return m ? <a key={i} href={href}>{m[1]}</a> : <Fragment key={i}>{part}</Fragment>;
  });
}

/** The official store badges, unmodified and the same height: App Store always, Google Play once braws is live there. */
function Badge({ d, size = 'md' }: { d: PageData; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`stores stores-${size}`}>
      <a className={`badge badge-${size}`} href={STORE} aria-label={d.s.storeLabel}>
        <img src={d.badge.src} alt={d.s.badgeAlt} width={d.badge.w} height={d.badge.h} />
      </a>
      {d.play && (
        <a className={`badge badge-play gp-${d.play.pad[2] > 0 ? 'framed' : 'wide'} badge-${size}`} href={d.play.url} aria-label={d.s.playLabel}>
          <img src={d.play.src} alt={d.s.playAlt} width={d.play.w} height={d.play.h} />
        </a>
      )}
    </span>
  );
}

function Globe() {
  return (
    <svg className="globe-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/** A <details> menu of plain links: works without JavaScript. With it, Escape and an outside tap close it. */
function LangPicker({ lang, languages, label, where }: { lang: Language; languages: Language[]; label: string; where: 'head' | 'foot' }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const d = ref.current!;
    const out = (e: Event) => { if (d.open && !d.contains(e.target as Node)) d.open = false; };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !d.open) return;
      d.open = false;
      d.querySelector('summary')?.focus();
    };
    document.addEventListener('click', out);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', out); document.removeEventListener('keydown', esc); };
  }, []);
  return (
    <details className={`langs langs-${where}`} ref={ref}>
      <summary>
        <Globe />
        <span className="vh">{label}: </span>
        <span className="lang-name" lang={lang.hreflang}>{lang.name}</span>
      </summary>
      <ul className="langs-list" aria-label={label}>
        {languages.map((l) => (
          <li key={l.code}>
            <a href={pathOf(l.code)} hrefLang={l.hreflang} lang={l.hreflang} dir={l.dir} aria-current={l.code === lang.code ? 'page' : undefined}>{l.name}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Nav({ d }: { d: PageData }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    const el = ref.current;
    if (!el) return;
    const open = !!el.querySelector('details[open]');
    el.classList.toggle('is-hidden', !open && y > prev && y > 200);
    el.classList.toggle('is-solid', y > 40);
  });
  return (
    <header className={d.play ? 'nav has-play' : 'nav'} ref={ref}>
      <a className="brand" href={pathOf(d.lang.code)} aria-label={d.s.homeLabel}>
        <img src="/icon.png" alt="" width={36} height={36} />
        <span>braws</span>
      </a>
      <div className="nav-end">
        <LangPicker lang={d.lang} languages={d.languages} label={d.s.langLabel} where="head" />
        <span className="nav-badge"><Badge d={d} size="sm" /></span>
      </div>
    </header>
  );
}

function HeroMedia() {
  const [video, setVideo] = useState<null | { mobile: boolean }>(null);
  useEffect(() => {
    if (reducedMotion() || saveData()) return;
    setVideo({ mobile: window.matchMedia('(max-width: 767px)').matches });
  }, []);
  if (!video) {
    return (
      <picture>
        <source media="(max-width: 767px)" srcSet="/media/hero/hero-mobile-poster.webp" type="image/webp" />
        <source srcSet="/media/hero/hero-poster.webp" type="image/webp" />
        <img className="hero-media" src="/media/hero/hero-poster.jpg" alt="" width={1600} height={900} {...({ fetchpriority: 'high' } as object)} />
      </picture>
    );
  }
  const base = video.mobile ? '/media/hero/hero-mobile' : '/media/hero/hero';
  return (
    <video className="hero-media" autoPlay muted loop playsInline preload="metadata" poster={`${base}-poster.webp`} aria-hidden="true">
      <source src={`${base}.webm`} type="video/webm" />
      <source src={`${base}.mp4`} type="video/mp4" />
    </video>
  );
}

function Hero({ d }: { d: PageData }) {
  const ref = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);
  // The words drift up and the footage zooms a little as the hero scrolls away.
  useProgress(ref, (p) => {
    if (copy.current) { copy.current.style.transform = `translate3d(0, ${-p * 14}vh, 0)`; copy.current.style.opacity = String(1 - p * 1.3); }
    if (media.current) media.current.style.transform = `scale(${1 + p * 0.08})`;
  }, ['start start', 'end start']);
  return (
    <section className="hero" ref={ref} aria-labelledby="hero-title">
      <div className="hero-media-wrap" ref={media}><HeroMedia /></div>
      <div className="scrim" />
      <div className="hero-copy wrap" ref={copy}>
        <h1 id="hero-title" className="hero-word" aria-label="braws" dir="ltr">
          {Array.from('braws').map((c, i) => <span key={i} className="ch" aria-hidden="true">{c}</span>)}
        </h1>
        <p className="hero-tag">{d.s.tagline1} {d.s.tagline2}</p>
        <div className="hero-cta">
          <Badge d={d} size="lg" />
          <p className="hero-note">{d.s.note}</p>
        </div>
      </div>
    </section>
  );
}

const STRIP: { kind: 'clip' | 'app'; name: string }[] = [
  { kind: 'clip', name: 'cat' }, { kind: 'app', name: 'hoy' }, { kind: 'clip', name: 'mug' }, { kind: 'app', name: 'room' },
  { kind: 'clip', name: 'window' }, { kind: 'app', name: 'stamps' }, { kind: 'clip', name: 'phone' }, { kind: 'app', name: 'world' },
  { kind: 'clip', name: 'latte' }, { kind: 'app', name: 'gifts' }, { kind: 'clip', name: 'nap' }, { kind: 'app', name: 'care' },
];

/** Real footage and real app screens sliding by. Clips load and play only while the strip is on screen. */
function Strip({ d }: { d: PageData }) {
  const ref = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [seen, setSeen] = useState(false); // los videos se cargan una sola vez, la primera vez que la tira aparece
  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(([e]) => {
      setOn(e.isIntersecting);
      if (e.isIntersecting) setSeen(true);
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // reproducir o pausar sin recargar: recargar es lo que hacía parpadear los videos
  useEffect(() => {
    ref.current?.querySelectorAll('video').forEach((v) => {
      if (on && !reducedMotion()) v.play().catch(() => {}); else v.pause();
    });
  }, [on, seen]);
  // la tira avanza sola y también se puede arrastrar con el dedo; es infinita porque la fila está duplicada
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let held = false, resumeAt = 0, last = 0, raf = 0;
    // distancia exacta entre una copia de la fila y la siguiente (incluye el espacio entre tarjetas), para que el salto no se note
    const half = () => { const t = el.querySelectorAll<HTMLElement>('.tile'); return t.length > STRIP.length ? t[STRIP.length].offsetLeft - t[0].offsetLeft : 0; };
    const wrap = () => {
      const h = half();
      if (h <= 0) return;
      if (el.scrollLeft >= h) el.scrollLeft -= h;
      else if (el.scrollLeft <= 0) el.scrollLeft += h;
    };
    const hold = () => { held = true; };
    const release = () => { held = false; resumeAt = performance.now() + 1800; };
    const tick = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      if (on && !held && t > resumeAt && !reducedMotion()) { el.scrollLeft += dt * 0.045; wrap(); }
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener('pointerdown', hold);
    el.addEventListener('touchstart', hold, { passive: true });
    el.addEventListener('wheel', release, { passive: true });
    window.addEventListener('pointerup', release);
    el.addEventListener('touchend', release, { passive: true });
    el.addEventListener('touchcancel', release, { passive: true });
    el.addEventListener('scroll', wrap, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', hold);
      el.removeEventListener('touchstart', hold);
      el.removeEventListener('wheel', release);
      window.removeEventListener('pointerup', release);
      el.removeEventListener('touchend', release);
      el.removeEventListener('touchcancel', release);
      el.removeEventListener('scroll', wrap);
    };
  }, [on]);
  const row = (copy: number) => STRIP.map((t, i) => (
    <figure className={`tile tile-${t.kind}`} key={`${copy}-${i}`}>
      {t.kind === 'clip' ? (
        <video muted loop playsInline preload="none" disablePictureInPicture poster={`/media/clips/${t.name}.webp`}
          src={seen && !reducedMotion() ? `/media/clips/${t.name}.mp4` : undefined} />
      ) : (
        <img src={`/media/app/${d.shots}/${t.name}.webp`} alt="" width={600} height={1299} loading="lazy" draggable={false} />
      )}
    </figure>
  ));
  return (
    <section className="strip" ref={ref} aria-hidden="true">
      <div className="marquee" ref={box} dir="ltr">
        <div className="marquee-track">{row(0)}{row(1)}</div>
      </div>
    </section>
  );
}

/** heroText, its words lighting up one by one as you scroll. */
function Reveal({ d }: { d: PageData }) {
  const ref = useRef<HTMLElement>(null);
  const words = splitWords(d.s.heroText, d.lang.code);
  useProgress(ref, (p) => {
    const spans = ref.current?.querySelectorAll<HTMLSpanElement>('.w');
    if (!spans) return;
    const lit = p * (spans.length + 2);
    spans.forEach((s, i) => { s.style.opacity = String(Math.max(0.16, Math.min(1, lit - i))); });
  }, ['start 80%', 'end 45%']);
  return (
    <section className="reveal" ref={ref}>
      <div className="wrap">
        <p className="reveal-line">{words.map((w, i) => <span className="w" key={i}>{w}</span>)}</p>
      </div>
    </section>
  );
}

const MOODS = ['cansada', 'normal', 'bien', 'radiante'];

/** Pinned: scrolling walks the pet from sleepy to over the moon. Real pet art from the app's own renderer. */
function PetPin({ d }: { d: PageData }) {
  const ref = useRef<HTMLElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [i, setI] = useState(MOODS.length - 1);
  const ok = useMotionOK();
  useEffect(() => { if (ok) setI(0); }, [ok]);
  useProgress(ref, (p) => {
    setI(Math.min(MOODS.length - 1, Math.floor(p * MOODS.length * 0.999)));
    if (bar.current) bar.current.style.transform = `scaleX(${p})`;
  });
  const c = d.s.cards[0];
  return (
    <section className="pin pin-pet" ref={ref} aria-labelledby="pet-title">
      <div className="pin-stage">
        <div className="wrap pet-grid">
          <div className="pet-copy">
            <p className="kicker">{c.title}</p>
            <h2 id="pet-title" className="h2">{d.s.moodTitle}</h2>
            <p className="body">{c.text}</p>
            <ol className="mood-list">
              {d.s.moods.map((m, k) => <li key={k} className={k === i ? 'on' : ''}><span className="dot" aria-hidden="true" />{m}</li>)}
            </ol>
            <div className="bar" aria-hidden="true"><i ref={bar} /></div>
          </div>
          <div className="pet-art">
            {MOODS.map((m, k) => (
              <img key={m} className={k === i ? 'on' : ''} src={`/media/pets/pet-${m}.svg`} alt={k === MOODS.length - 1 ? d.s.petAlt : ''} width={360} height={408} />
            ))}
            <p className="pet-mood" aria-hidden="true">{d.s.moods[i]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const SCREENS = ['room', 'stamp-make', 'world', 'create', 'gifts'];

/** Pinned: the phone switches between real app screens while the list on the side follows. */
function Screens({ d }: { d: PageData }) {
  const ref = useRef<HTMLElement>(null);
  const bar = useRef<HTMLElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const cards = d.s.cards.slice(1);
  useProgress(ref, (p) => {
    setI(Math.min(cards.length - 1, Math.floor(p * cards.length * 0.999)));
    if (bar.current) bar.current.style.transform = `scaleY(${p})`;
  });
  // A small tilt that follows the mouse.
  const rx = useSpring(0, { stiffness: 180, damping: 20 });
  const ry = useSpring(0, { stiffness: 180, damping: 20 });
  useEffect(() => {
    const apply = () => { if (phone.current) phone.current.style.transform = `perspective(1100px) rotateX(${rx.get()}deg) rotateY(${ry.get()}deg)`; };
    const a = rx.on('change', apply);
    const b = ry.on('change', apply);
    return () => { a(); b(); };
  }, [rx, ry]);
  const ids = { what: 'what', ...(d.s.ids || {}) };
  return (
    <section className="pin pin-screens" id={ids.what} ref={ref} aria-labelledby="what-title">
      <div className="pin-stage">
        <div className="wrap screens-grid">
          <div className="screens-copy">
            <h2 id="what-title" className="h2">{d.s.whatTitle}</h2>
            <p className="body lead-sm">{d.s.whatLead}</p>
            <div className="screens-list">
              <div className="rail" aria-hidden="true"><i ref={bar} /></div>
              <ol>
                {cards.map((c, k) => (
                  <li key={k} className={k === i ? 'on' : ''}>
                    <span className="ico">{c.ico}</span>
                    <h3>{c.title}</h3>
                    <p>{c.text}</p>
                    <div className="shot-inline">
                      <img src={`/media/app/${d.shots}/${SCREENS[k]}.webp`} alt={`${d.s.shotAlt}: ${c.title}`} width={600} height={1299} loading="lazy" />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div
            className="phone"
            ref={phone}
            onPointerMove={(e) => {
              if (e.pointerType !== 'mouse' || reducedMotion()) return;
              const r = e.currentTarget.getBoundingClientRect();
              rx.set(((e.clientY - r.top) / r.height - 0.5) * -7);
              ry.set(((e.clientX - r.left) / r.width - 0.5) * 7);
            }}
            onPointerLeave={() => { rx.set(0); ry.set(0); }}
          >
            {SCREENS.map((n, k) => (
              <img key={n} className={k === i ? 'on' : ''} src={`/media/app/${d.shots}/${n}.webp`} alt={k === i ? `${d.s.shotAlt}: ${cards[k].title}` : ''} width={600} height={1299} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Pins on public/assets/world.webp (440 x 440): you in the middle, then your braws.
const YOU = [227, 195];
const PINS = [[115, 207], [365, 108], [230, 272], [143, 300], [245, 385]];

/** The little planet: lines from you to each friend draw themselves as you scroll, and each pin answers with a ring. */
function World({ d }: { d: PageData }) {
  const ref = useRef<HTMLElement>(null);
  useProgress(ref, (p) => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<SVGPathElement>('.link').forEach((l, k) => {
      const t = Math.max(0, Math.min(1, p * 1.6 - k * 0.14));
      l.style.strokeDashoffset = String(1 - t);
    });
    root.querySelectorAll<SVGCircleElement>('.ring').forEach((r, k) => {
      const t = Math.max(0, Math.min(1, p * 1.6 - k * 0.14 - 0.12));
      r.style.opacity = String(t);
      r.style.transform = `scale(${0.4 + t * 0.6})`;
    });
    const g = root.querySelector<HTMLElement>('.world-art');
    if (g) g.style.transform = `rotate(${(p - 0.5) * -10}deg)`;
  }, ['start 85%', 'center 45%']);
  const c = d.s.cards[3];
  return (
    <section className="world" ref={ref} aria-labelledby="world-title">
      <div className="wrap world-grid">
        <div className="world-copy">
          <p className="kicker">{c.title}</p>
          <h2 id="world-title" className="h2">{d.s.worldCaption}</h2>
          <p className="body">{c.text}</p>
        </div>
        <div className="world-art">
          <img src="/assets/world.webp" alt={d.s.worldAlt} width={440} height={440} />
          <svg viewBox="0 0 440 440" aria-hidden="true">
            {PINS.map(([x, y], k) => {
              const mx = (YOU[0] + x) / 2 + (y - YOU[1]) * 0.25;
              const my = (YOU[1] + y) / 2 - (x - YOU[0]) * 0.25;
              return <path key={k} className="link" d={`M${YOU[0]} ${YOU[1]} Q${mx} ${my} ${x} ${y}`} pathLength={1} />;
            })}
            {PINS.map(([x, y], k) => <circle key={k} className="ring" cx={x} cy={y} r="34" />)}
          </svg>
        </div>
      </div>
    </section>
  );
}

function How({ d }: { d: PageData }) {
  const ref = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  useInView(ref);
  useProgress(ref, (p) => { if (path.current) path.current.style.strokeDashoffset = String(1 - Math.min(1, p * 1.4)); }, ['start 80%', 'end 60%']);
  const ids = { how: 'how', ...(d.s.ids || {}) };
  return (
    <section className="how" id={ids.how} ref={ref} aria-labelledby="how-title">
      <div className="wrap">
        <h2 id="how-title" className="h2">{d.s.howTitle}</h2>
        <p className="body">{d.s.howLead}</p>
        <svg className="how-line" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
          <path ref={path} d="M4 40 C 180 8, 330 58, 520 30 S 860 6, 1010 34 S 1150 46, 1196 22" pathLength={1} />
        </svg>
        <ol className="steps">
          {d.s.steps.map((st, k) => (
            <li key={k} className="step">
              <span className="num" aria-hidden="true">{k + 1}</span>
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Safety({ d }: { d: PageData }) {
  const ref = useRef<HTMLElement>(null);
  useInView(ref);
  const legal = d.s.legalHash || '';
  const ids = { safety: 'safety', ...(d.s.ids || {}) };
  return (
    <section className="safety night" id={ids.safety} ref={ref} aria-labelledby="safety-title">
      <div className="wrap">
        <h2 id="safety-title" className="h2">{d.s.safetyTitle}</h2>
        <p className="body">{linked(d.s.safetyLead, `/privacy/${legal}`)}</p>
        <ul className="checks">
          {d.s.checks.map((c, k) => (
            <li key={k}>
              <svg className="tick" viewBox="0 0 32 32" aria-hidden="true"><path d="M6 17 C 9 19, 11 22, 13 25 C 17 16, 22 10, 27 6" pathLength={1} /></svg>
              <p><strong>{c.b}</strong> {c.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FaqSection({ d }: { d: PageData }) {
  const legal = d.s.legalHash || '';
  const ids = { faq: 'faq', ...(d.s.ids || {}) };
  return (
    <section className="faq" id={ids.faq} aria-labelledby="faq-title">
      <div className="wrap faq-grid">
        <h2 id="faq-title" className="h2">{d.s.faqTitle}</h2>
        <div className="faq-list">
          {d.s.faq.map((f, k) => (
            <details key={k}>
              <summary>{f.q}</summary>
              <p>{linked(f.a, `/delete/${legal}`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A row of the things inside braws that runs faster when you scroll faster. */
function Velocity({ words }: { words: string[] }) {
  const row = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const v = useVelocity(scrollY);
  const speed = useSpring(useTransform(v, [-3000, 0, 3000], [-5, 1, 5], { clamp: false }), { damping: 50, stiffness: 300 });
  const x = useMotionValue(0);
  const ok = useMotionOK();
  useAnimationFrame((_, delta) => {
    if (!ok || !row.current) return;
    let next = x.get() - 0.0022 * delta * speed.get();
    if (next < -50) next += 50;
    if (next > 0) next -= 50;
    x.set(next);
    row.current.style.transform = `translate3d(${next}%, 0, 0)`;
  });
  const line = words.map((w, k) => <span key={k}>{w}<i>·</i></span>);
  return (
    <div className="velocity" aria-hidden="true" dir="ltr">
      <div className="velocity-row" ref={row}>
        <span className="half">{line}</span>
        <span className="half">{line}</span>
      </div>
    </div>
  );
}

function Final({ d }: { d: PageData }) {
  const mag = useRef<HTMLDivElement>(null);
  const mx = useSpring(0, { stiffness: 240, damping: 18 });
  const my = useSpring(0, { stiffness: 240, damping: 18 });
  useEffect(() => {
    const apply = () => { if (mag.current) mag.current.style.transform = `translate3d(${mx.get()}px, ${my.get()}px, 0)`; };
    const a = mx.on('change', apply);
    const b = my.on('change', apply);
    return () => { a(); b(); };
  }, [mx, my]);
  return (
    <section className="final night" aria-labelledby="end-title">
      <Velocity words={d.s.cards.map((c) => c.ico)} />
      <div className="wrap final-grid">
        <div>
          <h2 id="end-title" className="final-line">{d.s.endTitle}</h2>
          <div
            className="magnet"
            ref={mag}
            onPointerMove={(e) => {
              if (e.pointerType !== 'mouse' || reducedMotion()) return;
              const r = e.currentTarget.getBoundingClientRect();
              mx.set((e.clientX - r.left - r.width / 2) * 0.25);
              my.set((e.clientY - r.top - r.height / 2) * 0.25);
            }}
            onPointerLeave={() => { mx.set(0); my.set(0); }}
          >
            <Badge d={d} size="lg" />
          </div>
          <p className="final-note">{d.s.note}</p>
        </div>
        <img className="final-room" src="/assets/room.webp" alt={d.s.roomAlt} width={600} height={560} loading="lazy" />
      </div>
    </section>
  );
}

function Footer({ d }: { d: PageData }) {
  const legal = d.s.legalHash || '';
  // en pantallas táctiles no hay hover: la palabra se pinta sola al llegar al final
  const mark = useRef<HTMLAnchorElement>(null);
  useInView(mark, '0px 0px -25% 0px');
  return (
    <footer className="footer">
      <div className="wrap">
        <a className="wordmark" ref={mark} href={pathOf(d.lang.code)} aria-label={d.s.homeLabel}>
          <svg viewBox="0 0 1000 300" aria-hidden="true" focusable="false">
            <text x="500" y="240" textAnchor="middle" textLength="960" lengthAdjust="spacingAndGlyphs">braws</text>
          </svg>
        </a>
        <div className="foot-row">
          <nav aria-label={d.s.footNavLabel} className="foot-links">
            <a href={`/privacy/${legal}`}>{d.s.footPrivacy}</a>
            <a href={`/terms/${legal}`}>{d.s.footTerms}</a>
            <a href={`/support/${legal}`}>{d.s.footSupport}</a>
            <a href={`/delete/${legal}`}>{d.s.footDelete}</a>
          </nav>
          <LangPicker lang={d.lang} languages={d.languages} label={d.s.langLabel} where="foot" />
        </div>
        <p className="foot-tag">{d.s.footTagline}</p>
        <p className="credits">{d.s.footCredits} <span dir="ltr">{d.credits.join(', ')}</span>.</p>
        <p className="credits" dir="ltr" lang="en">Apple and the Apple logo are trademarks of Apple Inc.{d.play && ' Google Play and the Google Play logo are trademarks of Google LLC.'}</p>
      </div>
    </footer>
  );
}

/** The phone's sticky download bar: shows once the hero badge is gone, hides again when the final badge is on screen. */
function Dock({ d }: { d: PageData }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dock = ref.current!;
    const [hero, end] = ['.hero .badge', '.final .badge'].map((q) => document.querySelector(q));
    if (!hero || !end) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = hero.getBoundingClientRect();
      const e = end.getBoundingClientRect();
      const endOnScreen = e.top < window.innerHeight && e.bottom > 0;
      dock.classList.toggle('is-on', h.bottom < 0 && !endOnScreen);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className={d.play ? 'dock has-play' : 'dock'} ref={ref}>
      <img src="/apple-touch-icon.png" alt="" width={36} height={36} />
      <span className="dock-txt"><strong>braws</strong><small>{d.s.dockText}</small></span>
      <Badge d={d} size="sm" />
    </div>
  );
}

export default function App({ d }: { d: PageData }) {
  useEffect(() => startSmoothScroll(), []);
  return (
    <>
      <a className="skip" href="#main">{d.s.skip}</a>
      <Nav d={d} />
      <main id="main">
        <Hero d={d} />
        <Strip d={d} />
        <Reveal d={d} />
        <PetPin d={d} />
        <Screens d={d} />
        <World d={d} />
        <How d={d} />
        <Safety d={d} />
        <FaqSection d={d} />
        <Final d={d} />
      </main>
      <Footer d={d} />
      <Dock d={d} />
    </>
  );
}

export type { Strings };
