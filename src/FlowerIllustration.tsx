import type { FlowerId } from './data'

// Small original botanical vector marks for navigation; the main flowers are 3D meshes.
export default function FlowerIllustration({ id, className = '' }: { id: FlowerId; className?: string }) {
  return <svg className={className} viewBox="0 0 80 100" fill="none" aria-hidden="true">
    <path d="M41 89C40 73 39 58 40 36" stroke="#82906A" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M40 76C25 76 18 59 20 50C34 56 39 65 40 76Z" fill="#97A17B" />
    <path d="M40 68C54 66 62 51 60 44C47 50 42 58 40 68Z" fill="#B3BB91" />
    {id === 'tulip' && <>
      <path d="M21 21C22 10 28 9 35 20L40 10L48 21C58 9 62 17 60 28C60 45 48 51 40 51C28 51 19 41 21 21Z" fill="#E5A087" />
      <path d="M21 21C36 22 43 33 40 51C29 49 21 42 21 21Z" fill="#D58872" />
      <path d="M60 21C49 23 41 36 40 51C52 50 62 42 60 21Z" fill="#EDB29A" />
    </>}
    {id === 'rose' && <>
      <path d="M40 10C50 8 53 16 59 19C69 25 66 39 58 43C54 54 34 55 27 48C15 46 14 29 22 24C24 13 33 11 40 10Z" fill="#D28A89" />
      <path d="M25 26C41 20 47 29 49 42C38 49 26 42 25 26Z" fill="#C37577" />
      <path d="M37 17C54 15 60 25 54 34C46 20 36 33 34 38C27 29 31 21 37 17Z" fill="#E7AAA0" />
      <path d="M40 25C47 22 50 29 44 35C37 37 33 31 40 25Z" fill="#B9656A" />
    </>}
    {(id === 'cosmos' || id === 'daisy') && <>
      {Array.from({ length: id === 'daisy' ? 12 : 8 }, (_, i) => <ellipse key={i}
        cx="40" cy="20" rx={id === 'daisy' ? 5 : 8} ry="14"
        fill={id === 'daisy' ? (i % 2 ? '#EEE4C9' : '#FFFAE9') : (i % 2 ? '#E0A974' : '#EFC497')}
        transform={`rotate(${i * (id === 'daisy' ? 30 : 45)} 40 33)`} />)}
      <circle cx="40" cy="33" r="8" fill="#BD914C" /><circle cx="38" cy="31" r="5" fill="#DBB562" />
    </>}
  </svg>
}
