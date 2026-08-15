export class TexRenderQueue {
  private busy = false
  private pending: string | null = null

  constructor(private readonly send: (tex: string) => void) {}

  request(tex: string) {
    if (this.busy) {
      this.pending = tex
      return
    }
    this.busy = true
    this.send(tex)
  }

  finished() {
    this.busy = false
    const pending = this.pending
    this.pending = null
    if (pending !== null) {
      this.busy = true
      this.send(pending)
    }
  }

  failed() {
    this.busy = false
    this.pending = null
  }

  get isBusy() {
    return this.busy
  }
}
