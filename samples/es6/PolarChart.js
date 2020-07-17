import Chart from "./Chart.js";

export default class PolarChart extends Chart {
  constructor(opts) {
    // Call parent constructor
    super(opts);

    // Store opts
    this.margin = opts.margin || {
      left: 10,
      right: 10,
      top: 10,
      bottom: 10
    };
  }

  onDataReceived(msg) {
    // Call parent method
    super.onDataReceived(msg);
  }

  draw() {
    // Call parent method
    super.draw();

    // Calculate radius
    this.radius =
      Math.min(
        this.svg.clientWidth - this.margin.right - this.margin.left,
        this.svg.clientHeight - this.margin.top - this.margin.bottom
      ) / 2;
  }

  update() {
    // Call parent method
    super.update();
  }
}
