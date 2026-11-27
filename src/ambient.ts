export function createAmbience() {
  const context = new AudioContext()
  const master = context.createGain()
  master.gain.value = .045
  master.connect(context.destination)
  const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  const breeze = context.createBufferSource()
  breeze.buffer = buffer
  breeze.loop = true
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 450
  breeze.connect(filter).connect(master)
  breeze.start()
  let step = 0
  const chime = () => {
    if (context.state !== 'running') return
    const oscillator = context.createOscillator(), envelope = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = [523.25, 659.25, 783.99, 880, 659.25, 587.33][step++ % 6]
    envelope.gain.setValueAtTime(0, context.currentTime)
    envelope.gain.linearRampToValueAtTime(.2, context.currentTime + .08)
    envelope.gain.exponentialRampToValueAtTime(.001, context.currentTime + 2.3)
    oscillator.connect(envelope).connect(master)
    oscillator.start()
    oscillator.stop(context.currentTime + 2.4)
  }
  chime()
  const interval = window.setInterval(chime, 3400)
  return {
    pause: () => context.suspend(),
    resume: () => context.resume(),
    dispose: () => { clearInterval(interval); breeze.stop(); void context.close() },
  }
}
