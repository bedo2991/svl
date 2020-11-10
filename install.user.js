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
function Lh(k) {
  k = ["object" == typeof globalThis && globalThis, k, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global, ];
  for (var n = 0; n < k.length; ++n) {
    var r = k[n];
    if (r && r.Math == Math) {
      return r;
    }
  }
  throw Error("Cannot find global object");
}
var Mh = Lh(this);
function Q(k, n) {
  if (n) {
    a: {
      var r = Mh;
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
    this.o = H;
    Ga(this, "description", {configurable:!0, writable:!0, value:R});
  }
  if (k) {
    return k;
  }
  r.prototype.toString = function() {
    return this.o;
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
    var w = Mh[n[r]];
    "function" === typeof w && "function" != typeof w.prototype[k] && Ga(w.prototype, k, {configurable:!0, writable:!0, value:function() {
      return Nh(xa(this));
    }});
  }
  return k;
});
function Nh(k) {
  k = {next:k};
  k[Symbol.iterator] = function() {
    return this;
  };
  return k;
}
function Oh(k, n) {
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
    return Oh(this, function(n) {
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
    C.destroyFeatures();
    A.destroyFeatures();
    E.destroyFeatures();
  }
  function n() {
    x("resetting preferences");
    x("saveDefaultPreferences");
    V(!0);
    X(d);
    Y();
    w("success", "Preferences have been reset to the default values");
  }
  function r() {
    WazeWrap.Alerts.prompt(GM_info.script.name, "N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!\n\nPaste your string here:", "", Ph, null);
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
    1 === b ? (x("Changing SVL Layer visibility to " + c), C.setVisibility(c)) : Z ? (x("Changing Road Layer visibility to " + c), Z.setVisibility(c)) : console.warn("SVL: cannot toggle the WME's road layer");
    if (!ra[b] && (x("Initialising layer " + b), ra[b] = document.getElementById(1 === b ? "layer-switcher-item_street_vector_layer" : "layer-switcher-item_road"), !ra[b])) {
      console.warn("SVL: cannot find checkbox for layer number " + b);
      return;
    }
    ra[b].checked = c;
  }
  function ya(b, c) {
    c = void 0 === c ? !0 : c;
    x("savePreferences");
    b.version = "5.0.0";
    try {
      window.localStorage.setItem("svl", JSON.stringify(b)), c || w("success", "Preferences saved!");
    } catch (a) {
      console.error(a), w("error", "Could not save the preferences, your browser local storage seems to be full.");
    }
  }
  function Qh(b) {
    var c = b.v, a = b.u;
    b = b.B;
    return d.realsize ? c ? b ? c : 0.6 * c : b ? Ha[a] : 0.6 * Ha[a] : parseInt(O[a].strokeWidth, 10);
  }
  function V(b) {
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
    var B, F, D, t, G;
    d.fakelock = null != (G = null != (t = null == (B = a) ? void 0 : B.fakelock) ? t : null == (F = WazeWrap) ? void 0 : null == (D = F.User) ? void 0 : D.Rank()) ? G : 6;
    var K, S;
    d.hideMinorRoads = null != (S = null == (K = a) ? void 0 : K.hideMinorRoads) ? S : !0;
    var J, z;
    d.showDashedUnverifiedSL = null != (z = null == (J = a) ? void 0 : J.showDashedUnverifiedSL) ? z : !0;
    var U, aa;
    d.showSLcolor = null != (aa = null == (U = a) ? void 0 : U.showSLcolor) ? aa : !0;
    var ba, ca;
    d.showSLtext = null != (ca = null == (ba = a) ? void 0 : ba.showSLtext) ? ca : !0;
    var da, ea;
    d.disableRoadLayers = null != (ea = null == (da = a) ? void 0 : da.disableRoadLayers) ? ea : !0;
    var fa, ha;
    d.startDisabled = null != (ha = null == (fa = a) ? void 0 : fa.startDisabled) ? ha : !1;
    var ia, ja;
    d.clutterConstant = null != (ja = null == (ia = a) ? void 0 : ia.clutterConstant) ? ja : 7;
    var ka, la;
    d.labelOutlineWidth = null != (la = null == (ka = a) ? void 0 : ka.labelOutlineWidth) ? la : 3;
    var ma, Ia;
    d.closeZoomLabelSize = null != (Ia = null == (ma = a) ? void 0 : ma.closeZoomLabelSize) ? Ia : 14;
    var Ja, Ka;
    d.farZoomLabelSize = null != (Ka = null == (Ja = a) ? void 0 : Ja.farZoomLabelSize) ? Ka : 12;
    var La, Ma;
    d.useWMERoadLayerAtZoom = null != (Ma = null == (La = a) ? void 0 : La.useWMERoadLayerAtZoom) ? Ma : 1;
    var Na, Oa;
    d.switchZoom = null != (Oa = null == (Na = a) ? void 0 : Na.switchZoom) ? Oa : 5;
    var Pa, Qa;
    d.arrowDeclutter = null != (Qa = null == (Pa = a) ? void 0 : Pa.arrowDeclutter) ? Qa : 140;
    var Ra, Sa;
    d.showUnderGPSPoints = null != (Sa = null == (Ra = a) ? void 0 : Ra.showUnderGPSPoints) ? Sa : !1;
    var Ta, Ua;
    d.routingModeEnabled = null != (Ua = null == (Ta = a) ? void 0 : Ta.routingModeEnabled) ? Ua : !1;
    var Va, Wa;
    d.realsize = null != (Wa = null == (Va = a) ? void 0 : Va.realsize) ? Wa : !0;
    var Xa, Ya;
    d.showANs = null != (Ya = null == (Xa = a) ? void 0 : Xa.showANs) ? Ya : !1;
    var Za, $a;
    d.renderGeomNodes = null != ($a = null == (Za = a) ? void 0 : Za.renderGeomNodes) ? $a : !1;
    d.streets = [];
    var ab, bb, cb, db, eb, fb, gb, hb, ib;
    d.streets[1] = {strokeColor:null != (gb = null == (ab = a) ? void 0 : null == (bb = ab.streets[1]) ? void 0 : bb.strokeColor) ? gb : "#FFFFFF", strokeWidth:null != (hb = null == (cb = a) ? void 0 : null == (db = cb.streets[1]) ? void 0 : db.strokeWidth) ? hb : 10, strokeDashstyle:null != (ib = null == (eb = a) ? void 0 : null == (fb = eb.streets[1]) ? void 0 : fb.strokeDashstyle) ? ib : "solid", };
    var jb, kb, lb, mb, nb, ob, pb, qb, rb;
    d.streets[20] = {strokeColor:null != (pb = null == (jb = a) ? void 0 : null == (kb = jb.streets[20]) ? void 0 : kb.strokeColor) ? pb : "#2282ab", strokeWidth:null != (qb = null == (lb = a) ? void 0 : null == (mb = lb.streets[20]) ? void 0 : mb.strokeWidth) ? qb : 9, strokeDashstyle:null != (rb = null == (nb = a) ? void 0 : null == (ob = nb.streets[20]) ? void 0 : ob.strokeDashstyle) ? rb : "solid", };
    var sb, tb, ub, vb, wb, xb, yb, zb, Ab;
    d.streets[4] = {strokeColor:null != (yb = null == (sb = a) ? void 0 : null == (tb = sb.streets[4]) ? void 0 : tb.strokeColor) ? yb : "#3FC91C", strokeWidth:null != (zb = null == (ub = a) ? void 0 : null == (vb = ub.streets[4]) ? void 0 : vb.strokeWidth) ? zb : 11, strokeDashstyle:null != (Ab = null == (wb = a) ? void 0 : null == (xb = wb.streets[4]) ? void 0 : xb.strokeDashstyle) ? Ab : "solid", };
    var Bb, Cb, Db, Eb, Fb, Gb, Hb, Ib, Jb;
    d.streets[3] = {strokeColor:null != (Hb = null == (Bb = a) ? void 0 : null == (Cb = Bb.streets[3]) ? void 0 : Cb.strokeColor) ? Hb : "#387FB8", strokeWidth:null != (Ib = null == (Db = a) ? void 0 : null == (Eb = Db.streets[3]) ? void 0 : Eb.strokeWidth) ? Ib : 18, strokeDashstyle:null != (Jb = null == (Fb = a) ? void 0 : null == (Gb = Fb.streets[3]) ? void 0 : Gb.strokeDashstyle) ? Jb : "solid", };
    var Kb, Lb, Mb, Nb, Ob, Pb, Qb, Rb, Sb;
    d.streets[7] = {strokeColor:null != (Qb = null == (Kb = a) ? void 0 : null == (Lb = Kb.streets[7]) ? void 0 : Lb.strokeColor) ? Qb : "#ECE589", strokeWidth:null != (Rb = null == (Mb = a) ? void 0 : null == (Nb = Mb.streets[7]) ? void 0 : Nb.strokeWidth) ? Rb : 14, strokeDashstyle:null != (Sb = null == (Ob = a) ? void 0 : null == (Pb = Ob.streets[7]) ? void 0 : Pb.strokeDashstyle) ? Sb : "solid", };
    var Tb, Ub, Vb, Wb, Xb, Yb, Zb, $b, ac;
    d.streets[6] = {strokeColor:null != (Zb = null == (Tb = a) ? void 0 : null == (Ub = Tb.streets[6]) ? void 0 : Ub.strokeColor) ? Zb : "#C13040", strokeWidth:null != ($b = null == (Vb = a) ? void 0 : null == (Wb = Vb.streets[6]) ? void 0 : Wb.strokeWidth) ? $b : 16, strokeDashstyle:null != (ac = null == (Xb = a) ? void 0 : null == (Yb = Xb.streets[6]) ? void 0 : Yb.strokeDashstyle) ? ac : "solid", };
    var bc, cc, dc, ec, fc, gc, hc, ic, jc;
    d.streets[16] = {strokeColor:null != (hc = null == (bc = a) ? void 0 : null == (cc = bc.streets[16]) ? void 0 : cc.strokeColor) ? hc : "#B700FF", strokeWidth:null != (ic = null == (dc = a) ? void 0 : null == (ec = dc.streets[16]) ? void 0 : ec.strokeWidth) ? ic : 5, strokeDashstyle:null != (jc = null == (fc = a) ? void 0 : null == (gc = fc.streets[16]) ? void 0 : gc.strokeDashstyle) ? jc : "dash", };
    var kc, lc, mc, nc, oc, pc, qc, rc, sc;
    d.streets[5] = {strokeColor:null != (qc = null == (kc = a) ? void 0 : null == (lc = kc.streets[5]) ? void 0 : lc.strokeColor) ? qc : "#00FF00", strokeWidth:null != (rc = null == (mc = a) ? void 0 : null == (nc = mc.streets[5]) ? void 0 : nc.strokeWidth) ? rc : 5, strokeDashstyle:null != (sc = null == (oc = a) ? void 0 : null == (pc = oc.streets[5]) ? void 0 : pc.strokeDashstyle) ? sc : "dash", };
    var tc, uc, vc, wc, xc, yc, zc, Ac, Bc;
    d.streets[8] = {strokeColor:null != (zc = null == (tc = a) ? void 0 : null == (uc = tc.streets[8]) ? void 0 : uc.strokeColor) ? zc : "#82614A", strokeWidth:null != (Ac = null == (vc = a) ? void 0 : null == (wc = vc.streets[8]) ? void 0 : wc.strokeWidth) ? Ac : 7, strokeDashstyle:null != (Bc = null == (xc = a) ? void 0 : null == (yc = xc.streets[8]) ? void 0 : yc.strokeDashstyle) ? Bc : "solid", };
    var Cc, Dc, Ec, Fc, Gc, Hc, Ic, Jc, Kc;
    d.streets[15] = {strokeColor:null != (Ic = null == (Cc = a) ? void 0 : null == (Dc = Cc.streets[15]) ? void 0 : Dc.strokeColor) ? Ic : "#FF8000", strokeWidth:null != (Jc = null == (Ec = a) ? void 0 : null == (Fc = Ec.streets[15]) ? void 0 : Fc.strokeWidth) ? Jc : 5, strokeDashstyle:null != (Kc = null == (Gc = a) ? void 0 : null == (Hc = Gc.streets[15]) ? void 0 : Hc.strokeDashstyle) ? Kc : "dashdot", };
    var Lc, Mc, Nc, Oc, Pc, Qc, Rc, Sc, Tc;
    d.streets[18] = {strokeColor:null != (Rc = null == (Lc = a) ? void 0 : null == (Mc = Lc.streets[18]) ? void 0 : Mc.strokeColor) ? Rc : "#FFFFFF", strokeWidth:null != (Sc = null == (Nc = a) ? void 0 : null == (Oc = Nc.streets[18]) ? void 0 : Oc.strokeWidth) ? Sc : 8, strokeDashstyle:null != (Tc = null == (Pc = a) ? void 0 : null == (Qc = Pc.streets[18]) ? void 0 : Qc.strokeDashstyle) ? Tc : "dash", };
    var Uc, Vc, Wc, Xc, Yc, Zc, $c, ad, bd;
    d.streets[17] = {strokeColor:null != ($c = null == (Uc = a) ? void 0 : null == (Vc = Uc.streets[17]) ? void 0 : Vc.strokeColor) ? $c : "#00FFB3", strokeWidth:null != (ad = null == (Wc = a) ? void 0 : null == (Xc = Wc.streets[17]) ? void 0 : Xc.strokeWidth) ? ad : 7, strokeDashstyle:null != (bd = null == (Yc = a) ? void 0 : null == (Zc = Yc.streets[17]) ? void 0 : Zc.strokeDashstyle) ? bd : "solid", };
    var cd, dd, ed, fd, gd, hd, id, jd, kd;
    d.streets[22] = {strokeColor:null != (id = null == (cd = a) ? void 0 : null == (dd = cd.streets[22]) ? void 0 : dd.strokeColor) ? id : "#C6C7FF", strokeWidth:null != (jd = null == (ed = a) ? void 0 : null == (fd = ed.streets[22]) ? void 0 : fd.strokeWidth) ? jd : 6, strokeDashstyle:null != (kd = null == (gd = a) ? void 0 : null == (hd = gd.streets[22]) ? void 0 : hd.strokeDashstyle) ? kd : "solid", };
    var ld, md, nd, od, pd, qd, rd, sd, td;
    d.streets[19] = {strokeColor:null != (rd = null == (ld = a) ? void 0 : null == (md = ld.streets[19]) ? void 0 : md.strokeColor) ? rd : "#00FF00", strokeWidth:null != (sd = null == (nd = a) ? void 0 : null == (od = nd.streets[19]) ? void 0 : od.strokeWidth) ? sd : 5, strokeDashstyle:null != (td = null == (pd = a) ? void 0 : null == (qd = pd.streets[19]) ? void 0 : qd.strokeDashstyle) ? td : "dashdot", };
    var ud, vd, wd, xd, yd, zd, Ad, Bd, Cd;
    d.streets[2] = {strokeColor:null != (Ad = null == (ud = a) ? void 0 : null == (vd = ud.streets[2]) ? void 0 : vd.strokeColor) ? Ad : "#CBA12E", strokeWidth:null != (Bd = null == (wd = a) ? void 0 : null == (xd = wd.streets[2]) ? void 0 : xd.strokeWidth) ? Bd : 12, strokeDashstyle:null != (Cd = null == (yd = a) ? void 0 : null == (zd = yd.streets[2]) ? void 0 : zd.strokeDashstyle) ? Cd : "solid", };
    var Dd, Ed, Fd, Gd, Hd, Id, Jd, Kd, Ld;
    d.streets[10] = {strokeColor:null != (Jd = null == (Dd = a) ? void 0 : null == (Ed = Dd.streets[10]) ? void 0 : Ed.strokeColor) ? Jd : "#0000FF", strokeWidth:null != (Kd = null == (Fd = a) ? void 0 : null == (Gd = Fd.streets[10]) ? void 0 : Gd.strokeWidth) ? Kd : 5, strokeDashstyle:null != (Ld = null == (Hd = a) ? void 0 : null == (Id = Hd.streets[10]) ? void 0 : Id.strokeDashstyle) ? Ld : "dash", };
    var Md, Nd, Od, Pd, Qd, Rd;
    d.red = {strokeColor:null != (Qd = null == (Md = a) ? void 0 : null == (Nd = Md.red) ? void 0 : Nd.strokeColor) ? Qd : "#FF0000", strokeDashstyle:null != (Rd = null == (Od = a) ? void 0 : null == (Pd = Od.red) ? void 0 : Pd.strokeDashstyle) ? Rd : "solid", };
    var Sd, Td, Ud, Vd, Wd, Xd, Yd, Zd, $d;
    d.roundabout = {strokeColor:null != (Yd = null == (Sd = a) ? void 0 : null == (Td = Sd.roundabout) ? void 0 : Td.strokeColor) ? Yd : "#111", strokeWidth:null != (Zd = null == (Ud = a) ? void 0 : null == (Vd = Ud.roundabout) ? void 0 : Vd.strokeWidth) ? Zd : 1, strokeDashstyle:null != ($d = null == (Wd = a) ? void 0 : null == (Xd = Wd.roundabout) ? void 0 : Xd.strokeDashstyle) ? $d : "dash", };
    var ae, be, ce, de, ee, fe, ge, he;
    d.lanes = {strokeColor:null != (fe = null == (ae = a) ? void 0 : null == (be = ae.lanes) ? void 0 : be.strokeColor) ? fe : "#454443", strokeDashstyle:null != (ge = null == (ce = a) ? void 0 : null == (de = ce.lanes) ? void 0 : de.strokeDashstyle) ? ge : "dash", strokeOpacity:null != (he = null == V ? void 0 : null == (ee = V.lanes) ? void 0 : ee.strokeOpacity) ? he : 0.9, };
    var ie, je, ke, le, me, ne, oe, pe, qe;
    d.toll = {strokeColor:null != (oe = null == (ie = a) ? void 0 : null == (je = ie.toll) ? void 0 : je.strokeColor) ? oe : "#00E1FF", strokeDashstyle:null != (pe = null == (ke = a) ? void 0 : null == (le = ke.toll) ? void 0 : le.strokeDashstyle) ? pe : "solid", strokeOpacity:null != (qe = null == (me = a) ? void 0 : null == (ne = me.toll) ? void 0 : ne.strokeOpacity) ? qe : 1.0, };
    var re, se, te, ue, ve, we, xe, ye, ze;
    d.closure = {strokeColor:null != (xe = null == (re = a) ? void 0 : null == (se = re.closure) ? void 0 : se.strokeColor) ? xe : "#FF00FF", strokeOpacity:null != (ye = null == (te = a) ? void 0 : null == (ue = te.closure) ? void 0 : ue.strokeOpacity) ? ye : 1.0, strokeDashstyle:null != (ze = null == (ve = a) ? void 0 : null == (we = ve.closure) ? void 0 : we.strokeDashstyle) ? ze : "dash", };
    var Ae, Be, Ce, De, Ee, Fe, Ge, He, Ie;
    d.headlights = {strokeColor:null != (Ge = null == (Ae = a) ? void 0 : null == (Be = Ae.headlights) ? void 0 : Be.strokeColor) ? Ge : "#bfff00", strokeOpacity:null != (He = null == (Ce = a) ? void 0 : null == (De = Ce.headlights) ? void 0 : De.strokeOpacity) ? He : 0.9, strokeDashstyle:null != (Ie = null == (Ee = a) ? void 0 : null == (Fe = Ee.headlights) ? void 0 : Fe.strokeDashstyle) ? Ie : "dot", };
    var Je, Ke, Le, Me, Ne, Oe, Pe, Qe, Re;
    d.nearbyHOV = {strokeColor:null != (Pe = null == (Je = a) ? void 0 : null == (Ke = Je.nearbyHOV) ? void 0 : Ke.strokeColor) ? Pe : "#ff66ff", strokeOpacity:null != (Qe = null == (Le = a) ? void 0 : null == (Me = Le.nearbyHOV) ? void 0 : Me.strokeOpacity) ? Qe : 1.0, strokeDashstyle:null != (Re = null == (Ne = a) ? void 0 : null == (Oe = Ne.nearbyHOV) ? void 0 : Oe.strokeDashstyle) ? Re : "dash", };
    var Se, Te, Ue, Ve, We, Xe, Ye, Ze, $e;
    d.restriction = {strokeColor:null != (Ye = null == (Se = a) ? void 0 : null == (Te = Se.restriction) ? void 0 : Te.strokeColor) ? Ye : "#F2FF00", strokeOpacity:null != (Ze = null == (Ue = a) ? void 0 : null == (Ve = Ue.restriction) ? void 0 : Ve.strokeOpacity) ? Ze : 1.0, strokeDashstyle:null != ($e = null == (We = a) ? void 0 : null == (Xe = We.restriction) ? void 0 : Xe.strokeDashstyle) ? $e : "dash", };
    var af, bf, cf, df, ef, ff, gf, hf, jf;
    d.dirty = {strokeColor:null != (gf = null == (af = a) ? void 0 : null == (bf = af.dirty) ? void 0 : bf.strokeColor) ? gf : "#82614A", strokeOpacity:null != (hf = null == (cf = a) ? void 0 : null == (df = cf.dirty) ? void 0 : df.strokeOpacity) ? hf : 0.6, strokeDashstyle:null != (jf = null == (ef = a) ? void 0 : null == (ff = ef.dirty) ? void 0 : ff.strokeDashstyle) ? jf : "longdash", };
    d.speeds = {};
    var kf, lf, mf;
    d.speeds["default"] = null != (mf = null == (kf = a) ? void 0 : null == (lf = kf.speed) ? void 0 : lf["default"]) ? mf : "#cc0000";
    var nf, of;
    if (null == (nf = a) ? 0 : null == (of = nf.speeds) ? 0 : of.metric) {
      d.speeds.metric = a.speeds.metric;
    } else {
      d.speeds.metric = {};
      var pf, qf, rf;
      d.speeds.metric[5] = null != (rf = null == (pf = a) ? void 0 : null == (qf = pf.speeds) ? void 0 : qf.metric[5]) ? rf : "#542344";
      var sf, tf, uf;
      d.speeds.metric[7] = null != (uf = null == (sf = a) ? void 0 : null == (tf = sf.speeds) ? void 0 : tf.metric[7]) ? uf : "#ff5714";
      var vf, wf, xf;
      d.speeds.metric[10] = null != (xf = null == (vf = a) ? void 0 : null == (wf = vf.speeds) ? void 0 : wf.metric[10]) ? xf : "#ffbf00";
      var yf, zf, Af;
      d.speeds.metric[20] = null != (Af = null == (yf = a) ? void 0 : null == (zf = yf.speeds) ? void 0 : zf.metric[20]) ? Af : "#ee0000";
      var Bf, Cf, Df;
      d.speeds.metric[30] = null != (Df = null == (Bf = a) ? void 0 : null == (Cf = Bf.speeds) ? void 0 : Cf.metric[30]) ? Df : "#e4ff1a";
      var Ef, Ff, Gf;
      d.speeds.metric[40] = null != (Gf = null == (Ef = a) ? void 0 : null == (Ff = Ef.speeds) ? void 0 : Ff.metric[40]) ? Gf : "#993300";
      var Hf, If, Jf;
      d.speeds.metric[50] = null != (Jf = null == (Hf = a) ? void 0 : null == (If = Hf.speeds) ? void 0 : If.metric[50]) ? Jf : "#33ff33";
      var Kf, Lf, Mf;
      d.speeds.metric[60] = null != (Mf = null == (Kf = a) ? void 0 : null == (Lf = Kf.speeds) ? void 0 : Lf.metric[60]) ? Mf : "#639fab";
      var Nf, Of, Pf;
      d.speeds.metric[70] = null != (Pf = null == (Nf = a) ? void 0 : null == (Of = Nf.speeds) ? void 0 : Of.metric[70]) ? Pf : "#00ffff";
      var Qf, Rf, Sf;
      d.speeds.metric[80] = null != (Sf = null == (Qf = a) ? void 0 : null == (Rf = Qf.speeds) ? void 0 : Rf.metric[80]) ? Sf : "#00bfff";
      var Tf, Uf, Vf;
      d.speeds.metric[90] = null != (Vf = null == (Tf = a) ? void 0 : null == (Uf = Tf.speeds) ? void 0 : Uf.metric[90]) ? Vf : "#0066ff";
      var Wf, Xf, Yf;
      d.speeds.metric[100] = null != (Yf = null == (Wf = a) ? void 0 : null == (Xf = Wf.speeds) ? void 0 : Xf.metric[100]) ? Yf : "#ff00ff";
      var Zf, $f, ag;
      d.speeds.metric[110] = null != (ag = null == (Zf = a) ? void 0 : null == ($f = Zf.speeds) ? void 0 : $f.metric[110]) ? ag : "#ff0080";
      var bg, cg, dg;
      d.speeds.metric[120] = null != (dg = null == (bg = a) ? void 0 : null == (cg = bg.speeds) ? void 0 : cg.metric[120]) ? dg : "#ff0000";
      var eg, fg, gg;
      d.speeds.metric[130] = null != (gg = null == (eg = a) ? void 0 : null == (fg = eg.speeds) ? void 0 : fg.metric[130]) ? gg : "#ff9000";
      var hg, ig, jg;
      d.speeds.metric[140] = null != (jg = null == (hg = a) ? void 0 : null == (ig = hg.speeds) ? void 0 : ig.metric[140]) ? jg : "#ff4000";
      var kg, lg, mg;
      d.speeds.metric[150] = null != (mg = null == (kg = a) ? void 0 : null == (lg = kg.speeds) ? void 0 : lg.metric[150]) ? mg : "#0040ff";
    }
    var ng, og;
    if (null == (ng = a) ? 0 : null == (og = ng.speeds) ? 0 : og.imperial) {
      d.speeds.imperial = a.speeds.imperial;
    } else {
      d.speeds.imperial = {};
      var pg, qg, rg;
      d.speeds.imperial[5] = null != (rg = null == (pg = a) ? void 0 : null == (qg = pg.speeds) ? void 0 : qg.imperial[5]) ? rg : "#ff0000";
      var sg, tg, ug;
      d.speeds.imperial[10] = null != (ug = null == (sg = a) ? void 0 : null == (tg = sg.speeds) ? void 0 : tg.imperial[10]) ? ug : "#ff8000";
      var vg, wg, xg;
      d.speeds.imperial[15] = null != (xg = null == (vg = a) ? void 0 : null == (wg = vg.speeds) ? void 0 : wg.imperial[15]) ? xg : "#ffb000";
      var yg, zg, Ag;
      d.speeds.imperial[20] = null != (Ag = null == (yg = a) ? void 0 : null == (zg = yg.speeds) ? void 0 : zg.imperial[20]) ? Ag : "#bfff00";
      var Bg, Cg, Dg;
      d.speeds.imperial[25] = null != (Dg = null == (Bg = a) ? void 0 : null == (Cg = Bg.speeds) ? void 0 : Cg.imperial[25]) ? Dg : "#993300";
      var Eg, Fg, Gg;
      d.speeds.imperial[30] = null != (Gg = null == (Eg = a) ? void 0 : null == (Fg = Eg.speeds) ? void 0 : Fg.imperial[30]) ? Gg : "#33ff33";
      var Hg, Ig, Jg;
      d.speeds.imperial[35] = null != (Jg = null == (Hg = a) ? void 0 : null == (Ig = Hg.speeds) ? void 0 : Ig.imperial[35]) ? Jg : "#00ff90";
      var Kg, Lg, Mg;
      d.speeds.imperial[40] = null != (Mg = null == (Kg = a) ? void 0 : null == (Lg = Kg.speeds) ? void 0 : Lg.imperial[40]) ? Mg : "#00ffff";
      var Ng, Og, Pg;
      d.speeds.imperial[45] = null != (Pg = null == (Ng = a) ? void 0 : null == (Og = Ng.speeds) ? void 0 : Og.imperial[45]) ? Pg : "#00bfff";
      var Qg, Rg, Sg;
      d.speeds.imperial[50] = null != (Sg = null == (Qg = a) ? void 0 : null == (Rg = Qg.speeds) ? void 0 : Rg.imperial[50]) ? Sg : "#0066ff";
      var Tg, Ug, Vg;
      d.speeds.imperial[55] = null != (Vg = null == (Tg = a) ? void 0 : null == (Ug = Tg.speeds) ? void 0 : Ug.imperial[55]) ? Vg : "#ff00ff";
      var Wg, Xg, Yg;
      d.speeds.imperial[60] = null != (Yg = null == (Wg = a) ? void 0 : null == (Xg = Wg.speeds) ? void 0 : Xg.imperial[60]) ? Yg : "#ff0050";
      var Zg, $g, ah;
      d.speeds.imperial[65] = null != (ah = null == (Zg = a) ? void 0 : null == ($g = Zg.speeds) ? void 0 : $g.imperial[65]) ? ah : "#ff9010";
      var bh, ch, dh;
      d.speeds.imperial[70] = null != (dh = null == (bh = a) ? void 0 : null == (ch = bh.speeds) ? void 0 : ch.imperial[70]) ? dh : "#0040ff";
      var eh, fh, gh;
      d.speeds.imperial[75] = null != (gh = null == (eh = a) ? void 0 : null == (fh = eh.speeds) ? void 0 : fh.imperial[75]) ? gh : "#10ff10";
      var hh, ih, jh;
      d.speeds.imperial[80] = null != (jh = null == (hh = a) ? void 0 : null == (ih = hh.speeds) ? void 0 : ih.imperial[80]) ? jh : "#ff4000";
      var kh, lh, mh;
      d.speeds.imperial[85] = null != (mh = null == (kh = a) ? void 0 : null == (lh = kh.speeds) ? void 0 : lh.imperial[85]) ? mh : "#ff0000";
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
  function nh(b, c, a) {
    b ? (b = a.x - c.x, c = a.y - c.y) : (b = c.x - a.x, c = c.y - a.y);
    return 180 * Math.atan2(b, c) / Math.PI;
  }
  function na(b) {
    var c = "";
    if (b) {
      b = b.toString();
      for (var a = 0; a < b.length; a += 1) {
        c += Rh[b.charAt(a)];
      }
    }
    return c;
  }
  function oh(b, c, a) {
    a = void 0 === a ? !1 : a;
    var e, f, h = [];
    var m = null;
    var l = b.getAttributes(), q = b.getAddress(), u = b.hasNonEmptyStreet();
    if (null !== l.primaryStreetID && void 0 === q.attributes.state) {
      x("Address not ready", q, l), setTimeout(function() {
        oh(b, c, !0);
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
      (null != (e = l.fwdMaxSpeed) ? e : l.revMaxSpeed) && d.showSLtext && (l.fwdMaxSpeed === l.revMaxSpeed ? p = na(l.fwdMaxSpeed) : l.fwdMaxSpeed ? (p = na(l.fwdMaxSpeed), l.revMaxSpeed && (p += "'" + na(l.revMaxSpeed))) : (p = na(l.revMaxSpeed), l.fwdMaxSpeed && (p += "'" + na(l.fwdMaxSpeed))), l.fwdMaxSpeedUnverified || l.revMaxSpeedisVerified) && (p += "?");
      e = q + " " + p;
      if (" " === e) {
        return [];
      }
      p = l.roadType;
      p = new OpenLayers.Feature.Vector(c[0], {myId:l.id, color:O[p] ? O[p].strokeColor : "#f00", outlinecolor:O[p] ? O[p].outlineColor : "#fff", outlinewidth:d.labelOutlineWidth, });
      y = [];
      for (v = 0; v < c.length - 1; v += 1) {
        g = c[v].distanceTo(c[v + 1]), y.push({index:v, h:g});
      }
      y.sort(function(G, K) {
        return G.h > K.h ? -1 : G.h < K.h ? 1 : 0;
      });
      v = "" === q ? 1 : y.length;
      g = ph * e.length;
      for (var B = 0; B < y.length && 0 < v && !(y[B].h < (0 < B ? g : g - 30)); B += 1) {
        var F = y[B].index;
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
        m.attributes.A = v;
        --v;
        h.push(m);
      }
    }
    a && m && A.addFeatures(h);
    return h;
  }
  function qh(b) {
    var c = b.id, a = b.rev, e = b.l, f = b.m;
    b = nh(b.j, a ? f : e, a ? e : f);
    return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(e.x + 10 * Math.sin(b), e.y + 10 * Math.cos(b)), {myId:c, }, {rotation:b, externalGraphic:"https://raw.githubusercontent.com/bedo2991/svl/master/average.png", graphicWidth:36, graphicHeight:36, graphicZIndex:300, fillOpacity:1, pointerEvents:"none", });
  }
  function Sh(b) {
    var c = b.getAttributes();
    x("Drawing segment: " + c.id);
    var a = c.geometry.components, e = c.geometry.getVertices(), f = (new OpenLayers.Geometry.LineString(e)).simplify(1.5).components, h = [], m = 100 * c.level, l = c.fwdDirection && c.revDirection, q = b.isInRoundabout(), u = !1, p = !1, y = c.roadType, v = Qh({v:c.width, u:y, B:l, });
    l = v;
    var g = null;
    if (null === c.primaryStreetID) {
      return g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.red.strokeColor, width:v, dash:d.red.strokeDashstyle, }), h.push(g), h;
    }
    d.routingModeEnabled && null !== c.routingRoadType && (y = c.routingRoadType);
    if (void 0 !== O[y]) {
      var B;
      p = null != (B = c.fwdMaxSpeed) ? B : c.revMaxSpeed;
      0 < c.level && (u = !0, g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:"#000000", zIndex:m + 100, width:v, }), h.push(g));
      if ((p = p && d.showSLcolor) && u) {
        l = 0.56 * v;
      } else {
        if (u || p) {
          l = 0.68 * v;
        }
      }
      if (p) {
        if (B = d.showDashedUnverifiedSL && (c.fwdMaxSpeedUnverified || c.revMaxSpeedUnverified) ? "dash" : "solid", d.showSLSinglecolor || !c.fwdMaxSpeed && !c.revMaxSpeed || c.fwdMaxSpeed === c.revMaxSpeed || b.isOneWay()) {
          p = c.fwdMaxSpeed, b.isOneWay() && c.revDirection && (p = c.revMaxSpeed), p && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:za(p), width:u ? 0.8 * v : v, dash:B, a:!0, zIndex:m + 115, }), h.push(g));
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
            g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(p), {myId:c.id, color:za(c.fwdMaxSpeed), width:l, dash:B, a:!0, zIndex:m + 105, });
            h.push(g);
            g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(F), {myId:c.id, color:za(c.revMaxSpeed), width:l, dash:B, a:!0, zIndex:m + 110, });
            h.push(g);
          }
        }
      }
      g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:O[y].strokeColor, width:l, dash:O[y].strokeDashstyle, zIndex:m + 120, });
      h.push(g);
      0 > c.level && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:"#000000", width:l, opacity:0.3, zIndex:m + 125, }), h.push(g));
      u = b.getLockRank() + 1;
      var J, z;
      if (u > d.fakelock || u > (null == (J = WazeWrap) ? void 0 : null == (z = J.User) ? void 0 : z.Rank())) {
        g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:rh.strokeColor, width:0.1 * l, dash:rh.g, zIndex:m + 147, }), h.push(g);
      }
      J = b.getFlagAttributes();
      J.unpaved && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.dirty.strokeColor, width:0.7 * l, opacity:d.dirty.strokeOpacity, dash:d.dirty.strokeDashstyle, zIndex:m + 135, }), h.push(g));
      c.hasClosures && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.closure.strokeColor, width:0.6 * l, dash:d.closure.strokeDashstyle, opacity:d.closure.strokeOpacity, a:!0, zIndex:m + 140, }), h.push(g));
      if (c.fwdToll || c.revToll || c.restrictions.some(function(U) {
        return "TOLL" === U.getDefaultType();
      })) {
        g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.toll.strokeColor, width:0.3 * l, dash:d.toll.strokeDashstyle, opacity:d.toll.strokeOpacity, zIndex:m + 145, }), h.push(g);
      }
      q && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:Aa.strokeColor, width:0.15 * l, dash:Aa.g, opacity:Aa.strokeOpacity, a:!0, zIndex:m + 150, }), h.push(g));
      0 < c.restrictions.length && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.restriction.strokeColor, width:0.4 * l, dash:d.restriction.strokeDashstyle, opacity:d.restriction.strokeOpacity, a:!0, zIndex:m + 155, }), h.push(g));
      !1 === c.validated && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:sh.strokeColor, width:0.5 * l, dash:sh.g, a:!0, zIndex:m + 160, }), h.push(g));
      J.headlights && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.headlights.strokeColor, width:0.2 * l, dash:d.headlights.strokeDashstyle, opacity:d.headlights.strokeOpacity, a:!0, zIndex:m + 165, }));
      J.nearbyHOV && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.nearbyHOV.strokeColor, width:0.25 * l, dash:d.nearbyHOV.strokeDashstyle, opacity:d.nearbyHOV.strokeOpacity, a:!0, zIndex:m + 166, }));
      0 < c.fwdLaneCount && (z = e.slice(-2), z[0] = (new OpenLayers.Geometry.LineString([z[0], z[1], ])).getCentroid(!0), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(z), {myId:c.id, color:d.lanes.strokeColor, width:0.3 * l, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:m + 170, }), h.push(g));
      0 < c.revLaneCount && (z = e.slice(0, 2), z[1] = (new OpenLayers.Geometry.LineString([z[0], z[1], ])).getCentroid(!0), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(z), {myId:c.id, color:d.lanes.strokeColor, width:0.3 * l, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:m + 175, }), h.push(g));
      if (!1 === c.fwdDirection || !1 === c.revDirection) {
        if (z = a, !q && c.length / a.length < d.arrowDeclutter && (z = f), !1 === (c.fwdDirection || c.revDirection)) {
          for (u = 0; u < z.length - 1; u += 1) {
            h.push(new OpenLayers.Feature.Vector((new OpenLayers.Geometry.LineString([z[u], z[u + 1], ])).getCentroid(!0), {myId:c.id, a:!0, i:!0, zIndex:m + 180, }, Th));
          }
        } else {
          for (u = q ? 3 : 1, y = u - 1; y < z.length - 1; y += u) {
            v = nh(c.fwdDirection, z[y], z[y + 1]), B = new OpenLayers.Geometry.LineString([z[y], z[y + 1], ]), h.push(new OpenLayers.Feature.Vector(B.getCentroid(!0), {myId:c.id, a:!0, i:!0, }, {graphicName:"myTriangle", rotation:v, stroke:!0, strokeColor:"#000", graphiczIndex:m + 180, strokeWidth:1.5, fill:!0, fillColor:"#fff", fillOpacity:0.7, pointRadius:5, }));
          }
        }
      }
      J.fwdSpeedCamera && h.push(qh({id:c.id, rev:!1, j:c.fwdDirection, l:a[0], m:a[1], }));
      J.revSpeedCamera && h.push(qh({id:c.id, rev:!0, j:c.fwdDirection, l:a[a.length - 1], m:a[a.length - 2], }));
      if (!0 === d.renderGeomNodes && !q) {
        for (q = 1; q < a.length - 2; q += 1) {
          h.push(new OpenLayers.Feature.Vector(a[q], {myId:c.id, zIndex:m + 200, a:!0, i:!0, }, Uh));
        }
      }
      J.tunnel && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:Ba.strokeColor, opacity:Ba.strokeOpacity, width:0.3 * l, dash:Ba.g, zIndex:m + 177, }), h.push(g), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:th.strokeColor, width:0.1 * l, dash:th.g, zIndex:m + 177, }), h.push(g));
    }
    b = oh(b, f);
    0 < b.length && A.addFeatures(b);
    return h;
  }
  function uh(b) {
    b = b.getAttributes();
    var c = new OpenLayers.Geometry.Point(b.geometry.x, b.geometry.y);
    return new OpenLayers.Feature.Vector(c, {myid:b.id, }, vh(b));
  }
  function Vh() {
    V();
    X(d);
    Y();
    w("info", "All's well that ends well! Now it's everything as it was before.");
  }
  function Wh() {
    GM_setClipboard(JSON.stringify(d));
    w("info", "The configuration has been copied to your clipboard. Please paste it in a file (CTRL+V) to store it.");
  }
  function Ph(b, c) {
    if (null !== c && "" !== c) {
      try {
        d = JSON.parse(c);
      } catch (a) {
        w("error", "Your string seems to be somehow wrong. Please check that is a valid JSON string");
        return;
      }
      null !== d && d.streets ? (X(d), ya(d), Y(), w("success", "Done, preferences imported!")) : w("error", "Something went wrong. Is your string correct?");
    }
  }
  function wh() {
    var b = parseInt(W.map.getLayerByUniqueName("gps_points").getZIndex(), 10);
    d.showUnderGPSPoints ? (C.setZIndex(b - 2), E.setZIndex(b - 1)) : (C.setZIndex(b + 1), E.setZIndex(b + 2));
  }
  function xh() {
    if (d.routingModeEnabled) {
      var b = document.createElement("div");
      b.id = "routingModeDiv";
      b.className = "routingDiv";
      b.innerHTML = "Routing Mode<br><small>Hover to temporary disable it<small>";
      b.addEventListener("mouseenter", function() {
        d.routingModeEnabled = !1;
        oa();
      });
      b.addEventListener("mouseleave", function() {
        d.routingModeEnabled = !0;
        oa();
      });
      document.getElementById("map").appendChild(b);
    } else {
      null == (b = document.getElementById("routingModeDiv")) || b.remove();
    }
  }
  function yh() {
    clearInterval(Ca);
    Ca = null;
    d.autoReload && d.autoReload.enabled && (Ca = setInterval(R, d.autoReload.interval));
  }
  function zh() {
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
    d.showUnderGPSPoints !== document.getElementById("svl_showUnderGPSPoints").checked ? (d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked, wh()) : d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked;
    d.routingModeEnabled !== document.getElementById("svl_routingModeEnabled").checked ? (d.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked, xh()) : d.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked;
    d.useWMERoadLayerAtZoom = document.getElementById("svl_useWMERoadLayerAtZoom").value;
    d.switchZoom = document.getElementById("svl_switchZoom").value;
    d.showANs = document.getElementById("svl_showANs").checked;
    d.realsize = document.getElementById("svl_realsize").checked;
    d.realsize ? $("input.segmentsWidth").prop("disabled", !0) : $("input.segmentsWidth").prop("disabled", !1);
    X(d);
    yh();
  }
  function Xh() {
    zh();
    ya(d, !1);
    Y();
  }
  function Yh() {
    x("rollbackDefault");
    WazeWrap.Alerts.confirm(GM_info.script.name, "Are you sure you want to rollback to the default settings?\nANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!", n, null, "Yes, I want to reset", "Cancel");
  }
  function Ah(b) {
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
        var v, g, B, F;
        return null != (F = null == c ? void 0 : null == (v = c.edit) ? void 0 : null == (g = v.segment) ? void 0 : null == (B = g.fields) ? void 0 : B.unpaved) ? F : b;
      case "closure":
        var D, t, G;
        return null != (G = null == c ? void 0 : null == (D = c.objects) ? void 0 : null == (t = D.roadClosure) ? void 0 : t.name) ? G : b;
      case "headlights":
        var K, S, J, z;
        return null != (z = null == c ? void 0 : null == (K = c.edit) ? void 0 : null == (S = K.segment) ? void 0 : null == (J = S.fields) ? void 0 : J.headlights) ? z : b;
      case "lanes":
        var U, aa, ba;
        return null != (ba = null == c ? void 0 : null == (U = c.objects) ? void 0 : null == (aa = U.lanes) ? void 0 : aa.title) ? ba : b;
      case "speed limit":
        var ca, da, ea, fa;
        return null != (fa = null == c ? void 0 : null == (ca = c.edit) ? void 0 : null == (da = ca.segment) ? void 0 : null == (ea = da.fields) ? void 0 : ea.speed_limit) ? fa : b;
      case "nearbyHOV":
        var ha, ia, ja, ka;
        return null != (ka = null == c ? void 0 : null == (ha = c.edit) ? void 0 : null == (ia = ha.segment) ? void 0 : null == (ja = ia.fields) ? void 0 : ja.nearbyHOV) ? ka : b;
    }
    var la, ma;
    return null != (ma = null == c ? void 0 : null == (la = c.segment) ? void 0 : la.road_types[b]) ? ma : b;
  }
  function P(b) {
    var c = b.f, a = void 0 === b.c ? !0 : b.c, e = void 0 === b.b ? !1 : b.b;
    b = document.createElement("h5");
    b.innerText = Ah(c);
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
  function sa(b, c) {
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
  function Bh() {
    return {streets:["red"], decorations:"lanes toll restriction closure headlights dirty nearbyHOV".split(" "), };
  }
  function Y() {
    document.getElementById("svl_saveNewPref").classList.add("disabled");
    document.getElementById("svl_rollbackButton").classList.add("disabled");
    document.getElementById("svl_saveNewPref").classList.remove("btn-primary");
    document.getElementById("sidepanel-svl").classList.remove("svl_unsaved");
    for (var b = 0; b < d.streets.length; b += 1) {
      d.streets[b] && (document.getElementById("svl_streetWidth_" + b).value = d.streets[b].strokeWidth, document.getElementById("svl_streetColor_" + b).value = d.streets[b].strokeColor, document.getElementById("svl_strokeDashstyle_" + b).value = d.streets[b].strokeDashstyle);
    }
    b = Bh();
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
  function ta(b) {
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
  function pa(b) {
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
  function qa(b, c) {
    var a = document.createElement("details");
    a.open = void 0 === c ? !1 : c;
    c = document.createElement("summary");
    c.innerText = b;
    a.appendChild(c);
    return a;
  }
  function Zh() {
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
    c.innerText = "Version 5.0.0";
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
    var h = qa("Roads Properties", !0);
    h.appendChild(L({id:"realsize", title:"Use real-life Width", description:"When enabled, the segments thickness will be computed from the segments width instead of using the value set in the preferences", }));
    for (c = 0; c < d.streets.length; c += 1) {
      d.streets[c] && h.appendChild(P({f:c, c:!0, b:!1}));
    }
    e = qa("Segments Decorations");
    a = qa("Rendering Parameters");
    c = qa("Speed Limits");
    Bh().streets.forEach(function(m) {
      "red" !== m ? h.appendChild(P({f:m, c:!0, b:!1, })) : h.appendChild(P({f:m, c:!1, b:!1, }));
    });
    e.appendChild(P({f:"lanes", c:!1, b:!0, }));
    e.appendChild(P({f:"toll", c:!1, b:!0, }));
    e.appendChild(P({f:"restriction", c:!1, b:!0, }));
    e.appendChild(P({f:"closure", c:!1, b:!0, }));
    e.appendChild(P({f:"headlights", c:!1, b:!0, }));
    e.appendChild(P({f:"dirty", c:!1, b:!0, }));
    e.appendChild(P({f:"nearbyHOV", c:!1, b:!0, }));
    h.appendChild(e);
    b.appendChild(h);
    h.appendChild(L({id:"showANs", title:"Show Alternative Names", description:"When enabled, at most 2 ANs that differ from the primary name are shown under the street name.", }));
    a.appendChild(L({id:"routingModeEnabled", title:"Enable Routing Mode", description:"When enabled, roads are rendered by taking into consideration their routing attribute. E.g. a preferred Minor Highway is shown as a Major Highway.", }));
    a.appendChild(L({id:"showUnderGPSPoints", title:"GPS Layer above Roads", description:"When enabled, the GPS layer gets shown above the road layer.", }));
    h.appendChild(pa({id:"labelOutlineWidth", title:"Labels Outline Width", description:"How much border should the labels have?", min:0, max:10, step:1, }));
    a.appendChild(L({id:"disableRoadLayers", title:"Hide WME Road Layer", description:"When enabled, the WME standard road layer gets hidden automatically.", }));
    a.appendChild(L({id:"startDisabled", title:"SVL Initially Disabled", description:"When enabled, the SVL does not get enabled automatically.", }));
    h.appendChild(pa({id:"clutterConstant", title:"Street Names Density", description:"For an higher value, less elements will be shown.", min:1, max:20, step:1, }));
    a.appendChild(ta({id:"useWMERoadLayerAtZoom", title:"Stop using SVL at zoom level", description:"When you reach this zoom level, the road layer gets automatically enabled.", min:0, max:5, step:1, }));
    a.appendChild(ta({id:"switchZoom", title:"Close-zoom until level", description:"When the zoom is lower then this value, it will switch to far-zoom mode (rendering less details)", min:5, max:9, step:1, }));
    e = document.createElement("h5");
    e.innerText = "Close-zoom only";
    a.appendChild(e);
    a.appendChild(L({id:"renderGeomNodes", title:"Render Geometry Nodes", description:"When enabled, the geometry nodes are drawn, too.", }));
    a.appendChild(ta({id:"fakelock", title:"Render Map as Level", description:"All segments locked above this level will be stroked through with a black line.", min:1, max:7, step:1, }));
    a.appendChild(pa({id:"closeZoomLabelSize", title:"Font Size (at close zoom)", description:"Increase this value if you can't read the street names because they are too small.", min:8, max:32, step:1, }));
    a.appendChild(pa({id:"arrowDeclutter", title:"Limit Arrows", description:"Increase this value if you want less arrows to be shown on streets (it increases the performance).", min:1, max:200, step:1, }));
    e = document.createElement("h5");
    e.innerText = "Far-zoom only";
    a.appendChild(e);
    a.appendChild(pa({id:"farZoomLabelSize", title:"Font Size (at far zoom)", description:"Increase this value if you can't read the street names because they are too small.", min:8, max:32, }));
    a.appendChild(L({id:"hideMinorRoads", title:"Hide minor roads at zoom 3", description:"The WME loads some type of roads when they probably shouldn't be, check this option for avoid displaying them at higher zooms.", }));
    b.appendChild(a);
    a = qa("Utilities");
    a.appendChild(L({id:"autoReload_enabled", title:"Automatically Refresh the Map", description:"When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing.", }));
    a.appendChild(ta({id:"autoReload_interval", title:"Auto Reload Time Interval (in Seconds)", description:"How often should the WME be refreshed for new edits?", min:20, max:3600, step:1, }));
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
    a.innerText = Ah("speed limit");
    c.appendChild(a);
    a = "metric";
    c.appendChild(sa("Default", !0));
    for (e = 1; e < Object.keys(d.speeds[a]).length + 1; e += 1) {
      c.appendChild(sa(e, !0));
    }
    a = "imperial";
    c.appendChild(sa("Default", !1));
    for (e = 1; e < Object.keys(d.speeds[a]).length + 1; e += 1) {
      c.appendChild(sa(e, !1));
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
    new WazeWrap.Interface.Tab("SVL \ud83d\uddfa\ufe0f", b.innerHTML, Y);
    document.querySelectorAll(".prefElement").forEach(function(m) {
      m.addEventListener("change", zh);
    });
    document.getElementById("svl_saveNewPref").addEventListener("click", Xh);
    document.getElementById("svl_rollbackButton").addEventListener("click", Vh);
    document.getElementById("svl_resetButton").addEventListener("click", Yh);
    document.getElementById("svl_importButton").addEventListener("click", r);
    document.getElementById("svl_exportButton").addEventListener("click", Wh);
  }
  function $h(b) {
    x("Removing " + b.length + " nodes");
    if (I.zoom <= d.useWMERoadLayerAtZoom) {
      x("Destroy all nodes"), E.destroyFeatures();
    } else {
      if (N || 4000 < b.length) {
        N || ua();
      } else {
        var c;
        for (c = 0; c < b.length; c += 1) {
          E.destroyFeatures(E.getFeaturesByAttribute("myid", b[c].attributes.id));
        }
      }
    }
  }
  function vh(b) {
    var c;
    return 1 === (null == (c = b.segIDs) ? void 0 : c.length) ? ai : bi;
  }
  function ci(b) {
    x("Change nodes");
    b.forEach(function(c) {
      var a = c.attributes, e = E.getFeaturesByAttribute("myid", a.id)[0];
      e ? (e.style = vh(a), e.move(new OpenLayers.LonLat(a.geometry.x, a.geometry.y))) : 0 < a.id && E.addFeatures([uh(c)]);
    });
  }
  function di(b) {
    x("Node state deleted");
    for (var c = 0; c < b.length; c += 1) {
      E.destroyFeatures(E.getFeaturesByAttribute("myid", b[c].getID()));
    }
  }
  function ei(b) {
    for (var c = 0; c < b.length; c += 1) {
      va(b[c].getID());
    }
  }
  function Ch(b) {
    x("Adding " + b.length + " nodes");
    if (N || 4000 < b.length) {
      N || ua();
    } else {
      if (I.zoom <= d.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        for (var c = [], a = 0; a < b.length; a += 1) {
          void 0 !== b[a].attributes.geometry ? 0 < b[a].attributes.id && c.push(uh(b[a])) : console.warn("[SVL] Geometry of node is undefined");
        }
        E.addFeatures(c);
        return !0;
      }
    }
  }
  function T(b) {
    return !b.H;
  }
  function Dh() {
    x("updateStatusBasedOnZoom running");
    var b = !0;
    N && (3000 > Object.keys(W.model.segments.objects).length && 4000 > Object.keys(W.model.nodes.objects).length ? (N = !1, M(1, !0), M(0, !1), oa()) : console.warn("[SVL] Still too many elements to draw: Segments: " + Object.keys(W.model.segments.objects).length + "/3000, Nodes: " + Object.keys(W.model.nodes.objects).length + "/4000"));
    I.zoom <= d.useWMERoadLayerAtZoom ? (x("Road layer automatically enabled because of zoom out"), !0 === C.visibility && (wa = !0, M(0, !0), M(1, !1)), b = !1) : wa && (x("Re-enabling SVL after zoom in"), M(1, !0), M(0, !1), wa = !1);
    return b;
  }
  function fi() {
    clearTimeout(Eh);
    x("manageZoom clearing timer");
    Eh = setTimeout(Dh, 800);
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
    if (N || 3000 < b.length) {
      N || ua();
    } else {
      if (I.zoom <= d.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        Fh();
        var c = [];
        b.forEach(function(a) {
          null !== a && (c = c.concat(Sh(a)));
        });
        0 < c.length ? (x(c.length + " features added to the street layer"), C.addFeatures(c)) : console.warn("[SVL] no features drawn");
        Gh();
      }
    }
  }
  function va(b) {
    x("RemoveSegmentById: " + b);
    C.destroyFeatures(C.getFeaturesByAttribute("myId", b));
    A.destroyFeatures(A.getFeaturesByAttribute("myId", b));
  }
  function gi(b) {
    x("Edit " + b.length + " segments");
    b.forEach(function(c) {
      var a = c.getOldID();
      a && va(parseInt(a, 10));
      va(c.getID());
      "Delete" !== c.state && Da([c]);
    });
  }
  function hi(b) {
    x("Removing " + b.length + " segments");
    I.zoom <= d.useWMERoadLayerAtZoom ? (x("Destroy all segments and labels because of zoom out"), C.destroyFeatures(), A.destroyFeatures()) : N || 3000 < b.length ? N || ua() : (Fh(), b.forEach(function(c) {
      va(c.attributes.id);
    }), Gh());
  }
  function Hh(b) {
    x("ManageVisibilityChanged", b);
    E.setVisibility(b.object.visibility);
    A.setVisibility(b.object.visibility);
    b.object.visibility ? (x("enabled: registering events"), b = W.model.segments._events, b.objectsadded.push({context:C, callback:Da, svl:!0, }), b.objectschanged.push({context:C, callback:gi, svl:!0, }), b.objectsremoved.push({context:C, callback:hi, svl:!0, }), b["objects-state-deleted"].push({context:C, callback:ei, svl:!0, }), x("SVL: Registering node events"), b = W.model.nodes._events, b.objectsremoved.push({context:E, callback:$h, svl:!0, }), b.objectsadded.push({context:E, callback:Ch, 
    svl:!0, }), b.objectschanged.push({context:E, callback:ci, svl:!0, }), b["objects-state-deleted"].push({context:E, callback:di, svl:!0, }), !0 === Dh() && oa()) : (x("disabled: unregistering events"), x("SVL: Removing segments events"), b = W.model.segments._events, b.objectsadded = b.objectsadded.filter(T), b.objectschanged = b.objectschanged.filter(T), b.objectsremoved = b.objectsremoved.filter(T), b["objects-state-deleted"] = b["objects-state-deleted"].filter(T), x("SVL: Removing node events"), 
    b = W.model.nodes._events, b.objectsremoved = b.objectsremoved.filter(T), b.objectsadded = b.objectsadded.filter(T), b.objectschanged = b.objectschanged.filter(T), b["objects-state-deleted"] = b["objects-state-deleted"].filter(T), k());
  }
  function Ih(b) {
    b = void 0 === b ? 1 : b;
    30 < b ? console.error("SVL: could not initialize WazeWrap") : WazeWrap && WazeWrap.Ready && WazeWrap.Interface && WazeWrap.Alerts ? ii() : (console.log("SVL: WazeWrap not ready, retrying in 800ms"), setTimeout(function() {
      Ih(b + 1);
    }, 800));
  }
  function ii() {
    console.log("SVL: initializing WazeWrap");
    try {
      (new WazeWrap.Interface.Shortcut("SVLToggleLayer", "Toggle SVL", "svl", "Street Vector Layer", "A+l", function() {
        M(1, !C.visibility);
      }, null)).add(), console.log("SVL: Keyboard shortcut successfully added.");
    } catch (b) {
      console.error("SVL: Error while adding the keyboard shortcut:"), console.error(b);
    }
    try {
      WazeWrap.Interface.AddLayerCheckbox("road", "Street Vector Layer", !0, function(b) {
        C.setVisibility(b);
      }, C);
    } catch (b) {
      console.error("SVL: could not add layer checkbox");
    }
    d.startDisabled && M(1, !1);
    Zh();
    WazeWrap.Interface.ShowScriptUpdate("Street Vector Layer", "5.0.0", '<b>Major update!</b>\n            <br>Many things have changed! You may need to change some settings to have a similar view as before (for example increasing the streets width)\n        <br>- NEW: Rendering completely rewritten: performance improvements\n        <br>- NEW: The preference panel was redesigned and is now in the sidebar (SVL \ud83d\uddfa\ufe0f)\n        <br>- NEW: You can set what color to use for each speed limit (User request)\n        <br>- NEW: Added an option to render the streets based on their width (one way streets are thinner, their size changes when you zoom)\n        <br>- NEW: Some options are now are now localised using WME\'s strings\n        <br>- NEW: Dead-end nodes are rendered with a different color\n        <br>- NEW: The Preference panel changes color when you have unsaved changes\n        <br>- NEW: The "Next to Carpool/HOV/bus lane" is also shown\n        <br>- Removed: the zoom-level indicator while editing the preferences\n        <br>- Bug fixes and new bugs :)', 
    "", GM_info.script.supportURL);
  }
  function Jh(b) {
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
          Jh(c);
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
    !1 === V() && w("info", "This is the first time that you run Street Vector Layer in this browser.\nSome info about it:\nBy default, use ALT+L to toggle the layer.\nYou can change the streets color, thickness and style using the panel on the left sidebar.\nYour preferences will be saved for the next time in your browser.\nThe other road layers will be automatically hidden (you can change this behaviour in the preference panel).\nHave fun and tell us on the Waze forum if you liked the script!");
    b = new OpenLayers.StyleMap({pointerEvents:"none", strokeColor:"${color}", strokeWidth:"${width}", strokeOpacity:"${opacity}", strokeDashstyle:"${dash}", graphicZIndex:"${zIndex}", });
    var a = new OpenLayers.StyleMap({fontFamily:"Rubik, Open Sans, Alef, helvetica, sans-serif", fontWeight:"800", fontColor:"${color}", labelOutlineColor:"${outlinecolor}", labelOutlineWidth:"${outlinewidth}", label:"${label}", visibility:!d.startDisabled, angle:"${angle}", pointerEvents:"none", labelAlign:"cm", });
    C = new OpenLayers.Layer.Vector("Street Vector Layer", {styleMap:b, uniqueName:"vectorStreet", accelerator:"toggle" + "Street Vector Layer".replace(/\s+/g, ""), visibility:!d.startDisabled, isVector:!0, attribution:"SVL v. 5.0.0", rendererOptions:{zIndexing:!0, }, });
    C.renderer.drawFeature = function(e, f) {
      null == f && (f = e.style);
      if (e.geometry) {
        var h = H();
        2 > I.zoom || e.attributes.a && h || e.attributes.s && !h ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(C.renderer.extent) ? (C.renderer.featureDx = 0, f.pointerEvents = "none", h || !e.attributes.i && d.realsize && (f.strokeWidth /= I.resolution)) : f = {display:"none"};
        return C.renderer.drawGeometry(e.geometry, f, e.id);
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
    A = new OpenLayers.Layer.Vector("Labels Vector", {uniqueName:"vectorLabels", styleMap:a, visibility:!d.startDisabled, });
    A.renderer.drawFeature = function(e, f) {
      var h = I.zoom;
      if (2 > h) {
        return !1;
      }
      null == f && (f = e.style);
      if (e.geometry) {
        var m = H();
        7 - e.attributes.A > h || e.attributes.a && m || e.attributes.s && !m ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(A.renderer.extent) ? (A.renderer.featureDx = 0, f.pointerEvents = "none", f.fontSize = m ? d.farZoomLabelSize : d.closeZoomLabelSize) : f = {display:"none"};
        h = A.renderer.drawGeometry(e.geometry, f, e.id);
        "none" !== f.display && f.label && !1 !== h ? (m = e.geometry.getCentroid(), A.renderer.drawText(e.id, f, m)) : A.renderer.removeText(e.id);
        return h;
      }
    };
    A.renderer.drawText = function(e, f, h) {
      var m = !!f.labelOutlineWidth;
      if (m) {
        var l = OpenLayers.Util.extend({}, f);
        l.fontColor = l.labelOutlineColor;
        l.fontStrokeColor = l.labelOutlineColor;
        l.fontStrokeWidth = f.labelOutlineWidth;
        f.labelOutlineOpacity && (l.fontOpacity = f.labelOutlineOpacity);
        delete l.labelOutlineWidth;
        A.renderer.drawText(e, l, h);
      }
      var q = A.renderer.getResolution();
      l = (h.x - A.renderer.featureDx) / q + A.renderer.left;
      var u = h.y / q - A.renderer.top;
      m = m ? A.renderer.LABEL_OUTLINE_SUFFIX : A.renderer.LABEL_ID_SUFFIX;
      q = A.renderer.nodeFactory(e + m, "text");
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
        var g = A.renderer.nodeFactory(e + m + "_tspan_" + v, "tspan");
        !0 === f.labelSelect && (g.D = e, g.F = h, g.G = h.C);
        if (!1 === OpenLayers.IS_GECKO) {
          var B = void 0;
          g.setAttributeNS(null, "baseline-shift", null != (B = OpenLayers.Renderer.SVG.LABEL_VSHIFT[u[1]]) ? B : "-35%");
        }
        g.setAttribute("x", l);
        0 === v ? (B = OpenLayers.Renderer.SVG.LABEL_VFACTOR[u[1]], null == B && (B = -.5), g.setAttribute("dy", B * (y - 1) + "em")) : g.setAttribute("dy", "1em");
        g.textContent = "" === p[v] ? " " : p[v];
        g.parentNode || q.appendChild(g);
      }
      q.parentNode || A.renderer.textRoot.appendChild(q);
    };
    X(d);
    I.addLayer(C);
    I.addLayer(A);
    I.addLayer(E);
    "true" === window.localStorage.getItem("svlDebugOn") && (document.sv = C, document.lv = A, document.nv = E, document.svl_pref = d);
    b = I.getLayersBy("uniqueName", "roads");
    Z = null;
    1 === b.length && (Z = Fa(b).next().value);
    wa = !1;
    d.showUnderGPSPoints && wh();
    xh();
    yh();
    I.events.register("zoomend", null, fi, !0);
    Ih();
    I.zoom <= d.useWMERoadLayerAtZoom ? M(0, !0) : Z.getVisibility() && d.disableRoadLayers && (M(0, !1), console.log("SVL: WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel."));
    C.events.register("visibilitychanged", C, Hh);
    Hh({object:C, });
    $(".olControlAttribution").click(function() {
      w("info", 'The preferences have been moved to the sidebar on the left. Please look for the "SVL \ud83d\uddfa\ufe0f" tab.');
    });
    console.log("[SVL] v. 5.0.0 initialized correctly.");
  }
  function oa() {
    x("DrawAllSegments");
    k();
    Da(Object.values(W.model.segments.objects));
    Ch(Object.values(W.model.nodes.objects));
  }
  function X(b) {
    for (var c = 0; c < b.streets.length; c += 1) {
      if (b.streets[c]) {
        var a = b.streets[c].strokeColor;
        O[c] = {strokeColor:b.streets[c].strokeColor, strokeWidth:b.streets[c].strokeWidth, strokeDashstyle:b.streets[c].strokeDashstyle, outlineColor:127 > 0.299 * parseInt(a.substring(1, 3), 16) + 0.587 * parseInt(a.substring(3, 5), 16) + 0.114 * parseInt(a.substring(5, 7), 16) ? "#FFF" : "#000", };
      }
    }
    ph = b.clutterConstant;
    oa();
  }
  function Kh(b) {
    b = void 0 === b ? 0 : b;
    if (void 0 === W || void 0 === W.map) {
      console.log("SVL not ready to start, retrying in 600ms");
      var c = b + 1;
      20 > c ? setTimeout(function() {
        Kh(c);
      }, 600) : w("error", "Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!");
    } else {
      Jh();
    }
  }
  var Ea = "true" === window.localStorage.getItem("svlDebugOn"), x = Ea ? function(b) {
    for (var c = [], a = 0; a < arguments.length; ++a) {
      c[a] = arguments[a];
    }
    for (a = 0; a < c.length; a += 1) {
      "string" === typeof c[a] ? console.log("[SVL] 5.0.0: " + c[a]) : console.dir(c[a]);
    }
  } : function() {
  }, Fh = Ea ? console.group : function() {
  }, Gh = Ea ? console.groupEnd : function() {
  }, Ca = null, ph, O = [], C, E, A, N = !1, d, Z, wa, I, ra = {ROAD_LAYER:null, SVL_LAYER:null, }, Rh = "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079".split(""), sh = {strokeColor:"#F53BFF", strokeWidth:3, g:"solid", }, Aa = {strokeColor:"#111111", strokeWidth:1, g:"dash", strokeOpacity:0.6, }, bi = {stroke:!1, fillColor:"#0015FF", fillOpacity:0.9, pointRadius:3, pointerEvents:"none", }, ai = {stroke:!1, fillColor:"#C31CFF", fillOpacity:0.9, pointRadius:3, pointerEvents:"none", }, 
  Th = {graphicName:"x", strokeColor:"#f00", strokeWidth:1.5, fillColor:"#FFFF40", fillOpacity:0.7, pointRadius:7, pointerEvents:"none", }, Uh = {stroke:!1, fillColor:"#000", fillOpacity:0.5, pointRadius:3.5, graphicZIndex:179, pointerEvents:"none", }, rh = {strokeColor:"#000", strokeDashstyle:"solid", }, th = {strokeColor:"#C90", g:"longdash", }, Ba = {strokeColor:"#fff", strokeOpacity:0.8, g:"longdash", }, Ha = {1:5.0, 2:5.5, 3:22.5, 4:6.0, 5:2.0, 6:10.0, 7:9.0, 8:4.0, 10:2.0, 15:8.0, 16:2.0, 17:5.0, 
  18:10.0, 19:5.0, 20:5.0, 22:3.0, }, Eh = null;
  Kh();
})();

