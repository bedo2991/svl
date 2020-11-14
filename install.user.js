function xa(k) {
  var n = 0;
  return function() {
    return n < k.length ? {done:!1, value:k[n++], } : {done:!0};
  };
}
function Fa(k) {
  var n = "undefined" != typeof Symbol && Symbol.iterator && k[Symbol.iterator];
  return n ? n.call(k) : {next:xa(k)};
}
var Ga = "function" == typeof Object.defineProperties ? Object.defineProperty : function(k, n, r) {
  if (k == Array.prototype || k == Object.prototype) {
    return k;
  }
  k[n] = r.value;
  return k;
};
function Qh(k) {
  k = ["object" == typeof globalThis && globalThis, k, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global, ];
  for (var n = 0; n < k.length; ++n) {
    var r = k[n];
    if (r && r.Math == Math) {
      return r;
    }
  }
  throw Error("Cannot find global object");
}
var Rh = Qh(this);
function Q(k, n) {
  if (n) {
    a: {
      var r = Rh;
      k = k.split(".");
      for (var w = 0; w < k.length - 1; w++) {
        var H = k[w];
        if (!(H in r)) {
          break a;
        }
        r = r[H];
      }
      k = k[k.length - 1];
      w = r[k];
      n = n(w);
      n != w && null != n && Ga(r, k, {configurable:!0, writable:!0, value:n});
    }
  }
}
Q("Symbol", function(k) {
  function n(H) {
    if (this instanceof n) {
      throw new TypeError("Symbol is not a constructor");
    }
    return new r("jscomp_symbol_" + (H || "") + "_" + w++, H);
  }
  function r(H, R) {
    this.m = H;
    Ga(this, "description", {configurable:!0, writable:!0, value:R});
  }
  if (k) {
    return k;
  }
  r.prototype.toString = function() {
    return this.m;
  };
  var w = 0;
  return n;
});
Q("Symbol.iterator", function(k) {
  if (k) {
    return k;
  }
  k = Symbol("Symbol.iterator");
  for (var n = "Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "), r = 0; r < n.length; r++) {
    var w = Rh[n[r]];
    "function" === typeof w && "function" != typeof w.prototype[k] && Ga(w.prototype, k, {configurable:!0, writable:!0, value:function() {
      return Sh(xa(this));
    }});
  }
  return k;
});
function Sh(k) {
  k = {next:k};
  k[Symbol.iterator] = function() {
    return this;
  };
  return k;
}
function Th(k, n) {
  k instanceof String && (k += "");
  var r = 0, w = !1, H = {next:function() {
    if (!w && r < k.length) {
      var R = r++;
      return {value:n(R, k[R]), done:!1};
    }
    w = !0;
    return {done:!0, value:void 0};
  }};
  H[Symbol.iterator] = function() {
    return H;
  };
  return H;
}
Q("Array.prototype.keys", function(k) {
  return k ? k : function() {
    return Th(this, function(n) {
      return n;
    });
  };
});
Q("Number.isFinite", function(k) {
  return k ? k : function(n) {
    return "number" !== typeof n ? !1 : !isNaN(n) && Infinity !== n && -Infinity !== n;
  };
});
Q("Number.isInteger", function(k) {
  return k ? k : function(n) {
    return Number.isFinite(n) ? n === Math.floor(n) : !1;
  };
});
Q("Object.is", function(k) {
  return k ? k : function(n, r) {
    return n === r ? 0 !== n || 1 / n === 1 / r : n !== n && r !== r;
  };
});
Q("Array.prototype.includes", function(k) {
  return k ? k : function(n, r) {
    var w = this;
    w instanceof String && (w = String(w));
    var H = w.length;
    r = r || 0;
    for (0 > r && (r = Math.max(r + H, 0)); r < H; r++) {
      var R = w[r];
      if (R === n || Object.is(R, n)) {
        return !0;
      }
    }
    return !1;
  };
});
Q("String.prototype.includes", function(k) {
  return k ? k : function(n, r) {
    if (null == this) {
      throw new TypeError("The 'this' value for String.prototype.includes must not be null or undefined");
    }
    if (n instanceof RegExp) {
      throw new TypeError("First argument to String.prototype.includes must not be a regular expression");
    }
    return -1 !== this.indexOf(n, r || 0);
  };
});
Q("Object.values", function(k) {
  return k ? k : function(n) {
    var r = [], w;
    for (w in n) {
      Object.prototype.hasOwnProperty.call(n, w) && r.push(n[w]);
    }
    return r;
  };
});
(function() {
  function k() {
    x("Destroy all features");
    A.destroyFeatures(A.features, {silent:!0, });
    z.destroyFeatures(z.features, {silent:!0});
    E.destroyFeatures(E.features, {silent:!0});
  }
  function n() {
    x("resetting preferences");
    x("saveDefaultPreferences");
    Y(!0);
    Z(d);
    aa();
    w("success", "Preferences have been reset to the default values");
  }
  function r() {
    WazeWrap.Alerts.prompt(GM_info.script.name, "N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!\n\nPaste your string here:", "", Uh, null);
  }
  function w(b, c) {
    try {
      WazeWrap.Alerts[b](GM_info.script.name, c);
    } catch (a) {
      console.error(a), alert(c);
    }
  }
  function H(b) {
    b = void 0 === b ? I.zoom : b;
    return b < d.switchZoom;
  }
  function R() {
    0 !== W.model.actionManager.unsavedActionsNum() || WazeWrap.hasSelectedFeatures() || 0 !== document.querySelectorAll(".place-update-edit.show").length || W.controller.reload();
  }
  function M(b, c) {
    1 === b ? (x("Changing SVL Layer visibility to " + c), A.setVisibility(c)) : ba ? (x("Changing Road Layer visibility to " + c), ba.setVisibility(c)) : console.warn("SVL: cannot toggle the WME's road layer");
    if (!sa[b] && (x("Initialising layer " + b), sa[b] = document.getElementById(1 === b ? "layer-switcher-item_street_vector_layer" : "layer-switcher-item_road"), !sa[b])) {
      console.warn("SVL: cannot find checkbox for layer number " + b);
      return;
    }
    sa[b].checked = c;
  }
  function ya(b, c) {
    c = void 0 === c ? !0 : c;
    x("savePreferences");
    b.version = "5.0.4";
    try {
      window.localStorage.setItem("svl", JSON.stringify(b)), c || w("success", "Preferences saved!");
    } catch (a) {
      console.error(a), w("error", "Could not save the preferences, your browser local storage seems to be full.");
    }
  }
  function Vh(b) {
    var c = b.s, a = b.roadType;
    b = b.v;
    return d.realsize ? c ? b ? c : 0.6 * c : b ? Ha[a] : 0.6 * Ha[a] : parseInt(O[a].strokeWidth, 10);
  }
  function Y(b) {
    b = void 0 === b ? !1 : b;
    var c = !0, a = null;
    if (!0 === b) {
      window.localStorage.removeItem("svl");
    } else {
      var e = window.localStorage.getItem("svl");
      e && (a = JSON.parse(e));
    }
    null === a && (b ? x("Overwriting existing preferences") : (c = !1, x("Creating new preferences for the first time")));
    d = {autoReload:{}};
    var f, h, m;
    d.autoReload.interval = null != (m = null == (f = a) ? void 0 : null == (h = f.autoReload) ? void 0 : h.interval) ? m : 60000;
    var l, q, u;
    d.autoReload.enabled = null != (u = null == (l = a) ? void 0 : null == (q = l.autoReload) ? void 0 : q.enabled) ? u : !1;
    var p, y;
    d.showSLSinglecolor = null != (y = null == (p = a) ? void 0 : p.showSLSinglecolor) ? y : !1;
    var v, g;
    d.SLColor = null != (g = null == (v = a) ? void 0 : v.SLColor) ? g : "#ffdf00";
    var C, F, D, t, G;
    d.fakelock = null != (G = null != (t = null == (C = a) ? void 0 : C.fakelock) ? t : null == (F = WazeWrap) ? void 0 : null == (D = F.User) ? void 0 : D.Rank()) ? G : 6;
    var K, S;
    d.hideMinorRoads = null != (S = null == (K = a) ? void 0 : K.hideMinorRoads) ? S : !0;
    var J, B;
    d.showDashedUnverifiedSL = null != (B = null == (J = a) ? void 0 : J.showDashedUnverifiedSL) ? B : !0;
    var U, ca;
    d.showSLcolor = null != (ca = null == (U = a) ? void 0 : U.showSLcolor) ? ca : !0;
    var da, ea;
    d.showSLtext = null != (ea = null == (da = a) ? void 0 : da.showSLtext) ? ea : !0;
    var fa, ha;
    d.disableRoadLayers = null != (ha = null == (fa = a) ? void 0 : fa.disableRoadLayers) ? ha : !0;
    var ia, ja;
    d.startDisabled = null != (ja = null == (ia = a) ? void 0 : ia.startDisabled) ? ja : !1;
    var ka, la;
    d.clutterConstant = null != (la = null == (ka = a) ? void 0 : ka.clutterConstant) ? la : 7;
    var ma, na;
    d.labelOutlineWidth = null != (na = null == (ma = a) ? void 0 : ma.labelOutlineWidth) ? na : 3;
    var oa, Ia;
    d.closeZoomLabelSize = null != (Ia = null == (oa = a) ? void 0 : oa.closeZoomLabelSize) ? Ia : 14;
    var Ja, Ka;
    d.farZoomLabelSize = null != (Ka = null == (Ja = a) ? void 0 : Ja.farZoomLabelSize) ? Ka : 12;
    var La, Ma;
    d.useWMERoadLayerAtZoom = null != (Ma = null == (La = a) ? void 0 : La.useWMERoadLayerAtZoom) ? Ma : 1;
    var Na, Oa;
    d.switchZoom = null != (Oa = null == (Na = a) ? void 0 : Na.switchZoom) ? Oa : 5;
    var Pa, Qa;
    d.arrowDeclutter = null != (Qa = null == (Pa = a) ? void 0 : Pa.arrowDeclutter) ? Qa : 140;
    var Ra, Sa;
    d.segmentsThreshold = null != (Sa = null == (Ra = a) ? void 0 : Ra.segmentsThreshold) ? Sa : 3000;
    var Ta, Ua;
    d.nodesThreshold = null != (Ua = null == (Ta = a) ? void 0 : Ta.nodesThreshold) ? Ua : 4000;
    var Va, Wa;
    d.showUnderGPSPoints = null != (Wa = null == (Va = a) ? void 0 : Va.showUnderGPSPoints) ? Wa : !1;
    var Xa, Ya;
    d.routingModeEnabled = null != (Ya = null == (Xa = a) ? void 0 : Xa.routingModeEnabled) ? Ya : !1;
    var Za, $a;
    d.realsize = null != ($a = null == (Za = a) ? void 0 : Za.realsize) ? $a : !0;
    var ab, bb;
    d.showANs = null != (bb = null == (ab = a) ? void 0 : ab.showANs) ? bb : !1;
    var cb, db;
    d.renderGeomNodes = null != (db = null == (cb = a) ? void 0 : cb.renderGeomNodes) ? db : !1;
    d.streets = [];
    var eb, fb, gb, hb, ib, jb, kb, lb, mb;
    d.streets[1] = {strokeColor:null != (kb = null == (eb = a) ? void 0 : null == (fb = eb.streets[1]) ? void 0 : fb.strokeColor) ? kb : "#FFFFFF", strokeWidth:null != (lb = null == (gb = a) ? void 0 : null == (hb = gb.streets[1]) ? void 0 : hb.strokeWidth) ? lb : 10, strokeDashstyle:null != (mb = null == (ib = a) ? void 0 : null == (jb = ib.streets[1]) ? void 0 : jb.strokeDashstyle) ? mb : "solid", };
    var nb, ob, pb, qb, rb, sb, tb, ub, vb;
    d.streets[20] = {strokeColor:null != (tb = null == (nb = a) ? void 0 : null == (ob = nb.streets[20]) ? void 0 : ob.strokeColor) ? tb : "#2282ab", strokeWidth:null != (ub = null == (pb = a) ? void 0 : null == (qb = pb.streets[20]) ? void 0 : qb.strokeWidth) ? ub : 9, strokeDashstyle:null != (vb = null == (rb = a) ? void 0 : null == (sb = rb.streets[20]) ? void 0 : sb.strokeDashstyle) ? vb : "solid", };
    var wb, xb, yb, zb, Ab, Bb, Cb, Db, Eb;
    d.streets[4] = {strokeColor:null != (Cb = null == (wb = a) ? void 0 : null == (xb = wb.streets[4]) ? void 0 : xb.strokeColor) ? Cb : "#3FC91C", strokeWidth:null != (Db = null == (yb = a) ? void 0 : null == (zb = yb.streets[4]) ? void 0 : zb.strokeWidth) ? Db : 11, strokeDashstyle:null != (Eb = null == (Ab = a) ? void 0 : null == (Bb = Ab.streets[4]) ? void 0 : Bb.strokeDashstyle) ? Eb : "solid", };
    var Fb, Gb, Hb, Ib, Jb, Kb, Lb, Mb, Nb;
    d.streets[3] = {strokeColor:null != (Lb = null == (Fb = a) ? void 0 : null == (Gb = Fb.streets[3]) ? void 0 : Gb.strokeColor) ? Lb : "#387FB8", strokeWidth:null != (Mb = null == (Hb = a) ? void 0 : null == (Ib = Hb.streets[3]) ? void 0 : Ib.strokeWidth) ? Mb : 18, strokeDashstyle:null != (Nb = null == (Jb = a) ? void 0 : null == (Kb = Jb.streets[3]) ? void 0 : Kb.strokeDashstyle) ? Nb : "solid", };
    var Ob, Pb, Qb, Rb, Sb, Tb, Ub, Vb, Wb;
    d.streets[7] = {strokeColor:null != (Ub = null == (Ob = a) ? void 0 : null == (Pb = Ob.streets[7]) ? void 0 : Pb.strokeColor) ? Ub : "#ECE589", strokeWidth:null != (Vb = null == (Qb = a) ? void 0 : null == (Rb = Qb.streets[7]) ? void 0 : Rb.strokeWidth) ? Vb : 14, strokeDashstyle:null != (Wb = null == (Sb = a) ? void 0 : null == (Tb = Sb.streets[7]) ? void 0 : Tb.strokeDashstyle) ? Wb : "solid", };
    var Xb, Yb, Zb, $b, ac, bc, cc, dc, ec;
    d.streets[6] = {strokeColor:null != (cc = null == (Xb = a) ? void 0 : null == (Yb = Xb.streets[6]) ? void 0 : Yb.strokeColor) ? cc : "#C13040", strokeWidth:null != (dc = null == (Zb = a) ? void 0 : null == ($b = Zb.streets[6]) ? void 0 : $b.strokeWidth) ? dc : 16, strokeDashstyle:null != (ec = null == (ac = a) ? void 0 : null == (bc = ac.streets[6]) ? void 0 : bc.strokeDashstyle) ? ec : "solid", };
    var fc, gc, hc, ic, jc, kc, lc, mc, nc;
    d.streets[16] = {strokeColor:null != (lc = null == (fc = a) ? void 0 : null == (gc = fc.streets[16]) ? void 0 : gc.strokeColor) ? lc : "#B700FF", strokeWidth:null != (mc = null == (hc = a) ? void 0 : null == (ic = hc.streets[16]) ? void 0 : ic.strokeWidth) ? mc : 5, strokeDashstyle:null != (nc = null == (jc = a) ? void 0 : null == (kc = jc.streets[16]) ? void 0 : kc.strokeDashstyle) ? nc : "dash", };
    var oc, pc, qc, rc, sc, tc, uc, vc, wc;
    d.streets[5] = {strokeColor:null != (uc = null == (oc = a) ? void 0 : null == (pc = oc.streets[5]) ? void 0 : pc.strokeColor) ? uc : "#00FF00", strokeWidth:null != (vc = null == (qc = a) ? void 0 : null == (rc = qc.streets[5]) ? void 0 : rc.strokeWidth) ? vc : 5, strokeDashstyle:null != (wc = null == (sc = a) ? void 0 : null == (tc = sc.streets[5]) ? void 0 : tc.strokeDashstyle) ? wc : "dash", };
    var xc, yc, zc, Ac, Bc, Cc, Dc, Ec, Fc;
    d.streets[8] = {strokeColor:null != (Dc = null == (xc = a) ? void 0 : null == (yc = xc.streets[8]) ? void 0 : yc.strokeColor) ? Dc : "#82614A", strokeWidth:null != (Ec = null == (zc = a) ? void 0 : null == (Ac = zc.streets[8]) ? void 0 : Ac.strokeWidth) ? Ec : 7, strokeDashstyle:null != (Fc = null == (Bc = a) ? void 0 : null == (Cc = Bc.streets[8]) ? void 0 : Cc.strokeDashstyle) ? Fc : "solid", };
    var Gc, Hc, Ic, Jc, Kc, Lc, Mc, Nc, Oc;
    d.streets[15] = {strokeColor:null != (Mc = null == (Gc = a) ? void 0 : null == (Hc = Gc.streets[15]) ? void 0 : Hc.strokeColor) ? Mc : "#FF8000", strokeWidth:null != (Nc = null == (Ic = a) ? void 0 : null == (Jc = Ic.streets[15]) ? void 0 : Jc.strokeWidth) ? Nc : 5, strokeDashstyle:null != (Oc = null == (Kc = a) ? void 0 : null == (Lc = Kc.streets[15]) ? void 0 : Lc.strokeDashstyle) ? Oc : "dashdot", };
    var Pc, Qc, Rc, Sc, Tc, Uc, Vc, Wc, Xc;
    d.streets[18] = {strokeColor:null != (Vc = null == (Pc = a) ? void 0 : null == (Qc = Pc.streets[18]) ? void 0 : Qc.strokeColor) ? Vc : "#FFFFFF", strokeWidth:null != (Wc = null == (Rc = a) ? void 0 : null == (Sc = Rc.streets[18]) ? void 0 : Sc.strokeWidth) ? Wc : 8, strokeDashstyle:null != (Xc = null == (Tc = a) ? void 0 : null == (Uc = Tc.streets[18]) ? void 0 : Uc.strokeDashstyle) ? Xc : "dash", };
    var Yc, Zc, $c, ad, bd, cd, dd, ed, fd;
    d.streets[17] = {strokeColor:null != (dd = null == (Yc = a) ? void 0 : null == (Zc = Yc.streets[17]) ? void 0 : Zc.strokeColor) ? dd : "#00FFB3", strokeWidth:null != (ed = null == ($c = a) ? void 0 : null == (ad = $c.streets[17]) ? void 0 : ad.strokeWidth) ? ed : 7, strokeDashstyle:null != (fd = null == (bd = a) ? void 0 : null == (cd = bd.streets[17]) ? void 0 : cd.strokeDashstyle) ? fd : "solid", };
    var gd, hd, id, jd, kd, ld, md, nd, od;
    d.streets[22] = {strokeColor:null != (md = null == (gd = a) ? void 0 : null == (hd = gd.streets[22]) ? void 0 : hd.strokeColor) ? md : "#C6C7FF", strokeWidth:null != (nd = null == (id = a) ? void 0 : null == (jd = id.streets[22]) ? void 0 : jd.strokeWidth) ? nd : 6, strokeDashstyle:null != (od = null == (kd = a) ? void 0 : null == (ld = kd.streets[22]) ? void 0 : ld.strokeDashstyle) ? od : "solid", };
    var pd, qd, rd, sd, td, ud, vd, wd, xd;
    d.streets[19] = {strokeColor:null != (vd = null == (pd = a) ? void 0 : null == (qd = pd.streets[19]) ? void 0 : qd.strokeColor) ? vd : "#00FF00", strokeWidth:null != (wd = null == (rd = a) ? void 0 : null == (sd = rd.streets[19]) ? void 0 : sd.strokeWidth) ? wd : 5, strokeDashstyle:null != (xd = null == (td = a) ? void 0 : null == (ud = td.streets[19]) ? void 0 : ud.strokeDashstyle) ? xd : "dashdot", };
    var yd, zd, Ad, Bd, Cd, Dd, Ed, Fd, Gd;
    d.streets[2] = {strokeColor:null != (Ed = null == (yd = a) ? void 0 : null == (zd = yd.streets[2]) ? void 0 : zd.strokeColor) ? Ed : "#CBA12E", strokeWidth:null != (Fd = null == (Ad = a) ? void 0 : null == (Bd = Ad.streets[2]) ? void 0 : Bd.strokeWidth) ? Fd : 12, strokeDashstyle:null != (Gd = null == (Cd = a) ? void 0 : null == (Dd = Cd.streets[2]) ? void 0 : Dd.strokeDashstyle) ? Gd : "solid", };
    var Hd, Id, Jd, Kd, Ld, Md, Nd, Od, Pd;
    d.streets[10] = {strokeColor:null != (Nd = null == (Hd = a) ? void 0 : null == (Id = Hd.streets[10]) ? void 0 : Id.strokeColor) ? Nd : "#0000FF", strokeWidth:null != (Od = null == (Jd = a) ? void 0 : null == (Kd = Jd.streets[10]) ? void 0 : Kd.strokeWidth) ? Od : 5, strokeDashstyle:null != (Pd = null == (Ld = a) ? void 0 : null == (Md = Ld.streets[10]) ? void 0 : Md.strokeDashstyle) ? Pd : "dash", };
    var Qd, Rd, Sd, Td, Ud, Vd;
    d.red = {strokeColor:null != (Ud = null == (Qd = a) ? void 0 : null == (Rd = Qd.red) ? void 0 : Rd.strokeColor) ? Ud : "#FF0000", strokeDashstyle:null != (Vd = null == (Sd = a) ? void 0 : null == (Td = Sd.red) ? void 0 : Td.strokeDashstyle) ? Vd : "solid", };
    var Wd, Xd, Yd, Zd, $d, ae, be, ce, de;
    d.roundabout = {strokeColor:null != (be = null == (Wd = a) ? void 0 : null == (Xd = Wd.roundabout) ? void 0 : Xd.strokeColor) ? be : "#111", strokeWidth:null != (ce = null == (Yd = a) ? void 0 : null == (Zd = Yd.roundabout) ? void 0 : Zd.strokeWidth) ? ce : 1, strokeDashstyle:null != (de = null == ($d = a) ? void 0 : null == (ae = $d.roundabout) ? void 0 : ae.strokeDashstyle) ? de : "dash", };
    var ee, fe, ge, he, ie, je, ke, le;
    d.lanes = {strokeColor:null != (je = null == (ee = a) ? void 0 : null == (fe = ee.lanes) ? void 0 : fe.strokeColor) ? je : "#454443", strokeDashstyle:null != (ke = null == (ge = a) ? void 0 : null == (he = ge.lanes) ? void 0 : he.strokeDashstyle) ? ke : "dash", strokeOpacity:null != (le = null == Y ? void 0 : null == (ie = Y.lanes) ? void 0 : ie.strokeOpacity) ? le : 0.9, };
    var me, ne, oe, pe, qe, re, se, te, ue;
    d.toll = {strokeColor:null != (se = null == (me = a) ? void 0 : null == (ne = me.toll) ? void 0 : ne.strokeColor) ? se : "#00E1FF", strokeDashstyle:null != (te = null == (oe = a) ? void 0 : null == (pe = oe.toll) ? void 0 : pe.strokeDashstyle) ? te : "solid", strokeOpacity:null != (ue = null == (qe = a) ? void 0 : null == (re = qe.toll) ? void 0 : re.strokeOpacity) ? ue : 1.0, };
    var ve, we, xe, ye, ze, Ae, Be, Ce, De;
    d.closure = {strokeColor:null != (Be = null == (ve = a) ? void 0 : null == (we = ve.closure) ? void 0 : we.strokeColor) ? Be : "#FF00FF", strokeOpacity:null != (Ce = null == (xe = a) ? void 0 : null == (ye = xe.closure) ? void 0 : ye.strokeOpacity) ? Ce : 1.0, strokeDashstyle:null != (De = null == (ze = a) ? void 0 : null == (Ae = ze.closure) ? void 0 : Ae.strokeDashstyle) ? De : "dash", };
    var Ee, Fe, Ge, He, Ie, Je, Ke, Le, Me;
    d.headlights = {strokeColor:null != (Ke = null == (Ee = a) ? void 0 : null == (Fe = Ee.headlights) ? void 0 : Fe.strokeColor) ? Ke : "#bfff00", strokeOpacity:null != (Le = null == (Ge = a) ? void 0 : null == (He = Ge.headlights) ? void 0 : He.strokeOpacity) ? Le : 0.9, strokeDashstyle:null != (Me = null == (Ie = a) ? void 0 : null == (Je = Ie.headlights) ? void 0 : Je.strokeDashstyle) ? Me : "dot", };
    var Ne, Oe, Pe, Qe, Re, Se, Te, Ue, Ve;
    d.nearbyHOV = {strokeColor:null != (Te = null == (Ne = a) ? void 0 : null == (Oe = Ne.nearbyHOV) ? void 0 : Oe.strokeColor) ? Te : "#ff66ff", strokeOpacity:null != (Ue = null == (Pe = a) ? void 0 : null == (Qe = Pe.nearbyHOV) ? void 0 : Qe.strokeOpacity) ? Ue : 1.0, strokeDashstyle:null != (Ve = null == (Re = a) ? void 0 : null == (Se = Re.nearbyHOV) ? void 0 : Se.strokeDashstyle) ? Ve : "dash", };
    var We, Xe, Ye, Ze, $e, af, bf, cf, df;
    d.restriction = {strokeColor:null != (bf = null == (We = a) ? void 0 : null == (Xe = We.restriction) ? void 0 : Xe.strokeColor) ? bf : "#F2FF00", strokeOpacity:null != (cf = null == (Ye = a) ? void 0 : null == (Ze = Ye.restriction) ? void 0 : Ze.strokeOpacity) ? cf : 1.0, strokeDashstyle:null != (df = null == ($e = a) ? void 0 : null == (af = $e.restriction) ? void 0 : af.strokeDashstyle) ? df : "dash", };
    var ef, ff, gf, hf, jf, kf, lf, mf, nf;
    d.dirty = {strokeColor:null != (lf = null == (ef = a) ? void 0 : null == (ff = ef.dirty) ? void 0 : ff.strokeColor) ? lf : "#82614A", strokeOpacity:null != (mf = null == (gf = a) ? void 0 : null == (hf = gf.dirty) ? void 0 : hf.strokeOpacity) ? mf : 0.6, strokeDashstyle:null != (nf = null == (jf = a) ? void 0 : null == (kf = jf.dirty) ? void 0 : kf.strokeDashstyle) ? nf : "longdash", };
    d.speeds = {};
    var of, pf, qf;
    d.speeds["default"] = null != (qf = null == (of = a) ? void 0 : null == (pf = of.speed) ? void 0 : pf["default"]) ? qf : "#cc0000";
    var rf, sf;
    if (null == (rf = a) ? 0 : null == (sf = rf.speeds) ? 0 : sf.metric) {
      d.speeds.metric = a.speeds.metric;
    } else {
      d.speeds.metric = {};
      var tf, uf, vf;
      d.speeds.metric[5] = null != (vf = null == (tf = a) ? void 0 : null == (uf = tf.speeds) ? void 0 : uf.metric[5]) ? vf : "#542344";
      var wf, xf, yf;
      d.speeds.metric[7] = null != (yf = null == (wf = a) ? void 0 : null == (xf = wf.speeds) ? void 0 : xf.metric[7]) ? yf : "#ff5714";
      var zf, Af, Bf;
      d.speeds.metric[10] = null != (Bf = null == (zf = a) ? void 0 : null == (Af = zf.speeds) ? void 0 : Af.metric[10]) ? Bf : "#ffbf00";
      var Cf, Df, Ef;
      d.speeds.metric[20] = null != (Ef = null == (Cf = a) ? void 0 : null == (Df = Cf.speeds) ? void 0 : Df.metric[20]) ? Ef : "#ee0000";
      var Ff, Gf, Hf;
      d.speeds.metric[30] = null != (Hf = null == (Ff = a) ? void 0 : null == (Gf = Ff.speeds) ? void 0 : Gf.metric[30]) ? Hf : "#e4ff1a";
      var If, Jf, Kf;
      d.speeds.metric[40] = null != (Kf = null == (If = a) ? void 0 : null == (Jf = If.speeds) ? void 0 : Jf.metric[40]) ? Kf : "#993300";
      var Lf, Mf, Nf;
      d.speeds.metric[50] = null != (Nf = null == (Lf = a) ? void 0 : null == (Mf = Lf.speeds) ? void 0 : Mf.metric[50]) ? Nf : "#33ff33";
      var Of, Pf, Qf;
      d.speeds.metric[60] = null != (Qf = null == (Of = a) ? void 0 : null == (Pf = Of.speeds) ? void 0 : Pf.metric[60]) ? Qf : "#639fab";
      var Rf, Sf, Tf;
      d.speeds.metric[70] = null != (Tf = null == (Rf = a) ? void 0 : null == (Sf = Rf.speeds) ? void 0 : Sf.metric[70]) ? Tf : "#00ffff";
      var Uf, Vf, Wf;
      d.speeds.metric[80] = null != (Wf = null == (Uf = a) ? void 0 : null == (Vf = Uf.speeds) ? void 0 : Vf.metric[80]) ? Wf : "#00bfff";
      var Xf, Yf, Zf;
      d.speeds.metric[90] = null != (Zf = null == (Xf = a) ? void 0 : null == (Yf = Xf.speeds) ? void 0 : Yf.metric[90]) ? Zf : "#0066ff";
      var $f, ag, bg;
      d.speeds.metric[100] = null != (bg = null == ($f = a) ? void 0 : null == (ag = $f.speeds) ? void 0 : ag.metric[100]) ? bg : "#ff00ff";
      var cg, dg, eg;
      d.speeds.metric[110] = null != (eg = null == (cg = a) ? void 0 : null == (dg = cg.speeds) ? void 0 : dg.metric[110]) ? eg : "#ff0080";
      var fg, gg, hg;
      d.speeds.metric[120] = null != (hg = null == (fg = a) ? void 0 : null == (gg = fg.speeds) ? void 0 : gg.metric[120]) ? hg : "#ff0000";
      var ig, jg, kg;
      d.speeds.metric[130] = null != (kg = null == (ig = a) ? void 0 : null == (jg = ig.speeds) ? void 0 : jg.metric[130]) ? kg : "#ff9000";
      var lg, mg, ng;
      d.speeds.metric[140] = null != (ng = null == (lg = a) ? void 0 : null == (mg = lg.speeds) ? void 0 : mg.metric[140]) ? ng : "#ff4000";
      var og, pg, qg;
      d.speeds.metric[150] = null != (qg = null == (og = a) ? void 0 : null == (pg = og.speeds) ? void 0 : pg.metric[150]) ? qg : "#0040ff";
    }
    var rg, sg;
    if (null == (rg = a) ? 0 : null == (sg = rg.speeds) ? 0 : sg.imperial) {
      d.speeds.imperial = a.speeds.imperial;
    } else {
      d.speeds.imperial = {};
      var tg, ug, vg;
      d.speeds.imperial[5] = null != (vg = null == (tg = a) ? void 0 : null == (ug = tg.speeds) ? void 0 : ug.imperial[5]) ? vg : "#ff0000";
      var wg, xg, yg;
      d.speeds.imperial[10] = null != (yg = null == (wg = a) ? void 0 : null == (xg = wg.speeds) ? void 0 : xg.imperial[10]) ? yg : "#ff8000";
      var zg, Ag, Bg;
      d.speeds.imperial[15] = null != (Bg = null == (zg = a) ? void 0 : null == (Ag = zg.speeds) ? void 0 : Ag.imperial[15]) ? Bg : "#ffb000";
      var Cg, Dg, Eg;
      d.speeds.imperial[20] = null != (Eg = null == (Cg = a) ? void 0 : null == (Dg = Cg.speeds) ? void 0 : Dg.imperial[20]) ? Eg : "#bfff00";
      var Fg, Gg, Hg;
      d.speeds.imperial[25] = null != (Hg = null == (Fg = a) ? void 0 : null == (Gg = Fg.speeds) ? void 0 : Gg.imperial[25]) ? Hg : "#993300";
      var Ig, Jg, Kg;
      d.speeds.imperial[30] = null != (Kg = null == (Ig = a) ? void 0 : null == (Jg = Ig.speeds) ? void 0 : Jg.imperial[30]) ? Kg : "#33ff33";
      var Lg, Mg, Ng;
      d.speeds.imperial[35] = null != (Ng = null == (Lg = a) ? void 0 : null == (Mg = Lg.speeds) ? void 0 : Mg.imperial[35]) ? Ng : "#00ff90";
      var Og, Pg, Qg;
      d.speeds.imperial[40] = null != (Qg = null == (Og = a) ? void 0 : null == (Pg = Og.speeds) ? void 0 : Pg.imperial[40]) ? Qg : "#00ffff";
      var Rg, Sg, Tg;
      d.speeds.imperial[45] = null != (Tg = null == (Rg = a) ? void 0 : null == (Sg = Rg.speeds) ? void 0 : Sg.imperial[45]) ? Tg : "#00bfff";
      var Ug, Vg, Wg;
      d.speeds.imperial[50] = null != (Wg = null == (Ug = a) ? void 0 : null == (Vg = Ug.speeds) ? void 0 : Vg.imperial[50]) ? Wg : "#0066ff";
      var Xg, Yg, Zg;
      d.speeds.imperial[55] = null != (Zg = null == (Xg = a) ? void 0 : null == (Yg = Xg.speeds) ? void 0 : Yg.imperial[55]) ? Zg : "#ff00ff";
      var $g, ah, bh;
      d.speeds.imperial[60] = null != (bh = null == ($g = a) ? void 0 : null == (ah = $g.speeds) ? void 0 : ah.imperial[60]) ? bh : "#ff0050";
      var ch, dh, eh;
      d.speeds.imperial[65] = null != (eh = null == (ch = a) ? void 0 : null == (dh = ch.speeds) ? void 0 : dh.imperial[65]) ? eh : "#ff9010";
      var fh, gh, hh;
      d.speeds.imperial[70] = null != (hh = null == (fh = a) ? void 0 : null == (gh = fh.speeds) ? void 0 : gh.imperial[70]) ? hh : "#0040ff";
      var ih, jh, kh;
      d.speeds.imperial[75] = null != (kh = null == (ih = a) ? void 0 : null == (jh = ih.speeds) ? void 0 : jh.imperial[75]) ? kh : "#10ff10";
      var lh, mh, nh;
      d.speeds.imperial[80] = null != (nh = null == (lh = a) ? void 0 : null == (mh = lh.speeds) ? void 0 : mh.imperial[80]) ? nh : "#ff4000";
      var oh, ph, qh;
      d.speeds.imperial[85] = null != (qh = null == (oh = a) ? void 0 : null == (ph = oh.speeds) ? void 0 : ph.imperial[85]) ? qh : "#ff0000";
    }
    ya(d);
    return c;
  }
  function za(b) {
    if (d.showSLSinglecolor) {
      return d.SLColor;
    }
    var c;
    return null != (c = d.speeds[W.prefs.attributes.isImperial ? "imperial" : "metric"][b]) ? c : d.speeds["default"];
  }
  function rh(b, c, a) {
    b ? (b = a.x - c.x, c = a.y - c.y) : (b = c.x - a.x, c = c.y - a.y);
    return 180 * Math.atan2(b, c) / Math.PI;
  }
  function pa(b) {
    var c = "";
    if (b) {
      b = b.toString();
      for (var a = 0; a < b.length; a += 1) {
        c += Wh[b.charAt(a)];
      }
    }
    return c;
  }
  function sh(b, c, a) {
    a = void 0 === a ? !1 : a;
    var e, f, h = [];
    var m = null;
    var l = b.getAttributes(), q = b.getAddress(), u = b.hasNonEmptyStreet();
    if (null !== l.primaryStreetID && void 0 === q.attributes.state) {
      x("Address not ready", q, l), setTimeout(function() {
        sh(b, c, !0);
      }, 500);
    } else {
      var p = q.attributes;
      q = "";
      u ? q = p.street.name : 10 > l.roadType && !b.isInRoundabout() && (q = "\u2691");
      u = "";
      if (d.showANs) {
        for (var y = 0, v = 0; v < l.streetIDs.length; v += 1) {
          var g = l.streetIDs[v];
          if (2 === y) {
            u += " \u2026";
            break;
          }
          (g = W.model.streets.objects[g]) && g.name !== p.street.name && (y += 1, u += g.name ? "(" + g.name + ")" : "");
        }
        u = u.replace(")(", ", ");
        "" !== u && (u = "\n" + u);
      }
      O[l.roadType] || (q += "\n!! UNSUPPORTED ROAD TYPE !!");
      p = "";
      (null != (e = l.fwdMaxSpeed) ? e : l.revMaxSpeed) && d.showSLtext && (l.fwdMaxSpeed === l.revMaxSpeed ? p = pa(l.fwdMaxSpeed) : l.fwdMaxSpeed ? (p = pa(l.fwdMaxSpeed), l.revMaxSpeed && (p += "'" + pa(l.revMaxSpeed))) : (p = pa(l.revMaxSpeed), l.fwdMaxSpeed && (p += "'" + pa(l.fwdMaxSpeed))), l.fwdMaxSpeedUnverified || l.revMaxSpeedUnverified) && (p += "?");
      e = q + " " + p;
      if (" " === e) {
        return [];
      }
      p = l.roadType;
      p = new OpenLayers.Feature.Vector(c[0], {myId:l.id, color:O[p] ? O[p].strokeColor : "#f00", outlinecolor:O[p] ? O[p].outlineColor : "#fff", outlinewidth:d.labelOutlineWidth, });
      y = [];
      for (v = 0; v < c.length - 1; v += 1) {
        g = c[v].distanceTo(c[v + 1]), y.push({index:v, g:g});
      }
      y.sort(function(G, K) {
        return G.g > K.g ? -1 : G.g < K.g ? 1 : 0;
      });
      v = "" === q ? 1 : y.length;
      g = th * e.length;
      for (var C = 0; C < y.length && 0 < v && !(y[C].g < (0 < C ? g : g - 30)); C += 1) {
        var F = y[C].index;
        var D = f = 0;
        D = c[F];
        var t = (new OpenLayers.Geometry.LineString([D, c[F + 1], ])).getCentroid(!0);
        m = p.clone();
        m.geometry = t;
        l.fwdDirection ? (f = t.x - D.x, D = t.y - D.y) : (f = D.x - t.x, D = D.y - t.y);
        D = 90 + 180 * Math.atan2(f, D) / Math.PI;
        "" !== q ? (f = " \u25b6 ", 90 < D && 270 > D ? D -= 180 : f = " \u25c0 ") : f = "";
        b.isOneWay() || (f = "");
        m.attributes.label = f + e + f + u;
        m.attributes.angle = D;
        m.attributes.a = 1 === F % 2;
        m.attributes.u = v;
        --v;
        h.push(m);
      }
    }
    a && m && z.addFeatures(h, {silent:!0});
    return h;
  }
  function uh(b) {
    var c = b.id, a = b.rev, e = b.j, f = b.l;
    b = rh(b.i, a ? f : e, a ? e : f);
    return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(e.x + 10 * Math.sin(b), e.y + 10 * Math.cos(b)), {myId:c, }, {rotation:b, externalGraphic:"https://raw.githubusercontent.com/bedo2991/svl/master/average.png", graphicWidth:36, graphicHeight:36, graphicZIndex:300, fillOpacity:1, pointerEvents:"none", });
  }
  function Xh(b) {
    var c = b.getAttributes();
    x("Drawing segment: " + c.id);
    var a = c.geometry.components, e = c.geometry.getVertices(), f = (new OpenLayers.Geometry.LineString(e)).simplify(1.5).components, h = [], m = 100 * c.level, l = c.fwdDirection && c.revDirection, q = b.isInRoundabout(), u = !1, p = !1, y = c.roadType, v = Vh({s:c.width, roadType:y, v:l, });
    l = v;
    var g = null;
    if (null === c.primaryStreetID) {
      return g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.red.strokeColor, width:v, dash:d.red.strokeDashstyle, }), h.push(g), h;
    }
    d.routingModeEnabled && null !== c.routingRoadType && (y = c.routingRoadType);
    if (void 0 !== O[y]) {
      var C;
      p = null != (C = c.fwdMaxSpeed) ? C : c.revMaxSpeed;
      0 < c.level && (u = !0, g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:"#000000", zIndex:m + 100, width:v, }), h.push(g));
      if ((p = p && d.showSLcolor) && u) {
        l = 0.56 * v;
      } else {
        if (u || p) {
          l = 0.68 * v;
        }
      }
      if (p) {
        if (C = d.showDashedUnverifiedSL && (c.fwdMaxSpeedUnverified || c.revMaxSpeedUnverified) ? "dash" : "solid", d.showSLSinglecolor || !c.fwdMaxSpeed && !c.revMaxSpeed || c.fwdMaxSpeed === c.revMaxSpeed || b.isOneWay()) {
          p = c.fwdMaxSpeed, b.isOneWay() && c.revDirection && (p = c.revMaxSpeed), p && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:za(p), width:u ? 0.8 * v : v, dash:C, a:!0, zIndex:m + 115, }), h.push(g));
        } else {
          p = [];
          for (var F = [], D = 0; D < e.length - 1; D += 1) {
            var t = e[D], G = e[D + 1];
            g = t.x - G.x;
            var K = t.y - G.y;
            p[0] = t.clone();
            F[0] = t.clone();
            p[1] = G.clone();
            F[1] = G.clone();
            t = u ? 0.14 * v : 0.17 * v;
            if (0.5 > Math.abs(g)) {
              0 < K ? (p[0].move(-t, 0), p[1].move(-t, 0), F[0].move(t, 0), F[1].move(t, 0)) : (p[0].move(t, 0), p[1].move(t, 0), F[0].move(-t, 0), F[1].move(-t, 0));
            } else {
              var S = K / g;
              G = -1 / S;
              if (0.05 > Math.abs(S)) {
                0 < g ? (p[0].move(0, t), p[1].move(0, t), F[0].move(0, -t), F[1].move(0, -t)) : (p[0].move(0, -t), p[1].move(0, -t), F[0].move(0, t), F[1].move(0, t));
              } else {
                if (0 < K && 0 < g || 0 > g && 0 < K) {
                  t *= -1;
                }
                g = Math.sqrt(1 + G * G);
                p[0].move(t / g, G / g * t);
                p[1].move(t / g, G / g * t);
                F[0].move(-t / g, G / g * -t);
                F[1].move(-t / g, G / g * -t);
              }
            }
            g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(p), {myId:c.id, color:za(c.fwdMaxSpeed), width:l, dash:C, a:!0, zIndex:m + 105, });
            h.push(g);
            g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(F), {myId:c.id, color:za(c.revMaxSpeed), width:l, dash:C, a:!0, zIndex:m + 110, });
            h.push(g);
          }
        }
      }
      g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:O[y].strokeColor, width:l, dash:O[y].strokeDashstyle, zIndex:m + 120, });
      h.push(g);
      0 > c.level && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:"#000000", width:l, opacity:0.3, zIndex:m + 125, }), h.push(g));
      u = b.getLockRank() + 1;
      var J, B;
      if (u > d.fakelock || u > (null == (J = WazeWrap) ? void 0 : null == (B = J.User) ? void 0 : B.Rank())) {
        g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:vh.strokeColor, width:0.1 * l, dash:vh.strokeDashstyle, zIndex:m + 147, }), h.push(g);
      }
      J = b.getFlagAttributes();
      J.unpaved && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.dirty.strokeColor, width:0.7 * l, opacity:d.dirty.strokeOpacity, dash:d.dirty.strokeDashstyle, zIndex:m + 135, }), h.push(g));
      c.hasClosures && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.closure.strokeColor, width:0.6 * l, dash:d.closure.strokeDashstyle, opacity:d.closure.strokeOpacity, a:!0, zIndex:m + 140, }), h.push(g));
      if (c.fwdToll || c.revToll || c.restrictions.some(function(U) {
        return "TOLL" === U.getDefaultType();
      })) {
        g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.toll.strokeColor, width:0.3 * l, dash:d.toll.strokeDashstyle, opacity:d.toll.strokeOpacity, zIndex:m + 145, }), h.push(g);
      }
      q && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:Aa.strokeColor, width:0.15 * l, dash:Aa.strokeDashstyle, opacity:Aa.strokeOpacity, a:!0, zIndex:m + 150, }), h.push(g));
      0 < c.restrictions.length && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.restriction.strokeColor, width:0.4 * l, dash:d.restriction.strokeDashstyle, opacity:d.restriction.strokeOpacity, a:!0, zIndex:m + 155, }), h.push(g));
      !1 === c.validated && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:wh.strokeColor, width:0.5 * l, dash:wh.strokeDashstyle, a:!0, zIndex:m + 160, }), h.push(g));
      J.headlights && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.headlights.strokeColor, width:0.2 * l, dash:d.headlights.strokeDashstyle, opacity:d.headlights.strokeOpacity, a:!0, zIndex:m + 165, }));
      J.nearbyHOV && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.nearbyHOV.strokeColor, width:0.25 * l, dash:d.nearbyHOV.strokeDashstyle, opacity:d.nearbyHOV.strokeOpacity, a:!0, zIndex:m + 166, }));
      0 < c.fwdLaneCount && (B = e.slice(-2), B[0] = (new OpenLayers.Geometry.LineString([B[0], B[1], ])).getCentroid(!0), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(B), {myId:c.id, color:d.lanes.strokeColor, width:0.3 * l, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:m + 170, }), h.push(g));
      0 < c.revLaneCount && (B = e.slice(0, 2), B[1] = (new OpenLayers.Geometry.LineString([B[0], B[1], ])).getCentroid(!0), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(B), {myId:c.id, color:d.lanes.strokeColor, width:0.3 * l, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:m + 175, }), h.push(g));
      if (!1 === c.fwdDirection || !1 === c.revDirection) {
        if (B = a, !q && c.length / a.length < d.arrowDeclutter && (B = f), !1 === (c.fwdDirection || c.revDirection)) {
          for (u = 0; u < B.length - 1; u += 1) {
            h.push(new OpenLayers.Feature.Vector((new OpenLayers.Geometry.LineString([B[u], B[u + 1], ])).getCentroid(!0), {myId:c.id, a:!0, h:!0, zIndex:m + 180, }, Yh));
          }
        } else {
          for (u = q ? 3 : 1, y = u - 1; y < B.length - 1; y += u) {
            v = rh(c.fwdDirection, B[y], B[y + 1]), C = new OpenLayers.Geometry.LineString([B[y], B[y + 1], ]), h.push(new OpenLayers.Feature.Vector(C.getCentroid(!0), {myId:c.id, a:!0, h:!0, }, {graphicName:"myTriangle", rotation:v, stroke:!0, strokeColor:"#000", graphiczIndex:m + 180, strokeWidth:1.5, fill:!0, fillColor:"#fff", fillOpacity:0.7, pointRadius:5, }));
          }
        }
      }
      J.fwdSpeedCamera && h.push(uh({id:c.id, rev:!1, i:c.fwdDirection, j:a[0], l:a[1], }));
      J.revSpeedCamera && h.push(uh({id:c.id, rev:!0, i:c.fwdDirection, j:a[a.length - 1], l:a[a.length - 2], }));
      if (!0 === d.renderGeomNodes && !q) {
        for (q = 1; q < a.length - 2; q += 1) {
          h.push(new OpenLayers.Feature.Vector(a[q], {myId:c.id, zIndex:m + 200, a:!0, h:!0, }, Zh));
        }
      }
      J.tunnel && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:Ba.strokeColor, opacity:Ba.strokeOpacity, width:0.3 * l, dash:Ba.strokeDashstyle, zIndex:m + 177, }), h.push(g), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:xh.strokeColor, width:0.1 * l, dash:xh.strokeDashstyle, zIndex:m + 177, }), h.push(g));
    }
    b = sh(b, f);
    0 < b.length && z.addFeatures(b, {silent:!0});
    return h;
  }
  function yh(b) {
    b = b.getAttributes();
    var c = new OpenLayers.Geometry.Point(b.geometry.x, b.geometry.y);
    return new OpenLayers.Feature.Vector(c, {myid:b.id, }, zh(b));
  }
  function $h() {
    Y();
    Z(d);
    aa();
    w("info", "All's well that ends well! Now it's everything as it was before.");
  }
  function ai() {
    GM_setClipboard(JSON.stringify(d));
    w("info", "The configuration has been copied to your clipboard. Please paste it in a file (CTRL+V) to store it.");
  }
  function Uh(b, c) {
    if (null !== c && "" !== c) {
      try {
        d = JSON.parse(c);
      } catch (a) {
        w("error", "Your string seems to be somehow wrong. Please check that is a valid JSON string");
        return;
      }
      null !== d && d.streets ? (Z(d), ya(d), aa(), w("success", "Done, preferences imported!")) : w("error", "Something went wrong. Is your string correct?");
    }
  }
  function Ah() {
    var b = parseInt(W.map.getLayerByUniqueName("gps_points").getZIndex(), 10);
    d.showUnderGPSPoints ? (A.setZIndex(b - 2), E.setZIndex(b - 1)) : (A.setZIndex(b + 1), E.setZIndex(b + 2));
  }
  function Bh() {
    if (d.routingModeEnabled) {
      var b = document.createElement("div");
      b.id = "routingModeDiv";
      b.className = "routingDiv";
      b.innerHTML = "Routing Mode<br><small>Hover to temporary disable it<small>";
      b.addEventListener("mouseenter", function() {
        d.routingModeEnabled = !1;
        qa();
      });
      b.addEventListener("mouseleave", function() {
        d.routingModeEnabled = !0;
        qa();
      });
      document.getElementById("map").appendChild(b);
    } else {
      null == (b = document.getElementById("routingModeDiv")) || b.remove();
    }
  }
  function Ch() {
    clearInterval(Ca);
    Ca = null;
    d.autoReload && d.autoReload.enabled && (Ca = setInterval(R, d.autoReload.interval));
  }
  function Dh() {
    document.getElementById("svl_saveNewPref").classList.remove("disabled");
    document.getElementById("svl_saveNewPref").classList.add("btn-primary");
    document.getElementById("svl_rollbackButton").classList.remove("disabled");
    document.getElementById("sidepanel-svl").classList.add("svl_unsaved");
    for (var b = 0; b < d.streets.length; b += 1) {
      d.streets[b] && (d.streets[b] = {}, d.streets[b].strokeColor = document.getElementById("svl_streetColor_" + b).value, d.streets[b].strokeWidth = document.getElementById("svl_streetWidth_" + b).value, d.streets[b].strokeDashstyle = document.querySelector("#svl_strokeDashstyle_" + b + " option:checked").value);
    }
    d.fakelock = document.getElementById("svl_fakelock").value;
    b = W.prefs.attributes.isImperial ? "imperial" : "metric";
    var c = Object.keys(d.speeds[b]);
    d.speeds[b] = {};
    for (var a = 1; a < c.length + 1; a += 1) {
      d.speeds[b][document.getElementById("svl_slValue_" + b + "_" + a).value] = document.getElementById("svl_slColor_" + b + "_" + a).value;
    }
    d.speeds["default"] = document.getElementById("svl_slColor_" + b + "_Default").value;
    d.red = {};
    d.red.strokeColor = document.getElementById("svl_streetColor_red").value;
    d.red.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_red option:checked").value;
    d.dirty = {};
    d.dirty.strokeColor = document.getElementById("svl_streetColor_dirty").value;
    d.dirty.strokeOpacity = document.getElementById("svl_streetOpacity_dirty").value / 100.0;
    d.dirty.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_dirty option:checked").value;
    d.lanes = {};
    d.lanes.strokeColor = document.getElementById("svl_streetColor_lanes").value;
    d.lanes.strokeOpacity = document.getElementById("svl_streetOpacity_lanes").value / 100.0;
    d.lanes.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_lanes option:checked").value;
    d.toll = {};
    d.toll.strokeColor = document.getElementById("svl_streetColor_toll").value;
    d.toll.strokeOpacity = document.getElementById("svl_streetOpacity_toll").value / 100.0;
    d.toll.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_toll option:checked").value;
    d.restriction = {};
    d.restriction.strokeColor = document.getElementById("svl_streetColor_restriction").value;
    d.restriction.strokeOpacity = document.getElementById("svl_streetOpacity_restriction").value / 100.0;
    d.restriction.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_restriction option:checked").value;
    d.closure = {};
    d.closure.strokeColor = document.getElementById("svl_streetColor_closure").value;
    d.closure.strokeOpacity = document.getElementById("svl_streetOpacity_closure").value / 100.0;
    d.closure.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_closure option:checked").value;
    d.headlights = {};
    d.headlights.strokeColor = document.getElementById("svl_streetColor_headlights").value;
    d.headlights.strokeOpacity = document.getElementById("svl_streetOpacity_headlights").value / 100.0;
    d.headlights.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_headlights option:checked").value;
    d.nearbyHOV = {};
    d.nearbyHOV.strokeColor = document.getElementById("svl_streetColor_nearbyHOV").value;
    d.nearbyHOV.strokeOpacity = document.getElementById("svl_streetOpacity_nearbyHOV").value / 100.0;
    d.nearbyHOV.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_nearbyHOV option:checked").value;
    d.autoReload = {};
    d.autoReload.interval = 1000 * document.getElementById("svl_autoReload_interval").value;
    d.autoReload.enabled = document.getElementById("svl_autoReload_enabled").checked;
    d.clutterConstant = document.getElementById("svl_clutterConstant").value;
    d.arrowDeclutter = document.getElementById("svl_arrowDeclutter").value;
    d.labelOutlineWidth = document.getElementById("svl_labelOutlineWidth").value;
    d.disableRoadLayers = document.getElementById("svl_disableRoadLayers").checked;
    d.startDisabled = document.getElementById("svl_startDisabled").checked;
    d.showSLtext = document.getElementById("svl_showSLtext").checked;
    d.showSLcolor = document.getElementById("svl_showSLcolor").checked;
    d.showSLSinglecolor = document.getElementById("svl_showSLSinglecolor").checked;
    d.SLColor = document.getElementById("svl_SLColor").value;
    d.hideMinorRoads = document.getElementById("svl_hideMinorRoads").checked;
    d.showDashedUnverifiedSL = document.getElementById("svl_showDashedUnverifiedSL").checked;
    d.farZoomLabelSize = document.getElementById("svl_farZoomLabelSize").value;
    d.closeZoomLabelSize = document.getElementById("svl_closeZoomLabelSize").value;
    d.renderGeomNodes = document.getElementById("svl_renderGeomNodes").checked;
    d.nodesThreshold = document.getElementById("svl_nodesThreshold").value;
    d.segmentsThreshold = document.getElementById("svl_segmentsThreshold").value;
    d.showUnderGPSPoints !== document.getElementById("svl_showUnderGPSPoints").checked ? (d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked, Ah()) : d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked;
    d.routingModeEnabled !== document.getElementById("svl_routingModeEnabled").checked ? (d.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked, Bh()) : d.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked;
    d.useWMERoadLayerAtZoom = document.getElementById("svl_useWMERoadLayerAtZoom").value;
    d.switchZoom = document.getElementById("svl_switchZoom").value;
    d.showANs = document.getElementById("svl_showANs").checked;
    d.realsize = document.getElementById("svl_realsize").checked;
    d.realsize ? $("input.segmentsWidth").prop("disabled", !0) : $("input.segmentsWidth").prop("disabled", !1);
    Z(d);
    Ch();
  }
  function bi() {
    Dh();
    ya(d, !1);
    aa();
  }
  function ci() {
    x("rollbackDefault");
    WazeWrap.Alerts.confirm(GM_info.script.name, "Are you sure you want to rollback to the default settings?\nANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!", n, null, "Yes, I want to reset", "Cancel");
  }
  function Eh(b) {
    var c = I18n.translations[I18n.locale];
    switch(b) {
      case "red":
        var a, e, f;
        return null != (f = null == c ? void 0 : null == (a = c.segment) ? void 0 : null == (e = a.address) ? void 0 : e.none) ? f : b;
      case "toll":
        var h, m, l, q;
        return null != (q = null == c ? void 0 : null == (h = c.edit) ? void 0 : null == (m = h.segment) ? void 0 : null == (l = m.fields) ? void 0 : l.toll_road) ? q : b;
      case "restriction":
        var u, p, y;
        return null != (y = null == c ? void 0 : null == (u = c.restrictions) ? void 0 : null == (p = u.modal_headers) ? void 0 : p.restriction_summary) ? y : b;
      case "dirty":
        var v, g, C, F;
        return null != (F = null == c ? void 0 : null == (v = c.edit) ? void 0 : null == (g = v.segment) ? void 0 : null == (C = g.fields) ? void 0 : C.unpaved) ? F : b;
      case "closure":
        var D, t, G;
        return null != (G = null == c ? void 0 : null == (D = c.objects) ? void 0 : null == (t = D.roadClosure) ? void 0 : t.name) ? G : b;
      case "headlights":
        var K, S, J, B;
        return null != (B = null == c ? void 0 : null == (K = c.edit) ? void 0 : null == (S = K.segment) ? void 0 : null == (J = S.fields) ? void 0 : J.headlights) ? B : b;
      case "lanes":
        var U, ca, da;
        return null != (da = null == c ? void 0 : null == (U = c.objects) ? void 0 : null == (ca = U.lanes) ? void 0 : ca.title) ? da : b;
      case "speed limit":
        var ea, fa, ha, ia;
        return null != (ia = null == c ? void 0 : null == (ea = c.edit) ? void 0 : null == (fa = ea.segment) ? void 0 : null == (ha = fa.fields) ? void 0 : ha.speed_limit) ? ia : b;
      case "nearbyHOV":
        var ja, ka, la, ma;
        return null != (ma = null == c ? void 0 : null == (ja = c.edit) ? void 0 : null == (ka = ja.segment) ? void 0 : null == (la = ka.fields) ? void 0 : la.nearbyHOV) ? ma : b;
    }
    var na, oa;
    return null != (oa = null == c ? void 0 : null == (na = c.segment) ? void 0 : na.road_types[b]) ? oa : b;
  }
  function P(b) {
    var c = b.f, a = void 0 === b.c ? !0 : b.c, e = void 0 === b.b ? !1 : b.b;
    b = document.createElement("h5");
    b.innerText = Eh(c);
    var f = document.createElement("input");
    f.id = "svl_streetColor_" + c;
    f.className = "prefElement form-control";
    f.style.width = "55pt";
    f.title = "Color";
    f.type = "color";
    var h = document.createElement("div");
    a && (a = document.createElement("input"), a.id = "svl_streetWidth_" + c, a.className = Number.isInteger(c) ? "form-control prefElement segmentsWidth" : "form-control prefElement", a.style.width = "40pt", a.title = "Width (disabled if using real-size width)", a.type = "number", a.min = 1, a.max = 20, h.appendChild(a));
    e && (a = document.createElement("input"), a.id = "svl_streetOpacity_" + c, a.className = "form-control prefElement", a.style.width = "45pt", a.title = "Opacity", a.type = "number", a.min = 0, a.max = 100, a.step = 10, h.appendChild(a));
    a = document.createElement("select");
    a.className = "prefElement";
    a.title = "Stroke style";
    a.id = "svl_strokeDashstyle_" + c;
    a.innerHTML = '<option value="solid">Solid</option><option value="dash">Dashed</option><option value="dashdot">Dash Dot</option><option value="longdash">Long Dash</option><option value="longdashdot">Long Dash Dot</option><option value="dot">Dot</option>';
    a.className = "form-control prefElement";
    h.className = "expand";
    h.appendChild(f);
    h.appendChild(a);
    c = document.createElement("div");
    c.className = "prefLineStreets";
    c.appendChild(b);
    c.appendChild(h);
    return c;
  }
  function ta(b, c) {
    var a = (c = void 0 === c ? !0 : c) ? "metric" : "imperial", e = document.createElement("label");
    e.innerText = -1 !== b ? b : "Default";
    var f = document.createElement("div");
    f.appendChild(e);
    "number" === typeof b && (e = document.createElement("input"), e.id = "svl_slValue_" + a + "_" + b, e.className = "form-control prefElement", e.style.width = "50pt", e.title = "Speed Limit Value", e.type = "number", e.min = 0, e.max = 150, f.appendChild(e), e = document.createElement("span"), e.innerText = c ? "km/h" : "mph", f.appendChild(e));
    c = document.createElement("input");
    c.id = "svl_slColor_" + a + "_" + b;
    c.className = "prefElement form-control";
    c.style.width = "55pt";
    c.title = "Color";
    c.type = "color";
    f.className = "expand";
    f.appendChild(c);
    b = document.createElement("div");
    b.className = "svl_" + a + " prefLineSL";
    b.appendChild(f);
    return b;
  }
  function Fh() {
    return {streets:["red"], decorations:"lanes toll restriction closure headlights dirty nearbyHOV".split(" "), };
  }
  function aa() {
    document.getElementById("svl_saveNewPref").classList.add("disabled");
    document.getElementById("svl_rollbackButton").classList.add("disabled");
    document.getElementById("svl_saveNewPref").classList.remove("btn-primary");
    document.getElementById("sidepanel-svl").classList.remove("svl_unsaved");
    for (var b = 0; b < d.streets.length; b += 1) {
      d.streets[b] && (document.getElementById("svl_streetWidth_" + b).value = d.streets[b].strokeWidth, document.getElementById("svl_streetColor_" + b).value = d.streets[b].strokeColor, document.getElementById("svl_strokeDashstyle_" + b).value = d.streets[b].strokeDashstyle);
    }
    b = Fh();
    b.streets.forEach(function(f) {
      "red" !== f && (document.getElementById("svl_streetWidth_" + f).value = d[f].strokeWidth);
      document.getElementById("svl_streetColor_" + f).value = d[f].strokeColor;
      document.getElementById("svl_strokeDashstyle_" + f).value = d[f].strokeDashstyle;
    });
    b.decorations.forEach(function(f) {
      "dirty lanes toll restriction closure headlights nearbyHOV".split(" ").includes(f) ? document.getElementById("svl_streetOpacity_" + f).value = 100.0 * d[f].strokeOpacity : document.getElementById("svl_streetWidth_" + f).value = d[f].strokeWidth;
      document.getElementById("svl_streetColor_" + f).value = d[f].strokeColor;
      document.getElementById("svl_strokeDashstyle_" + f).value = d[f].strokeDashstyle;
    });
    var c, a, e;
    document.getElementById("svl_fakelock").value = null != (e = null == (c = WazeWrap) ? void 0 : null == (a = c.User) ? void 0 : a.Rank()) ? e : 7;
    document.getElementById("svl_autoReload_enabled").checked = d.autoReload.enabled;
    document.getElementById("svl_renderGeomNodes").checked = d.renderGeomNodes;
    document.getElementById("svl_labelOutlineWidth").value = d.labelOutlineWidth;
    document.getElementById("svl_hideMinorRoads").checked = d.hideMinorRoads;
    document.getElementById("svl_autoReload_interval").value = d.autoReload.interval / 1000;
    document.getElementById("svl_clutterConstant").value = d.clutterConstant;
    document.getElementById("svl_closeZoomLabelSize").value = d.closeZoomLabelSize;
    document.getElementById("svl_farZoomLabelSize").value = d.farZoomLabelSize;
    document.getElementById("svl_arrowDeclutter").value = d.arrowDeclutter;
    document.getElementById("svl_useWMERoadLayerAtZoom").value = d.useWMERoadLayerAtZoom;
    document.getElementById("svl_switchZoom").value = d.switchZoom;
    document.getElementById("svl_nodesThreshold").value = d.nodesThreshold;
    document.getElementById("svl_segmentsThreshold").value = d.segmentsThreshold;
    document.getElementById("svl_disableRoadLayers").checked = d.disableRoadLayers;
    document.getElementById("svl_startDisabled").checked = d.startDisabled;
    document.getElementById("svl_showUnderGPSPoints").checked = d.showUnderGPSPoints;
    document.getElementById("svl_routingModeEnabled").checked = d.routingModeEnabled;
    document.getElementById("svl_showANs").checked = d.showANs;
    document.getElementById("svl_showSLtext").checked = d.showSLtext;
    document.getElementById("svl_showSLcolor").checked = d.showSLcolor;
    document.getElementById("svl_showSLSinglecolor").checked = d.showSLSinglecolor;
    document.getElementById("svl_showDashedUnverifiedSL").checked = d.showDashedUnverifiedSL;
    document.getElementById("svl_SLColor").value = d.SLColor;
    document.getElementById("svl_realsize").checked = d.realsize;
    document.querySelectorAll(".segmentsWidth").forEach(function(f) {
      f.disabled = d.realsize;
    });
    c = (e = W.prefs.attributes.isImperial) ? "imperial" : "metric";
    a = Object.keys(d.speeds[c]);
    document.querySelectorAll(e ? ".svl_metric" : ".svl_imperial").forEach(function(f) {
      f.style.display = "none";
    });
    document.querySelectorAll(".svl_" + c).forEach(function(f) {
      f.style.display = "block";
    });
    for (e = 1; e < a.length + 1; e += 1) {
      document.getElementById("svl_slValue_" + c + "_" + e).value = a[e - 1], document.getElementById("svl_slColor_" + c + "_" + e).value = d.speeds[c][a[e - 1]];
    }
    document.getElementById("svl_slColor_" + c + "_Default").value = d.speeds["default"];
  }
  function L(b) {
    var c = b.id, a = b.title;
    b = b.description;
    var e = document.createElement("div");
    e.className = "prefLineCheckbox";
    var f = document.createElement("label");
    f.innerText = a;
    a = document.createElement("input");
    a.className = "prefElement";
    a.title = "True or False";
    a.id = "svl_" + c;
    a.type = "checkbox";
    a.checked = d[c];
    f.appendChild(a);
    e.appendChild(f);
    c = document.createElement("i");
    c.innerText = b;
    e.appendChild(c);
    return e;
  }
  function V(b) {
    var c = b.id, a = b.title, e = b.description, f = b.min, h = b.max, m = b.step;
    b = document.createElement("div");
    b.className = "prefLineInteger";
    var l = document.createElement("label");
    l.innerText = a;
    a = document.createElement("input");
    a.className = "prefElement form-control";
    a.title = "Insert a number";
    a.id = "svl_" + c;
    a.type = "number";
    a.min = f;
    a.max = h;
    a.step = m;
    l.appendChild(a);
    b.appendChild(l);
    e && (c = document.createElement("i"), c.innerText = e, b.appendChild(c));
    return b;
  }
  function ra(b) {
    var c = b.id, a = b.title, e = b.description, f = b.min, h = b.max, m = b.step;
    b = document.createElement("div");
    b.className = "prefLineSlider";
    var l = document.createElement("label");
    l.innerText = a;
    a = document.createElement("input");
    a.className = "prefElement form-control";
    a.title = "Pick a value using the slider";
    a.id = "svl_" + c;
    a.type = "range";
    a.min = f;
    a.max = h;
    a.step = m;
    l.appendChild(a);
    b.appendChild(l);
    e && (c = document.createElement("i"), c.innerText = e, b.appendChild(c));
    return b;
  }
  function X(b, c) {
    var a = document.createElement("details");
    a.open = void 0 === c ? !1 : c;
    c = document.createElement("summary");
    c.innerText = b;
    a.appendChild(c);
    return a;
  }
  function di() {
    var b = document.createElement("style");
    b.innerHTML = "\n        <style>\n        #sidepanel-svl details{margin-bottom:9pt;}\n        .svl_unsaved{background-color:#ffcc00}\n        .expand{display:flex; width:100%; justify-content:space-around;align-items: center;}\n        .prefLineCheckbox{width:100%; margin-bottom:1vh;}\n        .prefLineCheckbox label{display:block;width:100%}\n        .prefLineCheckbox input{float:right;}\n        .prefLineInteger{width:100%; margin-bottom:1vh;}\n        .prefLineInteger label{display:block;width:100%}\n        .prefLineInteger input{float:right;}\n        .prefLineSlider {width:100%; margin-bottom:1vh;}\n        .prefLineSlider label{display:block;width:100%}\n        .prefLineSlider input{float:right;}\n        .svl_logo {width:130px; display:inline-block; float:right}\n        #sidepanel-svl h5{text-transform: capitalize;}\n        .svl_support-link{display:inline-block; width:100%; text-align:center;}\n        .svl_buttons{clear:both; position:sticky; padding: 1vh; background-color:#eee; top:0; }\n        .routingDiv{opacity: 0.95; font-size:1.2em; border:0.2em #000 solid; position:absolute; top:3em; right:2em; padding:0.5em; background-color:#b30000}\n        #sidepanel-svl summary{font-weight:bold; margin:10px;}</style>";
    document.body.appendChild(b);
    b = document.createElement("div");
    var c = document.createElement("img");
    c.className = "svl_logo";
    c.src = "https://raw.githubusercontent.com/bedo2991/svl/master/logo.png";
    c.alt = "Street Vector Layer Logo";
    b.appendChild(c);
    c = document.createElement("span");
    c.innerText = "Thanks for using";
    b.appendChild(c);
    c = document.createElement("h4");
    c.innerText = "Street Vector Layer";
    b.appendChild(c);
    c = document.createElement("span");
    c.innerText = "Version 5.0.4";
    b.appendChild(c);
    c = document.createElement("a");
    c.innerText = "Something not working? Report it here.";
    c.href = GM_info.script.supportURL;
    c.target = "_blank";
    c.className = "svl_support-link";
    b.appendChild(c);
    c = document.createElement("button");
    c.id = "svl_saveNewPref";
    c.type = "button";
    c.className = "btn disabled waze-icon-save";
    c.innerText = "Save";
    c.title = "Save your edited settings";
    var a = document.createElement("button");
    a.id = "svl_rollbackButton";
    a.type = "button";
    a.className = "btn btn-default disabled";
    a.innerText = "Rollback";
    a.title = "Discard your temporary changes";
    var e = document.createElement("button");
    e.id = "svl_resetButton";
    e.type = "button";
    e.className = "btn btn-default";
    e.innerText = "Reset";
    e.title = "Overwrite your current settings with the default ones";
    var f = document.createElement("div");
    f.className = "svl_buttons expand";
    f.appendChild(c);
    f.appendChild(a);
    f.appendChild(e);
    b.appendChild(f);
    var h = X("Roads Properties", !0);
    h.appendChild(L({id:"realsize", title:"Use real-life Width", description:"When enabled, the segments thickness will be computed from the segments width instead of using the value set in the preferences", }));
    for (c = 0; c < d.streets.length; c += 1) {
      d.streets[c] && h.appendChild(P({f:c, c:!0, b:!1}));
    }
    f = X("Segments Decorations");
    e = X("Rendering Parameters");
    a = X("Performance Tuning");
    c = X("Speed Limits");
    Fh().streets.forEach(function(m) {
      "red" !== m ? h.appendChild(P({f:m, c:!0, b:!1, })) : h.appendChild(P({f:m, c:!1, b:!1, }));
    });
    f.appendChild(P({f:"lanes", c:!1, b:!0, }));
    f.appendChild(P({f:"toll", c:!1, b:!0, }));
    f.appendChild(P({f:"restriction", c:!1, b:!0, }));
    f.appendChild(P({f:"closure", c:!1, b:!0, }));
    f.appendChild(P({f:"headlights", c:!1, b:!0, }));
    f.appendChild(P({f:"dirty", c:!1, b:!0, }));
    f.appendChild(P({f:"nearbyHOV", c:!1, b:!0, }));
    h.appendChild(f);
    b.appendChild(h);
    h.appendChild(L({id:"showANs", title:"Show Alternative Names", description:"When enabled, at most 2 ANs that differ from the primary name are shown under the street name.", }));
    e.appendChild(L({id:"routingModeEnabled", title:"Enable Routing Mode", description:"When enabled, roads are rendered by taking into consideration their routing attribute. E.g. a preferred Minor Highway is shown as a Major Highway.", }));
    e.appendChild(L({id:"showUnderGPSPoints", title:"GPS Layer above Roads", description:"When enabled, the GPS layer gets shown above the road layer.", }));
    h.appendChild(ra({id:"labelOutlineWidth", title:"Labels Outline Width", description:"How much border should the labels have?", min:0, max:10, step:1, }));
    e.appendChild(L({id:"disableRoadLayers", title:"Hide WME Road Layer", description:"When enabled, the WME standard road layer gets hidden automatically.", }));
    e.appendChild(L({id:"startDisabled", title:"SVL Initially Disabled", description:"When enabled, the SVL does not get enabled automatically.", }));
    e.appendChild(ra({id:"clutterConstant", title:"Street Names Density", description:"For an higher value, less elements will be shown.", min:1, max:20, step:1, }));
    f = document.createElement("h5");
    f.innerText = "Close-zoom only";
    e.appendChild(f);
    e.appendChild(L({id:"renderGeomNodes", title:"Render Geometry Nodes", description:"When enabled, the geometry nodes are drawn, too.", }));
    e.appendChild(V({id:"fakelock", title:"Render Map as Level", description:"All segments locked above this level will be stroked through with a black line.", min:1, max:7, step:1, }));
    e.appendChild(ra({id:"closeZoomLabelSize", title:"Font Size (at close zoom)", description:"Increase this value if you can't read the street names because they are too small.", min:8, max:32, step:1, }));
    e.appendChild(ra({id:"arrowDeclutter", title:"Limit Arrows", description:"Increase this value if you want less arrows to be shown on streets (it increases the performance).", min:1, max:200, step:1, }));
    f = document.createElement("h5");
    f.innerText = "Far-zoom only";
    e.appendChild(f);
    e.appendChild(ra({id:"farZoomLabelSize", title:"Font Size (at far zoom)", description:"Increase this value if you can't read the street names because they are too small.", min:8, max:32, }));
    e.appendChild(L({id:"hideMinorRoads", title:"Hide minor roads at zoom 3", description:"The WME loads some type of roads when they probably shouldn't be, check this option for avoid displaying them at higher zooms.", }));
    b.appendChild(e);
    e = X("Utilities");
    e.appendChild(L({id:"autoReload_enabled", title:"Automatically Refresh the Map", description:"When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing.", }));
    e.appendChild(V({id:"autoReload_interval", title:"Auto Reload Time Interval (in Seconds)", description:"How often should the WME be refreshed for new edits?", min:20, max:3600, step:1, }));
    b.appendChild(e);
    a.appendChild(V({id:"useWMERoadLayerAtZoom", title:"Stop using SVL at zoom level", description:"When you reach this zoom level, the road layer gets automatically enabled.", min:0, max:5, step:1, }));
    a.appendChild(V({id:"switchZoom", title:"Close-zoom until level", description:"When the zoom is lower then this value, it will switch to far-zoom mode (rendering less details)", min:5, max:9, step:1, }));
    a.appendChild(V({id:"segmentsThreshold", title:"Segments threshold", description:"When the WME wants to draw more than this amount of segments, switch to the road layer", min:1000, max:10000, step:100, }));
    a.appendChild(V({id:"nodesThreshold", title:"Nodes threshold", description:"When the WME wants to draw more than this amount of nodes, switch to the road layer", min:1000, max:10000, step:100, }));
    b.appendChild(a);
    c.appendChild(L({id:"showSLtext", title:"Show on the Street Name", description:"Show the speed limit as text at the end of the street name.", }));
    c.appendChild(L({id:"showSLcolor", title:"Show using colors", description:"Show the speed limit by coloring the segment's outline.", }));
    c.appendChild(L({id:"showSLSinglecolor", title:"Show using Single Color", description:"Show the speed limit by coloring the segment's outline with a single color instead of a different color depending on the speed limit's value.", }));
    a = document.createElement("input");
    a.type = "color";
    a.className = "prefElement form-control";
    a.id = "svl_SLColor";
    c.appendChild(a);
    c.appendChild(L({id:"showDashedUnverifiedSL", title:"Show unverified Speed Limits with a dashed Line", description:"If the speed limit is not verified, it will be shown with a different style.", }));
    a = document.createElement("h6");
    a.innerText = Eh("speed limit");
    c.appendChild(a);
    a = "metric";
    c.appendChild(ta("Default", !0));
    for (e = 1; e < Object.keys(d.speeds[a]).length + 1; e += 1) {
      c.appendChild(ta(e, !0));
    }
    a = "imperial";
    c.appendChild(ta("Default", !1));
    for (e = 1; e < Object.keys(d.speeds[a]).length + 1; e += 1) {
      c.appendChild(ta(e, !1));
    }
    b.appendChild(c);
    c = document.createElement("h5");
    c.innerText = "Settings Backup";
    b.appendChild(c);
    c = document.createElement("div");
    c.className = "expand";
    a = document.createElement("button");
    a.id = "svl_exportButton";
    a.type = "button";
    a.innerText = "Export";
    a.className = "btn btn-default";
    e = document.createElement("button");
    e.id = "svl_importButton";
    e.type = "button";
    e.innerText = "Import";
    e.className = "btn btn-default";
    c.appendChild(e);
    c.appendChild(a);
    b.appendChild(c);
    new WazeWrap.Interface.Tab("SVL \ud83d\uddfa\ufe0f", b.innerHTML, aa);
    document.querySelectorAll(".prefElement").forEach(function(m) {
      m.addEventListener("change", Dh);
    });
    document.getElementById("svl_saveNewPref").addEventListener("click", bi);
    document.getElementById("svl_rollbackButton").addEventListener("click", $h);
    document.getElementById("svl_resetButton").addEventListener("click", ci);
    document.getElementById("svl_importButton").addEventListener("click", r);
    document.getElementById("svl_exportButton").addEventListener("click", ai);
  }
  function Gh(b) {
    E.destroyFeatures(E.getFeaturesByAttribute("myid", b), {silent:!0});
  }
  function ei(b) {
    x("Removing " + b.length + " nodes");
    if (I.zoom <= d.useWMERoadLayerAtZoom) {
      x("Destroy all nodes"), E.destroyFeatures(E.features, {silent:!0});
    } else {
      if (N || b.length > d.nodesThreshold) {
        N || ua();
      } else {
        var c;
        for (c = 0; c < b.length; c += 1) {
          Gh(b[c].attributes.id);
        }
      }
    }
  }
  function zh(b) {
    var c;
    return 1 === (null == (c = b.segIDs) ? void 0 : c.length) ? fi : gi;
  }
  function hi(b) {
    x("Change nodes");
    b.forEach(function(c) {
      var a = c.attributes, e = E.getFeaturesByAttribute("myid", a.id)[0];
      e ? (e.style = zh(a), e.move(new OpenLayers.LonLat(a.geometry.x, a.geometry.y))) : 0 < a.id && E.addFeatures([yh(c)], {silent:!0});
    });
  }
  function ii(b) {
    x("Node state deleted");
    for (var c = 0; c < b.length; c += 1) {
      Gh(b[c].getID());
    }
  }
  function ji(b) {
    for (var c = 0; c < b.length; c += 1) {
      va(b[c].getID());
    }
  }
  function Hh(b) {
    x("Adding " + b.length + " nodes");
    if (N || b.length > d.nodesThreshold) {
      N || ua();
    } else {
      if (I.zoom <= d.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        for (var c = [], a = 0; a < b.length; a += 1) {
          void 0 !== b[a].attributes.geometry ? 0 < b[a].attributes.id && c.push(yh(b[a])) : console.warn("[SVL] Geometry of node is undefined");
        }
        E.addFeatures(c, {silent:!0});
        return !0;
      }
    }
  }
  function T(b) {
    return !b.svl;
  }
  function Ih() {
    x("updateStatusBasedOnZoom running");
    var b = !0;
    N && (Object.keys(W.model.segments.objects).length < d.segmentsThreshold && Object.keys(W.model.nodes.objects).length < d.nodesThreshold ? (N = !1, M(1, !0), M(0, !1), qa()) : console.warn("[SVL] Still too many elements to draw: Segments: " + Object.keys(W.model.segments.objects).length + "/" + d.segmentsThreshold + ", Nodes: " + Object.keys(W.model.nodes.objects).length + "/" + d.nodesThreshold + " - You can change these thresholds in the preference panel."));
    I.zoom <= d.useWMERoadLayerAtZoom ? (x("Road layer automatically enabled because of zoom out"), !0 === A.visibility && (wa = !0, M(0, !0), M(1, !1)), b = !1) : wa && (x("Re-enabling SVL after zoom in"), M(1, !0), M(0, !1), wa = !1);
    return b;
  }
  function ki() {
    clearTimeout(Jh);
    x("manageZoom clearing timer");
    Jh = setTimeout(Ih, 800);
  }
  function ua() {
    console.warn("[SVL] Abort drawing, too many elements");
    N = !0;
    M(0, !0);
    M(1, !1);
    k();
  }
  function Da(b) {
    x("Adding " + b.length + " segments");
    if (N || b.length > d.segmentsThreshold) {
      N || ua();
    } else {
      if (I.zoom <= d.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        Kh();
        var c = [];
        b.forEach(function(a) {
          null !== a && (c = c.concat(Xh(a)));
        });
        0 < c.length ? (x(c.length + " features added to the street layer"), A.addFeatures(c, {silent:!0})) : console.warn("[SVL] no features drawn");
        Lh();
      }
    }
  }
  function va(b) {
    x("RemoveSegmentById: " + b);
    A.destroyFeatures(A.getFeaturesByAttribute("myId", b), {silent:!0});
    z.destroyFeatures(z.getFeaturesByAttribute("myId", b), {silent:!0});
  }
  function li(b) {
    x("Edit " + b.length + " segments");
    b.forEach(function(c) {
      var a = c.getOldID();
      a && va(parseInt(a, 10));
      va(c.getID());
      "Delete" !== c.state && Da([c]);
    });
  }
  function mi(b) {
    x("Removing " + b.length + " segments");
    I.zoom <= d.useWMERoadLayerAtZoom ? (x("Destroy all segments and labels because of zoom out"), A.destroyFeatures(A.features, {silent:!0, }), z.destroyFeatures(z.features, {silent:!0})) : N || b.length > d.segmentsThreshold ? N || ua() : (Kh(), b.forEach(function(c) {
      va(c.attributes.id);
    }), Lh());
  }
  function Mh(b) {
    x("ManageVisibilityChanged", b);
    E.setVisibility(b.object.visibility);
    z.setVisibility(b.object.visibility);
    b.object.visibility ? (x("enabled: registering events"), b = W.model.segments._events, b.objectsadded.push({context:A, callback:Da, svl:!0, }), b.objectschanged.push({context:A, callback:li, svl:!0, }), b.objectsremoved.push({context:A, callback:mi, svl:!0, }), b["objects-state-deleted"].push({context:A, callback:ji, svl:!0, }), x("SVL: Registering node events"), b = W.model.nodes._events, b.objectsremoved.push({context:E, callback:ei, svl:!0, }), b.objectsadded.push({context:E, callback:Hh, 
    svl:!0, }), b.objectschanged.push({context:E, callback:hi, svl:!0, }), b["objects-state-deleted"].push({context:E, callback:ii, svl:!0, }), !0 === Ih() && qa()) : (x("disabled: unregistering events"), x("SVL: Removing segments events"), b = W.model.segments._events, b.objectsadded = b.objectsadded.filter(T), b.objectschanged = b.objectschanged.filter(T), b.objectsremoved = b.objectsremoved.filter(T), b["objects-state-deleted"] = b["objects-state-deleted"].filter(T), x("SVL: Removing node events"), 
    b = W.model.nodes._events, b.objectsremoved = b.objectsremoved.filter(T), b.objectsadded = b.objectsadded.filter(T), b.objectschanged = b.objectschanged.filter(T), b["objects-state-deleted"] = b["objects-state-deleted"].filter(T), k());
  }
  function Nh(b) {
    b = void 0 === b ? 1 : b;
    30 < b ? console.error("SVL: could not initialize WazeWrap") : WazeWrap && WazeWrap.Ready && WazeWrap.Interface && WazeWrap.Alerts ? ni() : (console.log("SVL: WazeWrap not ready, retrying in 800ms"), setTimeout(function() {
      Nh(b + 1);
    }, 800));
  }
  function ni() {
    console.log("SVL: initializing WazeWrap");
    try {
      (new WazeWrap.Interface.Shortcut("SVLToggleLayer", "Toggle SVL", "svl", "Street Vector Layer", "A+l", function() {
        M(1, !A.visibility);
      }, null)).add(), console.log("SVL: Keyboard shortcut successfully added.");
    } catch (b) {
      console.error("SVL: Error while adding the keyboard shortcut:"), console.error(b);
    }
    try {
      WazeWrap.Interface.AddLayerCheckbox("road", "Street Vector Layer", !0, function(b) {
        A.setVisibility(b);
      }, A);
    } catch (b) {
      console.error("SVL: could not add layer checkbox");
    }
    d.startDisabled && M(1, !1);
    di();
    WazeWrap.Interface.ShowScriptUpdate("Street Vector Layer", "5.0.4", '<b>Major update!</b>\n            <br>Many things have changed! You may need to change some settings to have a similar view as before (for example increasing the streets width)\n        <br>- NEW: Rendering completely rewritten: performance improvements\n        <br>- NEW: The preference panel was redesigned and is now in the sidebar (SVL \ud83d\uddfa\ufe0f)\n        <br>- NEW: You can set what color to use for each speed limit (User request)\n        <br>- NEW: Added an option to render the streets based on their width (one way streets are thinner, their size changes when you zoom)\n        <br>- NEW: Some options are now localised using WME\'s strings\n        <br>- NEW: Dead-end nodes are rendered with a different color\n        <br>- NEW: The Preference panel changes color when you have unsaved changes\n        <br>- NEW: The "Next to Carpool/HOV/bus lane" is also shown\n        <br>- Removed: the zoom-level indicator while editing the preferences\n        <br>- Bug fixes and new bugs :)', 
    "", GM_info.script.supportURL);
  }
  function Oh(b) {
    b = void 0 === b ? 0 : b;
    try {
      if (void 0 === W || void 0 === W.map || void 0 === W.model) {
        throw Error("Model Not ready");
      }
    } catch (e) {
      var c = b + 1;
      if (20 > b) {
        console.warn(e);
        console.warn("Could not initialize SVL correctly. Maybe the Waze model was not ready. Retrying in 500ms...");
        setTimeout(function() {
          Oh(c);
        }, 500);
        return;
      }
      console.error(e);
      w("error", "Street Vector Layer failed to inizialize. Maybe the Editor has been updated or your connection/pc is really slow.");
      return;
    }
    I = W.map.getOLMap();
    d = null;
    OpenLayers.Renderer.symbol.myTriangle = [-2, 0, 2, 0, 0, -6, -2, 0];
    !1 === Y() && w("info", "This is the first time that you run Street Vector Layer in this browser.\nSome info about it:\nBy default, use ALT+L to toggle the layer.\nYou can change the streets color, thickness and style using the panel on the left sidebar.\nYour preferences will be saved for the next time in your browser.\nThe other road layers will be automatically hidden (you can change this behaviour in the preference panel).\nHave fun and tell us on the Waze forum if you liked the script!");
    b = new OpenLayers.StyleMap({pointerEvents:"none", strokeColor:"${color}", strokeWidth:"${width}", strokeOpacity:"${opacity}", strokeDashstyle:"${dash}", graphicZIndex:"${zIndex}", });
    var a = new OpenLayers.StyleMap({fontFamily:"Rubik, Open Sans, Alef, helvetica, sans-serif", fontWeight:"800", fontColor:"${color}", labelOutlineColor:"${outlinecolor}", labelOutlineWidth:"${outlinewidth}", label:"${label}", visibility:!d.startDisabled, angle:"${angle}", pointerEvents:"none", labelAlign:"cm", });
    A = new OpenLayers.Layer.Vector("Street Vector Layer", {styleMap:b, uniqueName:"vectorStreet", accelerator:"toggle" + "Street Vector Layer".replace(/\s+/g, ""), visibility:!d.startDisabled, isVector:!0, attribution:"SVL v. 5.0.4", rendererOptions:{zIndexing:!0, }, });
    A.renderer.drawFeature = function(e, f) {
      null == f && (f = e.style);
      if (e.geometry) {
        var h = H();
        2 > I.zoom || e.attributes.a && h || e.attributes.o && !h ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(A.renderer.extent) ? (A.renderer.featureDx = 0, f.pointerEvents = "none", h || !e.attributes.h && d.realsize && (f.strokeWidth /= I.resolution)) : f = {display:"none"};
        return A.renderer.drawGeometry(e.geometry, f, e.id);
      }
    };
    E = new OpenLayers.Layer.Vector("Nodes Vector", {uniqueName:"vectorNodes", visibility:!d.startDisabled, });
    E.renderer.drawFeature = function(e, f) {
      if (2 > I.zoom) {
        return f = {display:"none"}, E.renderer.drawGeometry(e.geometry, f, e.id);
      }
      null == f && (f = e.style);
      f = OpenLayers.Util.extend({}, f);
      if (e.geometry) {
        return H() ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(E.renderer.extent) ? (E.renderer.featureDx = 0, d.realsize && (f.pointRadius /= I.resolution)) : f = {display:"none"}, E.renderer.drawGeometry(e.geometry, f, e.id);
      }
    };
    z = new OpenLayers.Layer.Vector("Labels Vector", {uniqueName:"vectorLabels", styleMap:a, visibility:!d.startDisabled, });
    z.renderer.drawFeature = function(e, f) {
      var h = I.zoom;
      if (2 > h) {
        return !1;
      }
      null == f && (f = e.style);
      if (e.geometry) {
        var m = H();
        7 - e.attributes.u > h || e.attributes.a && m || e.attributes.o && !m ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(z.renderer.extent) ? (z.renderer.featureDx = 0, f.pointerEvents = "none", f.fontSize = m ? d.farZoomLabelSize : d.closeZoomLabelSize) : f = {display:"none"};
        h = z.renderer.drawGeometry(e.geometry, f, e.id);
        "none" !== f.display && f.label && !1 !== h ? (m = e.geometry.getCentroid(), z.renderer.drawText(e.id, f, m)) : z.renderer.removeText(e.id);
        return h;
      }
    };
    z.renderer.drawText = function(e, f, h) {
      var m = !!f.labelOutlineWidth;
      if (m) {
        var l = OpenLayers.Util.extend({}, f);
        l.fontColor = l.labelOutlineColor;
        l.fontStrokeColor = l.labelOutlineColor;
        l.fontStrokeWidth = f.labelOutlineWidth;
        f.labelOutlineOpacity && (l.fontOpacity = f.labelOutlineOpacity);
        delete l.labelOutlineWidth;
        z.renderer.drawText(e, l, h);
      }
      var q = z.renderer.getResolution();
      l = (h.x - z.renderer.featureDx) / q + z.renderer.left;
      var u = h.y / q - z.renderer.top;
      m = m ? z.renderer.LABEL_OUTLINE_SUFFIX : z.renderer.LABEL_ID_SUFFIX;
      q = z.renderer.nodeFactory(e + m, "text");
      q.setAttributeNS(null, "x", l);
      q.setAttributeNS(null, "y", -u);
      (f.angle || 0 === f.angle) && q.setAttributeNS(null, "transform", "rotate(" + f.angle + "," + l + "," + -u + ")");
      f.fontFamily && q.setAttributeNS(null, "font-family", f.fontFamily);
      f.fontWeight && q.setAttributeNS(null, "font-weight", f.fontWeight);
      f.fontSize && q.setAttributeNS(null, "font-size", f.fontSize);
      f.fontColor && q.setAttributeNS(null, "fill", f.fontColor);
      f.fontStrokeColor && q.setAttributeNS(null, "stroke", f.fontStrokeColor);
      f.fontStrokeWidth && q.setAttributeNS(null, "stroke-width", f.fontStrokeWidth);
      q.setAttributeNS(null, "pointer-events", "none");
      var p;
      u = null != (p = f.labelAlign) ? p : OpenLayers.Renderer.defaultSymbolizer.labelAlign;
      var y;
      q.setAttributeNS(null, "text-anchor", null != (y = OpenLayers.Renderer.SVG.LABEL_ALIGN[u[0]]) ? y : "middle");
      if (!0 === OpenLayers.IS_GECKO) {
        var v;
        q.setAttributeNS(null, "dominant-baseline", null != (v = OpenLayers.Renderer.SVG.LABEL_ALIGN[u[1]]) ? v : "central");
      }
      p = f.label.split("\n");
      for (y = p.length; q.childNodes.length > y;) {
        q.removeChild(q.lastChild);
      }
      for (v = 0; v < y; v += 1) {
        var g = z.renderer.nodeFactory(e + m + "_tspan_" + v, "tspan");
        !0 === f.labelSelect && (g.B = e, g.C = h, g.D = h.A);
        if (!1 === OpenLayers.IS_GECKO) {
          var C = void 0;
          g.setAttributeNS(null, "baseline-shift", null != (C = OpenLayers.Renderer.SVG.LABEL_VSHIFT[u[1]]) ? C : "-35%");
        }
        g.setAttribute("x", l);
        0 === v ? (C = OpenLayers.Renderer.SVG.LABEL_VFACTOR[u[1]], null == C && (C = -.5), g.setAttribute("dy", C * (y - 1) + "em")) : g.setAttribute("dy", "1em");
        g.textContent = "" === p[v] ? " " : p[v];
        g.parentNode || q.appendChild(g);
      }
      q.parentNode || z.renderer.textRoot.appendChild(q);
    };
    Z(d);
    I.addLayer(A);
    I.addLayer(z);
    I.addLayer(E);
    "true" === window.localStorage.getItem("svlDebugOn") && (document.sv = A, document.lv = z, document.nv = E, document.svl_pref = d);
    b = I.getLayersBy("uniqueName", "roads");
    ba = null;
    1 === b.length && (ba = Fa(b).next().value);
    wa = !1;
    d.showUnderGPSPoints && Ah();
    Bh();
    Ch();
    I.events.register("zoomend", null, ki, !0);
    Nh();
    I.zoom <= d.useWMERoadLayerAtZoom ? M(0, !0) : ba.getVisibility() && d.disableRoadLayers && (M(0, !1), console.log("SVL: WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel."));
    A.events.register("visibilitychanged", A, Mh);
    Mh({object:A, });
    $(".olControlAttribution").click(function() {
      w("info", 'The preferences have been moved to the sidebar on the left. Please look for the "SVL \ud83d\uddfa\ufe0f" tab.');
    });
    console.log("[SVL] v. 5.0.4 initialized correctly.");
  }
  function qa() {
    x("DrawAllSegments");
    k();
    Da(Object.values(W.model.segments.objects));
    Hh(Object.values(W.model.nodes.objects));
  }
  function Z(b) {
    for (var c = 0; c < b.streets.length; c += 1) {
      if (b.streets[c]) {
        var a = b.streets[c].strokeColor;
        O[c] = {strokeColor:b.streets[c].strokeColor, strokeWidth:b.streets[c].strokeWidth, strokeDashstyle:b.streets[c].strokeDashstyle, outlineColor:127 > 0.299 * parseInt(a.substring(1, 3), 16) + 0.587 * parseInt(a.substring(3, 5), 16) + 0.114 * parseInt(a.substring(5, 7), 16) ? "#FFF" : "#000", };
      }
    }
    th = b.clutterConstant;
    qa();
  }
  function Ph(b) {
    b = void 0 === b ? 0 : b;
    if (void 0 === W || void 0 === W.map) {
      console.log("SVL not ready to start, retrying in 600ms");
      var c = b + 1;
      20 > c ? setTimeout(function() {
        Ph(c);
      }, 600) : w("error", "Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!");
    } else {
      Oh();
    }
  }
  var Ea = "true" === window.localStorage.getItem("svlDebugOn"), x = Ea ? function(b) {
    for (var c = [], a = 0; a < arguments.length; ++a) {
      c[a] = arguments[a];
    }
    for (a = 0; a < c.length; a += 1) {
      "string" === typeof c[a] ? console.log("[SVL] 5.0.4: " + c[a]) : console.dir(c[a]);
    }
  } : function() {
  }, Kh = Ea ? console.group : function() {
  }, Lh = Ea ? console.groupEnd : function() {
  }, Ca = null, th, O = [], A, E, z, N = !1, d, ba, wa, I, sa = {ROAD_LAYER:null, SVL_LAYER:null, }, Wh = "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079".split(""), wh = {strokeColor:"#F53BFF", strokeWidth:3, strokeDashstyle:"solid", }, Aa = {strokeColor:"#111111", strokeWidth:1, strokeDashstyle:"dash", strokeOpacity:0.6, }, gi = {stroke:!1, fillColor:"#0015FF", fillOpacity:0.9, pointRadius:3, pointerEvents:"none", }, fi = {stroke:!1, fillColor:"#C31CFF", fillOpacity:0.9, pointRadius:3, 
  pointerEvents:"none", }, Yh = {graphicName:"x", strokeColor:"#f00", strokeWidth:1.5, fillColor:"#FFFF40", fillOpacity:0.7, pointRadius:7, pointerEvents:"none", }, Zh = {stroke:!1, fillColor:"#000", fillOpacity:0.5, pointRadius:3.5, graphicZIndex:179, pointerEvents:"none", }, vh = {strokeColor:"#000", strokeDashstyle:"solid", }, xh = {strokeColor:"#C90", strokeDashstyle:"longdash", }, Ba = {strokeColor:"#fff", strokeOpacity:0.8, strokeDashstyle:"longdash", }, Ha = {1:5.0, 2:5.5, 3:22.5, 4:6.0, 5:2.0, 
  6:10.0, 7:9.0, 8:4.0, 10:2.0, 15:8.0, 16:2.0, 17:5.0, 18:6.0, 19:5.0, 20:5.0, 22:3.0, }, Jh = null;
  Ph();
})();

