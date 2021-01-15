function Aa(m) {
  var p = 0;
  return function() {
    return p < m.length ? {done:!1, value:m[p++], } : {done:!0};
  };
}
function Q(m) {
  var p = "undefined" != typeof Symbol && Symbol.iterator && m[Symbol.iterator];
  return p ? p.call(m) : {next:Aa(m)};
}
function La(m) {
  for (var p, t = []; !(p = m.next()).done;) {
    t.push(p.value);
  }
  return t;
}
var Ma = "function" == typeof Object.defineProperties ? Object.defineProperty : function(m, p, t) {
  if (m == Array.prototype || m == Object.prototype) {
    return m;
  }
  m[p] = t.value;
  return m;
};
function Na(m) {
  m = ["object" == typeof globalThis && globalThis, m, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global, ];
  for (var p = 0; p < m.length; ++p) {
    var t = m[p];
    if (t && t.Math == Math) {
      return t;
    }
  }
  throw Error("Cannot find global object");
}
var Oa = Na(this);
function Y(m, p) {
  if (p) {
    a: {
      var t = Oa;
      m = m.split(".");
      for (var x = 0; x < m.length - 1; x++) {
        var I = m[x];
        if (!(I in t)) {
          break a;
        }
        t = t[I];
      }
      m = m[m.length - 1];
      x = t[m];
      p = p(x);
      p != x && null != p && Ma(t, m, {configurable:!0, writable:!0, value:p});
    }
  }
}
Y("Symbol", function(m) {
  function p(I) {
    if (this instanceof p) {
      throw new TypeError("Symbol is not a constructor");
    }
    return new t("jscomp_symbol_" + (I || "") + "_" + x++, I);
  }
  function t(I, S) {
    this.o = I;
    Ma(this, "description", {configurable:!0, writable:!0, value:S});
  }
  if (m) {
    return m;
  }
  t.prototype.toString = function() {
    return this.o;
  };
  var x = 0;
  return p;
});
Y("Symbol.iterator", function(m) {
  if (m) {
    return m;
  }
  m = Symbol("Symbol.iterator");
  for (var p = "Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "), t = 0; t < p.length; t++) {
    var x = Oa[p[t]];
    "function" === typeof x && "function" != typeof x.prototype[m] && Ma(x.prototype, m, {configurable:!0, writable:!0, value:function() {
      return di(Aa(this));
    }});
  }
  return m;
});
function di(m) {
  m = {next:m};
  m[Symbol.iterator] = function() {
    return this;
  };
  return m;
}
function ei(m, p) {
  m instanceof String && (m += "");
  var t = 0, x = !1, I = {next:function() {
    if (!x && t < m.length) {
      var S = t++;
      return {value:p(S, m[S]), done:!1};
    }
    x = !0;
    return {done:!0, value:void 0};
  }};
  I[Symbol.iterator] = function() {
    return I;
  };
  return I;
}
Y("Array.prototype.keys", function(m) {
  return m ? m : function() {
    return ei(this, function(p) {
      return p;
    });
  };
});
Y("Number.isFinite", function(m) {
  return m ? m : function(p) {
    return "number" !== typeof p ? !1 : !isNaN(p) && Infinity !== p && -Infinity !== p;
  };
});
Y("Number.isInteger", function(m) {
  return m ? m : function(p) {
    return Number.isFinite(p) ? p === Math.floor(p) : !1;
  };
});
Y("Object.is", function(m) {
  return m ? m : function(p, t) {
    return p === t ? 0 !== p || 1 / p === 1 / t : p !== p && t !== t;
  };
});
Y("Array.prototype.includes", function(m) {
  return m ? m : function(p, t) {
    var x = this;
    x instanceof String && (x = String(x));
    var I = x.length;
    t = t || 0;
    for (0 > t && (t = Math.max(t + I, 0)); t < I; t++) {
      var S = x[t];
      if (S === p || Object.is(S, p)) {
        return !0;
      }
    }
    return !1;
  };
});
Y("String.prototype.includes", function(m) {
  return m ? m : function(p, t) {
    if (null == this) {
      throw new TypeError("The 'this' value for String.prototype.includes must not be null or undefined");
    }
    if (p instanceof RegExp) {
      throw new TypeError("First argument to String.prototype.includes must not be a regular expression");
    }
    return -1 !== this.indexOf(p, t || 0);
  };
});
Y("Array.prototype.entries", function(m) {
  return m ? m : function() {
    return ei(this, function(p, t) {
      return [p, t];
    });
  };
});
Y("Object.values", function(m) {
  return m ? m : function(p) {
    var t = [], x;
    for (x in p) {
      Object.prototype.hasOwnProperty.call(p, x) && t.push(p[x]);
    }
    return t;
  };
});
(function() {
  function m() {
    y("Destroy all features");
    A.destroyFeatures(A.features, {silent:!0, });
    B.destroyFeatures(B.features, {silent:!0});
    F.destroyFeatures(F.features, {silent:!0});
  }
  function p() {
    y("resetting preferences");
    y("saveDefaultPreferences");
    Ba(!0);
    da(d);
    ea();
    x("success", g("preferences_reset_message"));
  }
  function t() {
    WazeWrap.Alerts.prompt(GM_info.script.name, g("preferences_import_prompt") + "\n\n" + g("preferences_import_prompt_2"), "", fi, null);
  }
  function x(a, b) {
    try {
      WazeWrap.Alerts[a](GM_info.script.name, b);
    } catch (c) {
      console.error(c), alert(b);
    }
  }
  function I(a) {
    a = void 0 === a ? J.zoom : a;
    return a < d.switchZoom;
  }
  function S() {
    0 !== W.model.actionManager.unsavedActionsNum() || WazeWrap.hasSelectedFeatures() || 0 !== document.querySelectorAll(".place-update-edit.show").length || W.controller.reload();
  }
  function N(a, b) {
    1 === a ? (y("Changing SVL Layer visibility to " + b), A.setVisibility(b)) : fa ? (y("Changing Road Layer visibility to " + b), fa.setVisibility(b)) : console.warn("SVL: cannot toggle the WME's road layer");
    if (!va[a] && (y("Initialising layer " + a), va[a] = document.getElementById(1 === a ? "layer-switcher-item_street_vector_layer" : "layer-switcher-item_road"), !va[a])) {
      console.warn("SVL: cannot find checkbox for layer number " + a);
      return;
    }
    va[a].checked = b;
  }
  function Ca(a, b) {
    b = void 0 === b ? !0 : b;
    y("savePreferences");
    a.version = "5.0.9";
    try {
      window.localStorage.setItem("svl", JSON.stringify(a)), b || x("success", g("preferences_saved"));
    } catch (c) {
      console.error(c), x("error", g("preferences_saving_error"));
    }
  }
  function gi(a) {
    var b = a.u, c = a.roadType;
    a = a.A;
    return d.realsize ? b ? a ? b : 0.6 * b : a ? Pa[c] : 0.6 * Pa[c] : parseInt(O[c].strokeWidth, 10);
  }
  function Ba(a) {
    a = void 0 === a ? !1 : a;
    var b = !0, c = null;
    if (!0 === a) {
      window.localStorage.removeItem("svl");
    } else {
      var e = window.localStorage.getItem("svl");
      e && (c = JSON.parse(e));
    }
    null === c && (a ? y("Overwriting existing preferences") : (b = !1, y("Creating new preferences for the first time")));
    d = {autoReload:{}};
    var f, k, n;
    d.autoReload.interval = null != (n = null == (f = c) ? void 0 : null == (k = f.autoReload) ? void 0 : k.interval) ? n : 60000;
    var h, r, v;
    d.autoReload.enabled = null != (v = null == (h = c) ? void 0 : null == (r = h.autoReload) ? void 0 : r.enabled) ? v : !1;
    var q, z;
    d.showSLSinglecolor = null != (z = null == (q = c) ? void 0 : q.showSLSinglecolor) ? z : !1;
    var w, l;
    d.SLColor = null != (l = null == (w = c) ? void 0 : w.SLColor) ? l : "#ffdf00";
    var D, G, E, u, H;
    d.fakelock = null != (H = null != (u = null == (D = c) ? void 0 : D.fakelock) ? u : null == (G = WazeWrap) ? void 0 : null == (E = G.User) ? void 0 : E.Rank()) ? H : 6;
    var M, U;
    d.hideMinorRoads = null != (U = null == (M = c) ? void 0 : M.hideMinorRoads) ? U : !0;
    var K, C;
    d.showDashedUnverifiedSL = null != (C = null == (K = c) ? void 0 : K.showDashedUnverifiedSL) ? C : !0;
    var Z, ha;
    d.showSLcolor = null != (ha = null == (Z = c) ? void 0 : Z.showSLcolor) ? ha : !0;
    var ia, ja;
    d.showSLtext = null != (ja = null == (ia = c) ? void 0 : ia.showSLtext) ? ja : !0;
    var ka, la;
    d.disableRoadLayers = null != (la = null == (ka = c) ? void 0 : ka.disableRoadLayers) ? la : !0;
    var ma, na;
    d.startDisabled = null != (na = null == (ma = c) ? void 0 : ma.startDisabled) ? na : !1;
    var oa, pa;
    d.clutterConstant = null != (pa = null == (oa = c) ? void 0 : oa.clutterConstant) ? pa : 7;
    var qa, ra;
    d.labelOutlineWidth = null != (ra = null == (qa = c) ? void 0 : qa.labelOutlineWidth) ? ra : 3;
    var sa, Qa;
    d.closeZoomLabelSize = null != (Qa = null == (sa = c) ? void 0 : sa.closeZoomLabelSize) ? Qa : 14;
    var Ra, Sa;
    d.farZoomLabelSize = null != (Sa = null == (Ra = c) ? void 0 : Ra.farZoomLabelSize) ? Sa : 12;
    var Ta, Ua;
    d.useWMERoadLayerAtZoom = null != (Ua = null == (Ta = c) ? void 0 : Ta.useWMERoadLayerAtZoom) ? Ua : 1;
    var Va, Wa;
    d.switchZoom = null != (Wa = null == (Va = c) ? void 0 : Va.switchZoom) ? Wa : 5;
    var Xa, Ya;
    d.arrowDeclutter = null != (Ya = null == (Xa = c) ? void 0 : Xa.arrowDeclutter) ? Ya : 140;
    var Za, $a;
    d.segmentsThreshold = null != ($a = null == (Za = c) ? void 0 : Za.segmentsThreshold) ? $a : 3000;
    var ab, bb;
    d.nodesThreshold = null != (bb = null == (ab = c) ? void 0 : ab.nodesThreshold) ? bb : 4000;
    var cb, db;
    d.showUnderGPSPoints = null != (db = null == (cb = c) ? void 0 : cb.showUnderGPSPoints) ? db : !1;
    var eb, fb;
    d.routingModeEnabled = null != (fb = null == (eb = c) ? void 0 : eb.routingModeEnabled) ? fb : !1;
    var gb, hb;
    d.hideRoutingModeBlock = null != (hb = null == (gb = c) ? void 0 : gb.hideRoutingModeBlock) ? hb : !1;
    var ib, jb;
    d.realsize = null != (jb = null == (ib = c) ? void 0 : ib.realsize) ? jb : !0;
    var kb, lb;
    d.showANs = null != (lb = null == (kb = c) ? void 0 : kb.showANs) ? lb : !1;
    var mb, nb;
    d.renderGeomNodes = null != (nb = null == (mb = c) ? void 0 : mb.renderGeomNodes) ? nb : !1;
    var ob, pb;
    d.layerOpacity = null != (pb = null == (ob = c) ? void 0 : ob.layerOpacity) ? pb : 0.8;
    d.streets = [];
    var qb, rb, sb, tb, ub, vb, wb, xb, yb;
    d.streets[1] = {strokeColor:null != (wb = null == (qb = c) ? void 0 : null == (rb = qb.streets[1]) ? void 0 : rb.strokeColor) ? wb : "#FFFFFF", strokeWidth:null != (xb = null == (sb = c) ? void 0 : null == (tb = sb.streets[1]) ? void 0 : tb.strokeWidth) ? xb : 10, strokeDashstyle:null != (yb = null == (ub = c) ? void 0 : null == (vb = ub.streets[1]) ? void 0 : vb.strokeDashstyle) ? yb : "solid", };
    var zb, Ab, Bb, Cb, Db, Eb, Fb, Gb, Hb;
    d.streets[20] = {strokeColor:null != (Fb = null == (zb = c) ? void 0 : null == (Ab = zb.streets[20]) ? void 0 : Ab.strokeColor) ? Fb : "#2282AB", strokeWidth:null != (Gb = null == (Bb = c) ? void 0 : null == (Cb = Bb.streets[20]) ? void 0 : Cb.strokeWidth) ? Gb : 9, strokeDashstyle:null != (Hb = null == (Db = c) ? void 0 : null == (Eb = Db.streets[20]) ? void 0 : Eb.strokeDashstyle) ? Hb : "solid", };
    var Ib, Jb, Kb, Lb, Mb, Nb, Ob, Pb, Qb;
    d.streets[4] = {strokeColor:null != (Ob = null == (Ib = c) ? void 0 : null == (Jb = Ib.streets[4]) ? void 0 : Jb.strokeColor) ? Ob : "#3FC91C", strokeWidth:null != (Pb = null == (Kb = c) ? void 0 : null == (Lb = Kb.streets[4]) ? void 0 : Lb.strokeWidth) ? Pb : 11, strokeDashstyle:null != (Qb = null == (Mb = c) ? void 0 : null == (Nb = Mb.streets[4]) ? void 0 : Nb.strokeDashstyle) ? Qb : "solid", };
    var Rb, Sb, Tb, Ub, Vb, Wb, Xb, Yb, Zb;
    d.streets[3] = {strokeColor:null != (Xb = null == (Rb = c) ? void 0 : null == (Sb = Rb.streets[3]) ? void 0 : Sb.strokeColor) ? Xb : "#387FB8", strokeWidth:null != (Yb = null == (Tb = c) ? void 0 : null == (Ub = Tb.streets[3]) ? void 0 : Ub.strokeWidth) ? Yb : 18, strokeDashstyle:null != (Zb = null == (Vb = c) ? void 0 : null == (Wb = Vb.streets[3]) ? void 0 : Wb.strokeDashstyle) ? Zb : "solid", };
    var $b, ac, bc, cc, dc, ec, fc, gc, hc;
    d.streets[7] = {strokeColor:null != (fc = null == ($b = c) ? void 0 : null == (ac = $b.streets[7]) ? void 0 : ac.strokeColor) ? fc : "#ECE589", strokeWidth:null != (gc = null == (bc = c) ? void 0 : null == (cc = bc.streets[7]) ? void 0 : cc.strokeWidth) ? gc : 14, strokeDashstyle:null != (hc = null == (dc = c) ? void 0 : null == (ec = dc.streets[7]) ? void 0 : ec.strokeDashstyle) ? hc : "solid", };
    var ic, jc, kc, lc, mc, nc, oc, pc, qc;
    d.streets[6] = {strokeColor:null != (oc = null == (ic = c) ? void 0 : null == (jc = ic.streets[6]) ? void 0 : jc.strokeColor) ? oc : "#C13040", strokeWidth:null != (pc = null == (kc = c) ? void 0 : null == (lc = kc.streets[6]) ? void 0 : lc.strokeWidth) ? pc : 16, strokeDashstyle:null != (qc = null == (mc = c) ? void 0 : null == (nc = mc.streets[6]) ? void 0 : nc.strokeDashstyle) ? qc : "solid", };
    var rc, sc, tc, uc, vc, wc, xc, yc, zc;
    d.streets[16] = {strokeColor:null != (xc = null == (rc = c) ? void 0 : null == (sc = rc.streets[16]) ? void 0 : sc.strokeColor) ? xc : "#B700FF", strokeWidth:null != (yc = null == (tc = c) ? void 0 : null == (uc = tc.streets[16]) ? void 0 : uc.strokeWidth) ? yc : 5, strokeDashstyle:null != (zc = null == (vc = c) ? void 0 : null == (wc = vc.streets[16]) ? void 0 : wc.strokeDashstyle) ? zc : "dash", };
    var Ac, Bc, Cc, Dc, Ec, Fc, Gc, Hc, Ic;
    d.streets[5] = {strokeColor:null != (Gc = null == (Ac = c) ? void 0 : null == (Bc = Ac.streets[5]) ? void 0 : Bc.strokeColor) ? Gc : "#00FF00", strokeWidth:null != (Hc = null == (Cc = c) ? void 0 : null == (Dc = Cc.streets[5]) ? void 0 : Dc.strokeWidth) ? Hc : 5, strokeDashstyle:null != (Ic = null == (Ec = c) ? void 0 : null == (Fc = Ec.streets[5]) ? void 0 : Fc.strokeDashstyle) ? Ic : "dash", };
    var Jc, Kc, Lc, Mc, Nc, Oc, Pc, Qc, Rc;
    d.streets[8] = {strokeColor:null != (Pc = null == (Jc = c) ? void 0 : null == (Kc = Jc.streets[8]) ? void 0 : Kc.strokeColor) ? Pc : "#82614A", strokeWidth:null != (Qc = null == (Lc = c) ? void 0 : null == (Mc = Lc.streets[8]) ? void 0 : Mc.strokeWidth) ? Qc : 7, strokeDashstyle:null != (Rc = null == (Nc = c) ? void 0 : null == (Oc = Nc.streets[8]) ? void 0 : Oc.strokeDashstyle) ? Rc : "solid", };
    var Sc, Tc, Uc, Vc, Wc, Xc, Yc, Zc, $c;
    d.streets[15] = {strokeColor:null != (Yc = null == (Sc = c) ? void 0 : null == (Tc = Sc.streets[15]) ? void 0 : Tc.strokeColor) ? Yc : "#FF8000", strokeWidth:null != (Zc = null == (Uc = c) ? void 0 : null == (Vc = Uc.streets[15]) ? void 0 : Vc.strokeWidth) ? Zc : 5, strokeDashstyle:null != ($c = null == (Wc = c) ? void 0 : null == (Xc = Wc.streets[15]) ? void 0 : Xc.strokeDashstyle) ? $c : "dashdot", };
    var ad, bd, cd, dd, ed, fd, gd, hd, id;
    d.streets[18] = {strokeColor:null != (gd = null == (ad = c) ? void 0 : null == (bd = ad.streets[18]) ? void 0 : bd.strokeColor) ? gd : "#FFFFFF", strokeWidth:null != (hd = null == (cd = c) ? void 0 : null == (dd = cd.streets[18]) ? void 0 : dd.strokeWidth) ? hd : 8, strokeDashstyle:null != (id = null == (ed = c) ? void 0 : null == (fd = ed.streets[18]) ? void 0 : fd.strokeDashstyle) ? id : "dash", };
    var jd, kd, ld, md, nd, od, pd, qd, rd;
    d.streets[17] = {strokeColor:null != (pd = null == (jd = c) ? void 0 : null == (kd = jd.streets[17]) ? void 0 : kd.strokeColor) ? pd : "#00FFB3", strokeWidth:null != (qd = null == (ld = c) ? void 0 : null == (md = ld.streets[17]) ? void 0 : md.strokeWidth) ? qd : 7, strokeDashstyle:null != (rd = null == (nd = c) ? void 0 : null == (od = nd.streets[17]) ? void 0 : od.strokeDashstyle) ? rd : "solid", };
    var sd, td, ud, vd, wd, xd, yd, zd, Ad;
    d.streets[22] = {strokeColor:null != (yd = null == (sd = c) ? void 0 : null == (td = sd.streets[22]) ? void 0 : td.strokeColor) ? yd : "#C6C7FF", strokeWidth:null != (zd = null == (ud = c) ? void 0 : null == (vd = ud.streets[22]) ? void 0 : vd.strokeWidth) ? zd : 6, strokeDashstyle:null != (Ad = null == (wd = c) ? void 0 : null == (xd = wd.streets[22]) ? void 0 : xd.strokeDashstyle) ? Ad : "solid", };
    var Bd, Cd, Dd, Ed, Fd, Gd, Hd, Id, Jd;
    d.streets[19] = {strokeColor:null != (Hd = null == (Bd = c) ? void 0 : null == (Cd = Bd.streets[19]) ? void 0 : Cd.strokeColor) ? Hd : "#00FF00", strokeWidth:null != (Id = null == (Dd = c) ? void 0 : null == (Ed = Dd.streets[19]) ? void 0 : Ed.strokeWidth) ? Id : 5, strokeDashstyle:null != (Jd = null == (Fd = c) ? void 0 : null == (Gd = Fd.streets[19]) ? void 0 : Gd.strokeDashstyle) ? Jd : "dashdot", };
    var Kd, Ld, Md, Nd, Od, Pd, Qd, Rd, Sd;
    d.streets[2] = {strokeColor:null != (Qd = null == (Kd = c) ? void 0 : null == (Ld = Kd.streets[2]) ? void 0 : Ld.strokeColor) ? Qd : "#CBA12E", strokeWidth:null != (Rd = null == (Md = c) ? void 0 : null == (Nd = Md.streets[2]) ? void 0 : Nd.strokeWidth) ? Rd : 12, strokeDashstyle:null != (Sd = null == (Od = c) ? void 0 : null == (Pd = Od.streets[2]) ? void 0 : Pd.strokeDashstyle) ? Sd : "solid", };
    var Td, Ud, Vd, Wd, Xd, Yd, Zd, $d, ae;
    d.streets[10] = {strokeColor:null != (Zd = null == (Td = c) ? void 0 : null == (Ud = Td.streets[10]) ? void 0 : Ud.strokeColor) ? Zd : "#0000FF", strokeWidth:null != ($d = null == (Vd = c) ? void 0 : null == (Wd = Vd.streets[10]) ? void 0 : Wd.strokeWidth) ? $d : 5, strokeDashstyle:null != (ae = null == (Xd = c) ? void 0 : null == (Yd = Xd.streets[10]) ? void 0 : Yd.strokeDashstyle) ? ae : "dash", };
    var be, ce, de, ee, fe, ge;
    d.red = {strokeColor:null != (fe = null == (be = c) ? void 0 : null == (ce = be.red) ? void 0 : ce.strokeColor) ? fe : "#FF0000", strokeDashstyle:null != (ge = null == (de = c) ? void 0 : null == (ee = de.red) ? void 0 : ee.strokeDashstyle) ? ge : "solid", };
    var he, ie, je, ke, le, me, ne, oe, pe;
    d.roundabout = {strokeColor:null != (ne = null == (he = c) ? void 0 : null == (ie = he.roundabout) ? void 0 : ie.strokeColor) ? ne : "#111", strokeWidth:null != (oe = null == (je = c) ? void 0 : null == (ke = je.roundabout) ? void 0 : ke.strokeWidth) ? oe : 1, strokeDashstyle:null != (pe = null == (le = c) ? void 0 : null == (me = le.roundabout) ? void 0 : me.strokeDashstyle) ? pe : "dash", };
    var qe, re, se, te, ue, ve, we, xe, ye;
    d.lanes = {strokeColor:null != (we = null == (qe = c) ? void 0 : null == (re = qe.lanes) ? void 0 : re.strokeColor) ? we : "#454443", strokeDashstyle:null != (xe = null == (se = c) ? void 0 : null == (te = se.lanes) ? void 0 : te.strokeDashstyle) ? xe : "dash", strokeOpacity:null != (ye = null == (ue = c) ? void 0 : null == (ve = ue.lanes) ? void 0 : ve.strokeOpacity) ? ye : 0.9, };
    var ze, Ae, Be, Ce, De, Ee, Fe, Ge, He;
    d.toll = {strokeColor:null != (Fe = null == (ze = c) ? void 0 : null == (Ae = ze.toll) ? void 0 : Ae.strokeColor) ? Fe : "#00E1FF", strokeDashstyle:null != (Ge = null == (Be = c) ? void 0 : null == (Ce = Be.toll) ? void 0 : Ce.strokeDashstyle) ? Ge : "solid", strokeOpacity:null != (He = null == (De = c) ? void 0 : null == (Ee = De.toll) ? void 0 : Ee.strokeOpacity) ? He : 1.0, };
    var Ie, Je, Ke, Le, Me, Ne, Oe, Pe, Qe;
    d.closure = {strokeColor:null != (Oe = null == (Ie = c) ? void 0 : null == (Je = Ie.closure) ? void 0 : Je.strokeColor) ? Oe : "#FF00FF", strokeOpacity:null != (Pe = null == (Ke = c) ? void 0 : null == (Le = Ke.closure) ? void 0 : Le.strokeOpacity) ? Pe : 1.0, strokeDashstyle:null != (Qe = null == (Me = c) ? void 0 : null == (Ne = Me.closure) ? void 0 : Ne.strokeDashstyle) ? Qe : "dash", };
    var Re, Se, Te, Ue, Ve, We, Xe, Ye, Ze;
    d.headlights = {strokeColor:null != (Xe = null == (Re = c) ? void 0 : null == (Se = Re.headlights) ? void 0 : Se.strokeColor) ? Xe : "#bfff00", strokeOpacity:null != (Ye = null == (Te = c) ? void 0 : null == (Ue = Te.headlights) ? void 0 : Ue.strokeOpacity) ? Ye : 0.9, strokeDashstyle:null != (Ze = null == (Ve = c) ? void 0 : null == (We = Ve.headlights) ? void 0 : We.strokeDashstyle) ? Ze : "dot", };
    var $e, af, bf, cf, df, ef, ff, gf, hf;
    d.nearbyHOV = {strokeColor:null != (ff = null == ($e = c) ? void 0 : null == (af = $e.nearbyHOV) ? void 0 : af.strokeColor) ? ff : "#ff66ff", strokeOpacity:null != (gf = null == (bf = c) ? void 0 : null == (cf = bf.nearbyHOV) ? void 0 : cf.strokeOpacity) ? gf : 1.0, strokeDashstyle:null != (hf = null == (df = c) ? void 0 : null == (ef = df.nearbyHOV) ? void 0 : ef.strokeDashstyle) ? hf : "dash", };
    var jf, kf, lf, mf, nf, of, pf, qf, rf;
    d.restriction = {strokeColor:null != (pf = null == (jf = c) ? void 0 : null == (kf = jf.restriction) ? void 0 : kf.strokeColor) ? pf : "#F2FF00", strokeOpacity:null != (qf = null == (lf = c) ? void 0 : null == (mf = lf.restriction) ? void 0 : mf.strokeOpacity) ? qf : 1.0, strokeDashstyle:null != (rf = null == (nf = c) ? void 0 : null == (of = nf.restriction) ? void 0 : of.strokeDashstyle) ? rf : "dash", };
    var sf, tf, uf, vf, wf, xf, yf, zf, Af;
    d.dirty = {strokeColor:null != (yf = null == (sf = c) ? void 0 : null == (tf = sf.dirty) ? void 0 : tf.strokeColor) ? yf : "#82614A", strokeOpacity:null != (zf = null == (uf = c) ? void 0 : null == (vf = uf.dirty) ? void 0 : vf.strokeOpacity) ? zf : 0.6, strokeDashstyle:null != (Af = null == (wf = c) ? void 0 : null == (xf = wf.dirty) ? void 0 : xf.strokeDashstyle) ? Af : "longdash", };
    d.speeds = {};
    var Bf, Cf, Df;
    d.speeds["default"] = null != (Df = null == (Bf = c) ? void 0 : null == (Cf = Bf.speed) ? void 0 : Cf["default"]) ? Df : "#cc0000";
    var Ef, Ff;
    if (null == (Ef = c) ? 0 : null == (Ff = Ef.speeds) ? 0 : Ff.metric) {
      d.speeds.metric = c.speeds.metric;
    } else {
      d.speeds.metric = {};
      var Gf, Hf, If;
      d.speeds.metric[5] = null != (If = null == (Gf = c) ? void 0 : null == (Hf = Gf.speeds) ? void 0 : Hf.metric[5]) ? If : "#542344";
      var Jf, Kf, Lf;
      d.speeds.metric[7] = null != (Lf = null == (Jf = c) ? void 0 : null == (Kf = Jf.speeds) ? void 0 : Kf.metric[7]) ? Lf : "#ff5714";
      var Mf, Nf, Of;
      d.speeds.metric[10] = null != (Of = null == (Mf = c) ? void 0 : null == (Nf = Mf.speeds) ? void 0 : Nf.metric[10]) ? Of : "#ffbf00";
      var Pf, Qf, Rf;
      d.speeds.metric[20] = null != (Rf = null == (Pf = c) ? void 0 : null == (Qf = Pf.speeds) ? void 0 : Qf.metric[20]) ? Rf : "#ee0000";
      var Sf, Tf, Uf;
      d.speeds.metric[30] = null != (Uf = null == (Sf = c) ? void 0 : null == (Tf = Sf.speeds) ? void 0 : Tf.metric[30]) ? Uf : "#e4ff1a";
      var Vf, Wf, Xf;
      d.speeds.metric[40] = null != (Xf = null == (Vf = c) ? void 0 : null == (Wf = Vf.speeds) ? void 0 : Wf.metric[40]) ? Xf : "#993300";
      var Yf, Zf, $f;
      d.speeds.metric[50] = null != ($f = null == (Yf = c) ? void 0 : null == (Zf = Yf.speeds) ? void 0 : Zf.metric[50]) ? $f : "#33ff33";
      var ag, bg, cg;
      d.speeds.metric[60] = null != (cg = null == (ag = c) ? void 0 : null == (bg = ag.speeds) ? void 0 : bg.metric[60]) ? cg : "#639fab";
      var dg, eg, fg;
      d.speeds.metric[70] = null != (fg = null == (dg = c) ? void 0 : null == (eg = dg.speeds) ? void 0 : eg.metric[70]) ? fg : "#00ffff";
      var gg, hg, ig;
      d.speeds.metric[80] = null != (ig = null == (gg = c) ? void 0 : null == (hg = gg.speeds) ? void 0 : hg.metric[80]) ? ig : "#00bfff";
      var jg, kg, lg;
      d.speeds.metric[90] = null != (lg = null == (jg = c) ? void 0 : null == (kg = jg.speeds) ? void 0 : kg.metric[90]) ? lg : "#0066ff";
      var mg, ng, og;
      d.speeds.metric[100] = null != (og = null == (mg = c) ? void 0 : null == (ng = mg.speeds) ? void 0 : ng.metric[100]) ? og : "#ff00ff";
      var pg, qg, rg;
      d.speeds.metric[110] = null != (rg = null == (pg = c) ? void 0 : null == (qg = pg.speeds) ? void 0 : qg.metric[110]) ? rg : "#ff0080";
      var sg, tg, ug;
      d.speeds.metric[120] = null != (ug = null == (sg = c) ? void 0 : null == (tg = sg.speeds) ? void 0 : tg.metric[120]) ? ug : "#ff0000";
      var vg, wg, xg;
      d.speeds.metric[130] = null != (xg = null == (vg = c) ? void 0 : null == (wg = vg.speeds) ? void 0 : wg.metric[130]) ? xg : "#ff9000";
      var yg, zg, Ag;
      d.speeds.metric[140] = null != (Ag = null == (yg = c) ? void 0 : null == (zg = yg.speeds) ? void 0 : zg.metric[140]) ? Ag : "#ff4000";
      var Bg, Cg, Dg;
      d.speeds.metric[150] = null != (Dg = null == (Bg = c) ? void 0 : null == (Cg = Bg.speeds) ? void 0 : Cg.metric[150]) ? Dg : "#0040ff";
    }
    var Eg, Fg;
    if (null == (Eg = c) ? 0 : null == (Fg = Eg.speeds) ? 0 : Fg.imperial) {
      d.speeds.imperial = c.speeds.imperial;
    } else {
      d.speeds.imperial = {};
      var Gg, Hg, Ig;
      d.speeds.imperial[5] = null != (Ig = null == (Gg = c) ? void 0 : null == (Hg = Gg.speeds) ? void 0 : Hg.imperial[5]) ? Ig : "#ff0000";
      var Jg, Kg, Lg;
      d.speeds.imperial[10] = null != (Lg = null == (Jg = c) ? void 0 : null == (Kg = Jg.speeds) ? void 0 : Kg.imperial[10]) ? Lg : "#ff8000";
      var Mg, Ng, Og;
      d.speeds.imperial[15] = null != (Og = null == (Mg = c) ? void 0 : null == (Ng = Mg.speeds) ? void 0 : Ng.imperial[15]) ? Og : "#ffb000";
      var Pg, Qg, Rg;
      d.speeds.imperial[20] = null != (Rg = null == (Pg = c) ? void 0 : null == (Qg = Pg.speeds) ? void 0 : Qg.imperial[20]) ? Rg : "#bfff00";
      var Sg, Tg, Ug;
      d.speeds.imperial[25] = null != (Ug = null == (Sg = c) ? void 0 : null == (Tg = Sg.speeds) ? void 0 : Tg.imperial[25]) ? Ug : "#993300";
      var Vg, Wg, Xg;
      d.speeds.imperial[30] = null != (Xg = null == (Vg = c) ? void 0 : null == (Wg = Vg.speeds) ? void 0 : Wg.imperial[30]) ? Xg : "#33ff33";
      var Yg, Zg, $g;
      d.speeds.imperial[35] = null != ($g = null == (Yg = c) ? void 0 : null == (Zg = Yg.speeds) ? void 0 : Zg.imperial[35]) ? $g : "#00ff90";
      var ah, bh, ch;
      d.speeds.imperial[40] = null != (ch = null == (ah = c) ? void 0 : null == (bh = ah.speeds) ? void 0 : bh.imperial[40]) ? ch : "#00ffff";
      var dh, eh, fh;
      d.speeds.imperial[45] = null != (fh = null == (dh = c) ? void 0 : null == (eh = dh.speeds) ? void 0 : eh.imperial[45]) ? fh : "#00bfff";
      var gh, hh, ih;
      d.speeds.imperial[50] = null != (ih = null == (gh = c) ? void 0 : null == (hh = gh.speeds) ? void 0 : hh.imperial[50]) ? ih : "#0066ff";
      var jh, kh, lh;
      d.speeds.imperial[55] = null != (lh = null == (jh = c) ? void 0 : null == (kh = jh.speeds) ? void 0 : kh.imperial[55]) ? lh : "#ff00ff";
      var mh, nh, oh;
      d.speeds.imperial[60] = null != (oh = null == (mh = c) ? void 0 : null == (nh = mh.speeds) ? void 0 : nh.imperial[60]) ? oh : "#ff0050";
      var ph, qh, rh;
      d.speeds.imperial[65] = null != (rh = null == (ph = c) ? void 0 : null == (qh = ph.speeds) ? void 0 : qh.imperial[65]) ? rh : "#ff9010";
      var sh, th, uh;
      d.speeds.imperial[70] = null != (uh = null == (sh = c) ? void 0 : null == (th = sh.speeds) ? void 0 : th.imperial[70]) ? uh : "#0040ff";
      var vh, wh, xh;
      d.speeds.imperial[75] = null != (xh = null == (vh = c) ? void 0 : null == (wh = vh.speeds) ? void 0 : wh.imperial[75]) ? xh : "#10ff10";
      var yh, zh, Ah;
      d.speeds.imperial[80] = null != (Ah = null == (yh = c) ? void 0 : null == (zh = yh.speeds) ? void 0 : zh.imperial[80]) ? Ah : "#ff4000";
      var Bh, Ch, Dh;
      d.speeds.imperial[85] = null != (Dh = null == (Bh = c) ? void 0 : null == (Ch = Bh.speeds) ? void 0 : Ch.imperial[85]) ? Dh : "#ff0000";
    }
    Ca(d);
    return b;
  }
  function Da(a) {
    if (d.showSLSinglecolor) {
      return d.SLColor;
    }
    var b;
    return null != (b = d.speeds[W.prefs.attributes.isImperial ? "imperial" : "metric"][W.prefs.attributes.isImperial ? Math.round(a / 1.609344) : a]) ? b : d.speeds["default"];
  }
  function Eh(a, b, c) {
    a ? (a = c.x - b.x, b = c.y - b.y) : (a = b.x - c.x, b = b.y - c.y);
    return 180 * Math.atan2(a, b) / Math.PI;
  }
  function ta(a) {
    var b = "";
    if (a) {
      var c = a;
      !0 === W.prefs.attributes.isImperial && (c = Math.round(a / 1.609344));
      c = c.toString();
      for (a = 0; a < c.length; a += 1) {
        b += hi[c.charAt(a)];
      }
    }
    return b;
  }
  function Fh(a, b, c) {
    c = void 0 === c ? !1 : c;
    var e, f, k = [];
    var n = null;
    var h = a.getAttributes(), r = a.getAddress(), v = a.hasNonEmptyStreet();
    if (null !== h.primaryStreetID && void 0 === r.attributes.state) {
      y("Address not ready", r, h), setTimeout(function() {
        Fh(a, b, !0);
      }, 500);
    } else {
      var q = r.attributes;
      r = "";
      v ? r = q.street.name : 10 > h.roadType && !a.isInRoundabout() && (r = "\u2691");
      v = "";
      if (d.showANs) {
        for (var z = 0, w = 0; w < h.streetIDs.length; w += 1) {
          var l = h.streetIDs[w];
          if (2 === z) {
            v += " \u2026";
            break;
          }
          (l = W.model.streets.objects[l]) && l.name !== q.street.name && (z += 1, v += l.name ? "(" + l.name + ")" : "");
        }
        v = v.replace(")(", ", ");
        "" !== v && (v = "\n" + v);
      }
      O[h.roadType] || (r += "\n!! UNSUPPORTED ROAD TYPE !!");
      q = "";
      (null != (e = h.fwdMaxSpeed) ? e : h.revMaxSpeed) && d.showSLtext && (h.fwdMaxSpeed === h.revMaxSpeed ? q = ta(h.fwdMaxSpeed) : h.fwdMaxSpeed ? (q = ta(h.fwdMaxSpeed), h.revMaxSpeed && (q += "'" + ta(h.revMaxSpeed))) : (q = ta(h.revMaxSpeed), h.fwdMaxSpeed && (q += "'" + ta(h.fwdMaxSpeed))), h.fwdMaxSpeedUnverified || h.revMaxSpeedUnverified) && (q += "?");
      e = r + " " + q;
      if (" " === e) {
        return [];
      }
      q = h.roadType;
      q = new OpenLayers.Feature.Vector(b[0], {myId:h.id, color:O[q] ? O[q].strokeColor : "#f00", outlinecolor:O[q] ? O[q].outlineColor : "#fff", outlinewidth:d.labelOutlineWidth, });
      z = [];
      for (w = 0; w < b.length - 1; w += 1) {
        l = b[w].distanceTo(b[w + 1]), z.push({index:w, h:l});
      }
      z.sort(function(H, M) {
        return H.h > M.h ? -1 : H.h < M.h ? 1 : 0;
      });
      w = "" === r ? 1 : z.length;
      l = Gh * e.length;
      for (var D = 0; D < z.length && 0 < w && !(z[D].h < (0 < D ? l : l - 30)); D += 1) {
        var G = z[D].index;
        var E = f = 0;
        E = b[G];
        var u = (new OpenLayers.Geometry.LineString([E, b[G + 1], ])).getCentroid(!0);
        n = q.clone();
        n.geometry = u;
        h.fwdDirection ? (f = u.x - E.x, E = u.y - E.y) : (f = E.x - u.x, E = E.y - u.y);
        E = 90 + 180 * Math.atan2(f, E) / Math.PI;
        "" !== r ? (f = " \u25b6 ", 90 < E && 270 > E ? E -= 180 : f = " \u25c0 ") : f = "";
        a.isOneWay() || (f = "");
        n.attributes.label = f + e + f + v;
        n.attributes.angle = E;
        n.attributes.a = 1 === G % 2;
        n.attributes.v = w;
        --w;
        k.push(n);
      }
    }
    c && n && B.addFeatures(k, {silent:!0});
    return k;
  }
  function Hh(a) {
    var b = a.id, c = a.rev, e = a.l, f = a.m;
    a = Eh(a.j, c ? f : e, c ? e : f);
    return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(e.x + 10 * Math.sin(a), e.y + 10 * Math.cos(a)), {myId:b, }, {rotation:a, externalGraphic:"https://raw.githubusercontent.com/bedo2991/svl/master/average.png", graphicWidth:36, graphicHeight:36, graphicZIndex:300, fillOpacity:1, pointerEvents:"none", });
  }
  function ii(a) {
    var b = a.getAttributes();
    y("Drawing segment: " + b.id);
    var c = b.geometry.components, e = b.geometry.getVertices(), f = (new OpenLayers.Geometry.LineString(e)).simplify(1.5).components, k = [], n = 100 * b.level, h = b.fwdDirection && b.revDirection, r = a.isInRoundabout(), v = !1, q = !1, z = b.roadType, w = gi({u:b.width, roadType:z, A:h, });
    h = w;
    var l = null;
    if (null === b.primaryStreetID) {
      return l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:d.red.strokeColor, width:w, dash:d.red.strokeDashstyle, }), k.push(l), k;
    }
    d.routingModeEnabled && null !== b.routingRoadType && (z = b.routingRoadType);
    if (void 0 !== O[z]) {
      var D;
      q = null != (D = b.fwdMaxSpeed) ? D : b.revMaxSpeed;
      0 < b.level && (v = !0, l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:"#000000", zIndex:n + 100, width:w, }), k.push(l));
      if ((q = q && d.showSLcolor) && v) {
        h = 0.56 * w;
      } else {
        if (v || q) {
          h = 0.68 * w;
        }
      }
      if (q) {
        if (D = d.showDashedUnverifiedSL && (b.fwdMaxSpeedUnverified || b.revMaxSpeedUnverified) ? "dash" : "solid", d.showSLSinglecolor || !b.fwdMaxSpeed && !b.revMaxSpeed || b.fwdMaxSpeed === b.revMaxSpeed || a.isOneWay()) {
          q = b.fwdMaxSpeed, a.isOneWay() && b.revDirection && (q = b.revMaxSpeed), q && (l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Da(q), width:v ? 0.8 * w : w, dash:D, a:!0, zIndex:n + 115, }), k.push(l));
        } else {
          q = [];
          for (var G = [], E = 0; E < e.length - 1; E += 1) {
            var u = e[E], H = e[E + 1];
            l = u.x - H.x;
            var M = u.y - H.y;
            q[0] = u.clone();
            G[0] = u.clone();
            q[1] = H.clone();
            G[1] = H.clone();
            u = v ? 0.14 * w : 0.17 * w;
            if (0.5 > Math.abs(l)) {
              0 < M ? (q[0].move(-u, 0), q[1].move(-u, 0), G[0].move(u, 0), G[1].move(u, 0)) : (q[0].move(u, 0), q[1].move(u, 0), G[0].move(-u, 0), G[1].move(-u, 0));
            } else {
              var U = M / l;
              H = -1 / U;
              if (0.05 > Math.abs(U)) {
                0 < l ? (q[0].move(0, u), q[1].move(0, u), G[0].move(0, -u), G[1].move(0, -u)) : (q[0].move(0, -u), q[1].move(0, -u), G[0].move(0, u), G[1].move(0, u));
              } else {
                if (0 < M && 0 < l || 0 > l && 0 < M) {
                  u *= -1;
                }
                l = Math.sqrt(1 + H * H);
                q[0].move(u / l, H / l * u);
                q[1].move(u / l, H / l * u);
                G[0].move(-u / l, H / l * -u);
                G[1].move(-u / l, H / l * -u);
              }
            }
            l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(q), {myId:b.id, color:Da(b.fwdMaxSpeed), width:h, dash:D, a:!0, zIndex:n + 105, });
            k.push(l);
            l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(G), {myId:b.id, color:Da(b.revMaxSpeed), width:h, dash:D, a:!0, zIndex:n + 110, });
            k.push(l);
          }
        }
      }
      l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:O[z].strokeColor, width:h, dash:O[z].strokeDashstyle, zIndex:n + 120, });
      k.push(l);
      0 > b.level && (l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:"#000000", width:h, opacity:0.3, zIndex:n + 125, }), k.push(l));
      v = a.getLockRank() + 1;
      var K, C;
      if (v > d.fakelock || v > (null == (K = WazeWrap) ? void 0 : null == (C = K.User) ? void 0 : C.Rank())) {
        l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Ih.strokeColor, width:0.1 * h, dash:Ih.strokeDashstyle, zIndex:n + 147, }), k.push(l);
      }
      K = a.getFlagAttributes();
      K.unpaved && (l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:d.dirty.strokeColor, width:0.7 * h, opacity:d.dirty.strokeOpacity, dash:d.dirty.strokeDashstyle, zIndex:n + 135, }), k.push(l));
      b.hasClosures && (l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:d.closure.strokeColor, width:0.6 * h, dash:d.closure.strokeDashstyle, opacity:d.closure.strokeOpacity, a:!0, zIndex:n + 140, }), k.push(l));
      if (b.fwdToll || b.revToll || b.restrictions.some(function(Z) {
        return "TOLL" === Z.getDefaultType();
      })) {
        l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:d.toll.strokeColor, width:0.3 * h, dash:d.toll.strokeDashstyle, opacity:d.toll.strokeOpacity, zIndex:n + 145, }), k.push(l);
      }
      r && (l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Ea.strokeColor, width:0.15 * h, dash:Ea.strokeDashstyle, opacity:Ea.strokeOpacity, a:!0, zIndex:n + 150, }), k.push(l));
      0 < b.restrictions.length && (l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:d.restriction.strokeColor, width:0.4 * h, dash:d.restriction.strokeDashstyle, opacity:d.restriction.strokeOpacity, a:!0, zIndex:n + 155, }), k.push(l));
      !1 === b.validated && (l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Jh.strokeColor, width:0.5 * h, dash:Jh.strokeDashstyle, a:!0, zIndex:n + 160, }), k.push(l));
      K.headlights && k.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:d.headlights.strokeColor, width:0.2 * h, dash:d.headlights.strokeDashstyle, opacity:d.headlights.strokeOpacity, a:!0, zIndex:n + 165, }));
      K.nearbyHOV && k.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:d.nearbyHOV.strokeColor, width:0.25 * h, dash:d.nearbyHOV.strokeDashstyle, opacity:d.nearbyHOV.strokeOpacity, a:!0, zIndex:n + 166, }));
      0 < b.fwdLaneCount && (C = e.slice(-2), C[0] = (new OpenLayers.Geometry.LineString([C[0], C[1], ])).getCentroid(!0), l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(C), {myId:b.id, color:d.lanes.strokeColor, width:0.3 * h, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:n + 170, }), k.push(l));
      0 < b.revLaneCount && (C = e.slice(0, 2), C[1] = (new OpenLayers.Geometry.LineString([C[0], C[1], ])).getCentroid(!0), l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(C), {myId:b.id, color:d.lanes.strokeColor, width:0.3 * h, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:n + 175, }), k.push(l));
      if (!1 === b.fwdDirection || !1 === b.revDirection) {
        if (C = c, !r && b.length / c.length < d.arrowDeclutter && (C = f), !1 === (b.fwdDirection || b.revDirection)) {
          for (v = 0; v < C.length - 1; v += 1) {
            k.push(new OpenLayers.Feature.Vector((new OpenLayers.Geometry.LineString([C[v], C[v + 1], ])).getCentroid(!0), {myId:b.id, a:!0, i:!0, zIndex:n + 180, }, ji));
          }
        } else {
          for (v = r ? 3 : 1, z = v - 1; z < C.length - 1; z += v) {
            w = Eh(b.fwdDirection, C[z], C[z + 1]), D = new OpenLayers.Geometry.LineString([C[z], C[z + 1], ]), k.push(new OpenLayers.Feature.Vector(D.getCentroid(!0), {myId:b.id, a:!0, i:!0, }, {graphicName:"myTriangle", rotation:w, stroke:!0, strokeColor:"#000", graphiczIndex:n + 180, strokeWidth:1.5, fill:!0, fillColor:"#fff", fillOpacity:0.7, pointRadius:5, }));
          }
        }
      }
      K.fwdSpeedCamera && k.push(Hh({id:b.id, rev:!1, j:b.fwdDirection, l:c[0], m:c[1], }));
      K.revSpeedCamera && k.push(Hh({id:b.id, rev:!0, j:b.fwdDirection, l:c[c.length - 1], m:c[c.length - 2], }));
      if (!0 === d.renderGeomNodes && !r) {
        for (r = 1; r < c.length - 2; r += 1) {
          k.push(new OpenLayers.Feature.Vector(c[r], {myId:b.id, zIndex:n + 200, a:!0, i:!0, }, ki));
        }
      }
      K.tunnel && (l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Fa.strokeColor, opacity:Fa.strokeOpacity, width:0.3 * h, dash:Fa.strokeDashstyle, zIndex:n + 177, }), k.push(l), l = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:b.id, color:Kh.strokeColor, width:0.1 * h, dash:Kh.strokeDashstyle, zIndex:n + 177, }), k.push(l));
    }
    a = Fh(a, f);
    0 < a.length && B.addFeatures(a, {silent:!0});
    return k;
  }
  function Lh(a) {
    a = a.getAttributes();
    var b = new OpenLayers.Geometry.Point(a.geometry.x, a.geometry.y);
    return new OpenLayers.Feature.Vector(b, {myid:a.id, }, Mh(a));
  }
  function li() {
    Ba();
    da(d);
    ea();
    x("info", g("preferences_rollback"));
  }
  function mi() {
    GM_setClipboard(JSON.stringify(d));
    x("info", g("export_preferences_message"));
  }
  function fi(a, b) {
    if (null !== b && "" !== b) {
      try {
        d = JSON.parse(b);
      } catch (c) {
        x("error", g("preferences_parsing_error"));
        return;
      }
      null !== d && d.streets ? (da(d), Ca(d), ea(), x("success", g("preferences_imported"))) : x("error", "preferences_importing_error");
    }
  }
  function Nh() {
    var a = parseInt(W.map.getLayerByUniqueName("gps_points").getZIndex(), 10);
    d.showUnderGPSPoints ? (A.setZIndex(a - 2), F.setZIndex(a - 1)) : (A.setZIndex(a + 1), F.setZIndex(a + 2));
  }
  function T(a) {
    var b = a.type, c = a.className, e = a.title, f = a.min, k = a.max, n = a.step, h = document.createElement("input");
    h.id = "svl_" + a.id;
    c && (h.className = c);
    e && (h.title = e);
    h.type = b;
    if ("range" === b || "number" === b) {
      h.min = f, h.max = k, h.step = n;
    }
    return h;
  }
  function Ga() {
    var a = document.getElementById("svl_routingModeDiv");
    d.routingModeEnabled && !0 !== d.hideRoutingModeBlock ? null === a && (a = document.createElement("div"), a.id = "svl_routingModeDiv", a.className = "routingDiv", a.innerHTML = g("routing_mode_panel_title") + "<br><small>" + g("routing_mode_panel_body") + "<small>", a.addEventListener("mouseenter", function() {
      d.routingModeEnabled = !1;
      ba();
    }), a.addEventListener("mouseleave", function() {
      d.routingModeEnabled = !0;
      ba();
    }), document.getElementById("map").appendChild(a)) : null == a || a.remove();
  }
  function Oh() {
    clearInterval(Ha);
    Ha = null;
    d.autoReload && d.autoReload.enabled && (Ha = setInterval(S, d.autoReload.interval));
  }
  function Ph() {
    document.getElementById("svl_saveNewPref").classList.remove("disabled");
    document.getElementById("svl_saveNewPref").disabled = !1;
    document.getElementById("svl_saveNewPref").classList.add("btn-primary");
    document.getElementById("svl_rollbackButton").classList.remove("disabled");
    document.getElementById("svl_rollbackButton").disabled = !1;
    document.getElementById("sidepanel-svl").classList.add("svl_unsaved");
    var a = document.getElementById("svl_presets"), b = document.getElementById("svl_presets").value, c = !1;
    "wme_colors" === b && (c = !0, d.streets = Qh[b].streets);
    "svl_standard" === b && (c = !0, d.streets = Qh[b].streets);
    if (c) {
      Rh(), a.value = "", x("info", g("preset_applied"));
    } else {
      for (a = 0; a < d.streets.length; a += 1) {
        d.streets[a] && (d.streets[a] = {}, d.streets[a].strokeColor = document.getElementById("svl_streetColor_" + a).value, d.streets[a].strokeWidth = document.getElementById("svl_streetWidth_" + a).value, d.streets[a].strokeDashstyle = document.querySelector("#svl_strokeDashstyle_" + a + " option:checked").value);
      }
    }
    d.fakelock = document.getElementById("svl_fakelock").value;
    a = W.prefs.attributes.isImperial ? "imperial" : "metric";
    b = Object.keys(d.speeds[a]);
    d.speeds[a] = {};
    for (c = 1; c < b.length + 1; c += 1) {
      d.speeds[a][document.getElementById("svl_slValue_" + a + "_" + c).value] = document.getElementById("svl_slColor_" + a + "_" + c).value;
    }
    d.speeds["default"] = document.getElementById("svl_slColor_" + a + "_Default").value;
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
    d.layerOpacity = document.getElementById("svl_layerOpacity").value / 100.0;
    d.showUnderGPSPoints !== document.getElementById("svl_showUnderGPSPoints").checked ? (d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked, Nh()) : d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked;
    d.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked;
    d.hideRoutingModeBlock = document.getElementById("svl_hideRoutingModeBlock").checked;
    Ga();
    d.useWMERoadLayerAtZoom = document.getElementById("svl_useWMERoadLayerAtZoom").value;
    d.switchZoom = document.getElementById("svl_switchZoom").value;
    d.showANs = document.getElementById("svl_showANs").checked;
    d.realsize = document.getElementById("svl_realsize").checked;
    d.realsize ? $("input.segmentsWidth").prop("disabled", !0) : $("input.segmentsWidth").prop("disabled", !1);
    da(d);
    Oh();
  }
  function ni() {
    Ph();
    Ca(d, !1);
    ea();
  }
  function oi() {
    y("rollbackDefault");
    WazeWrap.Alerts.confirm(GM_info.script.name, g("preferences_reset_question") + "\n" + g("preferences_reset_question_2"), p, null, g("preferences_reset_yes"), g("preferences_reset_cancel"));
  }
  function pi(a) {
    var b = a.id, c = a.title, e = a.description, f = a.options, k = a.g;
    a = document.createElement("div");
    a.className = "prefLineSelect";
    "string" === typeof k && (a.classList.add("newOption"), a.dataset.version = k);
    var n = document.createElement("select");
    n.className = "prefElement";
    k = document.createElement("label");
    k.innerText = c;
    n.id = "svl_" + b;
    f && 0 < f.length && f.forEach(function(h) {
      var r = document.createElement("option");
      r.text = h.text;
      r.value = h.value;
      n.add(r);
    });
    b = document.createElement("i");
    b.innerText = e;
    a.appendChild(k);
    a.appendChild(b);
    a.appendChild(n);
    return a;
  }
  function Sh(a) {
    var b = I18n.translations[I18n.locale];
    switch(a) {
      case "red":
        var c, e, f;
        return null != (f = null == b ? void 0 : null == (c = b.segment) ? void 0 : null == (e = c.address) ? void 0 : e.none) ? f : a;
      case "toll":
        var k, n, h, r;
        return null != (r = null == b ? void 0 : null == (k = b.edit) ? void 0 : null == (n = k.segment) ? void 0 : null == (h = n.fields) ? void 0 : h.toll_road) ? r : a;
      case "restriction":
        var v, q, z;
        return null != (z = null == b ? void 0 : null == (v = b.restrictions) ? void 0 : null == (q = v.modal_headers) ? void 0 : q.restriction_summary) ? z : a;
      case "dirty":
        var w, l, D, G;
        return null != (G = null == b ? void 0 : null == (w = b.edit) ? void 0 : null == (l = w.segment) ? void 0 : null == (D = l.fields) ? void 0 : D.unpaved) ? G : a;
      case "closure":
        var E, u, H;
        return null != (H = null == b ? void 0 : null == (E = b.objects) ? void 0 : null == (u = E.roadClosure) ? void 0 : u.name) ? H : a;
      case "headlights":
        var M, U, K, C;
        return null != (C = null == b ? void 0 : null == (M = b.edit) ? void 0 : null == (U = M.segment) ? void 0 : null == (K = U.fields) ? void 0 : K.headlights) ? C : a;
      case "lanes":
        var Z, ha, ia;
        return null != (ia = null == b ? void 0 : null == (Z = b.objects) ? void 0 : null == (ha = Z.lanes) ? void 0 : ha.title) ? ia : a;
      case "speed limit":
        var ja, ka, la, ma;
        return null != (ma = null == b ? void 0 : null == (ja = b.edit) ? void 0 : null == (ka = ja.segment) ? void 0 : null == (la = ka.fields) ? void 0 : la.speed_limit) ? ma : a;
      case "nearbyHOV":
        var na, oa, pa, qa;
        return null != (qa = null == b ? void 0 : null == (na = b.edit) ? void 0 : null == (oa = na.segment) ? void 0 : null == (pa = oa.fields) ? void 0 : pa.nearbyHOV) ? qa : a;
    }
    var ra, sa;
    return null != (sa = null == b ? void 0 : null == (ra = b.segment) ? void 0 : ra.road_types[a]) ? sa : a;
  }
  function R(a) {
    var b = a.f, c = void 0 === a.c ? !0 : a.c, e = void 0 === a.b ? !1 : a.b;
    a = document.createElement("h6");
    a.innerText = Sh(b);
    var f = T({id:"streetColor_" + b, className:"prefElement form-control", title:g("color"), type:"color", });
    f.style.width = "55pt";
    var k = document.createElement("div");
    c && (c = T({id:"streetWidth_" + b, type:"number", title:g("width") + " (" + g("width_disabled") + ")", className:Number.isInteger(b) ? "form-control prefElement segmentsWidth" : "form-control prefElement", min:1, max:20, step:1, }), c.style.width = "40pt", k.appendChild(c));
    e && (c = T({id:"streetOpacity_" + b, className:"form-control prefElement", title:g("opacity"), type:"number", min:0, max:100, step:10, }), c.style.width = "45pt", k.appendChild(c));
    c = document.createElement("select");
    c.className = "prefElement";
    c.title = "Stroke style";
    c.id = "svl_strokeDashstyle_" + b;
    c.innerHTML = '<option value="solid">' + g("line_solid") + '</option>\n       <option value="dash">' + g("line_dash") + '</option>\n       <option value="dashdot">' + g("line_dashdot") + '</option>\n       <option value="longdash">' + g("line_longdash") + '</option>\n       <option value="longdashdot">' + g("line_longdashdot") + '</option>\n       <option value="dot">' + g("line_dot") + "</option>";
    c.className = "form-control prefElement";
    k.className = "expand";
    k.appendChild(f);
    k.appendChild(c);
    b = document.createElement("div");
    b.className = "prefLineStreets";
    b.appendChild(a);
    b.appendChild(k);
    return b;
  }
  function wa(a, b) {
    var c = (b = void 0 === b ? !0 : b) ? "metric" : "imperial", e = document.createElement("label");
    e.innerText = -1 !== a ? a : "Default";
    var f = document.createElement("div");
    f.appendChild(e);
    "number" === typeof a && (e = T({id:"slValue_" + c + "_" + a, className:"form-control prefElement", title:g("speed_limit_value"), type:"number", min:0, max:150, step:1, }), e.style.width = "50pt", f.appendChild(e), e = document.createElement("span"), e.innerText = b ? g("kmh") : g("mph"), f.appendChild(e));
    a = T({id:"slColor_" + c + "_" + a, className:"prefElement form-control", type:"color", title:g("color"), });
    a.style.width = "55pt";
    f.className = "expand";
    f.appendChild(a);
    a = document.createElement("div");
    a.className = "svl_" + c + " prefLineSL";
    a.appendChild(f);
    return a;
  }
  function Th() {
    return {streets:["red"], decorations:"lanes toll restriction closure headlights dirty nearbyHOV".split(" "), };
  }
  function Rh() {
    for (var a = 0; a < d.streets.length; a += 1) {
      d.streets[a] && (document.getElementById("svl_streetWidth_" + a).value = d.streets[a].strokeWidth, document.getElementById("svl_streetColor_" + a).value = d.streets[a].strokeColor, document.getElementById("svl_strokeDashstyle_" + a).value = d.streets[a].strokeDashstyle);
    }
  }
  function ea() {
    document.getElementById("svl_saveNewPref").classList.add("disabled");
    document.getElementById("svl_saveNewPref").disabled = !0;
    document.getElementById("svl_rollbackButton").classList.add("disabled");
    document.getElementById("svl_rollbackButton").disabled = !0;
    document.getElementById("svl_saveNewPref").classList.remove("btn-primary");
    document.getElementById("sidepanel-svl").classList.remove("svl_unsaved");
    Rh();
    var a = Th();
    a.streets.forEach(function(f) {
      "red" !== f && (document.getElementById("svl_streetWidth_" + f).value = d[f].strokeWidth);
      document.getElementById("svl_streetColor_" + f).value = d[f].strokeColor;
      document.getElementById("svl_strokeDashstyle_" + f).value = d[f].strokeDashstyle;
    });
    a.decorations.forEach(function(f) {
      "dirty lanes toll restriction closure headlights nearbyHOV".split(" ").includes(f) ? document.getElementById("svl_streetOpacity_" + f).value = 100.0 * d[f].strokeOpacity : document.getElementById("svl_streetWidth_" + f).value = d[f].strokeWidth;
      document.getElementById("svl_streetColor_" + f).value = d[f].strokeColor;
      document.getElementById("svl_strokeDashstyle_" + f).value = d[f].strokeDashstyle;
    });
    var b, c, e;
    document.getElementById("svl_fakelock").value = null != (e = null == (b = WazeWrap) ? void 0 : null == (c = b.User) ? void 0 : c.Rank()) ? e : 7;
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
    document.getElementById("svl_hideRoutingModeBlock").checked = d.hideRoutingModeBlock;
    document.getElementById("svl_showANs").checked = d.showANs;
    document.getElementById("svl_layerOpacity").value = 100 * d.layerOpacity;
    document.getElementById("svl_showSLtext").checked = d.showSLtext;
    document.getElementById("svl_showSLcolor").checked = d.showSLcolor;
    document.getElementById("svl_showSLSinglecolor").checked = d.showSLSinglecolor;
    document.getElementById("svl_showDashedUnverifiedSL").checked = d.showDashedUnverifiedSL;
    document.getElementById("svl_SLColor").value = d.SLColor;
    document.getElementById("svl_realsize").checked = d.realsize;
    document.querySelectorAll(".segmentsWidth").forEach(function(f) {
      f.disabled = d.realsize;
    });
    a = (c = W.prefs.attributes.isImperial) ? "imperial" : "metric";
    b = Object.keys(d.speeds[a]);
    document.querySelectorAll(c ? ".svl_metric" : ".svl_imperial").forEach(function(f) {
      f.style.display = "none";
    });
    document.querySelectorAll(".svl_" + a).forEach(function(f) {
      f.style.display = "block";
    });
    for (c = 1; c < b.length + 1; c += 1) {
      document.getElementById("svl_slValue_" + a + "_" + c).value = b[c - 1], document.getElementById("svl_slColor_" + a + "_" + c).value = d.speeds[a][b[c - 1]];
    }
    document.getElementById("svl_slColor_" + a + "_Default").value = d.speeds["default"];
  }
  function L(a) {
    var b = a.id, c = a.title, e = a.description, f = a.g;
    a = document.createElement("div");
    a.className = "prefLineCheckbox";
    "string" === typeof f && (a.classList.add("newOption"), a.dataset.version = f);
    f = document.createElement("label");
    f.innerText = c;
    b = T({id:b, className:"prefElement", type:"checkbox", title:g("true_or_false"), });
    f.appendChild(b);
    a.appendChild(f);
    b = document.createElement("i");
    b.innerText = e;
    a.appendChild(b);
    return a;
  }
  function aa(a) {
    var b = a.id, c = a.title, e = a.description, f = a.min, k = a.max, n = a.step, h = a.g;
    a = document.createElement("div");
    a.className = "prefLineInteger";
    "string" === typeof h && (a.classList.add("newOption"), a.dataset.version = h);
    h = document.createElement("label");
    h.innerText = c;
    b = T({id:b, min:f, max:k, step:n, type:"number", title:g("insert_number"), className:"prefElement form-control", });
    h.appendChild(b);
    a.appendChild(h);
    e && (b = document.createElement("i"), b.innerText = e, a.appendChild(b));
    return a;
  }
  function ua(a) {
    var b = a.id, c = a.title, e = a.description, f = a.min, k = a.max, n = a.step, h = a.g;
    a = document.createElement("div");
    a.className = "prefLineSlider";
    "string" === typeof h && (a.classList.add("newOption"), a.dataset.version = h);
    h = document.createElement("label");
    h.innerText = c;
    b = T({id:b, min:f, max:k, step:n, title:g("pick_a_value_slider"), className:"prefElement form-control", type:"range", });
    h.appendChild(b);
    a.appendChild(h);
    e && (b = document.createElement("i"), b.innerText = e, a.appendChild(b));
    return a;
  }
  function ca(a, b) {
    var c = document.createElement("details");
    c.open = void 0 === b ? !1 : b;
    b = document.createElement("summary");
    b.innerText = a;
    c.appendChild(b);
    return c;
  }
  function qi() {
    var a = document.createElement("style");
    a.innerHTML = '\n        <style>\n        #sidepanel-svl details{margin-bottom:9pt;}\n        #sidepanel-svl i{font-size:small;}\n        .svl_unsaved{background-color:#ffcc00}\n        .expand{display:flex; width:100%; justify-content:space-around;align-items: center;}\n        .prefLineSelect{width:100%; margin-bottom:1vh;}\n        .prefLineSelect label{display:block;width:100%}\n        .prefLineCheckbox{width:100%; margin-bottom:1vh;}\n        .prefLineCheckbox label{display:block;width:100%}\n        .prefLineCheckbox input{float:right;}\n        .prefLineInteger{width:100%; margin-bottom:1vh;}\n        .prefLineInteger label{display:block;width:100%}\n        .prefLineInteger input{float:right;}\n        .prefLineSlider {width:100%; margin-bottom:1vh;}\n        .prefLineSlider label{display:block;width:100%}\n        .prefLineSlider input{float:right;}\n        .newOption::before {content:"' + 
    g("new_since_version") + ' " attr(data-version)"!"; font-weight:bolder; color:#e65c00;}\n        .newOption{border:1px solid #ff9900; padding: 1px; box-shadow: 2px 3px #cc7a00;}\n        .svl_logo {width:130px; display:inline-block; float:right}\n        .svl_support-link{display:inline-block; width:100%; text-align:center;}\n        .svl_translationblock{display:inline-block; width:100%; text-align:center; font-size:x-small}\n        .svl_buttons{clear:both; position:sticky; padding: 1vh; background-color:#eee; top:0; }\n        .routingDiv{opacity: 0.95; font-size:1.2em; color:#ffffff; border:0.2em #000 solid; position:absolute; top:3em; right:3.7em; padding:0.5em; background-color:#b30000;}\n        .routingDiv:hover{background-color:#ff3377;}\n        #sidepanel-svl summary{font-weight:bold; margin:10px;}</style>';
    document.body.appendChild(a);
    a = document.createElement("div");
    var b = document.createElement("img");
    b.className = "svl_logo";
    b.src = "https://raw.githubusercontent.com/bedo2991/svl/master/logo.png";
    b.alt = g("svl_logo");
    a.appendChild(b);
    b = document.createElement("span");
    b.innerText = g("thanks_for_using");
    a.appendChild(b);
    b = document.createElement("h4");
    b.innerText = "Street Vector Layer";
    a.appendChild(b);
    b = document.createElement("span");
    b.innerText = g("version") + " 5.0.9";
    a.appendChild(b);
    b = document.createElement("a");
    b.innerText = g("something_not_working") + " " + g("report_it_here") + ".";
    b.href = GM_info.script.supportURL;
    b.target = "_blank";
    b.className = "svl_support-link";
    a.appendChild(b);
    b = document.createElement("div");
    b.className = "svl_translationblock";
    if (g("language_code") === I18n.currentLocale()) {
      var c = g("completition_percentage");
      "100%" === c ? b.innerText = g("fully_translated_in") + " " + g("translated_by") : b.innerHTML = c + " " + g("translation_thanks") + " " + g("translated_by") + '. <a href="https://www.waze.com/forum/viewtopic.php?f=819&t=149535&start=310#p2114167" target="_blank">' + g("would_you_like_to_help") + "</a>";
    } else {
      b.innerHTML = '<b style="color:red">Unfortunately, SVL is not yet available in your language. Would you like to help translating?<br><a href="https://www.waze.com/forum/viewtopic.php?f=819&t=149535&start=310#p2114167" target="_blank">Please contact bedo2991</a>.</b>';
    }
    a.appendChild(b);
    b = document.createElement("button");
    b.id = "svl_saveNewPref";
    b.type = "button";
    b.className = "btn disabled waze-icon-save";
    b.innerText = g("save");
    b.title = g("save_help");
    c = document.createElement("button");
    c.id = "svl_rollbackButton";
    c.type = "button";
    c.className = "btn btn-default disabled";
    c.innerText = g("rollback");
    c.title = g("rollback_help");
    var e = document.createElement("button");
    e.id = "svl_resetButton";
    e.type = "button";
    e.className = "btn btn-default";
    e.innerText = g("reset");
    e.title = g("reset_help");
    var f = document.createElement("div");
    f.className = "svl_buttons expand";
    f.appendChild(b);
    f.appendChild(c);
    f.appendChild(e);
    a.appendChild(f);
    var k = ca(g("roads_properties"), !0);
    k.appendChild(L({id:"realsize", title:g("use_reallife_width"), description:g("use_reallife_width_descr"), g:"5.0.0", }));
    k.appendChild(pi({id:"presets", title:g("road_themes_title"), description:g("road_themes_descr"), options:[{text:"", value:""}, {text:g("svl_standard_layer"), value:"svl_standard"}, {text:g("wme_colors_layer"), value:"wme_colors"}, ], g:"5.0.8", }));
    for (b = 0; b < d.streets.length; b += 1) {
      d.streets[b] && k.appendChild(R({f:b, c:!0, b:!1}));
    }
    f = ca(g("segments_decorations"));
    e = ca(g("rendering_parameters"));
    c = ca(g("performance_tuning"));
    b = ca(g("speed_limits"));
    Th().streets.forEach(function(n) {
      "red" !== n ? k.appendChild(R({f:n, c:!0, b:!1, })) : k.appendChild(R({f:n, c:!1, b:!1, }));
    });
    f.appendChild(R({f:"lanes", c:!1, b:!0, }));
    f.appendChild(R({f:"toll", c:!1, b:!0, }));
    f.appendChild(R({f:"restriction", c:!1, b:!0, }));
    f.appendChild(R({f:"closure", c:!1, b:!0, }));
    f.appendChild(R({f:"headlights", c:!1, b:!0, }));
    f.appendChild(R({f:"dirty", c:!1, b:!0, }));
    f.appendChild(R({f:"nearbyHOV", c:!1, b:!0, }));
    k.appendChild(f);
    k.appendChild(L({id:"showANs", title:g("show_ans"), description:g("show_ans_descr"), }));
    a.appendChild(k);
    e.appendChild(aa({id:"layerOpacity", title:g("layer_opacity"), description:g("layer_opacity_descr"), min:10, max:100, step:5, g:"5.0.6", }));
    e.appendChild(L({id:"routingModeEnabled", title:g("enable_routing_mode"), description:g("enable_routing_mode_descr"), }));
    e.appendChild(L({id:"hideRoutingModeBlock", title:g("hide_routing_mode_panel"), description:g("hide_routing_mode_panel_descr"), g:"5.0.9", }));
    e.appendChild(L({id:"showUnderGPSPoints", title:g("gps_layer_above_roads"), description:g("gps_layer_above_roads_descr"), }));
    k.appendChild(ua({id:"labelOutlineWidth", title:g("label_width"), description:g("label_width_descr"), min:0, max:10, step:1, }));
    e.appendChild(L({id:"disableRoadLayers", title:g("hide_road_layer"), description:g("hide_road_layer"), }));
    e.appendChild(L({id:"startDisabled", title:g("svl_initially_disabled"), description:g("svl_initially_disabled_descr"), }));
    e.appendChild(ua({id:"clutterConstant", title:g("street_names_density"), description:g("street_names_density_descr"), min:1, max:20, step:1, }));
    f = document.createElement("h5");
    f.innerText = "Close-zoom only";
    e.appendChild(f);
    e.appendChild(L({id:"renderGeomNodes", title:g("render_geometry_nodes"), description:g("render_geometry_nodes_descr"), }));
    e.appendChild(aa({id:"fakelock", title:g("render_as_level"), description:g("render_as_level_descr"), min:1, max:7, step:1, }));
    e.appendChild(ua({id:"closeZoomLabelSize", title:g("font_size_close"), description:g("font_size_close_descr"), min:8, max:32, step:1, }));
    e.appendChild(ua({id:"arrowDeclutter", title:g("limit_arrows"), description:g("limit_arrows_descr"), min:1, max:200, step:1, }));
    f = document.createElement("h5");
    f.innerText = g("far_zoom_only");
    e.appendChild(f);
    e.appendChild(ua({id:"farZoomLabelSize", title:g("font_size_far"), description:g("font_size_far_descr"), min:8, max:32, }));
    e.appendChild(L({id:"hideMinorRoads", title:g("hide_minor_roads"), description:g("hide_minor_roads_descr"), }));
    a.appendChild(e);
    e = ca(g("utilities"));
    e.appendChild(L({id:"autoReload_enabled", title:g("automatically_refresh"), description:g("automatically_refresh_descr"), }));
    e.appendChild(aa({id:"autoReload_interval", title:g("autoreload_interval"), description:g("autoreload_interval_descr"), min:20, max:3600, step:1, }));
    a.appendChild(e);
    c.appendChild(aa({id:"useWMERoadLayerAtZoom", title:g("stop_svl_at_zoom"), description:g("stop_svl_at_zoom_descr"), min:0, max:5, step:1, }));
    c.appendChild(aa({id:"switchZoom", title:g("close_zoom_until_level"), description:g("close_zoom_until_level_descr"), min:5, max:9, step:1, }));
    c.appendChild(aa({id:"segmentsThreshold", title:g("segments_threshold"), description:g("segments_threshold_descr"), min:1000, max:10000, step:100, g:"5.0.4", }));
    c.appendChild(aa({id:"nodesThreshold", title:g("nodes_threshold"), description:g("nodes_threshold_descr"), min:1000, max:10000, step:100, g:"5.0.4", }));
    a.appendChild(c);
    b.appendChild(L({id:"showSLtext", title:g("show_sl_on_name"), description:g("show_sl_on_name_descr"), }));
    b.appendChild(L({id:"showSLcolor", title:g("show_sl_with_colors"), description:g("show_sl_with_colors_descr"), }));
    b.appendChild(L({id:"showSLSinglecolor", title:g("show_sl_with_one_color"), description:g("show_sl_with_one_color_descr"), }));
    c = T({id:"SLColor", type:"color", className:"prefElement form-control", });
    b.appendChild(c);
    b.appendChild(L({id:"showDashedUnverifiedSL", title:g("show_unverified_dashed"), description:g("show_unverified_dashed_descr"), }));
    c = document.createElement("h6");
    c.innerText = Sh("speed limit");
    b.appendChild(c);
    c = "metric";
    b.appendChild(wa("Default", !0));
    for (e = 1; e < Object.keys(d.speeds[c]).length + 1; e += 1) {
      b.appendChild(wa(e, !0));
    }
    c = "imperial";
    b.appendChild(wa("Default", !1));
    for (e = 1; e < Object.keys(d.speeds[c]).length + 1; e += 1) {
      b.appendChild(wa(e, !1));
    }
    a.appendChild(b);
    b = document.createElement("h5");
    b.innerText = g("settings_backup");
    a.appendChild(b);
    b = document.createElement("div");
    b.className = "expand";
    c = document.createElement("button");
    c.id = "svl_exportButton";
    c.type = "button";
    c.innerText = g("export");
    c.className = "btn btn-default";
    e = document.createElement("button");
    e.id = "svl_importButton";
    e.type = "button";
    e.innerText = g("import");
    e.className = "btn btn-default";
    b.appendChild(e);
    b.appendChild(c);
    a.appendChild(b);
    new WazeWrap.Interface.Tab("SVL \ud83d\uddfa\ufe0f", a.innerHTML, ea);
    document.querySelectorAll(".prefElement").forEach(function(n) {
      n.addEventListener("change", Ph);
    });
    document.getElementById("svl_saveNewPref").addEventListener("click", ni);
    document.getElementById("svl_rollbackButton").addEventListener("click", li);
    document.getElementById("svl_resetButton").addEventListener("click", oi);
    document.getElementById("svl_importButton").addEventListener("click", t);
    document.getElementById("svl_exportButton").addEventListener("click", mi);
  }
  function Uh(a) {
    F.destroyFeatures(F.getFeaturesByAttribute("myid", a), {silent:!0});
  }
  function ri(a) {
    y("Removing " + a.length + " nodes");
    if (J.zoom <= d.useWMERoadLayerAtZoom) {
      y("Destroy all nodes"), F.destroyFeatures(F.features, {silent:!0});
    } else {
      if (P || a.length > d.nodesThreshold) {
        P || xa();
      } else {
        var b;
        for (b = 0; b < a.length; b += 1) {
          Uh(a[b].attributes.id);
        }
      }
    }
  }
  function Mh(a) {
    var b;
    return 1 === (null == (b = a.segIDs) ? void 0 : b.length) ? si : ti;
  }
  function ui(a) {
    y("Change nodes");
    a.forEach(function(b) {
      var c = b.attributes, e = F.getFeaturesByAttribute("myid", c.id)[0];
      e ? (e.style = Mh(c), e.move(new OpenLayers.LonLat(c.geometry.x, c.geometry.y))) : 0 < c.id && F.addFeatures([Lh(b)], {silent:!0});
    });
  }
  function vi(a) {
    y("Node state deleted");
    for (var b = 0; b < a.length; b += 1) {
      Uh(a[b].getID());
    }
  }
  function wi(a) {
    for (var b = 0; b < a.length; b += 1) {
      ya(a[b].getID());
    }
  }
  function Vh(a) {
    y("Adding " + a.length + " nodes");
    if (P || a.length > d.nodesThreshold) {
      P || xa();
    } else {
      if (J.zoom <= d.useWMERoadLayerAtZoom) {
        y("Not adding them because of the zoom");
      } else {
        for (var b = [], c = 0; c < a.length; c += 1) {
          void 0 !== a[c].attributes.geometry ? 0 < a[c].attributes.id && b.push(Lh(a[c])) : console.warn("[SVL] Geometry of node is undefined");
        }
        F.addFeatures(b, {silent:!0});
        return !0;
      }
    }
  }
  function V(a) {
    return !a.svl;
  }
  function Wh() {
    y("updateStatusBasedOnZoom running");
    var a = !0;
    P && (Object.keys(W.model.segments.objects).length < d.segmentsThreshold && Object.keys(W.model.nodes.objects).length < d.nodesThreshold ? (P = !1, N(1, !0), N(0, !1), ba()) : console.warn("[SVL] Still too many elements to draw: Segments: " + Object.keys(W.model.segments.objects).length + "/" + d.segmentsThreshold + ", Nodes: " + Object.keys(W.model.nodes.objects).length + "/" + d.nodesThreshold + " - You can change these thresholds in the preference panel."));
    J.zoom <= d.useWMERoadLayerAtZoom ? (y("Road layer automatically enabled because of zoom out"), !0 === A.visibility && (za = !0, N(0, !0), N(1, !1)), a = !1) : za && (y("Re-enabling SVL after zoom in"), N(1, !0), N(0, !1), za = !1);
    return a;
  }
  function xi() {
    clearTimeout(Xh);
    y("manageZoom clearing timer");
    Xh = setTimeout(Wh, 800);
  }
  function xa() {
    console.warn("[SVL] Abort drawing, too many elements");
    P = !0;
    N(0, !0);
    N(1, !1);
    m();
  }
  function Ia(a) {
    y("Adding " + a.length + " segments");
    if (P || a.length > d.segmentsThreshold) {
      P || xa();
    } else {
      if (J.zoom <= d.useWMERoadLayerAtZoom) {
        y("Not adding them because of the zoom");
      } else {
        Yh();
        var b = [];
        a.forEach(function(c) {
          null !== c && (b = b.concat(ii(c)));
        });
        0 < b.length ? (y(b.length + " features added to the street layer"), A.addFeatures(b, {silent:!0})) : console.warn("[SVL] no features drawn");
        Zh();
      }
    }
  }
  function ya(a) {
    y("RemoveSegmentById: " + a);
    A.destroyFeatures(A.getFeaturesByAttribute("myId", a), {silent:!0});
    B.destroyFeatures(B.getFeaturesByAttribute("myId", a), {silent:!0});
  }
  function yi(a) {
    y("Edit " + a.length + " segments");
    a.forEach(function(b) {
      var c = b.getOldID();
      c && ya(parseInt(c, 10));
      ya(b.getID());
      "Delete" !== b.state && Ia([b]);
    });
  }
  function zi(a) {
    y("Removing " + a.length + " segments");
    J.zoom <= d.useWMERoadLayerAtZoom ? (y("Destroy all segments and labels because of zoom out"), A.destroyFeatures(A.features, {silent:!0, }), B.destroyFeatures(B.features, {silent:!0})) : P || a.length > d.segmentsThreshold ? P || xa() : (Yh(), a.forEach(function(b) {
      ya(b.attributes.id);
    }), Zh());
  }
  function $h(a) {
    y("ManageVisibilityChanged", a);
    F.setVisibility(a.object.visibility);
    B.setVisibility(a.object.visibility);
    a.object.visibility ? (y("enabled: registering events"), a = W.model.segments._events, "object" === typeof a && (a.objectsadded.push({context:A, callback:Ia, svl:!0, }), a.objectschanged.push({context:A, callback:yi, svl:!0, }), a.objectsremoved.push({context:A, callback:zi, svl:!0, }), a["objects-state-deleted"].push({context:A, callback:wi, svl:!0, })), y("SVL: Registering node events"), a = W.model.nodes._events, "object" === typeof a && (a.objectsremoved.push({context:F, callback:ri, svl:!0, 
    }), a.objectsadded.push({context:F, callback:Vh, svl:!0, }), a.objectschanged.push({context:F, callback:ui, svl:!0, }), a["objects-state-deleted"].push({context:F, callback:vi, svl:!0, })), !0 === Wh() && ba()) : (y("disabled: unregistering events"), y("SVL: Removing segments events"), a = W.model.segments._events, "object" === typeof a && (a.objectsadded = a.objectsadded.filter(V), a.objectschanged = a.objectschanged.filter(V), a.objectsremoved = a.objectsremoved.filter(V), a["objects-state-deleted"] = 
    a["objects-state-deleted"].filter(V)), y("SVL: Removing node events"), a = W.model.nodes._events, "object" === typeof a && (a.objectsremoved = a.objectsremoved.filter(V), a.objectsadded = a.objectsadded.filter(V), a.objectschanged = a.objectschanged.filter(V), a["objects-state-deleted"] = a["objects-state-deleted"].filter(V)), m());
  }
  function ai(a) {
    a = void 0 === a ? 1 : a;
    30 < a ? console.error("SVL: could not initialize WazeWrap") : WazeWrap && WazeWrap.Ready && WazeWrap.Interface && WazeWrap.Alerts ? Ai() : (console.log("SVL: WazeWrap not ready, retrying in 800ms"), setTimeout(function() {
      ai(a + 1);
    }, 800));
  }
  function Ai() {
    console.log("SVL: initializing WazeWrap");
    try {
      (new WazeWrap.Interface.Shortcut("SVLToggleLayer", "Toggle SVL", "svl", "Street Vector Layer", "A+l", function() {
        N(1, !A.visibility);
      }, null)).add(), console.log("SVL: Keyboard shortcut successfully added.");
    } catch (a) {
      console.error("SVL: Error while adding the keyboard shortcut:"), console.error(a);
    }
    try {
      WazeWrap.Interface.AddLayerCheckbox("road", "Street Vector Layer", !0, function(a) {
        A.setVisibility(a);
      }, A);
    } catch (a) {
      console.error("SVL: could not add layer checkbox");
    }
    d.startDisabled && N(1, !1);
    qi();
    WazeWrap.Interface.ShowScriptUpdate("Street Vector Layer", "5.0.9", "<b>" + g("whats_new") + "</b>\n      <br>- 5.0.9: Added an option to hide the routing panel - Code refactoring, bug fixes\n      <br>- 5.0.8: Styles preset. Switch to the WME standard colors, if you like.\n      <br>- 5.0.7: New options are highlighted in the preference panel\n      <br>- 5.0.6: Fixed a bug that was showing metric colors for speed limits while in imperial mode\n      <br>- 5.0.5: Added a global Layer Opacity setting", 
    "", GM_info.script.supportURL);
  }
  function g(a) {
    var b = Ja[a];
    if ("undefined" === typeof b) {
      return console.error("[SVL] Invalid translation key: " + a), "<invalid translation key>";
    }
    a = I18n.currentLocale();
    return X[a] && X[a][b] && "" !== X[a][b] ? X[a][b] : X.en[b];
  }
  function Bi() {
    console.debug("Loading translations...");
    fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vRjug3umcYtdN9iVQc2SAqfK03o6HvozEEoxBrdg_Xf73Dt6TuApRCmT_V6UIIkMyVjRjKydl9CP8qE/pub?gid=565129786&single=true&output=tsv").then(function(a) {
      if (a.ok && 200 === a.status) {
        return a.text();
      }
    }).then(function(a) {
      a = Q(a.split("\n").entries());
      for (var b = a.next(); !b.done; b = a.next()) {
        var c = Q(b.value);
        b = c.next().value;
        c = c.next().value;
        if (0 < b) {
          c = Q(c.split("\t")), b = c.next().value, c = La(c), X[b] = c.map(function(f) {
            return f.trim();
          });
        } else {
          b = Q(c.split("\t"));
          b.next();
          b = La(b);
          b = Q(b.entries());
          for (c = b.next(); !c.done; c = b.next()) {
            var e = Q(c.value);
            c = e.next().value;
            e = e.next().value;
            Ja[e.trim()] = c;
          }
          console.dir(Ja);
        }
      }
      console.dir(X);
    });
  }
  function bi(a) {
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
          bi(b);
        }, 500);
        return;
      }
      console.error(e);
      x("error", g("init_error"));
      return;
    }
    J = W.map.getOLMap();
    d = null;
    OpenLayers.Renderer.symbol.myTriangle = [-2, 0, 2, 0, 0, -6, -2, 0];
    !1 === Ba() && x("info", g("first_time") + "\n\n          " + g("some_info") + "\n          " + g("default_shortcut_instruction") + "\n          " + g("instructions_1") + "\n          " + g("instructions_2") + "\n          " + g("instructions_3") + "\n          " + g("instructions_4"));
    a = new OpenLayers.StyleMap({pointerEvents:"none", strokeColor:"${color}", strokeWidth:"${width}", strokeOpacity:"${opacity}", strokeDashstyle:"${dash}", graphicZIndex:"${zIndex}", });
    var c = new OpenLayers.StyleMap({fontFamily:"Rubik, Open Sans, Alef, helvetica, sans-serif", fontWeight:"800", fontColor:"${color}", labelOutlineColor:"${outlinecolor}", labelOutlineWidth:"${outlinewidth}", label:"${label}", visibility:!d.startDisabled, angle:"${angle}", pointerEvents:"none", labelAlign:"cm", });
    A = new OpenLayers.Layer.Vector("Street Vector Layer", {styleMap:a, uniqueName:"vectorStreet", accelerator:"toggle" + "Street Vector Layer".replace(/\s+/g, ""), visibility:!d.startDisabled, isVector:!0, attribution:g("svl_version") + " 5.0.9", rendererOptions:{zIndexing:!0, }, });
    A.renderer.drawFeature = function(e, f) {
      null == f && (f = e.style);
      if (e.geometry) {
        var k = I();
        2 > J.zoom || e.attributes.a && k || e.attributes.s && !k ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(A.renderer.extent) ? (A.renderer.featureDx = 0, f.pointerEvents = "none", k || !e.attributes.i && d.realsize && (f.strokeWidth /= J.resolution)) : f = {display:"none"};
        return A.renderer.drawGeometry(e.geometry, f, e.id);
      }
    };
    F = new OpenLayers.Layer.Vector("Nodes Vector", {uniqueName:"vectorNodes", visibility:!d.startDisabled, });
    F.renderer.drawFeature = function(e, f) {
      if (2 > J.zoom) {
        return f = {display:"none"}, F.renderer.drawGeometry(e.geometry, f, e.id);
      }
      null == f && (f = e.style);
      f = OpenLayers.Util.extend({}, f);
      if (e.geometry) {
        return I() ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(F.renderer.extent) ? (F.renderer.featureDx = 0, d.realsize && (f.pointRadius /= J.resolution)) : f = {display:"none"}, F.renderer.drawGeometry(e.geometry, f, e.id);
      }
    };
    B = new OpenLayers.Layer.Vector("Labels Vector", {uniqueName:"vectorLabels", styleMap:c, visibility:!d.startDisabled, });
    B.renderer.drawFeature = function(e, f) {
      var k = J.zoom;
      if (2 > k) {
        return !1;
      }
      null == f && (f = e.style);
      if (e.geometry) {
        var n = I();
        7 - e.attributes.v > k || e.attributes.a && n || e.attributes.s && !n ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(B.renderer.extent) ? (B.renderer.featureDx = 0, f.pointerEvents = "none", f.fontSize = n ? d.farZoomLabelSize : d.closeZoomLabelSize) : f = {display:"none"};
        k = B.renderer.drawGeometry(e.geometry, f, e.id);
        "none" !== f.display && f.label && !1 !== k ? (n = e.geometry.getCentroid(), B.renderer.drawText(e.id, f, n)) : B.renderer.removeText(e.id);
        return k;
      }
    };
    B.renderer.drawText = function(e, f, k) {
      var n = !!f.labelOutlineWidth;
      if (n) {
        var h = OpenLayers.Util.extend({}, f);
        h.fontColor = h.labelOutlineColor;
        h.fontStrokeColor = h.labelOutlineColor;
        h.fontStrokeWidth = f.labelOutlineWidth;
        f.labelOutlineOpacity && (h.fontOpacity = f.labelOutlineOpacity);
        delete h.labelOutlineWidth;
        B.renderer.drawText(e, h, k);
      }
      var r = B.renderer.getResolution();
      h = (k.x - B.renderer.featureDx) / r + B.renderer.left;
      var v = k.y / r - B.renderer.top;
      n = n ? B.renderer.LABEL_OUTLINE_SUFFIX : B.renderer.LABEL_ID_SUFFIX;
      r = B.renderer.nodeFactory(e + n, "text");
      r.setAttributeNS(null, "x", h);
      r.setAttributeNS(null, "y", -v);
      (f.angle || 0 === f.angle) && r.setAttributeNS(null, "transform", "rotate(" + f.angle + "," + h + "," + -v + ")");
      f.fontFamily && r.setAttributeNS(null, "font-family", f.fontFamily);
      f.fontWeight && r.setAttributeNS(null, "font-weight", f.fontWeight);
      f.fontSize && r.setAttributeNS(null, "font-size", f.fontSize);
      f.fontColor && r.setAttributeNS(null, "fill", f.fontColor);
      f.fontStrokeColor && r.setAttributeNS(null, "stroke", f.fontStrokeColor);
      f.fontStrokeWidth && r.setAttributeNS(null, "stroke-width", f.fontStrokeWidth);
      r.setAttributeNS(null, "pointer-events", "none");
      var q;
      v = null != (q = f.labelAlign) ? q : OpenLayers.Renderer.defaultSymbolizer.labelAlign;
      var z;
      r.setAttributeNS(null, "text-anchor", null != (z = OpenLayers.Renderer.SVG.LABEL_ALIGN[v[0]]) ? z : "middle");
      if (!0 === OpenLayers.IS_GECKO) {
        var w;
        r.setAttributeNS(null, "dominant-baseline", null != (w = OpenLayers.Renderer.SVG.LABEL_ALIGN[v[1]]) ? w : "central");
      }
      q = f.label.split("\n");
      for (z = q.length; r.childNodes.length > z;) {
        r.removeChild(r.lastChild);
      }
      for (w = 0; w < z; w += 1) {
        var l = B.renderer.nodeFactory(e + n + "_tspan_" + w, "tspan");
        !0 === f.labelSelect && (l.C = e, l.D = k, l.F = k.B);
        if (!1 === OpenLayers.IS_GECKO) {
          var D = void 0;
          l.setAttributeNS(null, "baseline-shift", null != (D = OpenLayers.Renderer.SVG.LABEL_VSHIFT[v[1]]) ? D : "-35%");
        }
        l.setAttribute("x", h);
        0 === w ? (D = OpenLayers.Renderer.SVG.LABEL_VFACTOR[v[1]], null == D && (D = -.5), l.setAttribute("dy", D * (z - 1) + "em")) : l.setAttribute("dy", "1em");
        l.textContent = "" === q[w] ? " " : q[w];
        l.parentNode || r.appendChild(l);
      }
      r.parentNode || B.renderer.textRoot.appendChild(r);
    };
    da(d);
    J.addLayer(A);
    J.addLayer(B);
    J.addLayer(F);
    "true" === window.localStorage.getItem("svlDebugOn") && (document.sv = A, document.lv = B, document.nv = F, document.svl_pref = d);
    a = J.getLayersBy("uniqueName", "roads");
    fa = null;
    1 === a.length && (fa = Q(a).next().value);
    za = !1;
    d.showUnderGPSPoints && Nh();
    Ga();
    Oh();
    J.events.register("zoomend", null, xi, !0);
    ai();
    J.zoom <= d.useWMERoadLayerAtZoom ? N(0, !0) : fa.getVisibility() && d.disableRoadLayers && (N(0, !1), console.log("SVL: WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel."));
    A.events.register("visibilitychanged", A, $h);
    $h({object:A, });
    $(".olControlAttribution").click(function() {
      x("info", g("preferences_moved"));
    });
    a = W.prefs._events;
    "object" === typeof a && a["change:isImperial"].push({callback:ba, });
    console.log("[SVL] v. 5.0.9 initialized correctly.");
  }
  function ba() {
    y("DrawAllSegments");
    m();
    Ia(Object.values(W.model.segments.objects));
    Vh(Object.values(W.model.nodes.objects));
  }
  function da(a) {
    O = [];
    for (var b = 0; b < a.streets.length; b += 1) {
      if (a.streets[b]) {
        var c = a.streets[b].strokeColor;
        O[b] = {strokeColor:a.streets[b].strokeColor, strokeWidth:a.streets[b].strokeWidth, strokeDashstyle:a.streets[b].strokeDashstyle, outlineColor:127 > 0.299 * parseInt(c.substring(1, 3), 16) + 0.587 * parseInt(c.substring(3, 5), 16) + 0.114 * parseInt(c.substring(5, 7), 16) ? "#FFF" : "#000", };
      }
    }
    Gh = a.clutterConstant;
    A.setOpacity(d.layerOpacity);
    Ga();
    ba();
  }
  function ci(a) {
    a = void 0 === a ? 0 : a;
    0 === a && Bi();
    if (void 0 !== W && void 0 !== W.map && 1 < Object.keys(X).length) {
      bi();
    } else {
      console.log("SVL not ready to start, retrying in 600ms");
      var b = a + 1;
      20 > b ? setTimeout(function() {
        ci(b);
      }, 600) : (a = g("bootstrap_error")) && "<invalid translation key>" !== a ? x("error", a) : x("error", "Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!");
    }
  }
  var Ka = "true" === window.localStorage.getItem("svlDebugOn"), y = Ka ? function(a) {
    for (var b = [], c = 0; c < arguments.length; ++c) {
      b[c] = arguments[c];
    }
    for (c = 0; c < b.length; c += 1) {
      "string" === typeof b[c] ? console.log("[SVL] 5.0.9: " + b[c]) : console.dir(b[c]);
    }
  } : function() {
  }, Yh = Ka ? console.group : function() {
  }, Zh = Ka ? console.groupEnd : function() {
  }, Ha = null, Gh, O = [], A, F, B, P = !1, d, fa, za, J, va = {ROAD_LAYER:null, SVL_LAYER:null, }, hi = "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079".split(""), Jh = {strokeColor:"#F53BFF", strokeWidth:3, strokeDashstyle:"solid", }, Ea = {strokeColor:"#111111", strokeWidth:1, strokeDashstyle:"dash", strokeOpacity:0.6, }, ti = {stroke:!1, fillColor:"#0015FF", fillOpacity:0.9, pointRadius:3, pointerEvents:"none", }, si = {stroke:!1, fillColor:"#C31CFF", fillOpacity:0.9, pointRadius:3, 
  pointerEvents:"none", }, ji = {graphicName:"x", strokeColor:"#f00", strokeWidth:1.5, fillColor:"#FFFF40", fillOpacity:0.7, pointRadius:7, pointerEvents:"none", }, ki = {stroke:!1, fillColor:"#000", fillOpacity:0.5, pointRadius:3.5, graphicZIndex:179, pointerEvents:"none", }, Ih = {strokeColor:"#000", strokeDashstyle:"solid", }, Kh = {strokeColor:"#C90", strokeDashstyle:"longdash", }, Fa = {strokeColor:"#fff", strokeOpacity:0.8, strokeDashstyle:"longdash", }, Pa = {1:5.0, 2:5.5, 3:22.5, 4:6.0, 5:2.0, 
  6:10.0, 7:9.0, 8:4.0, 10:2.0, 15:8.0, 16:2.0, 17:5.0, 18:6.0, 19:5.0, 20:5.0, 22:3.0, }, Qh = {svl_standard:{streets:[null, {strokeColor:"#FFFFFF", strokeWidth:10, strokeDashstyle:"solid", }, {strokeColor:"#CBA12E", strokeWidth:12, strokeDashstyle:"solid", }, {strokeColor:"#387FB8", strokeWidth:18, strokeDashstyle:"solid", }, {strokeColor:"#3FC91C", strokeWidth:11, strokeDashstyle:"solid", }, {strokeColor:"#00FF00", strokeWidth:5, strokeDashstyle:"dash", }, {strokeColor:"#C13040", strokeWidth:16, 
  strokeDashstyle:"solid", }, {strokeColor:"#ECE589", strokeWidth:14, strokeDashstyle:"solid", }, {strokeColor:"#82614A", strokeWidth:7, strokeDashstyle:"solid", }, null, {strokeColor:"#0000FF", strokeWidth:5, strokeDashstyle:"dash", }, null, null, null, null, {strokeColor:"#FF8000", strokeWidth:5, strokeDashstyle:"dashdot", }, {strokeColor:"#B700FF", strokeWidth:5, strokeDashstyle:"dash", }, {strokeColor:"#00FFB3", strokeWidth:7, strokeDashstyle:"solid", }, {strokeColor:"#FFFFFF", strokeWidth:8, 
  strokeDashstyle:"dash", }, {strokeColor:"#00FF00", strokeWidth:5, strokeDashstyle:"dashdot", }, {strokeColor:"#2282AB", strokeWidth:9, strokeDashstyle:"solid", }, null, {strokeColor:"#C6C7FF", strokeWidth:6, strokeDashstyle:"solid", }, ], }, wme_colors:{streets:[null, {strokeColor:"#FFFFDD", strokeWidth:10, strokeDashstyle:"solid", }, {strokeColor:"#FDFAA7", strokeWidth:12, strokeDashstyle:"solid", }, {strokeColor:"#6870C3", strokeWidth:18, strokeDashstyle:"solid", }, {strokeColor:"#B3BFB3", strokeWidth:11, 
  strokeDashstyle:"solid", }, {strokeColor:"#00FF00", strokeWidth:5, strokeDashstyle:"dash", }, {strokeColor:"#469FBB", strokeWidth:16, strokeDashstyle:"solid", }, {strokeColor:"#69BF88", strokeWidth:14, strokeDashstyle:"solid", }, {strokeColor:"#867342", strokeWidth:7, strokeDashstyle:"solid", }, null, {strokeColor:"#9A9A9A", strokeWidth:5, strokeDashstyle:"dash", }, null, null, null, null, {strokeColor:"#6FB6BE", strokeWidth:5, strokeDashstyle:"dashdot", }, {strokeColor:"#9A9A9A", strokeWidth:5, 
  strokeDashstyle:"dash", }, {strokeColor:"#BEBA6C", strokeWidth:7, strokeDashstyle:"solid", }, {strokeColor:"#D8D8F9", strokeWidth:8, strokeDashstyle:"dash", }, {strokeColor:"#222222", strokeWidth:5, strokeDashstyle:"dashdot", }, {strokeColor:"#ABABAB", strokeWidth:9, strokeDashstyle:"solid", }, null, {strokeColor:"#64799A", strokeWidth:6, strokeDashstyle:"solid", }, ], }, }, Xh = null, X = [], Ja = [];
  ci();
})();

