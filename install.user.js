function xa(l) {
  var n = 0;
  return function() {
    return n < l.length ? {done:!1, value:l[n++], } : {done:!0};
  };
}
function Ga(l) {
  var n = "undefined" != typeof Symbol && Symbol.iterator && l[Symbol.iterator];
  return n ? n.call(l) : {next:xa(l)};
}
var Ha = "function" == typeof Object.defineProperties ? Object.defineProperty : function(l, n, r) {
  if (l == Array.prototype || l == Object.prototype) {
    return l;
  }
  l[n] = r.value;
  return l;
};
function Yh(l) {
  l = ["object" == typeof globalThis && globalThis, l, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global, ];
  for (var n = 0; n < l.length; ++n) {
    var r = l[n];
    if (r && r.Math == Math) {
      return r;
    }
  }
  throw Error("Cannot find global object");
}
var Zh = Yh(this);
function Q(l, n) {
  if (n) {
    a: {
      var r = Zh;
      l = l.split(".");
      for (var w = 0; w < l.length - 1; w++) {
        var H = l[w];
        if (!(H in r)) {
          break a;
        }
        r = r[H];
      }
      l = l[l.length - 1];
      w = r[l];
      n = n(w);
      n != w && null != n && Ha(r, l, {configurable:!0, writable:!0, value:n});
    }
  }
}
Q("Symbol", function(l) {
  function n(H) {
    if (this instanceof n) {
      throw new TypeError("Symbol is not a constructor");
    }
    return new r("jscomp_symbol_" + (H || "") + "_" + w++, H);
  }
  function r(H, R) {
    this.o = H;
    Ha(this, "description", {configurable:!0, writable:!0, value:R});
  }
  if (l) {
    return l;
  }
  r.prototype.toString = function() {
    return this.o;
  };
  var w = 0;
  return n;
});
Q("Symbol.iterator", function(l) {
  if (l) {
    return l;
  }
  l = Symbol("Symbol.iterator");
  for (var n = "Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "), r = 0; r < n.length; r++) {
    var w = Zh[n[r]];
    "function" === typeof w && "function" != typeof w.prototype[l] && Ha(w.prototype, l, {configurable:!0, writable:!0, value:function() {
      return $h(xa(this));
    }});
  }
  return l;
});
function $h(l) {
  l = {next:l};
  l[Symbol.iterator] = function() {
    return this;
  };
  return l;
}
function ai(l, n) {
  l instanceof String && (l += "");
  var r = 0, w = !1, H = {next:function() {
    if (!w && r < l.length) {
      var R = r++;
      return {value:n(R, l[R]), done:!1};
    }
    w = !0;
    return {done:!0, value:void 0};
  }};
  H[Symbol.iterator] = function() {
    return H;
  };
  return H;
}
Q("Array.prototype.keys", function(l) {
  return l ? l : function() {
    return ai(this, function(n) {
      return n;
    });
  };
});
Q("Number.isFinite", function(l) {
  return l ? l : function(n) {
    return "number" !== typeof n ? !1 : !isNaN(n) && Infinity !== n && -Infinity !== n;
  };
});
Q("Number.isInteger", function(l) {
  return l ? l : function(n) {
    return Number.isFinite(n) ? n === Math.floor(n) : !1;
  };
});
Q("Object.is", function(l) {
  return l ? l : function(n, r) {
    return n === r ? 0 !== n || 1 / n === 1 / r : n !== n && r !== r;
  };
});
Q("Array.prototype.includes", function(l) {
  return l ? l : function(n, r) {
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
Q("String.prototype.includes", function(l) {
  return l ? l : function(n, r) {
    if (null == this) {
      throw new TypeError("The 'this' value for String.prototype.includes must not be null or undefined");
    }
    if (n instanceof RegExp) {
      throw new TypeError("First argument to String.prototype.includes must not be a regular expression");
    }
    return -1 !== this.indexOf(n, r || 0);
  };
});
Q("Object.values", function(l) {
  return l ? l : function(n) {
    var r = [], w;
    for (w in n) {
      Object.prototype.hasOwnProperty.call(n, w) && r.push(n[w]);
    }
    return r;
  };
});
(function() {
  function l() {
    x("Destroy all features");
    z.destroyFeatures(z.features, {silent:!0, });
    A.destroyFeatures(A.features, {silent:!0});
    E.destroyFeatures(E.features, {silent:!0});
  }
  function n() {
    x("resetting preferences");
    x("saveDefaultPreferences");
    ya(!0);
    aa(c);
    ba();
    w("success", "Preferences have been reset to the default values");
  }
  function r() {
    WazeWrap.Alerts.prompt(GM_info.script.name, "N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!\n\nPaste your string here:", "", bi, null);
  }
  function w(a, b) {
    try {
      WazeWrap.Alerts[a](GM_info.script.name, b);
    } catch (d) {
      console.error(d), alert(b);
    }
  }
  function H(a) {
    a = void 0 === a ? I.zoom : a;
    return a < c.switchZoom;
  }
  function R() {
    0 !== W.model.actionManager.unsavedActionsNum() || WazeWrap.hasSelectedFeatures() || 0 !== document.querySelectorAll(".place-update-edit.show").length || W.controller.reload();
  }
  function M(a, b) {
    1 === a ? (x("Changing SVL Layer visibility to " + b), z.setVisibility(b)) : ca ? (x("Changing Road Layer visibility to " + b), ca.setVisibility(b)) : console.warn("SVL: cannot toggle the WME's road layer");
    if (!sa[a] && (x("Initialising layer " + a), sa[a] = document.getElementById(1 === a ? "layer-switcher-item_street_vector_layer" : "layer-switcher-item_road"), !sa[a])) {
      console.warn("SVL: cannot find checkbox for layer number " + a);
      return;
    }
    sa[a].checked = b;
  }
  function za(a, b) {
    b = void 0 === b ? !0 : b;
    x("savePreferences");
    a.version = "5.0.9";
    try {
      window.localStorage.setItem("svl", JSON.stringify(a)), b || w("success", "Preferences saved!");
    } catch (d) {
      console.error(d), w("error", "Could not save the preferences, your browser local storage seems to be full.");
    }
  }
  function ci(a) {
    var b = a.u, d = a.roadType;
    a = a.A;
    return c.realsize ? b ? a ? b : 0.6 * b : a ? Ia[d] : 0.6 * Ia[d] : parseInt(N[d].strokeWidth, 10);
  }
  function ya(a) {
    a = void 0 === a ? !1 : a;
    var b = !0, d = null;
    if (!0 === a) {
      window.localStorage.removeItem("svl");
    } else {
      var e = window.localStorage.getItem("svl");
      e && (d = JSON.parse(e));
    }
    null === d && (a ? x("Overwriting existing preferences") : (b = !1, x("Creating new preferences for the first time")));
    c = {autoReload:{}};
    var f, h, m;
    c.autoReload.interval = null != (m = null == (f = d) ? void 0 : null == (h = f.autoReload) ? void 0 : h.interval) ? m : 60000;
    var g, q, u;
    c.autoReload.enabled = null != (u = null == (g = d) ? void 0 : null == (q = g.autoReload) ? void 0 : q.enabled) ? u : !1;
    var p, y;
    c.showSLSinglecolor = null != (y = null == (p = d) ? void 0 : p.showSLSinglecolor) ? y : !1;
    var v, k;
    c.SLColor = null != (k = null == (v = d) ? void 0 : v.SLColor) ? k : "#ffdf00";
    var C, F, D, t, G;
    c.fakelock = null != (G = null != (t = null == (C = d) ? void 0 : C.fakelock) ? t : null == (F = WazeWrap) ? void 0 : null == (D = F.User) ? void 0 : D.Rank()) ? G : 6;
    var L, T;
    c.hideMinorRoads = null != (T = null == (L = d) ? void 0 : L.hideMinorRoads) ? T : !0;
    var J, B;
    c.showDashedUnverifiedSL = null != (B = null == (J = d) ? void 0 : J.showDashedUnverifiedSL) ? B : !0;
    var V, da;
    c.showSLcolor = null != (da = null == (V = d) ? void 0 : V.showSLcolor) ? da : !0;
    var ea, fa;
    c.showSLtext = null != (fa = null == (ea = d) ? void 0 : ea.showSLtext) ? fa : !0;
    var ha, ia;
    c.disableRoadLayers = null != (ia = null == (ha = d) ? void 0 : ha.disableRoadLayers) ? ia : !0;
    var ja, ka;
    c.startDisabled = null != (ka = null == (ja = d) ? void 0 : ja.startDisabled) ? ka : !1;
    var la, ma;
    c.clutterConstant = null != (ma = null == (la = d) ? void 0 : la.clutterConstant) ? ma : 7;
    var na, oa;
    c.labelOutlineWidth = null != (oa = null == (na = d) ? void 0 : na.labelOutlineWidth) ? oa : 3;
    var pa, Ja;
    c.closeZoomLabelSize = null != (Ja = null == (pa = d) ? void 0 : pa.closeZoomLabelSize) ? Ja : 14;
    var Ka, La;
    c.farZoomLabelSize = null != (La = null == (Ka = d) ? void 0 : Ka.farZoomLabelSize) ? La : 12;
    var Ma, Na;
    c.useWMERoadLayerAtZoom = null != (Na = null == (Ma = d) ? void 0 : Ma.useWMERoadLayerAtZoom) ? Na : 1;
    var Oa, Pa;
    c.switchZoom = null != (Pa = null == (Oa = d) ? void 0 : Oa.switchZoom) ? Pa : 5;
    var Qa, Ra;
    c.arrowDeclutter = null != (Ra = null == (Qa = d) ? void 0 : Qa.arrowDeclutter) ? Ra : 140;
    var Sa, Ta;
    c.segmentsThreshold = null != (Ta = null == (Sa = d) ? void 0 : Sa.segmentsThreshold) ? Ta : 3000;
    var Ua, Va;
    c.nodesThreshold = null != (Va = null == (Ua = d) ? void 0 : Ua.nodesThreshold) ? Va : 4000;
    var Wa, Xa;
    c.showUnderGPSPoints = null != (Xa = null == (Wa = d) ? void 0 : Wa.showUnderGPSPoints) ? Xa : !1;
    var Ya, Za;
    c.routingModeEnabled = null != (Za = null == (Ya = d) ? void 0 : Ya.routingModeEnabled) ? Za : !1;
    var $a, ab;
    c.hideRoutingModeBlock = null != (ab = null == ($a = d) ? void 0 : $a.hideRoutingModeBlock) ? ab : !1;
    var bb, cb;
    c.realsize = null != (cb = null == (bb = d) ? void 0 : bb.realsize) ? cb : !0;
    var db, eb;
    c.showANs = null != (eb = null == (db = d) ? void 0 : db.showANs) ? eb : !1;
    var fb, gb;
    c.renderGeomNodes = null != (gb = null == (fb = d) ? void 0 : fb.renderGeomNodes) ? gb : !1;
    var hb, ib;
    c.layerOpacity = null != (ib = null == (hb = d) ? void 0 : hb.layerOpacity) ? ib : 0.8;
    c.streets = [];
    var jb, kb, lb, mb, nb, ob, pb, qb, rb;
    c.streets[1] = {strokeColor:null != (pb = null == (jb = d) ? void 0 : null == (kb = jb.streets[1]) ? void 0 : kb.strokeColor) ? pb : "#FFFFFF", strokeWidth:null != (qb = null == (lb = d) ? void 0 : null == (mb = lb.streets[1]) ? void 0 : mb.strokeWidth) ? qb : 10, strokeDashstyle:null != (rb = null == (nb = d) ? void 0 : null == (ob = nb.streets[1]) ? void 0 : ob.strokeDashstyle) ? rb : "solid", };
    var sb, tb, ub, vb, wb, xb, yb, zb, Ab;
    c.streets[20] = {strokeColor:null != (yb = null == (sb = d) ? void 0 : null == (tb = sb.streets[20]) ? void 0 : tb.strokeColor) ? yb : "#2282AB", strokeWidth:null != (zb = null == (ub = d) ? void 0 : null == (vb = ub.streets[20]) ? void 0 : vb.strokeWidth) ? zb : 9, strokeDashstyle:null != (Ab = null == (wb = d) ? void 0 : null == (xb = wb.streets[20]) ? void 0 : xb.strokeDashstyle) ? Ab : "solid", };
    var Bb, Cb, Db, Eb, Fb, Gb, Hb, Ib, Jb;
    c.streets[4] = {strokeColor:null != (Hb = null == (Bb = d) ? void 0 : null == (Cb = Bb.streets[4]) ? void 0 : Cb.strokeColor) ? Hb : "#3FC91C", strokeWidth:null != (Ib = null == (Db = d) ? void 0 : null == (Eb = Db.streets[4]) ? void 0 : Eb.strokeWidth) ? Ib : 11, strokeDashstyle:null != (Jb = null == (Fb = d) ? void 0 : null == (Gb = Fb.streets[4]) ? void 0 : Gb.strokeDashstyle) ? Jb : "solid", };
    var Kb, Lb, Mb, Nb, Ob, Pb, Qb, Rb, Sb;
    c.streets[3] = {strokeColor:null != (Qb = null == (Kb = d) ? void 0 : null == (Lb = Kb.streets[3]) ? void 0 : Lb.strokeColor) ? Qb : "#387FB8", strokeWidth:null != (Rb = null == (Mb = d) ? void 0 : null == (Nb = Mb.streets[3]) ? void 0 : Nb.strokeWidth) ? Rb : 18, strokeDashstyle:null != (Sb = null == (Ob = d) ? void 0 : null == (Pb = Ob.streets[3]) ? void 0 : Pb.strokeDashstyle) ? Sb : "solid", };
    var Tb, Ub, Vb, Wb, Xb, Yb, Zb, $b, ac;
    c.streets[7] = {strokeColor:null != (Zb = null == (Tb = d) ? void 0 : null == (Ub = Tb.streets[7]) ? void 0 : Ub.strokeColor) ? Zb : "#ECE589", strokeWidth:null != ($b = null == (Vb = d) ? void 0 : null == (Wb = Vb.streets[7]) ? void 0 : Wb.strokeWidth) ? $b : 14, strokeDashstyle:null != (ac = null == (Xb = d) ? void 0 : null == (Yb = Xb.streets[7]) ? void 0 : Yb.strokeDashstyle) ? ac : "solid", };
    var bc, cc, dc, ec, fc, gc, hc, ic, jc;
    c.streets[6] = {strokeColor:null != (hc = null == (bc = d) ? void 0 : null == (cc = bc.streets[6]) ? void 0 : cc.strokeColor) ? hc : "#C13040", strokeWidth:null != (ic = null == (dc = d) ? void 0 : null == (ec = dc.streets[6]) ? void 0 : ec.strokeWidth) ? ic : 16, strokeDashstyle:null != (jc = null == (fc = d) ? void 0 : null == (gc = fc.streets[6]) ? void 0 : gc.strokeDashstyle) ? jc : "solid", };
    var kc, lc, mc, nc, oc, pc, qc, rc, sc;
    c.streets[16] = {strokeColor:null != (qc = null == (kc = d) ? void 0 : null == (lc = kc.streets[16]) ? void 0 : lc.strokeColor) ? qc : "#B700FF", strokeWidth:null != (rc = null == (mc = d) ? void 0 : null == (nc = mc.streets[16]) ? void 0 : nc.strokeWidth) ? rc : 5, strokeDashstyle:null != (sc = null == (oc = d) ? void 0 : null == (pc = oc.streets[16]) ? void 0 : pc.strokeDashstyle) ? sc : "dash", };
    var tc, uc, vc, wc, xc, yc, zc, Ac, Bc;
    c.streets[5] = {strokeColor:null != (zc = null == (tc = d) ? void 0 : null == (uc = tc.streets[5]) ? void 0 : uc.strokeColor) ? zc : "#00FF00", strokeWidth:null != (Ac = null == (vc = d) ? void 0 : null == (wc = vc.streets[5]) ? void 0 : wc.strokeWidth) ? Ac : 5, strokeDashstyle:null != (Bc = null == (xc = d) ? void 0 : null == (yc = xc.streets[5]) ? void 0 : yc.strokeDashstyle) ? Bc : "dash", };
    var Cc, Dc, Ec, Fc, Gc, Hc, Ic, Jc, Kc;
    c.streets[8] = {strokeColor:null != (Ic = null == (Cc = d) ? void 0 : null == (Dc = Cc.streets[8]) ? void 0 : Dc.strokeColor) ? Ic : "#82614A", strokeWidth:null != (Jc = null == (Ec = d) ? void 0 : null == (Fc = Ec.streets[8]) ? void 0 : Fc.strokeWidth) ? Jc : 7, strokeDashstyle:null != (Kc = null == (Gc = d) ? void 0 : null == (Hc = Gc.streets[8]) ? void 0 : Hc.strokeDashstyle) ? Kc : "solid", };
    var Lc, Mc, Nc, Oc, Pc, Qc, Rc, Sc, Tc;
    c.streets[15] = {strokeColor:null != (Rc = null == (Lc = d) ? void 0 : null == (Mc = Lc.streets[15]) ? void 0 : Mc.strokeColor) ? Rc : "#FF8000", strokeWidth:null != (Sc = null == (Nc = d) ? void 0 : null == (Oc = Nc.streets[15]) ? void 0 : Oc.strokeWidth) ? Sc : 5, strokeDashstyle:null != (Tc = null == (Pc = d) ? void 0 : null == (Qc = Pc.streets[15]) ? void 0 : Qc.strokeDashstyle) ? Tc : "dashdot", };
    var Uc, Vc, Wc, Xc, Yc, Zc, $c, ad, bd;
    c.streets[18] = {strokeColor:null != ($c = null == (Uc = d) ? void 0 : null == (Vc = Uc.streets[18]) ? void 0 : Vc.strokeColor) ? $c : "#FFFFFF", strokeWidth:null != (ad = null == (Wc = d) ? void 0 : null == (Xc = Wc.streets[18]) ? void 0 : Xc.strokeWidth) ? ad : 8, strokeDashstyle:null != (bd = null == (Yc = d) ? void 0 : null == (Zc = Yc.streets[18]) ? void 0 : Zc.strokeDashstyle) ? bd : "dash", };
    var cd, dd, ed, fd, gd, hd, id, jd, kd;
    c.streets[17] = {strokeColor:null != (id = null == (cd = d) ? void 0 : null == (dd = cd.streets[17]) ? void 0 : dd.strokeColor) ? id : "#00FFB3", strokeWidth:null != (jd = null == (ed = d) ? void 0 : null == (fd = ed.streets[17]) ? void 0 : fd.strokeWidth) ? jd : 7, strokeDashstyle:null != (kd = null == (gd = d) ? void 0 : null == (hd = gd.streets[17]) ? void 0 : hd.strokeDashstyle) ? kd : "solid", };
    var ld, md, nd, od, pd, qd, rd, sd, td;
    c.streets[22] = {strokeColor:null != (rd = null == (ld = d) ? void 0 : null == (md = ld.streets[22]) ? void 0 : md.strokeColor) ? rd : "#C6C7FF", strokeWidth:null != (sd = null == (nd = d) ? void 0 : null == (od = nd.streets[22]) ? void 0 : od.strokeWidth) ? sd : 6, strokeDashstyle:null != (td = null == (pd = d) ? void 0 : null == (qd = pd.streets[22]) ? void 0 : qd.strokeDashstyle) ? td : "solid", };
    var ud, vd, wd, xd, yd, zd, Ad, Bd, Cd;
    c.streets[19] = {strokeColor:null != (Ad = null == (ud = d) ? void 0 : null == (vd = ud.streets[19]) ? void 0 : vd.strokeColor) ? Ad : "#00FF00", strokeWidth:null != (Bd = null == (wd = d) ? void 0 : null == (xd = wd.streets[19]) ? void 0 : xd.strokeWidth) ? Bd : 5, strokeDashstyle:null != (Cd = null == (yd = d) ? void 0 : null == (zd = yd.streets[19]) ? void 0 : zd.strokeDashstyle) ? Cd : "dashdot", };
    var Dd, Ed, Fd, Gd, Hd, Id, Jd, Kd, Ld;
    c.streets[2] = {strokeColor:null != (Jd = null == (Dd = d) ? void 0 : null == (Ed = Dd.streets[2]) ? void 0 : Ed.strokeColor) ? Jd : "#CBA12E", strokeWidth:null != (Kd = null == (Fd = d) ? void 0 : null == (Gd = Fd.streets[2]) ? void 0 : Gd.strokeWidth) ? Kd : 12, strokeDashstyle:null != (Ld = null == (Hd = d) ? void 0 : null == (Id = Hd.streets[2]) ? void 0 : Id.strokeDashstyle) ? Ld : "solid", };
    var Md, Nd, Od, Pd, Qd, Rd, Sd, Td, Ud;
    c.streets[10] = {strokeColor:null != (Sd = null == (Md = d) ? void 0 : null == (Nd = Md.streets[10]) ? void 0 : Nd.strokeColor) ? Sd : "#0000FF", strokeWidth:null != (Td = null == (Od = d) ? void 0 : null == (Pd = Od.streets[10]) ? void 0 : Pd.strokeWidth) ? Td : 5, strokeDashstyle:null != (Ud = null == (Qd = d) ? void 0 : null == (Rd = Qd.streets[10]) ? void 0 : Rd.strokeDashstyle) ? Ud : "dash", };
    var Vd, Wd, Xd, Yd, Zd, $d;
    c.red = {strokeColor:null != (Zd = null == (Vd = d) ? void 0 : null == (Wd = Vd.red) ? void 0 : Wd.strokeColor) ? Zd : "#FF0000", strokeDashstyle:null != ($d = null == (Xd = d) ? void 0 : null == (Yd = Xd.red) ? void 0 : Yd.strokeDashstyle) ? $d : "solid", };
    var ae, be, ce, de, ee, fe, ge, he, ie;
    c.roundabout = {strokeColor:null != (ge = null == (ae = d) ? void 0 : null == (be = ae.roundabout) ? void 0 : be.strokeColor) ? ge : "#111", strokeWidth:null != (he = null == (ce = d) ? void 0 : null == (de = ce.roundabout) ? void 0 : de.strokeWidth) ? he : 1, strokeDashstyle:null != (ie = null == (ee = d) ? void 0 : null == (fe = ee.roundabout) ? void 0 : fe.strokeDashstyle) ? ie : "dash", };
    var je, ke, le, me, ne, oe, pe, qe, re;
    c.lanes = {strokeColor:null != (pe = null == (je = d) ? void 0 : null == (ke = je.lanes) ? void 0 : ke.strokeColor) ? pe : "#454443", strokeDashstyle:null != (qe = null == (le = d) ? void 0 : null == (me = le.lanes) ? void 0 : me.strokeDashstyle) ? qe : "dash", strokeOpacity:null != (re = null == (ne = d) ? void 0 : null == (oe = ne.lanes) ? void 0 : oe.strokeOpacity) ? re : 0.9, };
    var se, te, ue, ve, we, xe, ye, ze, Ae;
    c.toll = {strokeColor:null != (ye = null == (se = d) ? void 0 : null == (te = se.toll) ? void 0 : te.strokeColor) ? ye : "#00E1FF", strokeDashstyle:null != (ze = null == (ue = d) ? void 0 : null == (ve = ue.toll) ? void 0 : ve.strokeDashstyle) ? ze : "solid", strokeOpacity:null != (Ae = null == (we = d) ? void 0 : null == (xe = we.toll) ? void 0 : xe.strokeOpacity) ? Ae : 1.0, };
    var Be, Ce, De, Ee, Fe, Ge, He, Ie, Je;
    c.closure = {strokeColor:null != (He = null == (Be = d) ? void 0 : null == (Ce = Be.closure) ? void 0 : Ce.strokeColor) ? He : "#FF00FF", strokeOpacity:null != (Ie = null == (De = d) ? void 0 : null == (Ee = De.closure) ? void 0 : Ee.strokeOpacity) ? Ie : 1.0, strokeDashstyle:null != (Je = null == (Fe = d) ? void 0 : null == (Ge = Fe.closure) ? void 0 : Ge.strokeDashstyle) ? Je : "dash", };
    var Ke, Le, Me, Ne, Oe, Pe, Qe, Re, Se;
    c.headlights = {strokeColor:null != (Qe = null == (Ke = d) ? void 0 : null == (Le = Ke.headlights) ? void 0 : Le.strokeColor) ? Qe : "#bfff00", strokeOpacity:null != (Re = null == (Me = d) ? void 0 : null == (Ne = Me.headlights) ? void 0 : Ne.strokeOpacity) ? Re : 0.9, strokeDashstyle:null != (Se = null == (Oe = d) ? void 0 : null == (Pe = Oe.headlights) ? void 0 : Pe.strokeDashstyle) ? Se : "dot", };
    var Te, Ue, Ve, We, Xe, Ye, Ze, $e, af;
    c.nearbyHOV = {strokeColor:null != (Ze = null == (Te = d) ? void 0 : null == (Ue = Te.nearbyHOV) ? void 0 : Ue.strokeColor) ? Ze : "#ff66ff", strokeOpacity:null != ($e = null == (Ve = d) ? void 0 : null == (We = Ve.nearbyHOV) ? void 0 : We.strokeOpacity) ? $e : 1.0, strokeDashstyle:null != (af = null == (Xe = d) ? void 0 : null == (Ye = Xe.nearbyHOV) ? void 0 : Ye.strokeDashstyle) ? af : "dash", };
    var bf, cf, df, ef, ff, gf, hf, jf, kf;
    c.restriction = {strokeColor:null != (hf = null == (bf = d) ? void 0 : null == (cf = bf.restriction) ? void 0 : cf.strokeColor) ? hf : "#F2FF00", strokeOpacity:null != (jf = null == (df = d) ? void 0 : null == (ef = df.restriction) ? void 0 : ef.strokeOpacity) ? jf : 1.0, strokeDashstyle:null != (kf = null == (ff = d) ? void 0 : null == (gf = ff.restriction) ? void 0 : gf.strokeDashstyle) ? kf : "dash", };
    var lf, mf, nf, of, pf, qf, rf, sf, tf;
    c.dirty = {strokeColor:null != (rf = null == (lf = d) ? void 0 : null == (mf = lf.dirty) ? void 0 : mf.strokeColor) ? rf : "#82614A", strokeOpacity:null != (sf = null == (nf = d) ? void 0 : null == (of = nf.dirty) ? void 0 : of.strokeOpacity) ? sf : 0.6, strokeDashstyle:null != (tf = null == (pf = d) ? void 0 : null == (qf = pf.dirty) ? void 0 : qf.strokeDashstyle) ? tf : "longdash", };
    c.speeds = {};
    var uf, vf, wf;
    c.speeds["default"] = null != (wf = null == (uf = d) ? void 0 : null == (vf = uf.speed) ? void 0 : vf["default"]) ? wf : "#cc0000";
    var xf, yf;
    if (null == (xf = d) ? 0 : null == (yf = xf.speeds) ? 0 : yf.metric) {
      c.speeds.metric = d.speeds.metric;
    } else {
      c.speeds.metric = {};
      var zf, Af, Bf;
      c.speeds.metric[5] = null != (Bf = null == (zf = d) ? void 0 : null == (Af = zf.speeds) ? void 0 : Af.metric[5]) ? Bf : "#542344";
      var Cf, Df, Ef;
      c.speeds.metric[7] = null != (Ef = null == (Cf = d) ? void 0 : null == (Df = Cf.speeds) ? void 0 : Df.metric[7]) ? Ef : "#ff5714";
      var Ff, Gf, Hf;
      c.speeds.metric[10] = null != (Hf = null == (Ff = d) ? void 0 : null == (Gf = Ff.speeds) ? void 0 : Gf.metric[10]) ? Hf : "#ffbf00";
      var If, Jf, Kf;
      c.speeds.metric[20] = null != (Kf = null == (If = d) ? void 0 : null == (Jf = If.speeds) ? void 0 : Jf.metric[20]) ? Kf : "#ee0000";
      var Lf, Mf, Nf;
      c.speeds.metric[30] = null != (Nf = null == (Lf = d) ? void 0 : null == (Mf = Lf.speeds) ? void 0 : Mf.metric[30]) ? Nf : "#e4ff1a";
      var Of, Pf, Qf;
      c.speeds.metric[40] = null != (Qf = null == (Of = d) ? void 0 : null == (Pf = Of.speeds) ? void 0 : Pf.metric[40]) ? Qf : "#993300";
      var Rf, Sf, Tf;
      c.speeds.metric[50] = null != (Tf = null == (Rf = d) ? void 0 : null == (Sf = Rf.speeds) ? void 0 : Sf.metric[50]) ? Tf : "#33ff33";
      var Uf, Vf, Wf;
      c.speeds.metric[60] = null != (Wf = null == (Uf = d) ? void 0 : null == (Vf = Uf.speeds) ? void 0 : Vf.metric[60]) ? Wf : "#639fab";
      var Xf, Yf, Zf;
      c.speeds.metric[70] = null != (Zf = null == (Xf = d) ? void 0 : null == (Yf = Xf.speeds) ? void 0 : Yf.metric[70]) ? Zf : "#00ffff";
      var $f, ag, bg;
      c.speeds.metric[80] = null != (bg = null == ($f = d) ? void 0 : null == (ag = $f.speeds) ? void 0 : ag.metric[80]) ? bg : "#00bfff";
      var cg, dg, eg;
      c.speeds.metric[90] = null != (eg = null == (cg = d) ? void 0 : null == (dg = cg.speeds) ? void 0 : dg.metric[90]) ? eg : "#0066ff";
      var fg, gg, hg;
      c.speeds.metric[100] = null != (hg = null == (fg = d) ? void 0 : null == (gg = fg.speeds) ? void 0 : gg.metric[100]) ? hg : "#ff00ff";
      var ig, jg, kg;
      c.speeds.metric[110] = null != (kg = null == (ig = d) ? void 0 : null == (jg = ig.speeds) ? void 0 : jg.metric[110]) ? kg : "#ff0080";
      var lg, mg, ng;
      c.speeds.metric[120] = null != (ng = null == (lg = d) ? void 0 : null == (mg = lg.speeds) ? void 0 : mg.metric[120]) ? ng : "#ff0000";
      var og, pg, qg;
      c.speeds.metric[130] = null != (qg = null == (og = d) ? void 0 : null == (pg = og.speeds) ? void 0 : pg.metric[130]) ? qg : "#ff9000";
      var rg, sg, tg;
      c.speeds.metric[140] = null != (tg = null == (rg = d) ? void 0 : null == (sg = rg.speeds) ? void 0 : sg.metric[140]) ? tg : "#ff4000";
      var ug, vg, wg;
      c.speeds.metric[150] = null != (wg = null == (ug = d) ? void 0 : null == (vg = ug.speeds) ? void 0 : vg.metric[150]) ? wg : "#0040ff";
    }
    var xg, yg;
    if (null == (xg = d) ? 0 : null == (yg = xg.speeds) ? 0 : yg.imperial) {
      c.speeds.imperial = d.speeds.imperial;
    } else {
      c.speeds.imperial = {};
      var zg, Ag, Bg;
      c.speeds.imperial[5] = null != (Bg = null == (zg = d) ? void 0 : null == (Ag = zg.speeds) ? void 0 : Ag.imperial[5]) ? Bg : "#ff0000";
      var Cg, Dg, Eg;
      c.speeds.imperial[10] = null != (Eg = null == (Cg = d) ? void 0 : null == (Dg = Cg.speeds) ? void 0 : Dg.imperial[10]) ? Eg : "#ff8000";
      var Fg, Gg, Hg;
      c.speeds.imperial[15] = null != (Hg = null == (Fg = d) ? void 0 : null == (Gg = Fg.speeds) ? void 0 : Gg.imperial[15]) ? Hg : "#ffb000";
      var Ig, Jg, Kg;
      c.speeds.imperial[20] = null != (Kg = null == (Ig = d) ? void 0 : null == (Jg = Ig.speeds) ? void 0 : Jg.imperial[20]) ? Kg : "#bfff00";
      var Lg, Mg, Ng;
      c.speeds.imperial[25] = null != (Ng = null == (Lg = d) ? void 0 : null == (Mg = Lg.speeds) ? void 0 : Mg.imperial[25]) ? Ng : "#993300";
      var Og, Pg, Qg;
      c.speeds.imperial[30] = null != (Qg = null == (Og = d) ? void 0 : null == (Pg = Og.speeds) ? void 0 : Pg.imperial[30]) ? Qg : "#33ff33";
      var Rg, Sg, Tg;
      c.speeds.imperial[35] = null != (Tg = null == (Rg = d) ? void 0 : null == (Sg = Rg.speeds) ? void 0 : Sg.imperial[35]) ? Tg : "#00ff90";
      var Ug, Vg, Wg;
      c.speeds.imperial[40] = null != (Wg = null == (Ug = d) ? void 0 : null == (Vg = Ug.speeds) ? void 0 : Vg.imperial[40]) ? Wg : "#00ffff";
      var Xg, Yg, Zg;
      c.speeds.imperial[45] = null != (Zg = null == (Xg = d) ? void 0 : null == (Yg = Xg.speeds) ? void 0 : Yg.imperial[45]) ? Zg : "#00bfff";
      var $g, ah, bh;
      c.speeds.imperial[50] = null != (bh = null == ($g = d) ? void 0 : null == (ah = $g.speeds) ? void 0 : ah.imperial[50]) ? bh : "#0066ff";
      var ch, dh, eh;
      c.speeds.imperial[55] = null != (eh = null == (ch = d) ? void 0 : null == (dh = ch.speeds) ? void 0 : dh.imperial[55]) ? eh : "#ff00ff";
      var fh, gh, hh;
      c.speeds.imperial[60] = null != (hh = null == (fh = d) ? void 0 : null == (gh = fh.speeds) ? void 0 : gh.imperial[60]) ? hh : "#ff0050";
      var ih, jh, kh;
      c.speeds.imperial[65] = null != (kh = null == (ih = d) ? void 0 : null == (jh = ih.speeds) ? void 0 : jh.imperial[65]) ? kh : "#ff9010";
      var lh, mh, nh;
      c.speeds.imperial[70] = null != (nh = null == (lh = d) ? void 0 : null == (mh = lh.speeds) ? void 0 : mh.imperial[70]) ? nh : "#0040ff";
      var oh, ph, qh;
      c.speeds.imperial[75] = null != (qh = null == (oh = d) ? void 0 : null == (ph = oh.speeds) ? void 0 : ph.imperial[75]) ? qh : "#10ff10";
      var rh, sh, th;
      c.speeds.imperial[80] = null != (th = null == (rh = d) ? void 0 : null == (sh = rh.speeds) ? void 0 : sh.imperial[80]) ? th : "#ff4000";
      var uh, vh, wh;
      c.speeds.imperial[85] = null != (wh = null == (uh = d) ? void 0 : null == (vh = uh.speeds) ? void 0 : vh.imperial[85]) ? wh : "#ff0000";
    }
    za(c);
    return b;
  }
  function Aa(a) {
    if (c.showSLSinglecolor) {
      return c.SLColor;
    }
    var b;
    return null != (b = c.speeds[W.prefs.attributes.isImperial ? "imperial" : "metric"][W.prefs.attributes.isImperial ? Math.round(a / 1.609344) : a]) ? b : c.speeds["default"];
  }
  function xh(a, b, d) {
    a ? (a = d.x - b.x, b = d.y - b.y) : (a = b.x - d.x, b = b.y - d.y);
    return 180 * Math.atan2(a, b) / Math.PI;
  }
  function qa(a) {
    var b = "";
    if (a) {
      var d = a;
      !0 === W.prefs.attributes.isImperial && (d = Math.round(a / 1.609344));
      d = d.toString();
      for (a = 0; a < d.length; a += 1) {
        b += di[d.charAt(a)];
      }
    }
    return b;
  }
  function yh(a, b, d) {
    d = void 0 === d ? !1 : d;
    var e, f, h = [];
    var m = null;
    var g = a.getAttributes(), q = a.getAddress(), u = a.hasNonEmptyStreet();
    if (null !== g.primaryStreetID && void 0 === q.attributes.state) {
      x("Address not ready", q, g), setTimeout(function() {
        yh(a, b, !0);
      }, 500);
    } else {
      var p = q.attributes;
      q = "";
      u ? q = p.street.name : 10 > g.roadType && !a.isInRoundabout() && (q = "\u2691");
      u = "";
      if (c.showANs) {
        for (var y = 0, v = 0; v < g.streetIDs.length; v += 1) {
          var k = g.streetIDs[v];
          if (2 === y) {
            u += " \u2026";
            break;
          }
          (k = W.model.streets.objects[k]) && k.name !== p.street.name && (y += 1, u += k.name ? "(" + k.name + ")" : "");
        }
        u = u.replace(")(", ", ");
        "" !== u && (u = "\n" + u);
      }
      N[g.roadType] || (q += "\n!! UNSUPPORTED ROAD TYPE !!");
      p = "";
      (null != (e = g.fwdMaxSpeed) ? e : g.revMaxSpeed) && c.showSLtext && (g.fwdMaxSpeed === g.revMaxSpeed ? p = qa(g.fwdMaxSpeed) : g.fwdMaxSpeed ? (p = qa(g.fwdMaxSpeed), g.revMaxSpeed && (p += "'" + qa(g.revMaxSpeed))) : (p = qa(g.revMaxSpeed), g.fwdMaxSpeed && (p += "'" + qa(g.fwdMaxSpeed))), g.fwdMaxSpeedUnverified || g.revMaxSpeedUnverified) && (p += "?");
      e = q + " " + p;
      if (" " === e) {
        return [];
      }
      p = g.roadType;
      p = new OpenLayers.Feature.Vector(b[0], {myId:g.id, color:N[p] ? N[p].strokeColor : "#f00", outlinecolor:N[p] ? N[p].outlineColor : "#fff", outlinewidth:c.labelOutlineWidth, });
      y = [];
      for (v = 0; v < b.length - 1; v += 1) {
        k = b[v].distanceTo(b[v + 1]), y.push({index:v, h:k});
      }
      y.sort(function(G, L) {
        return G.h > L.h ? -1 : G.h < L.h ? 1 : 0;
      });
      v = "" === q ? 1 : y.length;
      k = zh * e.length;
      for (var C = 0; C < y.length && 0 < v && !(y[C].h < (0 < C ? k : k - 30)); C += 1) {
        var F = y[C].index;
        var D = f = 0;
        D = b[F];
        var t = (new OpenLayers.Geometry.LineString([D, b[F + 1], ])).getCentroid(!0);
        m = p.clone();
        m.geometry = t;
        g.fwdDirection ? (f = t.x - D.x, D = t.y - D.y) : (f = D.x - t.x, D = D.y - t.y);
        D = 90 + 180 * Math.atan2(f, D) / Math.PI;
        "" !== q ? (f = " \u25b6 ", 90 < D && 270 > D ? D -= 180 : f = " \u25c0 ") : f = "";
        a.isOneWay() || (f = "");
        m.attributes.label = f + e + f + u;
        m.attributes.angle = D;
        m.attributes.a = 1 === F % 2;
        m.attributes.v = v;
        --v;
        h.push(m);
      }
    }
    d && m && A.addFeatures(h, {silent:!0});
    return h;
  }
  function Ah(a) {
    var b = a.id, d = a.rev, e = a.l, f = a.m;
    a = xh(a.j, d ? f : e, d ? e : f);
    return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(e.x + 10 * Math.sin(a), e.y + 10 * Math.cos(a)), {myId:b, }, {rotation:a, externalGraphic:"https://raw.githubusercontent.com/bedo2991/svl/master/average.png", graphicWidth:36, graphicHeight:36, graphicZIndex:300, fillOpacity:1, pointerEvents:"none", });
  }
  function ei(a) {
    var b = a.getAttributes();
    x("Drawing segment: " + b.id);
    var d = b.geometry.components, e = b.geometry.getVertices(), f = (new OpenLayers.Geometry.LineString(e)).simplify(1.5).components, h = [], m = 100 * b.level, g = b.fwdDirection && b.revDirection, q = a.isInRoundabout(), u = !1, p = !1, y = b.roadType, v = ci({u:b.width, roadType:y, A:g, });
    g = v;
    var k = null;
    if (null === b.primaryStreetID) {
      return k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:c.red.strokeColor, width:v, dash:c.red.strokeDashstyle, }), h.push(k), h;
    }
    c.routingModeEnabled && null !== b.routingRoadType && (y = b.routingRoadType);
    if (void 0 !== N[y]) {
      var C;
      p = null != (C = b.fwdMaxSpeed) ? C : b.revMaxSpeed;
      0 < b.level && (u = !0, k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:"#000000", zIndex:m + 100, width:v, }), h.push(k));
      if ((p = p && c.showSLcolor) && u) {
        g = 0.56 * v;
      } else {
        if (u || p) {
          g = 0.68 * v;
        }
      }
      if (p) {
        if (C = c.showDashedUnverifiedSL && (b.fwdMaxSpeedUnverified || b.revMaxSpeedUnverified) ? "dash" : "solid", c.showSLSinglecolor || !b.fwdMaxSpeed && !b.revMaxSpeed || b.fwdMaxSpeed === b.revMaxSpeed || a.isOneWay()) {
          p = b.fwdMaxSpeed, a.isOneWay() && b.revDirection && (p = b.revMaxSpeed), p && (k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Aa(p), width:u ? 0.8 * v : v, dash:C, a:!0, zIndex:m + 115, }), h.push(k));
        } else {
          p = [];
          for (var F = [], D = 0; D < e.length - 1; D += 1) {
            var t = e[D], G = e[D + 1];
            k = t.x - G.x;
            var L = t.y - G.y;
            p[0] = t.clone();
            F[0] = t.clone();
            p[1] = G.clone();
            F[1] = G.clone();
            t = u ? 0.14 * v : 0.17 * v;
            if (0.5 > Math.abs(k)) {
              0 < L ? (p[0].move(-t, 0), p[1].move(-t, 0), F[0].move(t, 0), F[1].move(t, 0)) : (p[0].move(t, 0), p[1].move(t, 0), F[0].move(-t, 0), F[1].move(-t, 0));
            } else {
              var T = L / k;
              G = -1 / T;
              if (0.05 > Math.abs(T)) {
                0 < k ? (p[0].move(0, t), p[1].move(0, t), F[0].move(0, -t), F[1].move(0, -t)) : (p[0].move(0, -t), p[1].move(0, -t), F[0].move(0, t), F[1].move(0, t));
              } else {
                if (0 < L && 0 < k || 0 > k && 0 < L) {
                  t *= -1;
                }
                k = Math.sqrt(1 + G * G);
                p[0].move(t / k, G / k * t);
                p[1].move(t / k, G / k * t);
                F[0].move(-t / k, G / k * -t);
                F[1].move(-t / k, G / k * -t);
              }
            }
            k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(p), {myId:b.id, color:Aa(b.fwdMaxSpeed), width:g, dash:C, a:!0, zIndex:m + 105, });
            h.push(k);
            k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(F), {myId:b.id, color:Aa(b.revMaxSpeed), width:g, dash:C, a:!0, zIndex:m + 110, });
            h.push(k);
          }
        }
      }
      k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:N[y].strokeColor, width:g, dash:N[y].strokeDashstyle, zIndex:m + 120, });
      h.push(k);
      0 > b.level && (k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:"#000000", width:g, opacity:0.3, zIndex:m + 125, }), h.push(k));
      u = a.getLockRank() + 1;
      var J, B;
      if (u > c.fakelock || u > (null == (J = WazeWrap) ? void 0 : null == (B = J.User) ? void 0 : B.Rank())) {
        k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Bh.strokeColor, width:0.1 * g, dash:Bh.strokeDashstyle, zIndex:m + 147, }), h.push(k);
      }
      J = a.getFlagAttributes();
      J.unpaved && (k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:c.dirty.strokeColor, width:0.7 * g, opacity:c.dirty.strokeOpacity, dash:c.dirty.strokeDashstyle, zIndex:m + 135, }), h.push(k));
      b.hasClosures && (k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:c.closure.strokeColor, width:0.6 * g, dash:c.closure.strokeDashstyle, opacity:c.closure.strokeOpacity, a:!0, zIndex:m + 140, }), h.push(k));
      if (b.fwdToll || b.revToll || b.restrictions.some(function(V) {
        return "TOLL" === V.getDefaultType();
      })) {
        k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:c.toll.strokeColor, width:0.3 * g, dash:c.toll.strokeDashstyle, opacity:c.toll.strokeOpacity, zIndex:m + 145, }), h.push(k);
      }
      q && (k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Ba.strokeColor, width:0.15 * g, dash:Ba.strokeDashstyle, opacity:Ba.strokeOpacity, a:!0, zIndex:m + 150, }), h.push(k));
      0 < b.restrictions.length && (k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:c.restriction.strokeColor, width:0.4 * g, dash:c.restriction.strokeDashstyle, opacity:c.restriction.strokeOpacity, a:!0, zIndex:m + 155, }), h.push(k));
      !1 === b.validated && (k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Ch.strokeColor, width:0.5 * g, dash:Ch.strokeDashstyle, a:!0, zIndex:m + 160, }), h.push(k));
      J.headlights && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:c.headlights.strokeColor, width:0.2 * g, dash:c.headlights.strokeDashstyle, opacity:c.headlights.strokeOpacity, a:!0, zIndex:m + 165, }));
      J.nearbyHOV && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:c.nearbyHOV.strokeColor, width:0.25 * g, dash:c.nearbyHOV.strokeDashstyle, opacity:c.nearbyHOV.strokeOpacity, a:!0, zIndex:m + 166, }));
      0 < b.fwdLaneCount && (B = e.slice(-2), B[0] = (new OpenLayers.Geometry.LineString([B[0], B[1], ])).getCentroid(!0), k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(B), {myId:b.id, color:c.lanes.strokeColor, width:0.3 * g, dash:c.lanes.strokeDashstyle, opacity:c.lanes.strokeOpacity, a:!0, zIndex:m + 170, }), h.push(k));
      0 < b.revLaneCount && (B = e.slice(0, 2), B[1] = (new OpenLayers.Geometry.LineString([B[0], B[1], ])).getCentroid(!0), k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(B), {myId:b.id, color:c.lanes.strokeColor, width:0.3 * g, dash:c.lanes.strokeDashstyle, opacity:c.lanes.strokeOpacity, a:!0, zIndex:m + 175, }), h.push(k));
      if (!1 === b.fwdDirection || !1 === b.revDirection) {
        if (B = d, !q && b.length / d.length < c.arrowDeclutter && (B = f), !1 === (b.fwdDirection || b.revDirection)) {
          for (u = 0; u < B.length - 1; u += 1) {
            h.push(new OpenLayers.Feature.Vector((new OpenLayers.Geometry.LineString([B[u], B[u + 1], ])).getCentroid(!0), {myId:b.id, a:!0, i:!0, zIndex:m + 180, }, fi));
          }
        } else {
          for (u = q ? 3 : 1, y = u - 1; y < B.length - 1; y += u) {
            v = xh(b.fwdDirection, B[y], B[y + 1]), C = new OpenLayers.Geometry.LineString([B[y], B[y + 1], ]), h.push(new OpenLayers.Feature.Vector(C.getCentroid(!0), {myId:b.id, a:!0, i:!0, }, {graphicName:"myTriangle", rotation:v, stroke:!0, strokeColor:"#000", graphiczIndex:m + 180, strokeWidth:1.5, fill:!0, fillColor:"#fff", fillOpacity:0.7, pointRadius:5, }));
          }
        }
      }
      J.fwdSpeedCamera && h.push(Ah({id:b.id, rev:!1, j:b.fwdDirection, l:d[0], m:d[1], }));
      J.revSpeedCamera && h.push(Ah({id:b.id, rev:!0, j:b.fwdDirection, l:d[d.length - 1], m:d[d.length - 2], }));
      if (!0 === c.renderGeomNodes && !q) {
        for (q = 1; q < d.length - 2; q += 1) {
          h.push(new OpenLayers.Feature.Vector(d[q], {myId:b.id, zIndex:m + 200, a:!0, i:!0, }, gi));
        }
      }
      J.tunnel && (k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Ca.strokeColor, opacity:Ca.strokeOpacity, width:0.3 * g, dash:Ca.strokeDashstyle, zIndex:m + 177, }), h.push(k), k = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Dh.strokeColor, width:0.1 * g, dash:Dh.strokeDashstyle, zIndex:m + 177, }), h.push(k));
    }
    a = yh(a, f);
    0 < a.length && A.addFeatures(a, {silent:!0});
    return h;
  }
  function Eh(a) {
    a = a.getAttributes();
    var b = new OpenLayers.Geometry.Point(a.geometry.x, a.geometry.y);
    return new OpenLayers.Feature.Vector(b, {myid:a.id, }, Fh(a));
  }
  function hi() {
    ya();
    aa(c);
    ba();
    w("info", "All's well that ends well! Now it's everything as it was before.");
  }
  function ii() {
    GM_setClipboard(JSON.stringify(c));
    w("info", "The configuration has been copied to your clipboard. Please paste it in a file (CTRL+V) to store it.");
  }
  function bi(a, b) {
    if (null !== b && "" !== b) {
      try {
        c = JSON.parse(b);
      } catch (d) {
        w("error", "Your string seems to be somehow wrong. Please check that is a valid JSON string");
        return;
      }
      null !== c && c.streets ? (aa(c), za(c), ba(), w("success", "Done, preferences imported!")) : w("error", "Something went wrong. Is your string correct?");
    }
  }
  function Gh() {
    var a = parseInt(W.map.getLayerByUniqueName("gps_points").getZIndex(), 10);
    c.showUnderGPSPoints ? (z.setZIndex(a - 2), E.setZIndex(a - 1)) : (z.setZIndex(a + 1), E.setZIndex(a + 2));
  }
  function S(a) {
    var b = a.type, d = a.className, e = a.title, f = a.min, h = a.max, m = a.step, g = document.createElement("input");
    g.id = "svl_" + a.id;
    d && (g.className = d);
    e && (g.title = e);
    g.type = b;
    if ("range" === b || "number" === b) {
      g.min = f, g.max = h, g.step = m;
    }
    return g;
  }
  function Hh() {
    var a = document.getElementById("svl_routingModeDiv");
    c.routingModeEnabled && !0 !== c.hideRoutingModeBlock ? null === a && (a = document.createElement("div"), a.id = "svl_routingModeDiv", a.className = "routingDiv", a.innerHTML = "SVL's Routing Mode<br><small>Hover to temporary disable it<small>", a.addEventListener("mouseenter", function() {
      c.routingModeEnabled = !1;
      Y();
    }), a.addEventListener("mouseleave", function() {
      c.routingModeEnabled = !0;
      Y();
    }), document.getElementById("map").appendChild(a)) : null == a || a.remove();
  }
  function Ih() {
    clearInterval(Da);
    Da = null;
    c.autoReload && c.autoReload.enabled && (Da = setInterval(R, c.autoReload.interval));
  }
  function Jh() {
    document.getElementById("svl_saveNewPref").classList.remove("disabled");
    document.getElementById("svl_saveNewPref").classList.add("btn-primary");
    document.getElementById("svl_rollbackButton").classList.remove("disabled");
    document.getElementById("sidepanel-svl").classList.add("svl_unsaved");
    var a = document.getElementById("svl_presets"), b = document.getElementById("svl_presets").value, d = !1;
    "wme_colors" === b && (d = !0, c.streets = Kh[b].streets);
    "svl_standard" === b && (d = !0, c.streets = Kh[b].streets);
    if (d) {
      Lh(), a.value = "", w("info", "Preset applied, don't forget to save your changes!");
    } else {
      for (a = 0; a < c.streets.length; a += 1) {
        c.streets[a] && (c.streets[a] = {}, c.streets[a].strokeColor = document.getElementById("svl_streetColor_" + a).value, c.streets[a].strokeWidth = document.getElementById("svl_streetWidth_" + a).value, c.streets[a].strokeDashstyle = document.querySelector("#svl_strokeDashstyle_" + a + " option:checked").value);
      }
    }
    c.fakelock = document.getElementById("svl_fakelock").value;
    a = W.prefs.attributes.isImperial ? "imperial" : "metric";
    b = Object.keys(c.speeds[a]);
    c.speeds[a] = {};
    for (d = 1; d < b.length + 1; d += 1) {
      c.speeds[a][document.getElementById("svl_slValue_" + a + "_" + d).value] = document.getElementById("svl_slColor_" + a + "_" + d).value;
    }
    c.speeds["default"] = document.getElementById("svl_slColor_" + a + "_Default").value;
    c.red = {};
    c.red.strokeColor = document.getElementById("svl_streetColor_red").value;
    c.red.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_red option:checked").value;
    c.dirty = {};
    c.dirty.strokeColor = document.getElementById("svl_streetColor_dirty").value;
    c.dirty.strokeOpacity = document.getElementById("svl_streetOpacity_dirty").value / 100.0;
    c.dirty.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_dirty option:checked").value;
    c.lanes = {};
    c.lanes.strokeColor = document.getElementById("svl_streetColor_lanes").value;
    c.lanes.strokeOpacity = document.getElementById("svl_streetOpacity_lanes").value / 100.0;
    c.lanes.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_lanes option:checked").value;
    c.toll = {};
    c.toll.strokeColor = document.getElementById("svl_streetColor_toll").value;
    c.toll.strokeOpacity = document.getElementById("svl_streetOpacity_toll").value / 100.0;
    c.toll.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_toll option:checked").value;
    c.restriction = {};
    c.restriction.strokeColor = document.getElementById("svl_streetColor_restriction").value;
    c.restriction.strokeOpacity = document.getElementById("svl_streetOpacity_restriction").value / 100.0;
    c.restriction.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_restriction option:checked").value;
    c.closure = {};
    c.closure.strokeColor = document.getElementById("svl_streetColor_closure").value;
    c.closure.strokeOpacity = document.getElementById("svl_streetOpacity_closure").value / 100.0;
    c.closure.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_closure option:checked").value;
    c.headlights = {};
    c.headlights.strokeColor = document.getElementById("svl_streetColor_headlights").value;
    c.headlights.strokeOpacity = document.getElementById("svl_streetOpacity_headlights").value / 100.0;
    c.headlights.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_headlights option:checked").value;
    c.nearbyHOV = {};
    c.nearbyHOV.strokeColor = document.getElementById("svl_streetColor_nearbyHOV").value;
    c.nearbyHOV.strokeOpacity = document.getElementById("svl_streetOpacity_nearbyHOV").value / 100.0;
    c.nearbyHOV.strokeDashstyle = document.querySelector("#svl_strokeDashstyle_nearbyHOV option:checked").value;
    c.autoReload = {};
    c.autoReload.interval = 1000 * document.getElementById("svl_autoReload_interval").value;
    c.autoReload.enabled = document.getElementById("svl_autoReload_enabled").checked;
    c.clutterConstant = document.getElementById("svl_clutterConstant").value;
    c.arrowDeclutter = document.getElementById("svl_arrowDeclutter").value;
    c.labelOutlineWidth = document.getElementById("svl_labelOutlineWidth").value;
    c.disableRoadLayers = document.getElementById("svl_disableRoadLayers").checked;
    c.startDisabled = document.getElementById("svl_startDisabled").checked;
    c.showSLtext = document.getElementById("svl_showSLtext").checked;
    c.showSLcolor = document.getElementById("svl_showSLcolor").checked;
    c.showSLSinglecolor = document.getElementById("svl_showSLSinglecolor").checked;
    c.SLColor = document.getElementById("svl_SLColor").value;
    c.hideMinorRoads = document.getElementById("svl_hideMinorRoads").checked;
    c.showDashedUnverifiedSL = document.getElementById("svl_showDashedUnverifiedSL").checked;
    c.farZoomLabelSize = document.getElementById("svl_farZoomLabelSize").value;
    c.closeZoomLabelSize = document.getElementById("svl_closeZoomLabelSize").value;
    c.renderGeomNodes = document.getElementById("svl_renderGeomNodes").checked;
    c.nodesThreshold = document.getElementById("svl_nodesThreshold").value;
    c.segmentsThreshold = document.getElementById("svl_segmentsThreshold").value;
    c.layerOpacity = document.getElementById("svl_layerOpacity").value / 100.0;
    c.showUnderGPSPoints !== document.getElementById("svl_showUnderGPSPoints").checked ? (c.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked, Gh()) : c.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked;
    c.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked;
    c.hideRoutingModeBlock = document.getElementById("svl_hideRoutingModeBlock").checked;
    Hh();
    c.useWMERoadLayerAtZoom = document.getElementById("svl_useWMERoadLayerAtZoom").value;
    c.switchZoom = document.getElementById("svl_switchZoom").value;
    c.showANs = document.getElementById("svl_showANs").checked;
    c.realsize = document.getElementById("svl_realsize").checked;
    c.realsize ? $("input.segmentsWidth").prop("disabled", !0) : $("input.segmentsWidth").prop("disabled", !1);
    aa(c);
    Ih();
  }
  function ji() {
    Jh();
    za(c, !1);
    ba();
  }
  function ki() {
    x("rollbackDefault");
    WazeWrap.Alerts.confirm(GM_info.script.name, "Are you sure you want to rollback to the default settings?\nANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!", n, null, "Yes, I want to reset", "Cancel");
  }
  function li(a) {
    var b = a.id, d = a.title, e = a.description, f = a.options, h = a.g;
    a = document.createElement("div");
    a.className = "prefLineSelect";
    "string" === typeof h && (a.classList.add("newOption"), a.dataset.version = h);
    var m = document.createElement("select");
    m.className = "prefElement";
    h = document.createElement("label");
    h.innerText = d;
    m.id = "svl_" + b;
    f && 0 < f.length && f.forEach(function(g) {
      var q = document.createElement("option");
      q.text = g.text;
      q.value = g.value;
      m.add(q);
    });
    b = document.createElement("i");
    b.innerText = e;
    a.appendChild(h);
    a.appendChild(b);
    a.appendChild(m);
    return a;
  }
  function Mh(a) {
    var b = I18n.translations[I18n.locale];
    switch(a) {
      case "red":
        var d, e, f;
        return null != (f = null == b ? void 0 : null == (d = b.segment) ? void 0 : null == (e = d.address) ? void 0 : e.none) ? f : a;
      case "toll":
        var h, m, g, q;
        return null != (q = null == b ? void 0 : null == (h = b.edit) ? void 0 : null == (m = h.segment) ? void 0 : null == (g = m.fields) ? void 0 : g.toll_road) ? q : a;
      case "restriction":
        var u, p, y;
        return null != (y = null == b ? void 0 : null == (u = b.restrictions) ? void 0 : null == (p = u.modal_headers) ? void 0 : p.restriction_summary) ? y : a;
      case "dirty":
        var v, k, C, F;
        return null != (F = null == b ? void 0 : null == (v = b.edit) ? void 0 : null == (k = v.segment) ? void 0 : null == (C = k.fields) ? void 0 : C.unpaved) ? F : a;
      case "closure":
        var D, t, G;
        return null != (G = null == b ? void 0 : null == (D = b.objects) ? void 0 : null == (t = D.roadClosure) ? void 0 : t.name) ? G : a;
      case "headlights":
        var L, T, J, B;
        return null != (B = null == b ? void 0 : null == (L = b.edit) ? void 0 : null == (T = L.segment) ? void 0 : null == (J = T.fields) ? void 0 : J.headlights) ? B : a;
      case "lanes":
        var V, da, ea;
        return null != (ea = null == b ? void 0 : null == (V = b.objects) ? void 0 : null == (da = V.lanes) ? void 0 : da.title) ? ea : a;
      case "speed limit":
        var fa, ha, ia, ja;
        return null != (ja = null == b ? void 0 : null == (fa = b.edit) ? void 0 : null == (ha = fa.segment) ? void 0 : null == (ia = ha.fields) ? void 0 : ia.speed_limit) ? ja : a;
      case "nearbyHOV":
        var ka, la, ma, na;
        return null != (na = null == b ? void 0 : null == (ka = b.edit) ? void 0 : null == (la = ka.segment) ? void 0 : null == (ma = la.fields) ? void 0 : ma.nearbyHOV) ? na : a;
    }
    var oa, pa;
    return null != (pa = null == b ? void 0 : null == (oa = b.segment) ? void 0 : oa.road_types[a]) ? pa : a;
  }
  function P(a) {
    var b = a.f, d = void 0 === a.c ? !0 : a.c, e = void 0 === a.b ? !1 : a.b;
    a = document.createElement("h5");
    a.innerText = Mh(b);
    var f = S({id:"streetColor_" + b, className:"prefElement form-control", title:"Color", type:"color", });
    f.style.width = "55pt";
    var h = document.createElement("div");
    d && (d = S({id:"streetWidth_" + b, type:"number", title:"Width (disabled if using real-size width)", className:Number.isInteger(b) ? "form-control prefElement segmentsWidth" : "form-control prefElement", min:1, max:20, step:1, }), d.style.width = "40pt", h.appendChild(d));
    e && (d = S({id:"streetOpacity_" + b, className:"form-control prefElement", type:"number", min:0, max:100, step:10, }), d.style.width = "45pt", h.appendChild(d));
    d = document.createElement("select");
    d.className = "prefElement";
    d.title = "Stroke style";
    d.id = "svl_strokeDashstyle_" + b;
    d.innerHTML = '<option value="solid">Solid</option><option value="dash">Dashed</option><option value="dashdot">Dash Dot</option><option value="longdash">Long Dash</option><option value="longdashdot">Long Dash Dot</option><option value="dot">Dot</option>';
    d.className = "form-control prefElement";
    h.className = "expand";
    h.appendChild(f);
    h.appendChild(d);
    b = document.createElement("div");
    b.className = "prefLineStreets";
    b.appendChild(a);
    b.appendChild(h);
    return b;
  }
  function ta(a, b) {
    var d = (b = void 0 === b ? !0 : b) ? "metric" : "imperial", e = document.createElement("label");
    e.innerText = -1 !== a ? a : "Default";
    var f = document.createElement("div");
    f.appendChild(e);
    "number" === typeof a && (e = S({id:"slValue_" + d + "_" + a, className:"form-control prefElement", title:"Speed Limit Value", type:"number", min:0, max:150, step:1, }), e.style.width = "50pt", f.appendChild(e), e = document.createElement("span"), e.innerText = b ? "km/h" : "mph", f.appendChild(e));
    a = S({id:"slColor_" + d + "_" + a, className:"prefElement form-control", type:"color", title:"Color", });
    a.style.width = "55pt";
    f.className = "expand";
    f.appendChild(a);
    a = document.createElement("div");
    a.className = "svl_" + d + " prefLineSL";
    a.appendChild(f);
    return a;
  }
  function Nh() {
    return {streets:["red"], decorations:"lanes toll restriction closure headlights dirty nearbyHOV".split(" "), };
  }
  function Lh() {
    for (var a = 0; a < c.streets.length; a += 1) {
      c.streets[a] && (document.getElementById("svl_streetWidth_" + a).value = c.streets[a].strokeWidth, document.getElementById("svl_streetColor_" + a).value = c.streets[a].strokeColor, document.getElementById("svl_strokeDashstyle_" + a).value = c.streets[a].strokeDashstyle);
    }
  }
  function ba() {
    document.getElementById("svl_saveNewPref").classList.add("disabled");
    document.getElementById("svl_rollbackButton").classList.add("disabled");
    document.getElementById("svl_saveNewPref").classList.remove("btn-primary");
    document.getElementById("sidepanel-svl").classList.remove("svl_unsaved");
    Lh();
    var a = Nh();
    a.streets.forEach(function(f) {
      "red" !== f && (document.getElementById("svl_streetWidth_" + f).value = c[f].strokeWidth);
      document.getElementById("svl_streetColor_" + f).value = c[f].strokeColor;
      document.getElementById("svl_strokeDashstyle_" + f).value = c[f].strokeDashstyle;
    });
    a.decorations.forEach(function(f) {
      "dirty lanes toll restriction closure headlights nearbyHOV".split(" ").includes(f) ? document.getElementById("svl_streetOpacity_" + f).value = 100.0 * c[f].strokeOpacity : document.getElementById("svl_streetWidth_" + f).value = c[f].strokeWidth;
      document.getElementById("svl_streetColor_" + f).value = c[f].strokeColor;
      document.getElementById("svl_strokeDashstyle_" + f).value = c[f].strokeDashstyle;
    });
    var b, d, e;
    document.getElementById("svl_fakelock").value = null != (e = null == (b = WazeWrap) ? void 0 : null == (d = b.User) ? void 0 : d.Rank()) ? e : 7;
    document.getElementById("svl_autoReload_enabled").checked = c.autoReload.enabled;
    document.getElementById("svl_renderGeomNodes").checked = c.renderGeomNodes;
    document.getElementById("svl_labelOutlineWidth").value = c.labelOutlineWidth;
    document.getElementById("svl_hideMinorRoads").checked = c.hideMinorRoads;
    document.getElementById("svl_autoReload_interval").value = c.autoReload.interval / 1000;
    document.getElementById("svl_clutterConstant").value = c.clutterConstant;
    document.getElementById("svl_closeZoomLabelSize").value = c.closeZoomLabelSize;
    document.getElementById("svl_farZoomLabelSize").value = c.farZoomLabelSize;
    document.getElementById("svl_arrowDeclutter").value = c.arrowDeclutter;
    document.getElementById("svl_useWMERoadLayerAtZoom").value = c.useWMERoadLayerAtZoom;
    document.getElementById("svl_switchZoom").value = c.switchZoom;
    document.getElementById("svl_nodesThreshold").value = c.nodesThreshold;
    document.getElementById("svl_segmentsThreshold").value = c.segmentsThreshold;
    document.getElementById("svl_disableRoadLayers").checked = c.disableRoadLayers;
    document.getElementById("svl_startDisabled").checked = c.startDisabled;
    document.getElementById("svl_showUnderGPSPoints").checked = c.showUnderGPSPoints;
    document.getElementById("svl_routingModeEnabled").checked = c.routingModeEnabled;
    document.getElementById("svl_hideRoutingModeBlock").checked = c.hideRoutingModeBlock;
    document.getElementById("svl_showANs").checked = c.showANs;
    document.getElementById("svl_layerOpacity").value = 100 * c.layerOpacity;
    document.getElementById("svl_showSLtext").checked = c.showSLtext;
    document.getElementById("svl_showSLcolor").checked = c.showSLcolor;
    document.getElementById("svl_showSLSinglecolor").checked = c.showSLSinglecolor;
    document.getElementById("svl_showDashedUnverifiedSL").checked = c.showDashedUnverifiedSL;
    document.getElementById("svl_SLColor").value = c.SLColor;
    document.getElementById("svl_realsize").checked = c.realsize;
    document.querySelectorAll(".segmentsWidth").forEach(function(f) {
      f.disabled = c.realsize;
    });
    a = (d = W.prefs.attributes.isImperial) ? "imperial" : "metric";
    b = Object.keys(c.speeds[a]);
    document.querySelectorAll(d ? ".svl_metric" : ".svl_imperial").forEach(function(f) {
      f.style.display = "none";
    });
    document.querySelectorAll(".svl_" + a).forEach(function(f) {
      f.style.display = "block";
    });
    for (d = 1; d < b.length + 1; d += 1) {
      document.getElementById("svl_slValue_" + a + "_" + d).value = b[d - 1], document.getElementById("svl_slColor_" + a + "_" + d).value = c.speeds[a][b[d - 1]];
    }
    document.getElementById("svl_slColor_" + a + "_Default").value = c.speeds["default"];
  }
  function K(a) {
    var b = a.id, d = a.title, e = a.description, f = a.g;
    a = document.createElement("div");
    a.className = "prefLineCheckbox";
    "string" === typeof f && (a.classList.add("newOption"), a.dataset.version = f);
    f = document.createElement("label");
    f.innerText = d;
    b = S({id:b, className:"prefElement", type:"checkbox", title:"True or False", });
    f.appendChild(b);
    a.appendChild(f);
    b = document.createElement("i");
    b.innerText = e;
    a.appendChild(b);
    return a;
  }
  function X(a) {
    var b = a.id, d = a.title, e = a.description, f = a.min, h = a.max, m = a.step, g = a.g;
    a = document.createElement("div");
    a.className = "prefLineInteger";
    "string" === typeof g && (a.classList.add("newOption"), a.dataset.version = g);
    g = document.createElement("label");
    g.innerText = d;
    b = S({id:b, min:f, max:h, step:m, type:"number", title:"Insert a number", className:"prefElement form-control", });
    g.appendChild(b);
    a.appendChild(g);
    e && (b = document.createElement("i"), b.innerText = e, a.appendChild(b));
    return a;
  }
  function ra(a) {
    var b = a.id, d = a.title, e = a.description, f = a.min, h = a.max, m = a.step, g = a.g;
    a = document.createElement("div");
    a.className = "prefLineSlider";
    "string" === typeof g && (a.classList.add("newOption"), a.dataset.version = g);
    g = document.createElement("label");
    g.innerText = d;
    b = S({id:b, min:f, max:h, step:m, title:"Pick a value using the slider", className:"prefElement form-control", type:"range", });
    g.appendChild(b);
    a.appendChild(g);
    e && (b = document.createElement("i"), b.innerText = e, a.appendChild(b));
    return a;
  }
  function Z(a, b) {
    var d = document.createElement("details");
    d.open = void 0 === b ? !1 : b;
    b = document.createElement("summary");
    b.innerText = a;
    d.appendChild(b);
    return d;
  }
  function mi() {
    var a = document.createElement("style");
    a.innerHTML = '\n        <style>\n        #sidepanel-svl details{margin-bottom:9pt;}\n        .svl_unsaved{background-color:#ffcc00}\n        .expand{display:flex; width:100%; justify-content:space-around;align-items: center;}\n        .prefLineSelect{width:100%; margin-bottom:1vh;}\n        .prefLineSelect label{display:block;width:100%}\n        .prefLineCheckbox{width:100%; margin-bottom:1vh;}\n        .prefLineCheckbox label{display:block;width:100%}\n        .prefLineCheckbox input{float:right;}\n        .prefLineInteger{width:100%; margin-bottom:1vh;}\n        .prefLineInteger label{display:block;width:100%}\n        .prefLineInteger input{float:right;}\n        .prefLineSlider {width:100%; margin-bottom:1vh;}\n        .prefLineSlider label{display:block;width:100%}\n        .prefLineSlider input{float:right;}\n        .newOption::before {content:"New since v. " attr(data-version)"!"; font-weight:bolder; color:#e65c00;}\n        .newOption{border:1px solid #ff9900; padding: 1px; box-shadow: 2px 3px #cc7a00;}\n        .svl_logo {width:130px; display:inline-block; float:right}\n        #sidepanel-svl h5{text-transform: capitalize;}\n        .svl_support-link{display:inline-block; width:100%; text-align:center;}\n        .svl_buttons{clear:both; position:sticky; padding: 1vh; background-color:#eee; top:0; }\n        .routingDiv{opacity: 0.95; font-size:1.2em; color:#ffffff; border:0.2em #000 solid; position:absolute; top:3em; right:3.7em; padding:0.5em; background-color:#b30000;}\n        .routingDiv:hover{background-color:#ff3377;}\n        #sidepanel-svl summary{font-weight:bold; margin:10px;}</style>';
    document.body.appendChild(a);
    a = document.createElement("div");
    var b = document.createElement("img");
    b.className = "svl_logo";
    b.src = "https://raw.githubusercontent.com/bedo2991/svl/master/logo.png";
    b.alt = "Street Vector Layer Logo";
    a.appendChild(b);
    b = document.createElement("span");
    b.innerText = "Thanks for using";
    a.appendChild(b);
    b = document.createElement("h4");
    b.innerText = "Street Vector Layer";
    a.appendChild(b);
    b = document.createElement("span");
    b.innerText = "Version 5.0.9";
    a.appendChild(b);
    b = document.createElement("a");
    b.innerText = "Something not working? Report it here.";
    b.href = GM_info.script.supportURL;
    b.target = "_blank";
    b.className = "svl_support-link";
    a.appendChild(b);
    b = document.createElement("button");
    b.id = "svl_saveNewPref";
    b.type = "button";
    b.className = "btn disabled waze-icon-save";
    b.innerText = "Save";
    b.title = "Save your edited settings";
    var d = document.createElement("button");
    d.id = "svl_rollbackButton";
    d.type = "button";
    d.className = "btn btn-default disabled";
    d.innerText = "Rollback";
    d.title = "Discard your temporary changes";
    var e = document.createElement("button");
    e.id = "svl_resetButton";
    e.type = "button";
    e.className = "btn btn-default";
    e.innerText = "Reset";
    e.title = "Overwrite your current settings with the default ones";
    var f = document.createElement("div");
    f.className = "svl_buttons expand";
    f.appendChild(b);
    f.appendChild(d);
    f.appendChild(e);
    a.appendChild(f);
    var h = Z("Roads Properties", !0);
    h.appendChild(K({id:"realsize", title:"Use real-life Width", description:"When enabled, the segments thickness will be computed from the segments width instead of using the value set in the preferences", g:"5.0.0", }));
    h.appendChild(li({id:"presets", title:"Road Themes", description:"Applies a predefined theme to your preferences", options:[{text:"", value:""}, {text:"SVL Standard", value:"svl_standard"}, {text:"WME Colors", value:"wme_colors"}, ], g:"5.0.8", }));
    for (b = 0; b < c.streets.length; b += 1) {
      c.streets[b] && h.appendChild(P({f:b, c:!0, b:!1}));
    }
    f = Z("Segments Decorations");
    e = Z("Rendering Parameters");
    d = Z("Performance Tuning");
    b = Z("Speed Limits");
    Nh().streets.forEach(function(m) {
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
    h.appendChild(K({id:"showANs", title:"Show Alternative Names", description:"When enabled, at most 2 ANs that differ from the primary name are shown under the street name.", }));
    a.appendChild(h);
    e.appendChild(X({id:"layerOpacity", title:"Layer Opacity", description:"10: almost invisible, 100: opaque.", min:10, max:100, step:5, g:"5.0.6", }));
    e.appendChild(K({id:"routingModeEnabled", title:"Enable Routing Mode", description:"When enabled, roads are rendered by taking into consideration their routing attribute. E.g. a preferred Minor Highway is shown as a Major Highway.", }));
    e.appendChild(K({id:"hideRoutingModeBlock", title:"Hide the Routing Mode Panel", description:"When enabled, the overlay to temporarily disable the routing mode is not shown.", g:"5.0.9", }));
    e.appendChild(K({id:"showUnderGPSPoints", title:"GPS Layer above Roads", description:"When enabled, the GPS layer gets shown above the road layer.", }));
    h.appendChild(ra({id:"labelOutlineWidth", title:"Labels Outline Width", description:"How much border should the labels have?", min:0, max:10, step:1, }));
    e.appendChild(K({id:"disableRoadLayers", title:"Hide WME Road Layer", description:"When enabled, the WME standard road layer gets hidden automatically.", }));
    e.appendChild(K({id:"startDisabled", title:"SVL Initially Disabled", description:"When enabled, the SVL does not get enabled automatically.", }));
    e.appendChild(ra({id:"clutterConstant", title:"Street Names Density", description:"For an higher value, less elements will be shown.", min:1, max:20, step:1, }));
    f = document.createElement("h5");
    f.innerText = "Close-zoom only";
    e.appendChild(f);
    e.appendChild(K({id:"renderGeomNodes", title:"Render Geometry Nodes", description:"When enabled, the geometry nodes are drawn, too.", }));
    e.appendChild(X({id:"fakelock", title:"Render Map as Level", description:"All segments locked above this level will be stroked through with a black line.", min:1, max:7, step:1, }));
    e.appendChild(ra({id:"closeZoomLabelSize", title:"Font Size (at close zoom)", description:"Increase this value if you can't read the street names because they are too small.", min:8, max:32, step:1, }));
    e.appendChild(ra({id:"arrowDeclutter", title:"Limit Arrows", description:"Increase this value if you want less arrows to be shown on streets (it increases the performance).", min:1, max:200, step:1, }));
    f = document.createElement("h5");
    f.innerText = "Far-zoom only";
    e.appendChild(f);
    e.appendChild(ra({id:"farZoomLabelSize", title:"Font Size (at far zoom)", description:"Increase this value if you can't read the street names because they are too small.", min:8, max:32, }));
    e.appendChild(K({id:"hideMinorRoads", title:"Hide minor roads at zoom 3", description:"The WME loads some type of roads when they probably shouldn't be, check this option for avoid displaying them at higher zooms.", }));
    a.appendChild(e);
    e = Z("Utilities");
    e.appendChild(K({id:"autoReload_enabled", title:"Automatically Refresh the Map", description:"When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing.", }));
    e.appendChild(X({id:"autoReload_interval", title:"Auto Reload Time Interval (in Seconds)", description:"How often should the WME be refreshed for new edits?", min:20, max:3600, step:1, }));
    a.appendChild(e);
    d.appendChild(X({id:"useWMERoadLayerAtZoom", title:"Stop using SVL at zoom level", description:"When you reach this zoom level, the road layer gets automatically enabled.", min:0, max:5, step:1, }));
    d.appendChild(X({id:"switchZoom", title:"Close-zoom until level", description:"When the zoom is lower then this value, it will switch to far-zoom mode (rendering less details)", min:5, max:9, step:1, }));
    d.appendChild(X({id:"segmentsThreshold", title:"Segments threshold", description:"When the WME wants to draw more than this amount of segments, switch to the road layer", min:1000, max:10000, step:100, g:"5.0.4", }));
    d.appendChild(X({id:"nodesThreshold", title:"Nodes threshold", description:"When the WME wants to draw more than this amount of nodes, switch to the road layer", min:1000, max:10000, step:100, g:"5.0.4", }));
    a.appendChild(d);
    b.appendChild(K({id:"showSLtext", title:"Show on the Street Name", description:"Show the speed limit as text at the end of the street name.", }));
    b.appendChild(K({id:"showSLcolor", title:"Show using colors", description:"Show the speed limit by coloring the segment's outline.", }));
    b.appendChild(K({id:"showSLSinglecolor", title:"Show using Single Color", description:"Show the speed limit by coloring the segment's outline with a single color instead of a different color depending on the speed limit's value.", }));
    d = S({id:"SLColor", type:"color", className:"prefElement form-control", });
    b.appendChild(d);
    b.appendChild(K({id:"showDashedUnverifiedSL", title:"Show unverified Speed Limits with a dashed Line", description:"If the speed limit is not verified, it will be shown with a different style.", }));
    d = document.createElement("h6");
    d.innerText = Mh("speed limit");
    b.appendChild(d);
    d = "metric";
    b.appendChild(ta("Default", !0));
    for (e = 1; e < Object.keys(c.speeds[d]).length + 1; e += 1) {
      b.appendChild(ta(e, !0));
    }
    d = "imperial";
    b.appendChild(ta("Default", !1));
    for (e = 1; e < Object.keys(c.speeds[d]).length + 1; e += 1) {
      b.appendChild(ta(e, !1));
    }
    a.appendChild(b);
    b = document.createElement("h5");
    b.innerText = "Settings Backup";
    a.appendChild(b);
    b = document.createElement("div");
    b.className = "expand";
    d = document.createElement("button");
    d.id = "svl_exportButton";
    d.type = "button";
    d.innerText = "Export";
    d.className = "btn btn-default";
    e = document.createElement("button");
    e.id = "svl_importButton";
    e.type = "button";
    e.innerText = "Import";
    e.className = "btn btn-default";
    b.appendChild(e);
    b.appendChild(d);
    a.appendChild(b);
    new WazeWrap.Interface.Tab("SVL \ud83d\uddfa\ufe0f", a.innerHTML, ba);
    document.querySelectorAll(".prefElement").forEach(function(m) {
      m.addEventListener("change", Jh);
    });
    document.getElementById("svl_saveNewPref").addEventListener("click", ji);
    document.getElementById("svl_rollbackButton").addEventListener("click", hi);
    document.getElementById("svl_resetButton").addEventListener("click", ki);
    document.getElementById("svl_importButton").addEventListener("click", r);
    document.getElementById("svl_exportButton").addEventListener("click", ii);
  }
  function Oh(a) {
    E.destroyFeatures(E.getFeaturesByAttribute("myid", a), {silent:!0});
  }
  function ni(a) {
    x("Removing " + a.length + " nodes");
    if (I.zoom <= c.useWMERoadLayerAtZoom) {
      x("Destroy all nodes"), E.destroyFeatures(E.features, {silent:!0});
    } else {
      if (O || a.length > c.nodesThreshold) {
        O || ua();
      } else {
        var b;
        for (b = 0; b < a.length; b += 1) {
          Oh(a[b].attributes.id);
        }
      }
    }
  }
  function Fh(a) {
    var b;
    return 1 === (null == (b = a.segIDs) ? void 0 : b.length) ? oi : pi;
  }
  function qi(a) {
    x("Change nodes");
    a.forEach(function(b) {
      var d = b.attributes, e = E.getFeaturesByAttribute("myid", d.id)[0];
      e ? (e.style = Fh(d), e.move(new OpenLayers.LonLat(d.geometry.x, d.geometry.y))) : 0 < d.id && E.addFeatures([Eh(b)], {silent:!0});
    });
  }
  function ri(a) {
    x("Node state deleted");
    for (var b = 0; b < a.length; b += 1) {
      Oh(a[b].getID());
    }
  }
  function si(a) {
    for (var b = 0; b < a.length; b += 1) {
      va(a[b].getID());
    }
  }
  function Ph(a) {
    x("Adding " + a.length + " nodes");
    if (O || a.length > c.nodesThreshold) {
      O || ua();
    } else {
      if (I.zoom <= c.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        for (var b = [], d = 0; d < a.length; d += 1) {
          void 0 !== a[d].attributes.geometry ? 0 < a[d].attributes.id && b.push(Eh(a[d])) : console.warn("[SVL] Geometry of node is undefined");
        }
        E.addFeatures(b, {silent:!0});
        return !0;
      }
    }
  }
  function U(a) {
    return !a.svl;
  }
  function Qh() {
    x("updateStatusBasedOnZoom running");
    var a = !0;
    O && (Object.keys(W.model.segments.objects).length < c.segmentsThreshold && Object.keys(W.model.nodes.objects).length < c.nodesThreshold ? (O = !1, M(1, !0), M(0, !1), Y()) : console.warn("[SVL] Still too many elements to draw: Segments: " + Object.keys(W.model.segments.objects).length + "/" + c.segmentsThreshold + ", Nodes: " + Object.keys(W.model.nodes.objects).length + "/" + c.nodesThreshold + " - You can change these thresholds in the preference panel."));
    I.zoom <= c.useWMERoadLayerAtZoom ? (x("Road layer automatically enabled because of zoom out"), !0 === z.visibility && (wa = !0, M(0, !0), M(1, !1)), a = !1) : wa && (x("Re-enabling SVL after zoom in"), M(1, !0), M(0, !1), wa = !1);
    return a;
  }
  function ti() {
    clearTimeout(Rh);
    x("manageZoom clearing timer");
    Rh = setTimeout(Qh, 800);
  }
  function ua() {
    console.warn("[SVL] Abort drawing, too many elements");
    O = !0;
    M(0, !0);
    M(1, !1);
    l();
  }
  function Ea(a) {
    x("Adding " + a.length + " segments");
    if (O || a.length > c.segmentsThreshold) {
      O || ua();
    } else {
      if (I.zoom <= c.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        Sh();
        var b = [];
        a.forEach(function(d) {
          null !== d && (b = b.concat(ei(d)));
        });
        0 < b.length ? (x(b.length + " features added to the street layer"), z.addFeatures(b, {silent:!0})) : console.warn("[SVL] no features drawn");
        Th();
      }
    }
  }
  function va(a) {
    x("RemoveSegmentById: " + a);
    z.destroyFeatures(z.getFeaturesByAttribute("myId", a), {silent:!0});
    A.destroyFeatures(A.getFeaturesByAttribute("myId", a), {silent:!0});
  }
  function ui(a) {
    x("Edit " + a.length + " segments");
    a.forEach(function(b) {
      var d = b.getOldID();
      d && va(parseInt(d, 10));
      va(b.getID());
      "Delete" !== b.state && Ea([b]);
    });
  }
  function vi(a) {
    x("Removing " + a.length + " segments");
    I.zoom <= c.useWMERoadLayerAtZoom ? (x("Destroy all segments and labels because of zoom out"), z.destroyFeatures(z.features, {silent:!0, }), A.destroyFeatures(A.features, {silent:!0})) : O || a.length > c.segmentsThreshold ? O || ua() : (Sh(), a.forEach(function(b) {
      va(b.attributes.id);
    }), Th());
  }
  function Uh(a) {
    x("ManageVisibilityChanged", a);
    E.setVisibility(a.object.visibility);
    A.setVisibility(a.object.visibility);
    a.object.visibility ? (x("enabled: registering events"), a = W.model.segments._events, "object" === typeof a && (a.objectsadded.push({context:z, callback:Ea, svl:!0, }), a.objectschanged.push({context:z, callback:ui, svl:!0, }), a.objectsremoved.push({context:z, callback:vi, svl:!0, }), a["objects-state-deleted"].push({context:z, callback:si, svl:!0, })), x("SVL: Registering node events"), a = W.model.nodes._events, "object" === typeof a && (a.objectsremoved.push({context:E, callback:ni, svl:!0, 
    }), a.objectsadded.push({context:E, callback:Ph, svl:!0, }), a.objectschanged.push({context:E, callback:qi, svl:!0, }), a["objects-state-deleted"].push({context:E, callback:ri, svl:!0, })), !0 === Qh() && Y()) : (x("disabled: unregistering events"), x("SVL: Removing segments events"), a = W.model.segments._events, "object" === typeof a && (a.objectsadded = a.objectsadded.filter(U), a.objectschanged = a.objectschanged.filter(U), a.objectsremoved = a.objectsremoved.filter(U), a["objects-state-deleted"] = 
    a["objects-state-deleted"].filter(U)), x("SVL: Removing node events"), a = W.model.nodes._events, "object" === typeof a && (a.objectsremoved = a.objectsremoved.filter(U), a.objectsadded = a.objectsadded.filter(U), a.objectschanged = a.objectschanged.filter(U), a["objects-state-deleted"] = a["objects-state-deleted"].filter(U)), l());
  }
  function Vh(a) {
    a = void 0 === a ? 1 : a;
    30 < a ? console.error("SVL: could not initialize WazeWrap") : WazeWrap && WazeWrap.Ready && WazeWrap.Interface && WazeWrap.Alerts ? wi() : (console.log("SVL: WazeWrap not ready, retrying in 800ms"), setTimeout(function() {
      Vh(a + 1);
    }, 800));
  }
  function wi() {
    console.log("SVL: initializing WazeWrap");
    try {
      (new WazeWrap.Interface.Shortcut("SVLToggleLayer", "Toggle SVL", "svl", "Street Vector Layer", "A+l", function() {
        M(1, !z.visibility);
      }, null)).add(), console.log("SVL: Keyboard shortcut successfully added.");
    } catch (a) {
      console.error("SVL: Error while adding the keyboard shortcut:"), console.error(a);
    }
    try {
      WazeWrap.Interface.AddLayerCheckbox("road", "Street Vector Layer", !0, function(a) {
        z.setVisibility(a);
      }, z);
    } catch (a) {
      console.error("SVL: could not add layer checkbox");
    }
    c.startDisabled && M(1, !1);
    mi();
    WazeWrap.Interface.ShowScriptUpdate("Street Vector Layer", "5.0.9", "<b>What's new?</b>\n      <br>- 5.0.9: Added an option to hide the routing panel - Code refactoring, bug fixes\n      <br>- 5.0.8: Styles preset. Switch to the WME standard colors, if you like.\n      <br>- 5.0.7: New options are highlighted in the preference panel\n      <br>- 5.0.6: Fixed a bug that was showing metric colors for speed limits while in imperial mode\n      <br>- 5.0.5: Added a global Layer Opacity setting", 
    "", GM_info.script.supportURL);
  }
  function Wh(a) {
    a = void 0 === a ? 0 : a;
    try {
      if (void 0 === W || void 0 === W.map || void 0 === W.model) {
        throw Error("Model Not ready");
      }
    } catch (e) {
      var b = a + 1;
      if (20 > a) {
        console.warn(e);
        console.warn("Could not initialize SVL correctly. Maybe the Waze model was not ready. Retrying in 500ms...");
        setTimeout(function() {
          Wh(b);
        }, 500);
        return;
      }
      console.error(e);
      w("error", "Street Vector Layer failed to inizialize. Maybe the Editor has been updated or your connection/pc is really slow.");
      return;
    }
    I = W.map.getOLMap();
    c = null;
    OpenLayers.Renderer.symbol.myTriangle = [-2, 0, 2, 0, 0, -6, -2, 0];
    !1 === ya() && w("info", "This is the first time that you run Street Vector Layer in this browser.\nSome info about it:\nBy default, use ALT+L to toggle the layer.\nYou can change the streets color, thickness and style using the panel on the left sidebar.\nYour preferences will be saved for the next time in your browser.\nThe other road layers will be automatically hidden (you can change this behaviour in the preference panel).\nHave fun and tell us on the Waze forum if you liked the script!");
    a = new OpenLayers.StyleMap({pointerEvents:"none", strokeColor:"${color}", strokeWidth:"${width}", strokeOpacity:"${opacity}", strokeDashstyle:"${dash}", graphicZIndex:"${zIndex}", });
    var d = new OpenLayers.StyleMap({fontFamily:"Rubik, Open Sans, Alef, helvetica, sans-serif", fontWeight:"800", fontColor:"${color}", labelOutlineColor:"${outlinecolor}", labelOutlineWidth:"${outlinewidth}", label:"${label}", visibility:!c.startDisabled, angle:"${angle}", pointerEvents:"none", labelAlign:"cm", });
    z = new OpenLayers.Layer.Vector("Street Vector Layer", {styleMap:a, uniqueName:"vectorStreet", accelerator:"toggle" + "Street Vector Layer".replace(/\s+/g, ""), visibility:!c.startDisabled, isVector:!0, attribution:"SVL v. 5.0.9", rendererOptions:{zIndexing:!0, }, });
    z.renderer.drawFeature = function(e, f) {
      null == f && (f = e.style);
      if (e.geometry) {
        var h = H();
        2 > I.zoom || e.attributes.a && h || e.attributes.s && !h ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(z.renderer.extent) ? (z.renderer.featureDx = 0, f.pointerEvents = "none", h || !e.attributes.i && c.realsize && (f.strokeWidth /= I.resolution)) : f = {display:"none"};
        return z.renderer.drawGeometry(e.geometry, f, e.id);
      }
    };
    E = new OpenLayers.Layer.Vector("Nodes Vector", {uniqueName:"vectorNodes", visibility:!c.startDisabled, });
    E.renderer.drawFeature = function(e, f) {
      if (2 > I.zoom) {
        return f = {display:"none"}, E.renderer.drawGeometry(e.geometry, f, e.id);
      }
      null == f && (f = e.style);
      f = OpenLayers.Util.extend({}, f);
      if (e.geometry) {
        return H() ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(E.renderer.extent) ? (E.renderer.featureDx = 0, c.realsize && (f.pointRadius /= I.resolution)) : f = {display:"none"}, E.renderer.drawGeometry(e.geometry, f, e.id);
      }
    };
    A = new OpenLayers.Layer.Vector("Labels Vector", {uniqueName:"vectorLabels", styleMap:d, visibility:!c.startDisabled, });
    A.renderer.drawFeature = function(e, f) {
      var h = I.zoom;
      if (2 > h) {
        return !1;
      }
      null == f && (f = e.style);
      if (e.geometry) {
        var m = H();
        7 - e.attributes.v > h || e.attributes.a && m || e.attributes.s && !m ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(A.renderer.extent) ? (A.renderer.featureDx = 0, f.pointerEvents = "none", f.fontSize = m ? c.farZoomLabelSize : c.closeZoomLabelSize) : f = {display:"none"};
        h = A.renderer.drawGeometry(e.geometry, f, e.id);
        "none" !== f.display && f.label && !1 !== h ? (m = e.geometry.getCentroid(), A.renderer.drawText(e.id, f, m)) : A.renderer.removeText(e.id);
        return h;
      }
    };
    A.renderer.drawText = function(e, f, h) {
      var m = !!f.labelOutlineWidth;
      if (m) {
        var g = OpenLayers.Util.extend({}, f);
        g.fontColor = g.labelOutlineColor;
        g.fontStrokeColor = g.labelOutlineColor;
        g.fontStrokeWidth = f.labelOutlineWidth;
        f.labelOutlineOpacity && (g.fontOpacity = f.labelOutlineOpacity);
        delete g.labelOutlineWidth;
        A.renderer.drawText(e, g, h);
      }
      var q = A.renderer.getResolution();
      g = (h.x - A.renderer.featureDx) / q + A.renderer.left;
      var u = h.y / q - A.renderer.top;
      m = m ? A.renderer.LABEL_OUTLINE_SUFFIX : A.renderer.LABEL_ID_SUFFIX;
      q = A.renderer.nodeFactory(e + m, "text");
      q.setAttributeNS(null, "x", g);
      q.setAttributeNS(null, "y", -u);
      (f.angle || 0 === f.angle) && q.setAttributeNS(null, "transform", "rotate(" + f.angle + "," + g + "," + -u + ")");
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
        var k = A.renderer.nodeFactory(e + m + "_tspan_" + v, "tspan");
        !0 === f.labelSelect && (k.C = e, k.D = h, k.F = h.B);
        if (!1 === OpenLayers.IS_GECKO) {
          var C = void 0;
          k.setAttributeNS(null, "baseline-shift", null != (C = OpenLayers.Renderer.SVG.LABEL_VSHIFT[u[1]]) ? C : "-35%");
        }
        k.setAttribute("x", g);
        0 === v ? (C = OpenLayers.Renderer.SVG.LABEL_VFACTOR[u[1]], null == C && (C = -.5), k.setAttribute("dy", C * (y - 1) + "em")) : k.setAttribute("dy", "1em");
        k.textContent = "" === p[v] ? " " : p[v];
        k.parentNode || q.appendChild(k);
      }
      q.parentNode || A.renderer.textRoot.appendChild(q);
    };
    aa(c);
    I.addLayer(z);
    I.addLayer(A);
    I.addLayer(E);
    "true" === window.localStorage.getItem("svlDebugOn") && (document.sv = z, document.lv = A, document.nv = E, document.svl_pref = c);
    a = I.getLayersBy("uniqueName", "roads");
    ca = null;
    1 === a.length && (ca = Ga(a).next().value);
    wa = !1;
    c.showUnderGPSPoints && Gh();
    Hh();
    Ih();
    I.events.register("zoomend", null, ti, !0);
    Vh();
    I.zoom <= c.useWMERoadLayerAtZoom ? M(0, !0) : ca.getVisibility() && c.disableRoadLayers && (M(0, !1), console.log("SVL: WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel."));
    z.events.register("visibilitychanged", z, Uh);
    Uh({object:z, });
    $(".olControlAttribution").click(function() {
      w("info", 'The preferences have been moved to the sidebar on the left. Please look for the "SVL \ud83d\uddfa\ufe0f" tab.');
    });
    a = W.prefs._events;
    "object" === typeof a && a["change:isImperial"].push({callback:Y, });
    console.log("[SVL] v. 5.0.9 initialized correctly.");
  }
  function Y() {
    x("DrawAllSegments");
    l();
    Ea(Object.values(W.model.segments.objects));
    Ph(Object.values(W.model.nodes.objects));
  }
  function aa(a) {
    N = [];
    for (var b = 0; b < a.streets.length; b += 1) {
      if (a.streets[b]) {
        var d = a.streets[b].strokeColor;
        N[b] = {strokeColor:a.streets[b].strokeColor, strokeWidth:a.streets[b].strokeWidth, strokeDashstyle:a.streets[b].strokeDashstyle, outlineColor:127 > 0.299 * parseInt(d.substring(1, 3), 16) + 0.587 * parseInt(d.substring(3, 5), 16) + 0.114 * parseInt(d.substring(5, 7), 16) ? "#FFF" : "#000", };
      }
    }
    zh = a.clutterConstant;
    z.setOpacity(c.layerOpacity);
    Y();
  }
  function Xh(a) {
    a = void 0 === a ? 0 : a;
    if (void 0 === W || void 0 === W.map) {
      console.log("SVL not ready to start, retrying in 600ms");
      var b = a + 1;
      20 > b ? setTimeout(function() {
        Xh(b);
      }, 600) : w("error", "Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!");
    } else {
      Wh();
    }
  }
  var Fa = "true" === window.localStorage.getItem("svlDebugOn"), x = Fa ? function(a) {
    for (var b = [], d = 0; d < arguments.length; ++d) {
      b[d] = arguments[d];
    }
    for (d = 0; d < b.length; d += 1) {
      "string" === typeof b[d] ? console.log("[SVL] 5.0.9: " + b[d]) : console.dir(b[d]);
    }
  } : function() {
  }, Sh = Fa ? console.group : function() {
  }, Th = Fa ? console.groupEnd : function() {
  }, Da = null, zh, N = [], z, E, A, O = !1, c, ca, wa, I, sa = {ROAD_LAYER:null, SVL_LAYER:null, }, di = "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079".split(""), Ch = {strokeColor:"#F53BFF", strokeWidth:3, strokeDashstyle:"solid", }, Ba = {strokeColor:"#111111", strokeWidth:1, strokeDashstyle:"dash", strokeOpacity:0.6, }, pi = {stroke:!1, fillColor:"#0015FF", fillOpacity:0.9, pointRadius:3, pointerEvents:"none", }, oi = {stroke:!1, fillColor:"#C31CFF", fillOpacity:0.9, pointRadius:3, 
  pointerEvents:"none", }, fi = {graphicName:"x", strokeColor:"#f00", strokeWidth:1.5, fillColor:"#FFFF40", fillOpacity:0.7, pointRadius:7, pointerEvents:"none", }, gi = {stroke:!1, fillColor:"#000", fillOpacity:0.5, pointRadius:3.5, graphicZIndex:179, pointerEvents:"none", }, Bh = {strokeColor:"#000", strokeDashstyle:"solid", }, Dh = {strokeColor:"#C90", strokeDashstyle:"longdash", }, Ca = {strokeColor:"#fff", strokeOpacity:0.8, strokeDashstyle:"longdash", }, Ia = {1:5.0, 2:5.5, 3:22.5, 4:6.0, 5:2.0, 
  6:10.0, 7:9.0, 8:4.0, 10:2.0, 15:8.0, 16:2.0, 17:5.0, 18:6.0, 19:5.0, 20:5.0, 22:3.0, }, Kh = {svl_standard:{streets:[null, {strokeColor:"#FFFFFF", strokeWidth:10, strokeDashstyle:"solid", }, {strokeColor:"#CBA12E", strokeWidth:12, strokeDashstyle:"solid", }, {strokeColor:"#387FB8", strokeWidth:18, strokeDashstyle:"solid", }, {strokeColor:"#3FC91C", strokeWidth:11, strokeDashstyle:"solid", }, {strokeColor:"#00FF00", strokeWidth:5, strokeDashstyle:"dash", }, {strokeColor:"#C13040", strokeWidth:16, 
  strokeDashstyle:"solid", }, {strokeColor:"#ECE589", strokeWidth:14, strokeDashstyle:"solid", }, {strokeColor:"#82614A", strokeWidth:7, strokeDashstyle:"solid", }, null, {strokeColor:"#0000FF", strokeWidth:5, strokeDashstyle:"dash", }, null, null, null, null, {strokeColor:"#FF8000", strokeWidth:5, strokeDashstyle:"dashdot", }, {strokeColor:"#B700FF", strokeWidth:5, strokeDashstyle:"dash", }, {strokeColor:"#00FFB3", strokeWidth:7, strokeDashstyle:"solid", }, {strokeColor:"#FFFFFF", strokeWidth:8, 
  strokeDashstyle:"dash", }, {strokeColor:"#00FF00", strokeWidth:5, strokeDashstyle:"dashdot", }, {strokeColor:"#2282AB", strokeWidth:9, strokeDashstyle:"solid", }, null, {strokeColor:"#C6C7FF", strokeWidth:6, strokeDashstyle:"solid", }, ], }, wme_colors:{streets:[null, {strokeColor:"#FFFFDD", strokeWidth:10, strokeDashstyle:"solid", }, {strokeColor:"#FDFAA7", strokeWidth:12, strokeDashstyle:"solid", }, {strokeColor:"#6870C3", strokeWidth:18, strokeDashstyle:"solid", }, {strokeColor:"#B3BFB3", strokeWidth:11, 
  strokeDashstyle:"solid", }, {strokeColor:"#00FF00", strokeWidth:5, strokeDashstyle:"dash", }, {strokeColor:"#469FBB", strokeWidth:16, strokeDashstyle:"solid", }, {strokeColor:"#69BF88", strokeWidth:14, strokeDashstyle:"solid", }, {strokeColor:"#867342", strokeWidth:7, strokeDashstyle:"solid", }, null, {strokeColor:"#9A9A9A", strokeWidth:5, strokeDashstyle:"dash", }, null, null, null, null, {strokeColor:"#6FB6BE", strokeWidth:5, strokeDashstyle:"dashdot", }, {strokeColor:"#9A9A9A", strokeWidth:5, 
  strokeDashstyle:"dash", }, {strokeColor:"#BEBA6C", strokeWidth:7, strokeDashstyle:"solid", }, {strokeColor:"#D8D8F9", strokeWidth:8, strokeDashstyle:"dash", }, {strokeColor:"#222222", strokeWidth:5, strokeDashstyle:"dashdot", }, {strokeColor:"#ABABAB", strokeWidth:9, strokeDashstyle:"solid", }, null, {strokeColor:"#64799A", strokeWidth:6, strokeDashstyle:"solid", }, ], }, }, Rh = null;
  Xh();
})();

