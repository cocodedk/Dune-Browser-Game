class Spector {
  constructor() {
    this.onCapture = {
      add() {},
    }
  }

  captureCanvas() {}

  captureNextFrame() {}

  getFps() {
    return 0
  }

  log() {}

  startCapture() {}

  stopCapture() {}

  getResultUI() {
    return {
      display() {},
    }
  }
}

module.exports = { Spector }
