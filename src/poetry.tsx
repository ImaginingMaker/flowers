import type { ReactNode } from 'react'

export const openingLines: ReactNode[] = [
  <>Somewhere,<br /><em>spring never ends.</em></>,
  <>A little wild.<br /><em>A little in love.</em></>,
  <>Where the wind goes,<br /><em>we follow.</em></>,
  <>There is magic<br /><em>in the ordinary.</em></>,
]

export const poem = {
  chapter: 'THE QUIET BEGINNING',
  title: <><span className="poem-title"><em>Bloom.</em></span><span>How a <em>flower</em> grows</span><span>out of <em>pure math.</em></span></>,
  note: 'A small wonder. Unfolding, all on its own.',
  margin: <>PETAL BY PETAL.<br />A LITTLE PIECE<br />OF SPRING.</>,
} as const
