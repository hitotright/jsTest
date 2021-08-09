/* eslint-disable no-param-reassign  */
/* eslint-disable no-underscore-dangle  */
/* eslint-disable space-before-function-paren  */
/* eslint-disable lines-around-comment */
/* eslint-disable no-irregular-whitespace */

import L from "leaflet";
import rbush from "rbush";
import ShipIconPolygonUtils from "./ShipIconPolygonUtils";

const patrolmmsis = [413035350, 412035030, 413035340, 412828000]; //40米以上执法船：海巡0718、海巡0713、海巡0717、海巡22

export let ShipIconGroup = L.Polygon.extend({
  options: {
    weight: 0.8,
    lineCap: "butt",
    color: "#000000",
    fillColor: "#ffff00",
    fillOpacity: 1,

    // 地图对象
    _map: undefined,

    // 缩放比例
    _scale: undefined,

    // 船舶选中颜色
    _selectColor: undefined,
  },

  initialize(options) {
    options = L.Util.setOptions(this, options);

    // 地图对象
    this._map = options.map;
    this._renderer = L.canvas({padding: 0.5});
    this._initCanvas();

    // 船舶选中颜色
    this._selectColor = options.selectColor ? options.selectColor : "#ff0000";

    this._flashShip = options.flash ? options.flash : false;

    // 船舶渲染方式
    this._renderer = L.canvas({padding: 0.5});

    // 初始化缩放比例
    this._scale = options.scale ? options.scale : 1;
    this._ships = new rbush();
    this._latlngShips = new rbush();
  },

  setFlashShip(isFlash) {
    this._flashShip = isFlash;
  },

  _flashColor(that) {
    if (that.options) {
      const colorArr = ["#ff0000", "#ffff00"];
      let index = colorArr.indexOf(that.options.fillColor);
      let fillColor = colorArr[0];
      if (colorArr[index + 1]) {
        fillColor = colorArr[index + 1];
      }
      that.setStyle({fillColor});
    }
  },

  getScale() {
    return this._scale;
  },

  // 初始化船舶位置坐标
  _initShipPoint() {
    if (!this._map) {
      return;
    }
    const {mmsi, custShipType, sog, status} = this._shipItem;
    this.fillColor = this._getShipColor(this._shipItem);
    //开启频闪
    if (
      this._flashShip &&
      this._shipItem.aisType == "WARN" &&
      this.flashColorHandler == undefined
    ) {
      this.flashColorHandler = setInterval(() => this._flashColor(this), 800);
    }
    if (status == "STOP" || status == "ANCHOR" || (status == "" && sog < 10)) {
      return this._initStopShipLayer();
    }
    //
    return this._initDefaultShipLayer();
  },

  // 静止船舶
  _initStopShipLayer() {
    const map = this._map;
    const scale = this._scale / 1.3;
    const {lat, lng} = this._shipItem;

    const rotate = 0;

    const latlngPoint = [lat, lng];
    const pointList = ShipIconPolygonUtils.getShipPoint("stop");
    const shapePointList = ShipIconPolygonUtils.getRotatePointList({
      map,
      latlngPoint,
      pointList,
      scale,
      rotate,
    });

    this._shipPoints = shapePointList;
    this._context.beginPath();
    this._context.arc(
      shapePointList[0].x,
      (shapePointList[3].y + shapePointList[0].y) / 2,
      Math.abs(shapePointList[1].x - shapePointList[0].x) * 2,
      0,
      Math.PI * 2,
      false,
    );
    this._context.setLineDash([]);
    this._context.fillStyle = this.fillColor;
    this._context.strokeStyle = this.color;
    this._context.lineWidth = this.weight;
    this._context.fill(); //多边形填充
    this._context.stroke(); //结束绘制
    return shapePointList;
  },

  // 默认船舶坐标
  _initDefaultShipLayer() {
    const map = this._map;
    let scale = this._scale;
    const {lat, lng, sog = 0, rot, cog = 0, mmsi} = this._shipItem;

    /* cog 对地航向 COG 在1/103时对地航线（0-3599）例：cog: 1338 */
    /* sog ​​​​对地航速除以10节距为单位，1023=无；1022=102.2节 */
    /* rot ​​​​0至+126=向左转至最高708度/分钟或更高0至-126=向右转弯 */
    const speed = sog / 10;
    const rotate = cog / 10;
    const direct = this._getShipHeadDegree() - rotate;

    const latlngPoint = [lat, lng];
    const pointList = ShipIconPolygonUtils.getShipPoint("default");
    const shipLinePointList = ShipIconPolygonUtils.getShipSpeedPointList({
      map,
      topPoint: pointList[0],
      latlngPoint,
      speed,
      scale,
      direct,
      rotate,
    });
    this._shipLinePoints = shipLinePointList;

    const shapePointList = ShipIconPolygonUtils.getRotatePointList({
      map,
      latlngPoint,
      pointList,
      scale,
      rotate,
    });
    this._shipPoints = shapePointList;
    this._context.beginPath();
    for (let i = 0; i < shapePointList.length; i++) {
      let p = shapePointList[i];
      this._context[i ? "lineTo" : "moveTo"](p.x, p.y);
    }
    this._context.closePath();
    this._context.setLineDash([]);
    this._context.fillStyle = this.fillColor;
    this._context.strokeStyle = this.color;
    this._context.lineWidth = this.weight;
    this._context.fill(); //多边形填充
    this._context.stroke(); //结束绘制

    if (shipLinePointList.length > 0) {
      this._context.beginPath();
      this._context.setLineDash([2]);
      this._context.moveTo(shipLinePointList[0].x, shipLinePointList[0].y);
      this._context.lineTo(shipLinePointList[2].x, shipLinePointList[2].y);
      this._context.stroke();
      this._context.beginPath();
      this._context.moveTo(shipLinePointList[0].x, shipLinePointList[0].y);
      this._context.lineTo(shipLinePointList[1].x, shipLinePointList[1].y);
      this._context.stroke();
    }
    return shapePointList;
  },

  _initCanvas() {
    if (!this._renderer._container) {
      this._renderer.addTo(this._map);
    }
    this._canvas = this._renderer._container;
    this._context = this._renderer._ctx;

    const y = this._canvas.height / 2;
    this._scaleMeters = this._map.distance(
      this._map.containerPointToLatLng([0, y]),
      this._map.containerPointToLatLng([100, y]),
    );
  },

  redraw() {
    this._redraw(true);
  },

  _redraw(clear) {
    let self = this;

    if (clear) {
      this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
    if (!this._map || !this._latlngShips) return;

    let tmp = [];

    let mapBounds = self._map.getBounds();
    //Only re-draw what we are showing on the map.
    let mapBoxCoords = {
      minX: mapBounds.getWest(),
      minY: mapBounds.getSouth(),
      maxX: mapBounds.getEast(),
      maxY: mapBounds.getNorth(),
    };
    self._latlngShips.search(mapBoxCoords).forEach(function (e) {
      //Readjust Point Map
      let pointPos = self._map.latLngToLayerPoint(L.latLng(e.data.lat, e.data.lng));
      //Redraw points
      // let pointList = self._drawShip(e.data, pointPos);
      self._shipItem = e.data;
      let pointList = self._initShipPoint();

      let newCoords = {
        minX: pointPos.x - 10,
        minY: pointPos.y - 10,
        maxX: pointPos.x + 10,
        maxY: pointPos.y + 10,
        data: e.data,
        pointList,
      };

      tmp.push(newCoords);
    });
    //Clear rBush & Bulk Load for performance
    this._ships.clear();
    this._ships.load(tmp);
  },

  //Multiple layers at a time for rBush performance
  addShips(ships) {
    let self = this;
    let tmpShip = [];
    let tmpLatLng = [];
    this._clear();
    ships.forEach(function (ship) {
      let latlng = L.latLng(ship.lat, ship.lng);
      let isDisplaying = self._map.getBounds().contains(latlng);
      let s = self._addShip(ship, latlng, isDisplaying);

      //Only add to Point Lookup if we are on map
      if (isDisplaying === true) tmpShip.push(s[0]);

      tmpLatLng.push(s[1]);
    });
    console.log(tmpShip.length);
    self._ships.load(tmpShip);
    self._latlngShips.load(tmpLatLng);
  },

  //Adds single layer at a time. Less efficient for rBush
  addShip(ship) {
    let self = this;
    let latlng = L.latLng(ship.lat, ship.lng);
    let isDisplaying = self._map.getBounds().contains(latlng);
    let dat = self._addShip(ship, latlng, isDisplaying);

    //Only add to Point Lookup if we are on map
    if (isDisplaying === true) self._ships.insert(dat[0]);

    self._latlngShips.insert(dat[1]);
  },

  removeShip(ship, redraw) {
    let self = this;

    //If we are removed point
    if (ship["minX"]) ship = ship.data;

    let latlng = L.latLng(ship.lat, ship.lng);
    let isDisplaying = self._map.getBounds().contains(latlng);

    let shipData = {
      minX: latlng.lng,
      minY: latlng.lat,
      maxX: latlng.lng,
      maxY: latlng.lat,
      data: ship,
    };

    self._latlngShips.remove(shipData, function (a, b) {
      return a.data.mmsi === b.data.mmsi;
    });

    if (isDisplaying === true && redraw === true) {
      self._redraw(true);
    }
  },

  _addShip(ship, latlng, isDisplaying) {
    let self = this;
    //Needed for pop-up & tooltip to work.
    ship._map = self._map;

    //_ships contains Points of ships currently displaying on map
    if (!self._ships) self._ships = new rbush();

    //_latlngShips contains Lat\Long coordinates of all ships in layer.
    if (!self._latlngShips) {
      self._latlngShips = new rbush();
    }

    let pointPos = self._map.latLngToLayerPoint(latlng);
    let pointList = [];

    //Only draw if we are on map
    if (isDisplaying === true) {
      // pointList = self._drawShip(ship, pointPos);
      self._shipItem = ship;
      pointList = self._initShipPoint();
    }

    let ret = [
      {
        minX: pointPos.x - 10,
        minY: pointPos.y - 10,
        maxX: pointPos.x + 10,
        maxY: pointPos.y + 10,
        data: ship,
        pointList,
      },
      {
        minX: latlng.lng,
        minY: latlng.lat,
        maxX: latlng.lng,
        maxY: latlng.lat,
        data: ship,
        pointList,
      },
    ];
    return ret;
  },

  clearShips() {
    this._ships = new rbush();
    this._latlngShips = new rbush();
  },

  _drawShip(ship, pointPos) {
    let self = this;
    if (!pointPos) {
      pointPos = self._map.latLngToLayerPoint(L.latLng(ship.lat, ship.lng));
    }
    let pointList = [
      [-10, -5],
      [-10, 5],
      [10, 0],
    ];
    let speed = (ship.sog * 92.52 * 10) / this._scaleMeters;
    pointList.push([10 + speed, 0]);
    pointList.push(
      ShipIconPolygonUtils.rotatePoint(
        [10, 0],
        [10 + speed, 0],
        (ship.trueHeading - ship.cog) / 10 - 180,
      ),
    );
    // 旋转坐标
    pointList = pointList.map((item) =>
      ShipIconPolygonUtils.rotatePoint([0, 0], item, ship.cog / 10 - 180),
    );
    // 计算坐标
    pointList = pointList.map((item) => ({
      x: item[0] * this._scale + pointPos.x,
      y: item[1] * this._scale + pointPos.y,
    }));
    this._context.fillStyle = "#ffff00";
    this._context.strokeStyle = "red";
    this._context.beginPath();
    this._context.setLineDash([]);
    this._context.moveTo(pointList[2].x, pointList[2].y);
    this._context.lineTo(pointList[1].x, pointList[1].y);
    this._context.lineTo(pointList[0].x, pointList[0].y);
    this._context.closePath();
    this._context.lineTo(pointList[3].x, pointList[3].y);
    this._context.lineWidth = this;
    this._context.fill(); //多边形填充
    this._context.stroke(); //结束绘制
    this._context.beginPath();
    this._context.setLineDash([2, 2]);
    this._context.moveTo(pointList[2].x, pointList[2].y);
    this._context.lineTo(pointList[4].x, pointList[4].y);
    this._context.stroke(); //结束绘制
    return pointList.splice(0, 3);
  },

  _project() {
    //更新可见区域
    // console.log("project");
    let bounds = this._renderer._bounds;
    if (bounds) {
      let size = bounds.getSize();
      this._rawPxBounds = L.bounds(bounds.min, size);
      if (this._rawPxBounds.isValid()) {
        this._updateBounds();
      }
    }
  },

  _update() {
    // console.log("_update");
    const y = this._canvas.height / 2;
    this._scaleMeters = this._map.distance(
      this._map.containerPointToLatLng([0, y]),
      this._map.containerPointToLatLng([100, y]),
    );
  },
  _updatePath() {
    // console.log("_updatePath");
    if (!this._renderer._drawing) {
      return;
    }
    this._redraw(true);
  },
  _clear() {
    let bounds = this._renderer._bounds;
    if (bounds) {
      let size = bounds.getSize();
      this._context.clearRect(bounds.min.x, bounds.min.y, size.x, size.y);
    }
  },
  _containsPoint(p) {
    let inside = false;

    if (!this._ships) {
      return inside;
    }

    let ret = this._pointSearch(p);

    if (ret && ret.length > 0) {
      inside = true;
    }
    // also check if it's on polygon stroke
    return inside;
  },

  _pointSearch(p) {
    return this._ships
      .search({
        minX: p.x,
        minY: p.y,
        maxX: p.x,
        maxY: p.y,
      })
      .filter((item) => this._pointInPolygon(p, item.pointList));
  },

  _pointInPolygon(checkPoint, polygonPoints) {
    let counter = 0;
    let i;
    let xinters;
    let p1, p2;
    let pointCount = polygonPoints.length;
    p1 = polygonPoints[0];

    for (i = 1; i <= pointCount; i++) {
      p2 = polygonPoints[i % pointCount];
      if (checkPoint.x > Math.min(p1.x, p2.x) && checkPoint.x <= Math.max(p1.x, p2.x)) {
        if (checkPoint.y <= Math.max(p1.y, p2.y)) {
          if (p1.x != p2.x) {
            xinters = ((checkPoint.x - p1.x) * (p2.y - p1.y)) / (p2.x - p1.x) + p1.y;
            if (p1.y == p2.y || checkPoint.y <= xinters) {
              counter++;
            }
          }
        }
      }
      p1 = p2;
    }
    if (counter % 2 == 0) {
      return false;
    } else {
      return true;
    }
  },

  //修改停泊船为圆形
  _updateShipStop: function (layer, points) {
    if (!this._renderer._drawing) {
      return;
    }
    let ctx = this._renderer._ctx;

    // ctx.lineWidth = 1.5;
    // ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.arc(
      points[0].x,
      (points[3].y + points[0].y) / 2,
      Math.abs(points[1].x - points[0].x) * 2,
      0,
      Math.PI * 2,
      false,
    );
    // ctx.stroke();
    this._renderer._fillStroke(ctx, layer);
  },

  _updateShipDash: function (layer, points) {
    if (!points || points.length < 3) {
      return;
    }
    if (!this._renderer._drawing) {
      return;
    }

    let ctx = this._renderer._ctx;

    // ctx.strokeStyle = "yellow";
    ctx.beginPath();
    ctx.setLineDash([2]);

    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    this._renderer._fillStroke(ctx, layer);
  },

  // 绘制船舶线或形状，参考方法 Canvas._updatePoly
  _updateShipPoly: function (layer, points, closed) {
    if (!points || points.length === 0) {
      return;
    }
    if (!this._renderer._drawing) {
      return;
    }

    let i;
    let j;
    let len2;
    let p;
    let parts = [points];
    let len = parts.length;
    let ctx = this._renderer._ctx;

    if (!len) {
      return;
    }

    ctx.beginPath();

    for (i = 0; i < len; i++) {
      for (j = 0, len2 = parts[i].length; j < len2; j++) {
        p = parts[i][j];
        ctx[j ? "lineTo" : "moveTo"](p.x, p.y);
      }
      if (closed) {
        ctx.closePath();
      }
    }

    // console.log('color', layer.options.color);
    this._renderer._fillStroke(ctx, layer);
  },

  // 获取船舶颜色
  _getShipColor(shipItem) {
    return ShipIconPolygonUtils.getShipColor(shipItem);
  },

  //获取船头角度
  _getShipHeadDegree() {
    const {sog, cog = 0, trueHeading} = this._shipItem;
    let shipRotateAngle = 0;
    if (!trueHeading || trueHeading <= 0 || trueHeading === 511 || trueHeading == 1023) {
      shipRotateAngle = cog / 10;
    } else {
      shipRotateAngle = trueHeading;
    }
    return shipRotateAngle;
  },

  // 初始化船舶选中点坐标
  getSelectScale() {
    let scale = this._scale * 1.8;
    return scale;
  },

  // 获取当前船舶选中图层
  getSelectLayer() {
    const map = this._map;
    let scale = this._scale * 1.8;

    const {mmsi, lat, lng} = this._shipItem;
    if (!mmsi) {
      return;
    }

    const latlngPoint = [lat, lng];

    const selectPointList = ShipIconPolygonUtils.getShipSelectPoint({
      map,
      latlngPoint,
      scale,
    });
    if (!selectPointList) {
      return;
    }
    const selectLayer = selectPointList.map((pointList) => {
      const latlngs = pointList.map((p) =>
        map.containerPointToLatLng(map.layerPointToContainerPoint(p)),
      );
      const polyline = L.polyline(latlngs, {
        weight: 1.6,
        color: this._selectColor,
        renderer: this._renderer,
      });
      // console.log('latlngs', latlngs, 'polyline', polyline);
      return polyline;
    });
    return selectLayer;
  },
});

export function shipIconGroup(options) {
  return new ShipIconGroup(options);
}
