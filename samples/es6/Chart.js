import * as contentUtil from "./contentUtil.js";

export default class Chart {
  constructor(opts) {
    // SVG general opts
    this.svg = opts.svg;
    this.svgSelection = d3.select(this.svg);
    this.drawn = false;
    this.disableLegend = opts.disableLegend; // Boolean value used to disable legend
    this.transTime = opts.transTime || 500;

    // Color opts
    this.displayRules = opts.displayRules || {};
    this.fills = opts.fills || [
      "#21b9b7",
      "#4141e0",
      "#7db71a",
      "#8e2f8a",
      "#d38506",
      "#0abf85",
      "#2f90ec",
      "#db3851"
    ];
    this.strokes = opts.strokes || [
      "#1d9992",
      "#2222bc",
      "#6a9617",
      "#6d256d",
      "#ba7006",
      "#0a9e69",
      "#07689e",
      "#a50a2f"
    ];

    // Legend opts
    this.legend = opts.legend || {};
    this.legend.titleTopPad = opts.legend.titleTopPad || 20; // Padding between legend title top and chart bottom
    this.legend.titleBottomPad = opts.legend.titleBottomPad || 5; // Padding between legend title bottom and first row of legend
    this.legend.rowPad = opts.legend.rowPad || 3; // Padding between legend rows
    this.legend.rectWidth = opts.legend.rectWidth || 12; // Width of legend rects
    this.legend.rectPad = opts.legend.rectPad || 5; // Padding between legend rect and legend text
    this.legend.textPad = opts.legend.textPad || 5; // Padding after legend text

    // Expand colors with lightened and darkened variants
    this.fills.forEach(d => {
      this.fills.push(contentUtil.modifyColor(d, 25)); // Push lightened
    });
    this.fills.forEach(d => {
      this.fills.push(contentUtil.modifyColor(d, -25)); // Push darkened
    });

    this.strokes.forEach(d => {
      this.strokes.push(contentUtil.modifyColor(d, 25)); // Push lightened
    });
    this.strokes.forEach(d => {
      this.strokes.push(contentUtil.modifyColor(d, -25)); // Push darkened
    });
  }

  onDataReceived(msg) {
    // Get legend title
    this.legend.title = msg.columns[this.legend.columnIndex].label;

    // Process data depending on legend type
    switch (this.legend.type) {
      case "categorical":
        // Get array of distinct categories
        this.legend.data = [
          ...new Set(msg.data.map(d => d[this.legend.columnIndex]))
        ];

        // Map ids to distinct categories
        this.legend.data = this.legend.data.map((d, i) => ({
          category: d,
          id: contentUtil.getId(d),
          fill: this.displayRules[d]
            ? this.colorAssignments[d].fill
            : this.fills[i],
          stroke: this.displayRules[d]
            ? this.colorAssignments[d].stroke
            : this.strokes[i]
        }));
        break;
    }
  }

  draw() {
    // Enter defs and save reference
    this.svgSelection
      .selectAll("defs")
      .data([this])
      .enter()
      .append("defs");

    const defs = this.svgSelection.select("defs");

    // Enter legend elements depending on legend type
    switch (this.legend.type) {
      case "categorical":
        // Enter gradients
        const gradients = defs
          .selectAll(".legend-gradient")
          .data(this.legend.data, d => d.id);

        gradients
          .enter()
          .append("linearGradient")
          .classed("legend-gradient", true)
          .attrs({
            id: d => d.id + "-gradient",
            x1: "0%",
            x2: "100%",
            y1: "50%",
            y2: "50%"
          })
          .each(function(d, i) {
            // Append color stops
            d3.select(this)
              .append("stop")
              .attrs({
                offset: "0%",
                "stop-color": d.fill,
                "stop-opacity": 1
              });

            d3.select(this)
              .append("stop")
              .attrs({
                offset: "100%",
                "stop-color": d.fill,
                "stop-opacity": 0.7
              });
          });

        // Return here if legend disabled
        if (this.disableLegend) {
          this.legend.height = 0;
          return;
        }

        // Calculate position of legend elements
        this.calculateCategoricalLegendDimensions();

        // Enter/update legend group and save reference
        this.svgSelection
          .selectAll(".g-legend")
          .data([this.legend.title])
          .enter()
          .append("g")
          .classed("g-legend", true);

        const gLegend = this.svgSelection
          .select(".g-legend")
          .attr(
            "transform",
            "translate(0, " + (this.svg.clientHeight - this.legend.height) + ")"
          );

        // Enter/update legend title
        const legTitle = gLegend
          .selectAll(".legend-title")
          .data([this.legend.title]);

        legTitle
          .enter()
          .append("text")
          .classed("legend-title", true)
          .text(d => d)
          .merge(legTitle)
          .attr("transform", "translate(" + this.svg.clientWidth / 2 + ", 0)");

        // Enter/update legend groups
        const legGroups = gLegend
          .selectAll(".g-legend-entry")
          .data(this.legend.data, d => d.id)
          .enter()
          .append("g")
          .classed("g-legend-entry", true)
          .classed("selectable", this.legend.selectable)
          .attr("id", d => d.id + "-legend-entry")
          .on("click", (d, i) => {
            if (this.legend.selectable) {
              this.legend.select(d, i);
            }
          });

        gLegend
          .selectAll(".g-legend-entry")
          .data(this.legend.data, d => d.id)
          .attr(
            "transform",
            (d, i) =>
              "translate(" +
              this.legend.elPos[i].x +
              ", " +
              this.legend.elPos[i].y +
              ")"
          );

        // Enter legend rects
        legGroups
          .append("rect")
          .classed("legend-rect", true)
          .attrs({
            width: this.legend.rectWidth,
            height: this.legend.rectWidth,
            fill: d => "url(#" + d.id + "-gradient)",
            stroke: d => d.stroke
          });

        // Enter legend texts
        legGroups
          .append("text")
          .classed("legend-text", true)
          .text(d => d.category)
          .attrs({
            x: this.legend.rectWidth + this.legend.rectPad,
            y: this.legend.rectWidth / 2
          });
    }

    // Toggle drawn boolean
    this.drawn = true;
  }

  update() {
    // Grab defs reference
    const defs = this.svgSelection.select("defs");

    // Update legend elements depending on legend type
    switch (this.legend.type) {
      case "categorical":
        // Enter/update/exit gradients
        const gradients = defs
          .selectAll(".legend-gradient")
          .data(this.legend.data, d => d.id);

        gradients.each(function(d, i) {
          // Update color stops
          d3.select(this)
            .selectAll("stop")
            .attr("stop-color", d.fill);
        });

        gradients
          .enter()
          .append("linearGradient")
          .classed("legend-gradient", true)
          .attrs({
            id: d => d.id + "-gradient",
            x1: "0%",
            x2: "100%",
            y1: "50%",
            y2: "50%"
          })
          .each(function(d, i) {
            // Append color stops
            d3.select(this)
              .append("stop")
              .attrs({
                offset: "0%",
                "stop-color": d.fill,
                "stop-opacity": 1
              });

            d3.select(this)
              .append("stop")
              .attrs({
                offset: "100%",
                "stop-color": d.fill,
                "stop-opacity": 0.7
              });
          });

        // Return here if legend disabled
        if (this.disableLegend) {
          return;
        }

        // Calculate position of legend elements
        this.calculateCategoricalLegendDimensions();

        // Grab legend group reference
        const gLegend = this.svgSelection.select(".g-legend");

        // Update legend groups
        const legGroups = gLegend
          .selectAll(".g-legend-entry")
          .data(this.legend.data, d => d.id);

        // Exit
        legGroups
          .exit()
          .each(function() {
            if (d3.select(this).classed("selected")) {
              this.legend.deselect();
            }
          })
          .transition()
          .duration(this.transTime)
          .style("opacity", 0)
          .remove();

        // Update
        legGroups
          .each(function(d, i) {
            // Update legend rect fill
            d3.select(this)
              .select(".legend-rect")
              .attrs({
                fill: "url(#" + d.id + "-gradient)",
                stroke: d.stroke
              });
          })
          .transition()
          .duration(this.transTime)
          .attr(
            "transform",
            (d, i) =>
              "translate(" +
              this.legend.elPos[i].x +
              ", " +
              this.legend.elPos[i].y +
              ")"
          )
          .style("opacity", 1);

        // Enter
        let enter = legGroups
          .enter()
          .append("g")
          .classed("g-legend-entry", true)
          .attrs({
            id: d => d.id + "-legend-entry",
            transform: (d, i) =>
              "translate(" +
              this.legend.elPos[i].x +
              ", " +
              this.legend.elPos[i].y +
              ")"
          })
          .on("click", (d, i) => {
            if (this.legend.selectable) {
              this.legend.select(d, i);
            }
          });

        // Enter legend rects
        enter
          .append("rect")
          .classed("legend-rect", true)
          .attrs({
            width: this.legend.rectWidth,
            height: this.legend.rectWidth,
            fill: d => "url(#" + d.id + "-gradient)",
            stroke: d => d.stroke
          })
          .style("opacity", 0)
          .transition()
          .duration(this.transTime)
          .style("opacity", 1);

        // Enter legend texts
        enter
          .append("text")
          .classed("legend-text", true)
          .text(d => d.category)
          .attrs({
            x: this.legend.rectWidth + this.legend.rectPad,
            y: this.legend.rectWidth / 2
          })
          .style("opacity", 0)
          .transition()
          .duration(this.transTime)
          .style("opacity", 1);

        // Update legend position
        gLegend
          .transition()
          .duration(this.transTime)
          .attr(
            "transform",
            "translate(0, " + (this.svg.clientHeight - this.legend.height) + ")"
          );
    }
  }

  calculateCategoricalLegendDimensions() {
    // Create dummy text variable to get legend title height
    let titleHeight;
    this.svgSelection
      .append("text")
      .classed("legend-title", true)
      .text("TEST")
      .each(function() {
        titleHeight = this.getBBox().height;
        this.remove();
      });

    // Create dummy text variables to get legend text height/widths
    const textWidths = [];
    let textHeight;
    this.svgSelection
      .selectAll(".dummyText")
      .data(this.legend.data)
      .enter()
      .append("text")
      .classed("legend-text", true)
      .text(d => d.category)
      .style("font-weight", this.legend.selectable ? "bold" : "normal")
      .each(function() {
        textHeight = this.getBBox().height;
        textWidths.push(this.getComputedTextLength());
        this.remove();
      });

    // Determine which row each element will sit in and how long each row is
    const rows = [];
    const rowSums = [];
    let rowSum;
    let row = 0;
    for (let i = 0; i < textWidths.length; i++) {
      rowSum =
        textWidths[i] +
        this.legend.rectWidth +
        this.legend.rectPad +
        this.legend.textPad;
      rows.push(row);
      while (
        rowSum +
          textWidths[i + 1] +
          this.legend.rectWidth +
          this.legend.rectPad +
          this.legend.textPad <=
          this.svg.clientWidth &&
        i + 1 < textWidths.length
      ) {
        i++;
        rowSum +=
          textWidths[i] +
          this.legend.rectWidth +
          this.legend.rectPad +
          this.legend.textPad;
        rows.push(row);
      }
      rowSums.push(rowSum);
      row++;
    }

    // Calculate x and y coordinates for legend elements
    this.legend.elPos = [];
    for (let i = 0; i < textWidths.length; i++) {
      this.legend.elPos.push({
        x:
          i == 0 || rows[i - 1] != rows[i]
            ? this.svg.clientWidth / 2 - rowSums[rows[i]] / 2
            : this.legend.elPos[i - 1].x +
              textWidths[i - 1] +
              this.legend.rectWidth +
              this.legend.rectPad +
              this.legend.textPad,
        y:
          titleHeight +
          this.legend.titleBottomPad +
          rows[i] * (textHeight + this.legend.rowPad)
      });
    }

    // Set legend height
    this.legend.height =
      this.legend.elPos[this.legend.elPos.length - 1].y +
      textHeight +
      this.legend.rowPad;
  }
}
