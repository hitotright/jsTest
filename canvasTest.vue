<template>
  <div id="app">
    <div id="container"></div>
  </div>
</template>
<script>
import Konva from "konva";
export default {
  mounted() {
    var stage = new Konva.Stage({
      container: "container",
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // add canvas element
    var layer = new Konva.Layer();
    stage.add(layer);

    //backGroup
    var back = new Konva.Rect({
      x: 0,
      y: 0,
      width: 800,
      height: 400,
      fill: "blue",
    });
    layer.add(back);

    // create shape
    var box = new Konva.Rect({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 100, y: 100 },
      fillLinearGradientColorStops: [0, "red", 1, "white"],
      stroke: "black",
      strokeWidth: 1,
      draggable: true,
    });
    layer.add(box);

    // add cursor styling
    box.on("mouseover", function () {
      document.body.style.cursor = "pointer";
    });
    box.on("mouseout", function () {
      document.body.style.cursor = "default";
    });

    //line
    var line = new Konva.Path({
      x: 200,
      y: 200,
      data: "M 0 0 Q 140 -20 200 0",
      strokeLinearGradientStartPoint: { x: 0, y: 0 },
      strokeLinearGradientEndPoint: { x: 200, y: 0 },
      strokeLinearGradientColorStops: [
        0,
        "rgba(255,255,255,0)",
        1,
        "rgba(255,255,255,1)",
      ],
      shadowColor: "rgba(255,255,255,1)",
      shadowBlur: 5,
    });
    layer.add(line);
    console.log(line);
    let percent = 0,
      P0 = { x: 0, y: 0 },
      P1 = { x: 140, y: -20 },
      P2 = { x: 200, y: 0 };
    var anim = new Konva.Animation((frame) => {
      // var angularSpeed = 100;
      // var angularDiff = (angularSpeed * frame.timeDiff) / 1000;
      // var shapes = layer.getChildren();
      // for (var n = 0; n < shapes.length; n++) {
      //   var shape = shapes[n];
      //   shape.rotate(angularDiff);
      // }
      let speed = 2;
      let b = this.getB(P0, P1, P2, percent);
      line.data(
        `M ${P0.x} ${P0.y} Q ${b.Q01.x} ${b.Q01.y} ${b.B0.x} ${b.B0.y}`
      );
      percent += 1 / ((speed * 1000) / frame.timeDiff);
      if (percent >= 1) {
        percent = 0;
      }
      // update stuff
    }, layer);

    anim.start();
  },
  methods: {
    getB(P0, P1, P2, percent) {
      let Q01 = this.interpolation(P0, P1, percent),
        Q11 = this.interpolation(P1, P2, percent),
        B0 = this.interpolation(Q01, Q11, percent);
      return { Q01, Q11, B0 };
    },
    interpolation(P0, P1, t) {
      return {
        x: P0.x * (1 - t) + P1.x * t,
        y: P0.y * (1 - t) + P1.y * t,
      };
    },
  },
};
</script>
