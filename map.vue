<template>
  <div>
    <!-- 地图层 -->
    <div id="map" class="map__wrapper" @contextmenu.prevent="() => false"></div>
  </div>
</template>
<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { shipIconLayer } from "./ShipIconLayerCopy";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

export default {
  data() {
    return {
      map: null,
      timeHander: null,
    };
  },
  mounted() {
    this.initmap();
    clearInterval(this.timeHander);
    this.timeHander = setInterval(this.testShip, 5000);
    // this.testShip();
    // this.drawPoly();
  },
  methods: {
    drawPoly() {
      let editableLayers = new L.FeatureGroup([
        L.circle([29.894211, 121.939633], { radius: 200 }),
      ]);
      this.map.addLayer(editableLayers);
      // let drawControl = new L.Control.Draw({
      //   edit: { featureGroup: editableLayers, remove: false },
      // });
      // this.map.addControl(drawControl);
      let editHandler = new L.EditToolbar.Edit(this.map, {
        featureGroup: editableLayers,
        selectedPathOptions: {},
      });
      this.map.on(L.Draw.Event.CREATED, (e) => {
        let type = e.layerType,
          layer = e.layer;

        if (type === "marker") {
          layer.bindPopup("A popup!");
        }
        console.log("create");
        editableLayers.addLayer(layer);
      });
      this.map.on("draw:edited", (e) => {
        console.log("draw:edited");
      });
      this.map.on("draw:drawstart", (e) => {
        console.log("draw:drawstart");
      });
      this.map.on("draw:drawstop", (e) => {
        console.log("draw:drawstop");
      });
      this.map.on("draw:editresize", (e) => {
        console.log("draw:editresize");
        let target = e.target,
          layer = e.layer;
        target._editTooltip.updateContent({
          text: "半径:" + layer._radius.toFixed(1) + "nm",
        });
        setTimeout(
          L.Util.bind(
            () => target._editTooltip.updateContent({ text: "" }),
            this
          ),
          1000
        );
      });

      // let handler = new L.Draw.Circle(this.map).enable();
      editHandler.enable();
    },
    initmap: function () {
      let baseLayer = L.tileLayer(
        "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "Haut-Gis-Org © OpenStreetMap",
        }
      );
      let renderer = L.canvas({ padding: 0.5 });
      this.map = L.map("map", {
        center: [29.894211, 121.939633],
        zoom: 12,
        renderer,
      });
      baseLayer.addTo(this.map);
      let shipLayer = shipIconLayer({
        map: this.map,
        shipData: [],
        renderer,
      }).addTo(this.map);
      window.globalShipLayer = shipLayer;
    },
    testShip() {
      let shipData = [];
      for (let i = 0; i < 20000; i++) {
        let lat = 29.796317 + Math.random() * 1.5;
        let lng = 121.830771 + Math.random() * 1.5;
        let item = {
          destination: "",
          dataSource: "",
          sourceName: "",
          lat: lat,
          lng: lng,
          mmsi: lat + "," + lng,
          name: lat + "," + lng,
          nameCn: "",
          aisName: "",
          custShipType: "",
          labelCode: "",
          shipId: lat + "," + lng,
          shipUnionNo: lat + "," + lng,
          aisType: "",
          officeName: "",
          rot: 1,
          cog: 900,
          trueHeading: 1200,
          sog: 300,
          son: 300,
          color: null,
          status: "",
          zoneStatus: 0,
          trackId: 0,
          utc: "",
        };
        shipData.push(item);
      }
      if (window.globalShipLayer) {
        window.globalShipLayer.clearShips();
        window.globalShipLayer.addShips(shipData);
      }
    },
  },
};
</script>
<style scoped lang="css">
.map__wrapper {
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 0;
}
</style>
