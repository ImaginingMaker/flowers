export const flowers = [
  {
    id: 'tulip', name: '郁金香', en: 'Tulip', latin: 'Tulipa gesneriana',
    meaning: '温柔而坚定的爱', note: '每一次遇见，都是春天。',
    poem: '把未说出口的喜欢，\n藏进一朵温柔的春天。',
    color: '#d88b73', pale: '#f3e4d8', season: '春日', tag: '爱的告白',
  },
  {
    id: 'rose', name: '玫瑰', en: 'Rose', latin: 'Rosa × hybrida',
    meaning: '浪漫与热烈的爱', note: '你是我日复一日的心动。',
    poem: '世间有万千种浪漫，\n而我偏爱有你的那一种。',
    color: '#c87576', pale: '#f2dfe0', season: '初夏', tag: '心动如初',
  },
  {
    id: 'cosmos', name: '波斯菊', en: 'Cosmos', latin: 'Cosmos bipinnatus',
    meaning: '自由与美好的相遇', note: '风经过时，也带来了你。',
    poem: '愿你自由，愿你明亮，\n愿每一阵风都温柔地爱你。',
    color: '#d19a64', pale: '#f3e6cf', season: '夏秋', tag: '自由生长',
  },
  {
    id: 'daisy', name: '雏菊', en: 'Daisy', latin: 'Bellis perennis',
    meaning: '纯真与藏在心底的爱', note: '小小的喜欢，也会开出花。',
    poem: '幸福不必声势浩大，\n与你一起的日常，就很好。',
    color: '#b49d60', pale: '#eee9d7', season: '春日', tag: '日常的幸福',
  },
] as const

export type FlowerId = typeof flowers[number]['id']
export type Flower = typeof flowers[number]
