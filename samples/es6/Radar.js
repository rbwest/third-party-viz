import PolarChart from "./PolarChart.js";
import * as messagingUtil from "./messagingUtil.js";
import * as contentUtil from "./contentUtil.js";

const SAMPLE_MESSAGE = {
  version: "1",
  resultName: "dd55",
  rowCount: 18,
  availableRowCount: 18,
  data: [
    ["Hybrid", "Cylinders", 3.6666666666666665, "BEST12.2"],
    ["Hybrid", "MPG (City)", 55, "BEST12.2"],
    ["Hybrid", "MSRP", 19920, "DOLLAR12.2"],
    ["Sedan", "Cylinders", 5.580152671755725, "BEST12.2"],
    ["Sedan", "MPG (City)", 21.083969465648856, "BEST12.2"],
    ["Sedan", "MSRP", 29773.618320610687, "DOLLAR12.2"],
    ["Sports", "Cylinders", 6.340425531914893, "BEST12.2"],
    ["Sports", "MPG (City)", 18.408163265306122, "BEST12.2"],
    ["Sports", "MSRP", 53387.06122448979, "DOLLAR12.2"],
    ["SUV", "Cylinders", 6.566666666666666, "BEST12.2"],
    ["SUV", "MPG (City)", 16.1, "BEST12.2"],
    ["SUV", "MSRP", 34790.25, "DOLLAR12.2"],
    ["Truck", "Cylinders", 6.25, "BEST12.2"],
    ["Truck", "MPG (City)", 16.5, "BEST12.2"],
    ["Truck", "MSRP", 24941.375, "DOLLAR12.2"],
    ["Wagon", "Cylinders", 5.3, "BEST12.2"],
    ["Wagon", "MPG (City)", 21.1, "BEST12.2"],
    ["Wagon", "MSRP", 28840.533333333333, "DOLLAR12.2"]
  ],
  columns: [
    {
      name: "bi173",
      label: "Type",
      type: "string"
    },
    {
      name: "bi174",
      label: "Metric",
      type: "string"
    },
    {
      name: "bi175",
      label: "Measure",
      type: "number",
      usage: "quantitative",
      aggregation: "sum",
      format: {
        name: "BEST",
        width: 12,
        precision: 0,
        formatString: "BEST12."
      }
    },
    {
      name: "bi176",
      label: "Format",
      type: "string"
    }
  ]
}; // Sample data message to render graph outside of VA for debugging

export default class Radar extends PolarChart {
  constructor(opts) {
    // Set default options
    opts.legend = opts.legend || {};
    opts.legend.type = "categorical";
    opts.legend.columnIndex = 0;
    opts.legend.selectable = opts.legend.selectable !== false;
    console.log(opts.legend);

    // Call parent constructor
    super(opts);

    // Bind selection functions
    this.legend.select = this.legendSelect;
    this.legend.deselect = this.legendDeselect;

    // If not in iFrame (outside VA) -> render with sample data,
    if (!contentUtil.inIframe()) {
      this.onDataReceived(SAMPLE_MESSAGE);
    }
    // Else, set data received listener and wait for data message
    else {
      window.addEventListener("message", event => {
        if (event && event.data && event.data.data) {
          this.onDataReceived(event.data);
        }
      });
    }

    // Listen for resize event
    window.addEventListener("resize", () => {
      this.draw();
    });
  }

  onDataReceived(msg) {
    // Validate data roles
    if (
      !contentUtil.validateRoles(
        msg,
        ["string", "string", "number", "string"],
        ["number"]
      )
    ) {
      messagingUtil.postInstructionalMessage(
        msg.resultName,
        "D3 Radar Chart expects columns to be assigned in this order:\n" +
          " 1. Category (string)\n" +
          " 2. Metric Name (string)\n" +
          " 3. Metric Value (number)\n" +
          " 4. Metric Format (string)"
      );
      return;
    }

    // Store old metadata/data for transitions
    this.old = {
      metadata: this.metadata,
      data: this.data
    };

    // Extract categories and metrics to use in processing data message
    const categories = [...new Set(msg.data.map(d => d[0]))];
    const metrics = [...new Set(msg.data.map(d => d[1]))];
    this.deltaAngle = (2 * Math.PI) / metrics.length;

    // Extract metadata from data message
    this.metadata = {
      category: msg.columns[0].label,
      metrics: {}
    };

    metrics.forEach((metric, metricIndex) => {
      this.metadata.metrics[metric] = {
        metric: metric,
        angle: metricIndex * this.deltaAngle,
        format: contentUtil.translateFormat(msg.data[metricIndex][3]),
        maximum:
          this.max || d3.max(msg.data.filter(d => d[1] == metric), d => d[2])
      };
    });

    // Extract data from message
    let datum, datumIndex;
    this.data = [];
    categories.forEach((category, categoryIndex) => {
      datum = {
        category: category,
        id: contentUtil.getId(category),
        metrics: []
      };

      metrics.forEach((metric, metricIndex) => {
        datumIndex = categoryIndex * metrics.length + metricIndex;

        datum.metrics.push({
          metric: metric,
          measure: msg.data[datumIndex][2],
          scaledMeasure:
            msg.data[datumIndex][2] / this.metadata.metrics[metric].maximum
        });
      });

      this.data.push(datum);
    });

    // Call parent method
    super.onDataReceived(msg);

    // Draw if not drawn, else update
    if (!this.drawn) {
      this.draw();
    } else {
      this.update();
    }
  }

  draw() {
    // Return if data is not yet initialized
    if (!this.data) {
      return;
    }

    // Call parent method
    super.draw();
  }

  update() {
    // Call parent method
    super.update();
  }

  legendSelect(d, i) {
    console.log(d);
    console.log(i);
  }

  legendDeselect() {}
}
