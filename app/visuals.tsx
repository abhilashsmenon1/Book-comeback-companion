import type { Book } from "../lib/books";

const paths = {
  book: "M12 6c-3.6-2.8-7.2-2.2-9-1v13c2-1.2 5.4-1.7 9 1 3.6-2.7 7-2.2 9-1V5c-1.8-1.2-5.4-1.8-9 1Zm0 0v13",
  grid: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6 6-6-6 6-6",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  pencil: "m14 5 5 5M4 20l1-5L16 4a2 2 0 0 1 3 0l1 1a2 2 0 0 1 0 3L9 19l-5 1Z",
  bookmark: "M6 4h12v17l-6-4-6 4z",
  play: "m8 5 12 7-12 7Z",
  leaf: "M5 19c3-7 8-10 14-14M7 15c-5-7 1-10 12-10 0 9-5 13-12 10Z",
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function BookCover({ book }: { book: Book }) {
  const palette = (book.example ? ["sample-tide", "sample-garden", "sample-orchard", "sample-rain"].indexOf(book.id)
    : [...book.id].reduce((sum, character) => sum + character.charCodeAt(0), 0)) % 4;
  return (
    <div className={`cover cover-${palette}`} aria-hidden="true">
      <svg viewBox="0 0 60 82" fill="none" className="cover-art" aria-hidden="true">
        <path d="M10 13H51V70H10z" stroke="currentColor" opacity=".5" />
        {palette === 0 && <path d="M28 58l2-22h6l2 22M28 36h10m-8 0v-6h6v6m-8-6 5-5 5 5M17 57c5-4 9-4 14 0s9 4 15 0m-27 5c5-3 8-3 13 0s9 3 13 0M20 30l6 2m14 0 6-2" stroke="currentColor" strokeLinecap="round" />}
        {palette === 1 && <path d="M23 57V39a8 8 0 0 1 16 0v18M19 57h24m-14-21v21m4-22v22m-8-12h12M15 51c7-7 4-12 1-14m29 15c-7-8-2-12 1-15m-29 7c-4-1-5-5-3-8m29 7c4-1 6-4 5-7" stroke="currentColor" strokeLinecap="round" />}
        {palette === 2 && <path d="M31 60V27m0 28L20 43m11 8 11-14m-11 7-8-12m8 7 7-10m-12 21-8-1m21-7 7-2m-23 1-4-2" stroke="currentColor" strokeLinecap="round" />}
        {palette === 3 && <path d="M19 35h25v18H19zM19 35l12 10 13-10M20 52l8-9m15 9-8-9m-12-14 2-3m8 3 2-3m7 3 2-3m-22 34 2-3m9 3 2-3m8 3 2-3" stroke="currentColor" strokeLinecap="round" />}
      </svg>
    </div>
  );
}

export function HeroArt() {
  return <svg className="hero-art" viewBox="0 0 350 200" fill="none" aria-hidden="true">
    <defs>
      <pattern id="grain" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".45" fill="#4d624d" opacity=".26" /></pattern>
    </defs>
    <path d="M83 149c-9-38 24-91 71-111 51-21 111-8 138 25s31 81-9 102c-47 25-187 29-200-16Z" fill="var(--art-field)" />
    <path d="M83 149c-9-38 24-91 71-111 51-21 111-8 138 25s31 81-9 102c-47 25-187 29-200-16Z" fill="url(#grain)" />
    <path d="m251 145 52-8m-50 15 61-8M60 140l49 8m-59 0 60 8" stroke="#718469" opacity=".6" strokeLinecap="round" />
    <path d="M252 139c8-27 17-52 40-75m-26 42c-6-18-2-27 5-32 4 13 2 23-5 32Zm5-9c11-15 19-17 30-17-6 10-15 16-30 17Zm10-16c-2-13 2-24 9-30 2 13-1 21-9 30Zm7-12c5-13 14-18 23-20-5 10-11 17-23 20Z" fill="#a6b394" stroke="#657f61" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M108 145c-11-16-24-30-44-39m27 19c-10-13-9-22-6-27 7 7 9 17 6 27Zm-8-6c-12-6-20-5-27-1 9 6 17 7 27 1Zm-10-8c-4-9-9-13-18-14 3 7 8 12 18 14Z" fill="#a6b394" stroke="#657f61" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="m91 133 11-57 86 13 75-16 12 58-79 32z" fill="#6d8568" stroke="#415842" strokeWidth="2" strokeLinejoin="round" />
    <path d="M99 126 112 70c30-5 52 1 73 18 21-19 44-26 70-22l11 59c-29 3-52 13-71 29-32-14-61-22-96-28Z" fill="#e9dbb8" stroke="#415842" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M106 119l14-58c26-4 48 4 65 24 20-20 40-29 63-25l12 59c-24 1-46 9-66 29-27-15-55-25-88-29Z" fill="#fcf0ce" stroke="#415842" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="m185 85 9 63m-67-70c17-1 32 4 46 15m-49-5c18-1 33 6 50 16m-53-6c20 0 37 7 54 17m-57-7c15 0 28 5 40 10m40-26c13-11 27-17 43-17m-41 27c13-10 27-16 43-17m-41 28c13-11 27-17 43-18m-41 28c10-9 19-13 30-16" stroke="#9c9476" strokeWidth="1.25" strokeLinecap="round" />
    <path d="M211 70c4-3 8-5 13-6l9 42-8-3-5 7z" fill="#ac624e" stroke="#834c3b" strokeWidth="1.1" strokeLinejoin="round" />
    <path d="M88 60v18m-9-9h18m206 36v12m-6-6h12M223 34v12m-6-6h12" stroke="#8b7452" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="112" cy="41" r="2" fill="#927951" /><circle cx="320" cy="94" r="2" fill="#927951" />
  </svg>;
}
