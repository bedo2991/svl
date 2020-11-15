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
function Sh(k) {
  k = ["object" == typeof globalThis && globalThis, k, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global, ];
  for (var n = 0; n < k.length; ++n) {
    var r = k[n];
    if (r && r.Math == Math) {
      return r;
    }
  }
  throw Error("Cannot find global object");
}
var Th = Sh(this);
function Q(k, n) {
  if (n) {
    a: {
      var r = Th;
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
    var w = Th[n[r]];
    "function" === typeof w && "function" != typeof w.prototype[k] && Ga(w.prototype, k, {configurable:!0, writable:!0, value:function() {
      return Uh(xa(this));
    }});
  }
  return k;
});
function Uh(k) {
  k = {next:k};
  k[Symbol.iterator] = function() {
    return this;
  };
  return k;
}
function Vh(k, n) {
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
    return Vh(this, function(n) {
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
    z.destroyFeatures(z.features, {silent:!0, });
    A.destroyFeatures(A.features, {silent:!0});
    E.destroyFeatures(E.features, {silent:!0});
  }
  function n() {
    x("resetting preferences");
    x("saveDefaultPreferences");
    Z(!0);
    aa(d);
    ba();
    w("success", "Preferences have been reset to the default values");
  }
  function r() {
    WazeWrap.Alerts.prompt(GM_info.script.name, "N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!\n\nPaste your string here:", "", Wh, null);
  }
  function w(a, c) {
    try {
      WazeWrap.Alerts[a](GM_info.script.name, c);
    } catch (b) {
      console.error(b), alert(c);
    }
  }
  function H(a) {
    a = void 0 === a ? I.zoom : a;
    return a < d.switchZoom;
  }
  function R() {
    0 !== W.model.actionManager.unsavedActionsNum() || WazeWrap.hasSelectedFeatures() || 0 !== document.querySelectorAll(".place-update-edit.show").length || W.controller.reload();
  }
  function M(a, c) {
    1 === a ? (x("Changing SVL Layer visibility to " + c), z.setVisibility(c)) : ca ? (x("Changing Road Layer visibility to " + c), ca.setVisibility(c)) : console.warn("SVL: cannot toggle the WME's road layer");
    if (!sa[a] && (x("Initialising layer " + a), sa[a] = document.getElementById(1 === a ? "layer-switcher-item_street_vector_layer" : "layer-switcher-item_road"), !sa[a])) {
      console.warn("SVL: cannot find checkbox for layer number " + a);
      return;
    }
    sa[a].checked = c;
  }
  function ya(a, c) {
    c = void 0 === c ? !0 : c;
    x("savePreferences");
    a.version = "5.0.6";
    try {
      window.localStorage.setItem("svl", JSON.stringify(a)), c || w("success", "Preferences saved!");
    } catch (b) {
      console.error(b), w("error", "Could not save the preferences, your browser local storage seems to be full.");
    }
  }
  function Xh(a) {
    var c = a.s, b = a.roadType;
    a = a.v;
    return d.realsize ? c ? a ? c : 0.6 * c : a ? Ha[b] : 0.6 * Ha[b] : parseInt(O[b].strokeWidth, 10);
  }
  function Z(a) {
    a = void 0 === a ? !1 : a;
    var c = !0, b = null;
    if (!0 === a) {
      window.localStorage.removeItem("svl");
    } else {
      var e = window.localStorage.getItem("svl");
      e && (b = JSON.parse(e));
    }
    null === b && (a ? x("Overwriting existing preferences") : (c = !1, x("Creating new preferences for the first time")));
    d = {autoReload:{}};
    var f, h, m;
    d.autoReload.interval = null != (m = null == (f = b) ? void 0 : null == (h = f.autoReload) ? void 0 : h.interval) ? m : 60000;
    var l, q, u;
    d.autoReload.enabled = null != (u = null == (l = b) ? void 0 : null == (q = l.autoReload) ? void 0 : q.enabled) ? u : !1;
    var p, y;
    d.showSLSinglecolor = null != (y = null == (p = b) ? void 0 : p.showSLSinglecolor) ? y : !1;
    var v, g;
    d.SLColor = null != (g = null == (v = b) ? void 0 : v.SLColor) ? g : "#ffdf00";
    var C, F, D, t, G;
    d.fakelock = null != (G = null != (t = null == (C = b) ? void 0 : C.fakelock) ? t : null == (F = WazeWrap) ? void 0 : null == (D = F.User) ? void 0 : D.Rank()) ? G : 6;
    var K, S;
    d.hideMinorRoads = null != (S = null == (K = b) ? void 0 : K.hideMinorRoads) ? S : !0;
    var J, B;
    d.showDashedUnverifiedSL = null != (B = null == (J = b) ? void 0 : J.showDashedUnverifiedSL) ? B : !0;
    var U, da;
    d.showSLcolor = null != (da = null == (U = b) ? void 0 : U.showSLcolor) ? da : !0;
    var ea, fa;
    d.showSLtext = null != (fa = null == (ea = b) ? void 0 : ea.showSLtext) ? fa : !0;
    var ha, ia;
    d.disableRoadLayers = null != (ia = null == (ha = b) ? void 0 : ha.disableRoadLayers) ? ia : !0;
    var ja, ka;
    d.startDisabled = null != (ka = null == (ja = b) ? void 0 : ja.startDisabled) ? ka : !1;
    var la, ma;
    d.clutterConstant = null != (ma = null == (la = b) ? void 0 : la.clutterConstant) ? ma : 7;
    var na, oa;
    d.labelOutlineWidth = null != (oa = null == (na = b) ? void 0 : na.labelOutlineWidth) ? oa : 3;
    var pa, Ia;
    d.closeZoomLabelSize = null != (Ia = null == (pa = b) ? void 0 : pa.closeZoomLabelSize) ? Ia : 14;
    var Ja, Ka;
    d.farZoomLabelSize = null != (Ka = null == (Ja = b) ? void 0 : Ja.farZoomLabelSize) ? Ka : 12;
    var La, Ma;
    d.useWMERoadLayerAtZoom = null != (Ma = null == (La = b) ? void 0 : La.useWMERoadLayerAtZoom) ? Ma : 1;
    var Na, Oa;
    d.switchZoom = null != (Oa = null == (Na = b) ? void 0 : Na.switchZoom) ? Oa : 5;
    var Pa, Qa;
    d.arrowDeclutter = null != (Qa = null == (Pa = b) ? void 0 : Pa.arrowDeclutter) ? Qa : 140;
    var Ra, Sa;
    d.segmentsThreshold = null != (Sa = null == (Ra = b) ? void 0 : Ra.segmentsThreshold) ? Sa : 3000;
    var Ta, Ua;
    d.nodesThreshold = null != (Ua = null == (Ta = b) ? void 0 : Ta.nodesThreshold) ? Ua : 4000;
    var Va, Wa;
    d.showUnderGPSPoints = null != (Wa = null == (Va = b) ? void 0 : Va.showUnderGPSPoints) ? Wa : !1;
    var Xa, Ya;
    d.routingModeEnabled = null != (Ya = null == (Xa = b) ? void 0 : Xa.routingModeEnabled) ? Ya : !1;
    var Za, $a;
    d.realsize = null != ($a = null == (Za = b) ? void 0 : Za.realsize) ? $a : !0;
    var ab, bb;
    d.showANs = null != (bb = null == (ab = b) ? void 0 : ab.showANs) ? bb : !1;
    var cb, db;
    d.renderGeomNodes = null != (db = null == (cb = b) ? void 0 : cb.renderGeomNodes) ? db : !1;
    var eb, fb;
    d.layerOpacity = null != (fb = null == (eb = b) ? void 0 : eb.layerOpacity) ? fb : 0.9;
    d.streets = [];
    var gb, hb, ib, jb, kb, lb, mb, nb, ob;
    d.streets[1] = {strokeColor:null != (mb = null == (gb = b) ? void 0 : null == (hb = gb.streets[1]) ? void 0 : hb.strokeColor) ? mb : "#FFFFFF", strokeWidth:null != (nb = null == (ib = b) ? void 0 : null == (jb = ib.streets[1]) ? void 0 : jb.strokeWidth) ? nb : 10, strokeDashstyle:null != (ob = null == (kb = b) ? void 0 : null == (lb = kb.streets[1]) ? void 0 : lb.strokeDashstyle) ? ob : "solid", };
    var pb, qb, rb, sb, tb, ub, vb, wb, xb;
    d.streets[20] = {strokeColor:null != (vb = null == (pb = b) ? void 0 : null == (qb = pb.streets[20]) ? void 0 : qb.strokeColor) ? vb : "#2282ab", strokeWidth:null != (wb = null == (rb = b) ? void 0 : null == (sb = rb.streets[20]) ? void 0 : sb.strokeWidth) ? wb : 9, strokeDashstyle:null != (xb = null == (tb = b) ? void 0 : null == (ub = tb.streets[20]) ? void 0 : ub.strokeDashstyle) ? xb : "solid", };
    var yb, zb, Ab, Bb, Cb, Db, Eb, Fb, Gb;
    d.streets[4] = {strokeColor:null != (Eb = null == (yb = b) ? void 0 : null == (zb = yb.streets[4]) ? void 0 : zb.strokeColor) ? Eb : "#3FC91C", strokeWidth:null != (Fb = null == (Ab = b) ? void 0 : null == (Bb = Ab.streets[4]) ? void 0 : Bb.strokeWidth) ? Fb : 11, strokeDashstyle:null != (Gb = null == (Cb = b) ? void 0 : null == (Db = Cb.streets[4]) ? void 0 : Db.strokeDashstyle) ? Gb : "solid", };
    var Hb, Ib, Jb, Kb, Lb, Mb, Nb, Ob, Pb;
    d.streets[3] = {strokeColor:null != (Nb = null == (Hb = b) ? void 0 : null == (Ib = Hb.streets[3]) ? void 0 : Ib.strokeColor) ? Nb : "#387FB8", strokeWidth:null != (Ob = null == (Jb = b) ? void 0 : null == (Kb = Jb.streets[3]) ? void 0 : Kb.strokeWidth) ? Ob : 18, strokeDashstyle:null != (Pb = null == (Lb = b) ? void 0 : null == (Mb = Lb.streets[3]) ? void 0 : Mb.strokeDashstyle) ? Pb : "solid", };
    var Qb, Rb, Sb, Tb, Ub, Vb, Wb, Xb, Yb;
    d.streets[7] = {strokeColor:null != (Wb = null == (Qb = b) ? void 0 : null == (Rb = Qb.streets[7]) ? void 0 : Rb.strokeColor) ? Wb : "#ECE589", strokeWidth:null != (Xb = null == (Sb = b) ? void 0 : null == (Tb = Sb.streets[7]) ? void 0 : Tb.strokeWidth) ? Xb : 14, strokeDashstyle:null != (Yb = null == (Ub = b) ? void 0 : null == (Vb = Ub.streets[7]) ? void 0 : Vb.strokeDashstyle) ? Yb : "solid", };
    var Zb, $b, ac, bc, cc, dc, ec, fc, gc;
    d.streets[6] = {strokeColor:null != (ec = null == (Zb = b) ? void 0 : null == ($b = Zb.streets[6]) ? void 0 : $b.strokeColor) ? ec : "#C13040", strokeWidth:null != (fc = null == (ac = b) ? void 0 : null == (bc = ac.streets[6]) ? void 0 : bc.strokeWidth) ? fc : 16, strokeDashstyle:null != (gc = null == (cc = b) ? void 0 : null == (dc = cc.streets[6]) ? void 0 : dc.strokeDashstyle) ? gc : "solid", };
    var hc, ic, jc, kc, lc, mc, nc, oc, pc;
    d.streets[16] = {strokeColor:null != (nc = null == (hc = b) ? void 0 : null == (ic = hc.streets[16]) ? void 0 : ic.strokeColor) ? nc : "#B700FF", strokeWidth:null != (oc = null == (jc = b) ? void 0 : null == (kc = jc.streets[16]) ? void 0 : kc.strokeWidth) ? oc : 5, strokeDashstyle:null != (pc = null == (lc = b) ? void 0 : null == (mc = lc.streets[16]) ? void 0 : mc.strokeDashstyle) ? pc : "dash", };
    var qc, rc, sc, tc, uc, vc, wc, xc, yc;
    d.streets[5] = {strokeColor:null != (wc = null == (qc = b) ? void 0 : null == (rc = qc.streets[5]) ? void 0 : rc.strokeColor) ? wc : "#00FF00", strokeWidth:null != (xc = null == (sc = b) ? void 0 : null == (tc = sc.streets[5]) ? void 0 : tc.strokeWidth) ? xc : 5, strokeDashstyle:null != (yc = null == (uc = b) ? void 0 : null == (vc = uc.streets[5]) ? void 0 : vc.strokeDashstyle) ? yc : "dash", };
    var zc, Ac, Bc, Cc, Dc, Ec, Fc, Gc, Hc;
    d.streets[8] = {strokeColor:null != (Fc = null == (zc = b) ? void 0 : null == (Ac = zc.streets[8]) ? void 0 : Ac.strokeColor) ? Fc : "#82614A", strokeWidth:null != (Gc = null == (Bc = b) ? void 0 : null == (Cc = Bc.streets[8]) ? void 0 : Cc.strokeWidth) ? Gc : 7, strokeDashstyle:null != (Hc = null == (Dc = b) ? void 0 : null == (Ec = Dc.streets[8]) ? void 0 : Ec.strokeDashstyle) ? Hc : "solid", };
    var Ic, Jc, Kc, Lc, Mc, Nc, Oc, Pc, Qc;
    d.streets[15] = {strokeColor:null != (Oc = null == (Ic = b) ? void 0 : null == (Jc = Ic.streets[15]) ? void 0 : Jc.strokeColor) ? Oc : "#FF8000", strokeWidth:null != (Pc = null == (Kc = b) ? void 0 : null == (Lc = Kc.streets[15]) ? void 0 : Lc.strokeWidth) ? Pc : 5, strokeDashstyle:null != (Qc = null == (Mc = b) ? void 0 : null == (Nc = Mc.streets[15]) ? void 0 : Nc.strokeDashstyle) ? Qc : "dashdot", };
    var Rc, Sc, Tc, Uc, Vc, Wc, Xc, Yc, Zc;
    d.streets[18] = {strokeColor:null != (Xc = null == (Rc = b) ? void 0 : null == (Sc = Rc.streets[18]) ? void 0 : Sc.strokeColor) ? Xc : "#FFFFFF", strokeWidth:null != (Yc = null == (Tc = b) ? void 0 : null == (Uc = Tc.streets[18]) ? void 0 : Uc.strokeWidth) ? Yc : 8, strokeDashstyle:null != (Zc = null == (Vc = b) ? void 0 : null == (Wc = Vc.streets[18]) ? void 0 : Wc.strokeDashstyle) ? Zc : "dash", };
    var $c, ad, bd, cd, dd, ed, fd, gd, hd;
    d.streets[17] = {strokeColor:null != (fd = null == ($c = b) ? void 0 : null == (ad = $c.streets[17]) ? void 0 : ad.strokeColor) ? fd : "#00FFB3", strokeWidth:null != (gd = null == (bd = b) ? void 0 : null == (cd = bd.streets[17]) ? void 0 : cd.strokeWidth) ? gd : 7, strokeDashstyle:null != (hd = null == (dd = b) ? void 0 : null == (ed = dd.streets[17]) ? void 0 : ed.strokeDashstyle) ? hd : "solid", };
    var id, jd, kd, ld, md, nd, od, pd, qd;
    d.streets[22] = {strokeColor:null != (od = null == (id = b) ? void 0 : null == (jd = id.streets[22]) ? void 0 : jd.strokeColor) ? od : "#C6C7FF", strokeWidth:null != (pd = null == (kd = b) ? void 0 : null == (ld = kd.streets[22]) ? void 0 : ld.strokeWidth) ? pd : 6, strokeDashstyle:null != (qd = null == (md = b) ? void 0 : null == (nd = md.streets[22]) ? void 0 : nd.strokeDashstyle) ? qd : "solid", };
    var rd, sd, td, ud, vd, wd, xd, yd, zd;
    d.streets[19] = {strokeColor:null != (xd = null == (rd = b) ? void 0 : null == (sd = rd.streets[19]) ? void 0 : sd.strokeColor) ? xd : "#00FF00", strokeWidth:null != (yd = null == (td = b) ? void 0 : null == (ud = td.streets[19]) ? void 0 : ud.strokeWidth) ? yd : 5, strokeDashstyle:null != (zd = null == (vd = b) ? void 0 : null == (wd = vd.streets[19]) ? void 0 : wd.strokeDashstyle) ? zd : "dashdot", };
    var Ad, Bd, Cd, Dd, Ed, Fd, Gd, Hd, Id;
    d.streets[2] = {strokeColor:null != (Gd = null == (Ad = b) ? void 0 : null == (Bd = Ad.streets[2]) ? void 0 : Bd.strokeColor) ? Gd : "#CBA12E", strokeWidth:null != (Hd = null == (Cd = b) ? void 0 : null == (Dd = Cd.streets[2]) ? void 0 : Dd.strokeWidth) ? Hd : 12, strokeDashstyle:null != (Id = null == (Ed = b) ? void 0 : null == (Fd = Ed.streets[2]) ? void 0 : Fd.strokeDashstyle) ? Id : "solid", };
    var Jd, Kd, Ld, Md, Nd, Od, Pd, Qd, Rd;
    d.streets[10] = {strokeColor:null != (Pd = null == (Jd = b) ? void 0 : null == (Kd = Jd.streets[10]) ? void 0 : Kd.strokeColor) ? Pd : "#0000FF", strokeWidth:null != (Qd = null == (Ld = b) ? void 0 : null == (Md = Ld.streets[10]) ? void 0 : Md.strokeWidth) ? Qd : 5, strokeDashstyle:null != (Rd = null == (Nd = b) ? void 0 : null == (Od = Nd.streets[10]) ? void 0 : Od.strokeDashstyle) ? Rd : "dash", };
    var Sd, Td, Ud, Vd, Wd, Xd;
    d.red = {strokeColor:null != (Wd = null == (Sd = b) ? void 0 : null == (Td = Sd.red) ? void 0 : Td.strokeColor) ? Wd : "#FF0000", strokeDashstyle:null != (Xd = null == (Ud = b) ? void 0 : null == (Vd = Ud.red) ? void 0 : Vd.strokeDashstyle) ? Xd : "solid", };
    var Yd, Zd, $d, ae, be, ce, de, ee, fe;
    d.roundabout = {strokeColor:null != (de = null == (Yd = b) ? void 0 : null == (Zd = Yd.roundabout) ? void 0 : Zd.strokeColor) ? de : "#111", strokeWidth:null != (ee = null == ($d = b) ? void 0 : null == (ae = $d.roundabout) ? void 0 : ae.strokeWidth) ? ee : 1, strokeDashstyle:null != (fe = null == (be = b) ? void 0 : null == (ce = be.roundabout) ? void 0 : ce.strokeDashstyle) ? fe : "dash", };
    var ge, he, ie, je, ke, le, me, ne;
    d.lanes = {strokeColor:null != (le = null == (ge = b) ? void 0 : null == (he = ge.lanes) ? void 0 : he.strokeColor) ? le : "#454443", strokeDashstyle:null != (me = null == (ie = b) ? void 0 : null == (je = ie.lanes) ? void 0 : je.strokeDashstyle) ? me : "dash", strokeOpacity:null != (ne = null == Z ? void 0 : null == (ke = Z.lanes) ? void 0 : ke.strokeOpacity) ? ne : 0.9, };
    var oe, pe, qe, re, se, te, ue, ve, we;
    d.toll = {strokeColor:null != (ue = null == (oe = b) ? void 0 : null == (pe = oe.toll) ? void 0 : pe.strokeColor) ? ue : "#00E1FF", strokeDashstyle:null != (ve = null == (qe = b) ? void 0 : null == (re = qe.toll) ? void 0 : re.strokeDashstyle) ? ve : "solid", strokeOpacity:null != (we = null == (se = b) ? void 0 : null == (te = se.toll) ? void 0 : te.strokeOpacity) ? we : 1.0, };
    var xe, ye, ze, Ae, Be, Ce, De, Ee, Fe;
    d.closure = {strokeColor:null != (De = null == (xe = b) ? void 0 : null == (ye = xe.closure) ? void 0 : ye.strokeColor) ? De : "#FF00FF", strokeOpacity:null != (Ee = null == (ze = b) ? void 0 : null == (Ae = ze.closure) ? void 0 : Ae.strokeOpacity) ? Ee : 1.0, strokeDashstyle:null != (Fe = null == (Be = b) ? void 0 : null == (Ce = Be.closure) ? void 0 : Ce.strokeDashstyle) ? Fe : "dash", };
    var Ge, He, Ie, Je, Ke, Le, Me, Ne, Oe;
    d.headlights = {strokeColor:null != (Me = null == (Ge = b) ? void 0 : null == (He = Ge.headlights) ? void 0 : He.strokeColor) ? Me : "#bfff00", strokeOpacity:null != (Ne = null == (Ie = b) ? void 0 : null == (Je = Ie.headlights) ? void 0 : Je.strokeOpacity) ? Ne : 0.9, strokeDashstyle:null != (Oe = null == (Ke = b) ? void 0 : null == (Le = Ke.headlights) ? void 0 : Le.strokeDashstyle) ? Oe : "dot", };
    var Pe, Qe, Re, Se, Te, Ue, Ve, We, Xe;
    d.nearbyHOV = {strokeColor:null != (Ve = null == (Pe = b) ? void 0 : null == (Qe = Pe.nearbyHOV) ? void 0 : Qe.strokeColor) ? Ve : "#ff66ff", strokeOpacity:null != (We = null == (Re = b) ? void 0 : null == (Se = Re.nearbyHOV) ? void 0 : Se.strokeOpacity) ? We : 1.0, strokeDashstyle:null != (Xe = null == (Te = b) ? void 0 : null == (Ue = Te.nearbyHOV) ? void 0 : Ue.strokeDashstyle) ? Xe : "dash", };
    var Ye, Ze, $e, af, bf, cf, df, ef, ff;
    d.restriction = {strokeColor:null != (df = null == (Ye = b) ? void 0 : null == (Ze = Ye.restriction) ? void 0 : Ze.strokeColor) ? df : "#F2FF00", strokeOpacity:null != (ef = null == ($e = b) ? void 0 : null == (af = $e.restriction) ? void 0 : af.strokeOpacity) ? ef : 1.0, strokeDashstyle:null != (ff = null == (bf = b) ? void 0 : null == (cf = bf.restriction) ? void 0 : cf.strokeDashstyle) ? ff : "dash", };
    var gf, hf, jf, kf, lf, mf, nf, of, pf;
    d.dirty = {strokeColor:null != (nf = null == (gf = b) ? void 0 : null == (hf = gf.dirty) ? void 0 : hf.strokeColor) ? nf : "#82614A", strokeOpacity:null != (of = null == (jf = b) ? void 0 : null == (kf = jf.dirty) ? void 0 : kf.strokeOpacity) ? of : 0.6, strokeDashstyle:null != (pf = null == (lf = b) ? void 0 : null == (mf = lf.dirty) ? void 0 : mf.strokeDashstyle) ? pf : "longdash", };
    d.speeds = {};
    var qf, rf, sf;
    d.speeds["default"] = null != (sf = null == (qf = b) ? void 0 : null == (rf = qf.speed) ? void 0 : rf["default"]) ? sf : "#cc0000";
    var tf, uf;
    if (null == (tf = b) ? 0 : null == (uf = tf.speeds) ? 0 : uf.metric) {
      d.speeds.metric = b.speeds.metric;
    } else {
      d.speeds.metric = {};
      var vf, wf, xf;
      d.speeds.metric[5] = null != (xf = null == (vf = b) ? void 0 : null == (wf = vf.speeds) ? void 0 : wf.metric[5]) ? xf : "#542344";
      var yf, zf, Af;
      d.speeds.metric[7] = null != (Af = null == (yf = b) ? void 0 : null == (zf = yf.speeds) ? void 0 : zf.metric[7]) ? Af : "#ff5714";
      var Bf, Cf, Df;
      d.speeds.metric[10] = null != (Df = null == (Bf = b) ? void 0 : null == (Cf = Bf.speeds) ? void 0 : Cf.metric[10]) ? Df : "#ffbf00";
      var Ef, Ff, Gf;
      d.speeds.metric[20] = null != (Gf = null == (Ef = b) ? void 0 : null == (Ff = Ef.speeds) ? void 0 : Ff.metric[20]) ? Gf : "#ee0000";
      var Hf, If, Jf;
      d.speeds.metric[30] = null != (Jf = null == (Hf = b) ? void 0 : null == (If = Hf.speeds) ? void 0 : If.metric[30]) ? Jf : "#e4ff1a";
      var Kf, Lf, Mf;
      d.speeds.metric[40] = null != (Mf = null == (Kf = b) ? void 0 : null == (Lf = Kf.speeds) ? void 0 : Lf.metric[40]) ? Mf : "#993300";
      var Nf, Of, Pf;
      d.speeds.metric[50] = null != (Pf = null == (Nf = b) ? void 0 : null == (Of = Nf.speeds) ? void 0 : Of.metric[50]) ? Pf : "#33ff33";
      var Qf, Rf, Sf;
      d.speeds.metric[60] = null != (Sf = null == (Qf = b) ? void 0 : null == (Rf = Qf.speeds) ? void 0 : Rf.metric[60]) ? Sf : "#639fab";
      var Tf, Uf, Vf;
      d.speeds.metric[70] = null != (Vf = null == (Tf = b) ? void 0 : null == (Uf = Tf.speeds) ? void 0 : Uf.metric[70]) ? Vf : "#00ffff";
      var Wf, Xf, Yf;
      d.speeds.metric[80] = null != (Yf = null == (Wf = b) ? void 0 : null == (Xf = Wf.speeds) ? void 0 : Xf.metric[80]) ? Yf : "#00bfff";
      var Zf, $f, ag;
      d.speeds.metric[90] = null != (ag = null == (Zf = b) ? void 0 : null == ($f = Zf.speeds) ? void 0 : $f.metric[90]) ? ag : "#0066ff";
      var bg, cg, dg;
      d.speeds.metric[100] = null != (dg = null == (bg = b) ? void 0 : null == (cg = bg.speeds) ? void 0 : cg.metric[100]) ? dg : "#ff00ff";
      var eg, fg, gg;
      d.speeds.metric[110] = null != (gg = null == (eg = b) ? void 0 : null == (fg = eg.speeds) ? void 0 : fg.metric[110]) ? gg : "#ff0080";
      var hg, ig, jg;
      d.speeds.metric[120] = null != (jg = null == (hg = b) ? void 0 : null == (ig = hg.speeds) ? void 0 : ig.metric[120]) ? jg : "#ff0000";
      var kg, lg, mg;
      d.speeds.metric[130] = null != (mg = null == (kg = b) ? void 0 : null == (lg = kg.speeds) ? void 0 : lg.metric[130]) ? mg : "#ff9000";
      var ng, og, pg;
      d.speeds.metric[140] = null != (pg = null == (ng = b) ? void 0 : null == (og = ng.speeds) ? void 0 : og.metric[140]) ? pg : "#ff4000";
      var qg, rg, sg;
      d.speeds.metric[150] = null != (sg = null == (qg = b) ? void 0 : null == (rg = qg.speeds) ? void 0 : rg.metric[150]) ? sg : "#0040ff";
    }
    var tg, ug;
    if (null == (tg = b) ? 0 : null == (ug = tg.speeds) ? 0 : ug.imperial) {
      d.speeds.imperial = b.speeds.imperial;
    } else {
      d.speeds.imperial = {};
      var vg, wg, xg;
      d.speeds.imperial[5] = null != (xg = null == (vg = b) ? void 0 : null == (wg = vg.speeds) ? void 0 : wg.imperial[5]) ? xg : "#ff0000";
      var yg, zg, Ag;
      d.speeds.imperial[10] = null != (Ag = null == (yg = b) ? void 0 : null == (zg = yg.speeds) ? void 0 : zg.imperial[10]) ? Ag : "#ff8000";
      var Bg, Cg, Dg;
      d.speeds.imperial[15] = null != (Dg = null == (Bg = b) ? void 0 : null == (Cg = Bg.speeds) ? void 0 : Cg.imperial[15]) ? Dg : "#ffb000";
      var Eg, Fg, Gg;
      d.speeds.imperial[20] = null != (Gg = null == (Eg = b) ? void 0 : null == (Fg = Eg.speeds) ? void 0 : Fg.imperial[20]) ? Gg : "#bfff00";
      var Hg, Ig, Jg;
      d.speeds.imperial[25] = null != (Jg = null == (Hg = b) ? void 0 : null == (Ig = Hg.speeds) ? void 0 : Ig.imperial[25]) ? Jg : "#993300";
      var Kg, Lg, Mg;
      d.speeds.imperial[30] = null != (Mg = null == (Kg = b) ? void 0 : null == (Lg = Kg.speeds) ? void 0 : Lg.imperial[30]) ? Mg : "#33ff33";
      var Ng, Og, Pg;
      d.speeds.imperial[35] = null != (Pg = null == (Ng = b) ? void 0 : null == (Og = Ng.speeds) ? void 0 : Og.imperial[35]) ? Pg : "#00ff90";
      var Qg, Rg, Sg;
      d.speeds.imperial[40] = null != (Sg = null == (Qg = b) ? void 0 : null == (Rg = Qg.speeds) ? void 0 : Rg.imperial[40]) ? Sg : "#00ffff";
      var Tg, Ug, Vg;
      d.speeds.imperial[45] = null != (Vg = null == (Tg = b) ? void 0 : null == (Ug = Tg.speeds) ? void 0 : Ug.imperial[45]) ? Vg : "#00bfff";
      var Wg, Xg, Yg;
      d.speeds.imperial[50] = null != (Yg = null == (Wg = b) ? void 0 : null == (Xg = Wg.speeds) ? void 0 : Xg.imperial[50]) ? Yg : "#0066ff";
      var Zg, $g, ah;
      d.speeds.imperial[55] = null != (ah = null == (Zg = b) ? void 0 : null == ($g = Zg.speeds) ? void 0 : $g.imperial[55]) ? ah : "#ff00ff";
      var bh, ch, dh;
      d.speeds.imperial[60] = null != (dh = null == (bh = b) ? void 0 : null == (ch = bh.speeds) ? void 0 : ch.imperial[60]) ? dh : "#ff0050";
      var eh, fh, gh;
      d.speeds.imperial[65] = null != (gh = null == (eh = b) ? void 0 : null == (fh = eh.speeds) ? void 0 : fh.imperial[65]) ? gh : "#ff9010";
      var hh, ih, jh;
      d.speeds.imperial[70] = null != (jh = null == (hh = b) ? void 0 : null == (ih = hh.speeds) ? void 0 : ih.imperial[70]) ? jh : "#0040ff";
      var kh, lh, mh;
      d.speeds.imperial[75] = null != (mh = null == (kh = b) ? void 0 : null == (lh = kh.speeds) ? void 0 : lh.imperial[75]) ? mh : "#10ff10";
      var nh, oh, ph;
      d.speeds.imperial[80] = null != (ph = null == (nh = b) ? void 0 : null == (oh = nh.speeds) ? void 0 : oh.imperial[80]) ? ph : "#ff4000";
      var qh, rh, sh;
      d.speeds.imperial[85] = null != (sh = null == (qh = b) ? void 0 : null == (rh = qh.speeds) ? void 0 : rh.imperial[85]) ? sh : "#ff0000";
    }
    ya(d);
    return c;
  }
  function za(a) {
    if (d.showSLSinglecolor) {
      return d.SLColor;
    }
    var c;
    return null != (c = d.speeds[W.prefs.attributes.isImperial ? "imperial" : "metric"][W.prefs.attributes.isImperial ? Math.round(a / 1.609344) : a]) ? c : d.speeds["default"];
  }
  function th(a, c, b) {
    a ? (a = b.x - c.x, c = b.y - c.y) : (a = c.x - b.x, c = c.y - b.y);
    return 180 * Math.atan2(a, c) / Math.PI;
  }
  function qa(a) {
    var c = "";
    if (a) {
      var b = a;
      !0 === W.prefs.attributes.isImperial && (b = Math.round(a / 1.609344));
      b = b.toString();
      for (a = 0; a < b.length; a += 1) {
        c += Yh[b.charAt(a)];
      }
    }
    return c;
  }
  function uh(a, c, b) {
    b = void 0 === b ? !1 : b;
    var e, f, h = [];
    var m = null;
    var l = a.getAttributes(), q = a.getAddress(), u = a.hasNonEmptyStreet();
    if (null !== l.primaryStreetID && void 0 === q.attributes.state) {
      x("Address not ready", q, l), setTimeout(function() {
        uh(a, c, !0);
      }, 500);
    } else {
      var p = q.attributes;
      q = "";
      u ? q = p.street.name : 10 > l.roadType && !a.isInRoundabout() && (q = "\u2691");
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
      (null != (e = l.fwdMaxSpeed) ? e : l.revMaxSpeed) && d.showSLtext && (l.fwdMaxSpeed === l.revMaxSpeed ? p = qa(l.fwdMaxSpeed) : l.fwdMaxSpeed ? (p = qa(l.fwdMaxSpeed), l.revMaxSpeed && (p += "'" + qa(l.revMaxSpeed))) : (p = qa(l.revMaxSpeed), l.fwdMaxSpeed && (p += "'" + qa(l.fwdMaxSpeed))), l.fwdMaxSpeedUnverified || l.revMaxSpeedUnverified) && (p += "?");
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
      g = vh * e.length;
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
        a.isOneWay() || (f = "");
        m.attributes.label = f + e + f + u;
        m.attributes.angle = D;
        m.attributes.a = 1 === F % 2;
        m.attributes.u = v;
        --v;
        h.push(m);
      }
    }
    b && m && A.addFeatures(h, {silent:!0});
    return h;
  }
  function wh(a) {
    var c = a.id, b = a.rev, e = a.j, f = a.l;
    a = th(a.i, b ? f : e, b ? e : f);
    return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(e.x + 10 * Math.sin(a), e.y + 10 * Math.cos(a)), {myId:c, }, {rotation:a, externalGraphic:"https://raw.githubusercontent.com/bedo2991/svl/master/average.png", graphicWidth:36, graphicHeight:36, graphicZIndex:300, fillOpacity:1, pointerEvents:"none", });
  }
  function Zh(a) {
    var c = a.getAttributes();
    x("Drawing segment: " + c.id);
    var b = c.geometry.components, e = c.geometry.getVertices(), f = (new OpenLayers.Geometry.LineString(e)).simplify(1.5).components, h = [], m = 100 * c.level, l = c.fwdDirection && c.revDirection, q = a.isInRoundabout(), u = !1, p = !1, y = c.roadType, v = Xh({s:c.width, roadType:y, v:l, });
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
        if (C = d.showDashedUnverifiedSL && (c.fwdMaxSpeedUnverified || c.revMaxSpeedUnverified) ? "dash" : "solid", d.showSLSinglecolor || !c.fwdMaxSpeed && !c.revMaxSpeed || c.fwdMaxSpeed === c.revMaxSpeed || a.isOneWay()) {
          p = c.fwdMaxSpeed, a.isOneWay() && c.revDirection && (p = c.revMaxSpeed), p && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:za(p), width:u ? 0.8 * v : v, dash:C, a:!0, zIndex:m + 115, }), h.push(g));
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
      u = a.getLockRank() + 1;
      var J, B;
      if (u > d.fakelock || u > (null == (J = WazeWrap) ? void 0 : null == (B = J.User) ? void 0 : B.Rank())) {
        g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:xh.strokeColor, width:0.1 * l, dash:xh.strokeDashstyle, zIndex:m + 147, }), h.push(g);
      }
      J = a.getFlagAttributes();
      J.unpaved && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.dirty.strokeColor, width:0.7 * l, opacity:d.dirty.strokeOpacity, dash:d.dirty.strokeDashstyle, zIndex:m + 135, }), h.push(g));
      c.hasClosures && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.closure.strokeColor, width:0.6 * l, dash:d.closure.strokeDashstyle, opacity:d.closure.strokeOpacity, a:!0, zIndex:m + 140, }), h.push(g));
      if (c.fwdToll || c.revToll || c.restrictions.some(function(U) {
        return "TOLL" === U.getDefaultType();
      })) {
        g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.toll.strokeColor, width:0.3 * l, dash:d.toll.strokeDashstyle, opacity:d.toll.strokeOpacity, zIndex:m + 145, }), h.push(g);
      }
      q && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:Aa.strokeColor, width:0.15 * l, dash:Aa.strokeDashstyle, opacity:Aa.strokeOpacity, a:!0, zIndex:m + 150, }), h.push(g));
      0 < c.restrictions.length && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.restriction.strokeColor, width:0.4 * l, dash:d.restriction.strokeDashstyle, opacity:d.restriction.strokeOpacity, a:!0, zIndex:m + 155, }), h.push(g));
      !1 === c.validated && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:yh.strokeColor, width:0.5 * l, dash:yh.strokeDashstyle, a:!0, zIndex:m + 160, }), h.push(g));
      J.headlights && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.headlights.strokeColor, width:0.2 * l, dash:d.headlights.strokeDashstyle, opacity:d.headlights.strokeOpacity, a:!0, zIndex:m + 165, }));
      J.nearbyHOV && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.nearbyHOV.strokeColor, width:0.25 * l, dash:d.nearbyHOV.strokeDashstyle, opacity:d.nearbyHOV.strokeOpacity, a:!0, zIndex:m + 166, }));
      0 < c.fwdLaneCount && (B = e.slice(-2), B[0] = (new OpenLayers.Geometry.LineString([B[0], B[1], ])).getCentroid(!0), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(B), {myId:c.id, color:d.lanes.strokeColor, width:0.3 * l, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:m + 170, }), h.push(g));
      0 < c.revLaneCount && (B = e.slice(0, 2), B[1] = (new OpenLayers.Geometry.LineString([B[0], B[1], ])).getCentroid(!0), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(B), {myId:c.id, color:d.lanes.strokeColor, width:0.3 * l, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:m + 175, }), h.push(g));
      if (!1 === c.fwdDirection || !1 === c.revDirection) {
        if (B = b, !q && c.length / b.length < d.arrowDeclutter && (B = f), !1 === (c.fwdDirection || c.revDirection)) {
          for (u = 0; u < B.length - 1; u += 1) {
            h.push(new OpenLayers.Feature.Vector((new OpenLayers.Geometry.LineString([B[u], B[u + 1], ])).getCentroid(!0), {myId:c.id, a:!0, h:!0, zIndex:m + 180, }, $h));
          }
        } else {
          for (u = q ? 3 : 1, y = u - 1; y < B.length - 1; y += u) {
            v = th(c.fwdDirection, B[y], B[y + 1]), C = new OpenLayers.Geometry.LineString([B[y], B[y + 1], ]), h.push(new OpenLayers.Feature.Vector(C.getCentroid(!0), {myId:c.id, a:!0, h:!0, }, {graphicName:"myTriangle", rotation:v, stroke:!0, strokeColor:"#000", graphiczIndex:m + 180, strokeWidth:1.5, fill:!0, fillColor:"#fff", fillOpacity:0.7, pointRadius:5, }));
          }
        }
      }
      J.fwdSpeedCamera && h.push(wh({id:c.id, rev:!1, i:c.fwdDirection, j:b[0], l:b[1], }));
      J.revSpeedCamera && h.push(wh({id:c.id, rev:!0, i:c.fwdDirection, j:b[b.length - 1], l:b[b.length - 2], }));
      if (!0 === d.renderGeomNodes && !q) {
        for (q = 1; q < b.length - 2; q += 1) {
          h.push(new OpenLayers.Feature.Vector(b[q], {myId:c.id, zIndex:m + 200, a:!0, h:!0, }, ai));
        }
      }
      J.tunnel && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:Ba.strokeColor, opacity:Ba.strokeOpacity, width:0.3 * l, dash:Ba.strokeDashstyle, zIndex:m + 177, }), h.push(g), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:zh.strokeColor, width:0.1 * l, dash:zh.strokeDashstyle, zIndex:m + 177, }), h.push(g));
    }
    a = uh(a, f);
    0 < a.length && A.addFeatures(a, {silent:!0});
    return h;
  }
  function Ah(a) {
    a = a.getAttributes();
    var c = new OpenLayers.Geometry.Point(a.geometry.x, a.geometry.y);
    return new OpenLayers.Feature.Vector(c, {myid:a.id, }, Bh(a));
  }
  function bi() {
    Z();
    aa(d);
    ba();
    w("info", "All's well that ends well! Now it's everything as it was before.");
  }
  function ci() {
    GM_setClipboard(JSON.stringify(d));
    w("info", "The configuration has been copied to your clipboard. Please paste it in a file (CTRL+V) to store it.");
  }
  function Wh(a, c) {
    if (null !== c && "" !== c) {
      try {
        d = JSON.parse(c);
      } catch (b) {
        w("error", "Your string seems to be somehow wrong. Please check that is a valid JSON string");
        return;
      }
      null !== d && d.streets ? (aa(d), ya(d), ba(), w("success", "Done, preferences imported!")) : w("error", "Something went wrong. Is your string correct?");
    }
  }
  function Ch() {
    var a = parseInt(W.map.getLayerByUniqueName("gps_points").getZIndex(), 10);
    d.showUnderGPSPoints ? (z.setZIndex(a - 2), E.setZIndex(a - 1)) : (z.setZIndex(a + 1), E.setZIndex(a + 2));
  }
  function Dh() {
    if (d.routingModeEnabled) {
      var a = document.createElement("div");
      a.id = "routingModeDiv";
      a.className = "routingDiv";
      a.innerHTML = "Routing Mode<br><small>Hover to temporary disable it<small>";
      a.addEventListener("mouseenter", function() {
        d.routingModeEnabled = !1;
        X();
      });
      a.addEventListener("mouseleave", function() {
        d.routingModeEnabled = !0;
        X();
      });
      document.getElementById("map").appendChild(a);
    } else {
      null == (a = document.getElementById("routingModeDiv")) || a.remove();
    }
  }
  function Eh() {
    clearInterval(Ca);
    Ca = null;
    d.autoReload && d.autoReload.enabled && (Ca = setInterval(R, d.autoReload.interval));
  }
  function Fh() {
    document.getElementById("svl_saveNewPref").classList.remove("disabled");
    document.getElementById("svl_saveNewPref").classList.add("btn-primary");
    document.getElementById("svl_rollbackButton").classList.remove("disabled");
    document.getElementById("sidepanel-svl").classList.add("svl_unsaved");
    for (var a = 0; a < d.streets.length; a += 1) {
      d.streets[a] && (d.streets[a] = {}, d.streets[a].strokeColor = document.getElementById("svl_streetColor_" + a).value, d.streets[a].strokeWidth = document.getElementById("svl_streetWidth_" + a).value, d.streets[a].strokeDashstyle = document.querySelector("#svl_strokeDashstyle_" + a + " option:checked").value);
    }
    d.fakelock = document.getElementById("svl_fakelock").value;
    a = W.prefs.attributes.isImperial ? "imperial" : "metric";
    var c = Object.keys(d.speeds[a]);
    d.speeds[a] = {};
    for (var b = 1; b < c.length + 1; b += 1) {
      d.speeds[a][document.getElementById("svl_slValue_" + a + "_" + b).value] = document.getElementById("svl_slColor_" + a + "_" + b).value;
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
    d.showUnderGPSPoints !== document.getElementById("svl_showUnderGPSPoints").checked ? (d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked, Ch()) : d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked;
    d.routingModeEnabled !== document.getElementById("svl_routingModeEnabled").checked ? (d.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked, Dh()) : d.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked;
    d.useWMERoadLayerAtZoom = document.getElementById("svl_useWMERoadLayerAtZoom").value;
    d.switchZoom = document.getElementById("svl_switchZoom").value;
    d.showANs = document.getElementById("svl_showANs").checked;
    d.realsize = document.getElementById("svl_realsize").checked;
    d.realsize ? $("input.segmentsWidth").prop("disabled", !0) : $("input.segmentsWidth").prop("disabled", !1);
    aa(d);
    Eh();
  }
  function di() {
    Fh();
    ya(d, !1);
    ba();
  }
  function ei() {
    x("rollbackDefault");
    WazeWrap.Alerts.confirm(GM_info.script.name, "Are you sure you want to rollback to the default settings?\nANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!", n, null, "Yes, I want to reset", "Cancel");
  }
  function Gh(a) {
    var c = I18n.translations[I18n.locale];
    switch(a) {
      case "red":
        var b, e, f;
        return null != (f = null == c ? void 0 : null == (b = c.segment) ? void 0 : null == (e = b.address) ? void 0 : e.none) ? f : a;
      case "toll":
        var h, m, l, q;
        return null != (q = null == c ? void 0 : null == (h = c.edit) ? void 0 : null == (m = h.segment) ? void 0 : null == (l = m.fields) ? void 0 : l.toll_road) ? q : a;
      case "restriction":
        var u, p, y;
        return null != (y = null == c ? void 0 : null == (u = c.restrictions) ? void 0 : null == (p = u.modal_headers) ? void 0 : p.restriction_summary) ? y : a;
      case "dirty":
        var v, g, C, F;
        return null != (F = null == c ? void 0 : null == (v = c.edit) ? void 0 : null == (g = v.segment) ? void 0 : null == (C = g.fields) ? void 0 : C.unpaved) ? F : a;
      case "closure":
        var D, t, G;
        return null != (G = null == c ? void 0 : null == (D = c.objects) ? void 0 : null == (t = D.roadClosure) ? void 0 : t.name) ? G : a;
      case "headlights":
        var K, S, J, B;
        return null != (B = null == c ? void 0 : null == (K = c.edit) ? void 0 : null == (S = K.segment) ? void 0 : null == (J = S.fields) ? void 0 : J.headlights) ? B : a;
      case "lanes":
        var U, da, ea;
        return null != (ea = null == c ? void 0 : null == (U = c.objects) ? void 0 : null == (da = U.lanes) ? void 0 : da.title) ? ea : a;
      case "speed limit":
        var fa, ha, ia, ja;
        return null != (ja = null == c ? void 0 : null == (fa = c.edit) ? void 0 : null == (ha = fa.segment) ? void 0 : null == (ia = ha.fields) ? void 0 : ia.speed_limit) ? ja : a;
      case "nearbyHOV":
        var ka, la, ma, na;
        return null != (na = null == c ? void 0 : null == (ka = c.edit) ? void 0 : null == (la = ka.segment) ? void 0 : null == (ma = la.fields) ? void 0 : ma.nearbyHOV) ? na : a;
    }
    var oa, pa;
    return null != (pa = null == c ? void 0 : null == (oa = c.segment) ? void 0 : oa.road_types[a]) ? pa : a;
  }
  function P(a) {
    var c = a.f, b = void 0 === a.c ? !0 : a.c, e = void 0 === a.b ? !1 : a.b;
    a = document.createElement("h5");
    a.innerText = Gh(c);
    var f = document.createElement("input");
    f.id = "svl_streetColor_" + c;
    f.className = "prefElement form-control";
    f.style.width = "55pt";
    f.title = "Color";
    f.type = "color";
    var h = document.createElement("div");
    b && (b = document.createElement("input"), b.id = "svl_streetWidth_" + c, b.className = Number.isInteger(c) ? "form-control prefElement segmentsWidth" : "form-control prefElement", b.style.width = "40pt", b.title = "Width (disabled if using real-size width)", b.type = "number", b.min = 1, b.max = 20, h.appendChild(b));
    e && (b = document.createElement("input"), b.id = "svl_streetOpacity_" + c, b.className = "form-control prefElement", b.style.width = "45pt", b.title = "Opacity", b.type = "number", b.min = 0, b.max = 100, b.step = 10, h.appendChild(b));
    b = document.createElement("select");
    b.className = "prefElement";
    b.title = "Stroke style";
    b.id = "svl_strokeDashstyle_" + c;
    b.innerHTML = '<option value="solid">Solid</option><option value="dash">Dashed</option><option value="dashdot">Dash Dot</option><option value="longdash">Long Dash</option><option value="longdashdot">Long Dash Dot</option><option value="dot">Dot</option>';
    b.className = "form-control prefElement";
    h.className = "expand";
    h.appendChild(f);
    h.appendChild(b);
    c = document.createElement("div");
    c.className = "prefLineStreets";
    c.appendChild(a);
    c.appendChild(h);
    return c;
  }
  function ta(a, c) {
    var b = (c = void 0 === c ? !0 : c) ? "metric" : "imperial", e = document.createElement("label");
    e.innerText = -1 !== a ? a : "Default";
    var f = document.createElement("div");
    f.appendChild(e);
    "number" === typeof a && (e = document.createElement("input"), e.id = "svl_slValue_" + b + "_" + a, e.className = "form-control prefElement", e.style.width = "50pt", e.title = "Speed Limit Value", e.type = "number", e.min = 0, e.max = 150, f.appendChild(e), e = document.createElement("span"), e.innerText = c ? "km/h" : "mph", f.appendChild(e));
    c = document.createElement("input");
    c.id = "svl_slColor_" + b + "_" + a;
    c.className = "prefElement form-control";
    c.style.width = "55pt";
    c.title = "Color";
    c.type = "color";
    f.className = "expand";
    f.appendChild(c);
    a = document.createElement("div");
    a.className = "svl_" + b + " prefLineSL";
    a.appendChild(f);
    return a;
  }
  function Hh() {
    return {streets:["red"], decorations:"lanes toll restriction closure headlights dirty nearbyHOV".split(" "), };
  }
  function ba() {
    document.getElementById("svl_saveNewPref").classList.add("disabled");
    document.getElementById("svl_rollbackButton").classList.add("disabled");
    document.getElementById("svl_saveNewPref").classList.remove("btn-primary");
    document.getElementById("sidepanel-svl").classList.remove("svl_unsaved");
    for (var a = 0; a < d.streets.length; a += 1) {
      d.streets[a] && (document.getElementById("svl_streetWidth_" + a).value = d.streets[a].strokeWidth, document.getElementById("svl_streetColor_" + a).value = d.streets[a].strokeColor, document.getElementById("svl_strokeDashstyle_" + a).value = d.streets[a].strokeDashstyle);
    }
    a = Hh();
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
    var c, b, e;
    document.getElementById("svl_fakelock").value = null != (e = null == (c = WazeWrap) ? void 0 : null == (b = c.User) ? void 0 : b.Rank()) ? e : 7;
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
    c = (e = W.prefs.attributes.isImperial) ? "imperial" : "metric";
    b = Object.keys(d.speeds[c]);
    document.querySelectorAll(e ? ".svl_metric" : ".svl_imperial").forEach(function(f) {
      f.style.display = "none";
    });
    document.querySelectorAll(".svl_" + c).forEach(function(f) {
      f.style.display = "block";
    });
    for (e = 1; e < b.length + 1; e += 1) {
      document.getElementById("svl_slValue_" + c + "_" + e).value = b[e - 1], document.getElementById("svl_slColor_" + c + "_" + e).value = d.speeds[c][b[e - 1]];
    }
    document.getElementById("svl_slColor_" + c + "_Default").value = d.speeds["default"];
  }
  function L(a) {
    var c = a.id, b = a.title;
    a = a.description;
    var e = document.createElement("div");
    e.className = "prefLineCheckbox";
    var f = document.createElement("label");
    f.innerText = b;
    b = document.createElement("input");
    b.className = "prefElement";
    b.title = "True or False";
    b.id = "svl_" + c;
    b.type = "checkbox";
    b.checked = d[c];
    f.appendChild(b);
    e.appendChild(f);
    c = document.createElement("i");
    c.innerText = a;
    e.appendChild(c);
    return e;
  }
  function V(a) {
    var c = a.id, b = a.title, e = a.description, f = a.min, h = a.max, m = a.step;
    a = document.createElement("div");
    a.className = "prefLineInteger";
    var l = document.createElement("label");
    l.innerText = b;
    b = document.createElement("input");
    b.className = "prefElement form-control";
    b.title = "Insert a number";
    b.id = "svl_" + c;
    b.type = "number";
    b.min = f;
    b.max = h;
    b.step = m;
    l.appendChild(b);
    a.appendChild(l);
    e && (c = document.createElement("i"), c.innerText = e, a.appendChild(c));
    return a;
  }
  function ra(a) {
    var c = a.id, b = a.title, e = a.description, f = a.min, h = a.max, m = a.step;
    a = document.createElement("div");
    a.className = "prefLineSlider";
    var l = document.createElement("label");
    l.innerText = b;
    b = document.createElement("input");
    b.className = "prefElement form-control";
    b.title = "Pick a value using the slider";
    b.id = "svl_" + c;
    b.type = "range";
    b.min = f;
    b.max = h;
    b.step = m;
    l.appendChild(b);
    a.appendChild(l);
    e && (c = document.createElement("i"), c.innerText = e, a.appendChild(c));
    return a;
  }
  function Y(a, c) {
    var b = document.createElement("details");
    b.open = void 0 === c ? !1 : c;
    c = document.createElement("summary");
    c.innerText = a;
    b.appendChild(c);
    return b;
  }
  function fi() {
    var a = document.createElement("style");
    a.innerHTML = "\n        <style>\n        #sidepanel-svl details{margin-bottom:9pt;}\n        .svl_unsaved{background-color:#ffcc00}\n        .expand{display:flex; width:100%; justify-content:space-around;align-items: center;}\n        .prefLineCheckbox{width:100%; margin-bottom:1vh;}\n        .prefLineCheckbox label{display:block;width:100%}\n        .prefLineCheckbox input{float:right;}\n        .prefLineInteger{width:100%; margin-bottom:1vh;}\n        .prefLineInteger label{display:block;width:100%}\n        .prefLineInteger input{float:right;}\n        .prefLineSlider {width:100%; margin-bottom:1vh;}\n        .prefLineSlider label{display:block;width:100%}\n        .prefLineSlider input{float:right;}\n        .svl_logo {width:130px; display:inline-block; float:right}\n        #sidepanel-svl h5{text-transform: capitalize;}\n        .svl_support-link{display:inline-block; width:100%; text-align:center;}\n        .svl_buttons{clear:both; position:sticky; padding: 1vh; background-color:#eee; top:0; }\n        .routingDiv{opacity: 0.95; font-size:1.2em; border:0.2em #000 solid; position:absolute; top:3em; right:2em; padding:0.5em; background-color:#b30000}\n        #sidepanel-svl summary{font-weight:bold; margin:10px;}</style>";
    document.body.appendChild(a);
    a = document.createElement("div");
    var c = document.createElement("img");
    c.className = "svl_logo";
    c.src = "https://raw.githubusercontent.com/bedo2991/svl/master/logo.png";
    c.alt = "Street Vector Layer Logo";
    a.appendChild(c);
    c = document.createElement("span");
    c.innerText = "Thanks for using";
    a.appendChild(c);
    c = document.createElement("h4");
    c.innerText = "Street Vector Layer";
    a.appendChild(c);
    c = document.createElement("span");
    c.innerText = "Version 5.0.6";
    a.appendChild(c);
    c = document.createElement("a");
    c.innerText = "Something not working? Report it here.";
    c.href = GM_info.script.supportURL;
    c.target = "_blank";
    c.className = "svl_support-link";
    a.appendChild(c);
    c = document.createElement("button");
    c.id = "svl_saveNewPref";
    c.type = "button";
    c.className = "btn disabled waze-icon-save";
    c.innerText = "Save";
    c.title = "Save your edited settings";
    var b = document.createElement("button");
    b.id = "svl_rollbackButton";
    b.type = "button";
    b.className = "btn btn-default disabled";
    b.innerText = "Rollback";
    b.title = "Discard your temporary changes";
    var e = document.createElement("button");
    e.id = "svl_resetButton";
    e.type = "button";
    e.className = "btn btn-default";
    e.innerText = "Reset";
    e.title = "Overwrite your current settings with the default ones";
    var f = document.createElement("div");
    f.className = "svl_buttons expand";
    f.appendChild(c);
    f.appendChild(b);
    f.appendChild(e);
    a.appendChild(f);
    var h = Y("Roads Properties", !0);
    h.appendChild(L({id:"realsize", title:"Use real-life Width", description:"When enabled, the segments thickness will be computed from the segments width instead of using the value set in the preferences", }));
    for (c = 0; c < d.streets.length; c += 1) {
      d.streets[c] && h.appendChild(P({f:c, c:!0, b:!1}));
    }
    f = Y("Segments Decorations");
    e = Y("Rendering Parameters");
    b = Y("Performance Tuning");
    c = Y("Speed Limits");
    Hh().streets.forEach(function(m) {
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
    h.appendChild(L({id:"showANs", title:"Show Alternative Names", description:"When enabled, at most 2 ANs that differ from the primary name are shown under the street name.", }));
    a.appendChild(h);
    e.appendChild(V({id:"layerOpacity", title:"Layer Opacity", description:"10: almost invisible, 100: opaque.", min:10, max:100, step:5, }));
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
    a.appendChild(e);
    e = Y("Utilities");
    e.appendChild(L({id:"autoReload_enabled", title:"Automatically Refresh the Map", description:"When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing.", }));
    e.appendChild(V({id:"autoReload_interval", title:"Auto Reload Time Interval (in Seconds)", description:"How often should the WME be refreshed for new edits?", min:20, max:3600, step:1, }));
    a.appendChild(e);
    b.appendChild(V({id:"useWMERoadLayerAtZoom", title:"Stop using SVL at zoom level", description:"When you reach this zoom level, the road layer gets automatically enabled.", min:0, max:5, step:1, }));
    b.appendChild(V({id:"switchZoom", title:"Close-zoom until level", description:"When the zoom is lower then this value, it will switch to far-zoom mode (rendering less details)", min:5, max:9, step:1, }));
    b.appendChild(V({id:"segmentsThreshold", title:"Segments threshold", description:"When the WME wants to draw more than this amount of segments, switch to the road layer", min:1000, max:10000, step:100, }));
    b.appendChild(V({id:"nodesThreshold", title:"Nodes threshold", description:"When the WME wants to draw more than this amount of nodes, switch to the road layer", min:1000, max:10000, step:100, }));
    a.appendChild(b);
    c.appendChild(L({id:"showSLtext", title:"Show on the Street Name", description:"Show the speed limit as text at the end of the street name.", }));
    c.appendChild(L({id:"showSLcolor", title:"Show using colors", description:"Show the speed limit by coloring the segment's outline.", }));
    c.appendChild(L({id:"showSLSinglecolor", title:"Show using Single Color", description:"Show the speed limit by coloring the segment's outline with a single color instead of a different color depending on the speed limit's value.", }));
    b = document.createElement("input");
    b.type = "color";
    b.className = "prefElement form-control";
    b.id = "svl_SLColor";
    c.appendChild(b);
    c.appendChild(L({id:"showDashedUnverifiedSL", title:"Show unverified Speed Limits with a dashed Line", description:"If the speed limit is not verified, it will be shown with a different style.", }));
    b = document.createElement("h6");
    b.innerText = Gh("speed limit");
    c.appendChild(b);
    b = "metric";
    c.appendChild(ta("Default", !0));
    for (e = 1; e < Object.keys(d.speeds[b]).length + 1; e += 1) {
      c.appendChild(ta(e, !0));
    }
    b = "imperial";
    c.appendChild(ta("Default", !1));
    for (e = 1; e < Object.keys(d.speeds[b]).length + 1; e += 1) {
      c.appendChild(ta(e, !1));
    }
    a.appendChild(c);
    c = document.createElement("h5");
    c.innerText = "Settings Backup";
    a.appendChild(c);
    c = document.createElement("div");
    c.className = "expand";
    b = document.createElement("button");
    b.id = "svl_exportButton";
    b.type = "button";
    b.innerText = "Export";
    b.className = "btn btn-default";
    e = document.createElement("button");
    e.id = "svl_importButton";
    e.type = "button";
    e.innerText = "Import";
    e.className = "btn btn-default";
    c.appendChild(e);
    c.appendChild(b);
    a.appendChild(c);
    new WazeWrap.Interface.Tab("SVL \ud83d\uddfa\ufe0f", a.innerHTML, ba);
    document.querySelectorAll(".prefElement").forEach(function(m) {
      m.addEventListener("change", Fh);
    });
    document.getElementById("svl_saveNewPref").addEventListener("click", di);
    document.getElementById("svl_rollbackButton").addEventListener("click", bi);
    document.getElementById("svl_resetButton").addEventListener("click", ei);
    document.getElementById("svl_importButton").addEventListener("click", r);
    document.getElementById("svl_exportButton").addEventListener("click", ci);
  }
  function Ih(a) {
    E.destroyFeatures(E.getFeaturesByAttribute("myid", a), {silent:!0});
  }
  function gi(a) {
    x("Removing " + a.length + " nodes");
    if (I.zoom <= d.useWMERoadLayerAtZoom) {
      x("Destroy all nodes"), E.destroyFeatures(E.features, {silent:!0});
    } else {
      if (N || a.length > d.nodesThreshold) {
        N || ua();
      } else {
        var c;
        for (c = 0; c < a.length; c += 1) {
          Ih(a[c].attributes.id);
        }
      }
    }
  }
  function Bh(a) {
    var c;
    return 1 === (null == (c = a.segIDs) ? void 0 : c.length) ? hi : ii;
  }
  function ji(a) {
    x("Change nodes");
    a.forEach(function(c) {
      var b = c.attributes, e = E.getFeaturesByAttribute("myid", b.id)[0];
      e ? (e.style = Bh(b), e.move(new OpenLayers.LonLat(b.geometry.x, b.geometry.y))) : 0 < b.id && E.addFeatures([Ah(c)], {silent:!0});
    });
  }
  function ki(a) {
    x("Node state deleted");
    for (var c = 0; c < a.length; c += 1) {
      Ih(a[c].getID());
    }
  }
  function li(a) {
    for (var c = 0; c < a.length; c += 1) {
      va(a[c].getID());
    }
  }
  function Jh(a) {
    x("Adding " + a.length + " nodes");
    if (N || a.length > d.nodesThreshold) {
      N || ua();
    } else {
      if (I.zoom <= d.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        for (var c = [], b = 0; b < a.length; b += 1) {
          void 0 !== a[b].attributes.geometry ? 0 < a[b].attributes.id && c.push(Ah(a[b])) : console.warn("[SVL] Geometry of node is undefined");
        }
        E.addFeatures(c, {silent:!0});
        return !0;
      }
    }
  }
  function T(a) {
    return !a.svl;
  }
  function Kh() {
    x("updateStatusBasedOnZoom running");
    var a = !0;
    N && (Object.keys(W.model.segments.objects).length < d.segmentsThreshold && Object.keys(W.model.nodes.objects).length < d.nodesThreshold ? (N = !1, M(1, !0), M(0, !1), X()) : console.warn("[SVL] Still too many elements to draw: Segments: " + Object.keys(W.model.segments.objects).length + "/" + d.segmentsThreshold + ", Nodes: " + Object.keys(W.model.nodes.objects).length + "/" + d.nodesThreshold + " - You can change these thresholds in the preference panel."));
    I.zoom <= d.useWMERoadLayerAtZoom ? (x("Road layer automatically enabled because of zoom out"), !0 === z.visibility && (wa = !0, M(0, !0), M(1, !1)), a = !1) : wa && (x("Re-enabling SVL after zoom in"), M(1, !0), M(0, !1), wa = !1);
    return a;
  }
  function mi() {
    clearTimeout(Lh);
    x("manageZoom clearing timer");
    Lh = setTimeout(Kh, 800);
  }
  function ua() {
    console.warn("[SVL] Abort drawing, too many elements");
    N = !0;
    M(0, !0);
    M(1, !1);
    k();
  }
  function Da(a) {
    x("Adding " + a.length + " segments");
    if (N || a.length > d.segmentsThreshold) {
      N || ua();
    } else {
      if (I.zoom <= d.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        Mh();
        var c = [];
        a.forEach(function(b) {
          null !== b && (c = c.concat(Zh(b)));
        });
        0 < c.length ? (x(c.length + " features added to the street layer"), z.addFeatures(c, {silent:!0})) : console.warn("[SVL] no features drawn");
        Nh();
      }
    }
  }
  function va(a) {
    x("RemoveSegmentById: " + a);
    z.destroyFeatures(z.getFeaturesByAttribute("myId", a), {silent:!0});
    A.destroyFeatures(A.getFeaturesByAttribute("myId", a), {silent:!0});
  }
  function ni(a) {
    x("Edit " + a.length + " segments");
    a.forEach(function(c) {
      var b = c.getOldID();
      b && va(parseInt(b, 10));
      va(c.getID());
      "Delete" !== c.state && Da([c]);
    });
  }
  function oi(a) {
    x("Removing " + a.length + " segments");
    I.zoom <= d.useWMERoadLayerAtZoom ? (x("Destroy all segments and labels because of zoom out"), z.destroyFeatures(z.features, {silent:!0, }), A.destroyFeatures(A.features, {silent:!0})) : N || a.length > d.segmentsThreshold ? N || ua() : (Mh(), a.forEach(function(c) {
      va(c.attributes.id);
    }), Nh());
  }
  function Oh(a) {
    x("ManageVisibilityChanged", a);
    E.setVisibility(a.object.visibility);
    A.setVisibility(a.object.visibility);
    a.object.visibility ? (x("enabled: registering events"), a = W.model.segments._events, "object" === typeof a && (a.objectsadded.push({context:z, callback:Da, svl:!0, }), a.objectschanged.push({context:z, callback:ni, svl:!0, }), a.objectsremoved.push({context:z, callback:oi, svl:!0, }), a["objects-state-deleted"].push({context:z, callback:li, svl:!0, })), x("SVL: Registering node events"), a = W.model.nodes._events, "object" === typeof a && (a.objectsremoved.push({context:E, callback:gi, svl:!0, 
    }), a.objectsadded.push({context:E, callback:Jh, svl:!0, }), a.objectschanged.push({context:E, callback:ji, svl:!0, }), a["objects-state-deleted"].push({context:E, callback:ki, svl:!0, })), !0 === Kh() && X()) : (x("disabled: unregistering events"), x("SVL: Removing segments events"), a = W.model.segments._events, "object" === typeof a && (a.objectsadded = a.objectsadded.filter(T), a.objectschanged = a.objectschanged.filter(T), a.objectsremoved = a.objectsremoved.filter(T), a["objects-state-deleted"] = 
    a["objects-state-deleted"].filter(T)), x("SVL: Removing node events"), a = W.model.nodes._events, "object" === typeof a && (a.objectsremoved = a.objectsremoved.filter(T), a.objectsadded = a.objectsadded.filter(T), a.objectschanged = a.objectschanged.filter(T), a["objects-state-deleted"] = a["objects-state-deleted"].filter(T)), k());
  }
  function Ph(a) {
    a = void 0 === a ? 1 : a;
    30 < a ? console.error("SVL: could not initialize WazeWrap") : WazeWrap && WazeWrap.Ready && WazeWrap.Interface && WazeWrap.Alerts ? pi() : (console.log("SVL: WazeWrap not ready, retrying in 800ms"), setTimeout(function() {
      Ph(a + 1);
    }, 800));
  }
  function pi() {
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
    d.startDisabled && M(1, !1);
    fi();
    WazeWrap.Interface.ShowScriptUpdate("Street Vector Layer", "5.0.6", '<b>Major update!</b>\n            <br>Many things have changed! You may need to change some settings to have a similar view as before (for example increasing the streets width)\n            <br>- 5.0.6: Fixed a bug that was showing metric colors for speed limits while in imperial mode\n            <br>- 5.0.5: Added a global Layer Opacity setting\n        <br>From previous releases:\n        <br>- Rendering completely rewritten: performance improvements\n        <br>- The preference panel was redesigned and is now in the sidebar (SVL \ud83d\uddfa\ufe0f)\n        <br>- You can set what color to use for each speed limit (User request)\n        <br>- Added an option to render the streets based on their width (one way streets are thinner, their size changes when you zoom)\n        <br>- Some options are now localised using WME\'s strings\n        <br>- Dead-end nodes are rendered with a different color\n        <br>- The Preference panel changes color when you have unsaved changes\n        <br>- The "Next to Carpool/HOV/bus lane" is also shown\n        <br>- Removed: the zoom-level indicator while editing the preferences\n        <br>- Bug fixes and new bugs :)', 
    "", GM_info.script.supportURL);
  }
  function Qh(a) {
    a = void 0 === a ? 0 : a;
    try {
      if (void 0 === W || void 0 === W.map || void 0 === W.model) {
        throw Error("Model Not ready");
      }
    } catch (e) {
      var c = a + 1;
      if (20 > a) {
        console.warn(e);
        console.warn("Could not initialize SVL correctly. Maybe the Waze model was not ready. Retrying in 500ms...");
        setTimeout(function() {
          Qh(c);
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
    !1 === Z() && w("info", "This is the first time that you run Street Vector Layer in this browser.\nSome info about it:\nBy default, use ALT+L to toggle the layer.\nYou can change the streets color, thickness and style using the panel on the left sidebar.\nYour preferences will be saved for the next time in your browser.\nThe other road layers will be automatically hidden (you can change this behaviour in the preference panel).\nHave fun and tell us on the Waze forum if you liked the script!");
    a = new OpenLayers.StyleMap({pointerEvents:"none", strokeColor:"${color}", strokeWidth:"${width}", strokeOpacity:"${opacity}", strokeDashstyle:"${dash}", graphicZIndex:"${zIndex}", });
    var b = new OpenLayers.StyleMap({fontFamily:"Rubik, Open Sans, Alef, helvetica, sans-serif", fontWeight:"800", fontColor:"${color}", labelOutlineColor:"${outlinecolor}", labelOutlineWidth:"${outlinewidth}", label:"${label}", visibility:!d.startDisabled, angle:"${angle}", pointerEvents:"none", labelAlign:"cm", });
    z = new OpenLayers.Layer.Vector("Street Vector Layer", {styleMap:a, uniqueName:"vectorStreet", accelerator:"toggle" + "Street Vector Layer".replace(/\s+/g, ""), visibility:!d.startDisabled, isVector:!0, attribution:"SVL v. 5.0.6", rendererOptions:{zIndexing:!0, }, });
    z.renderer.drawFeature = function(e, f) {
      null == f && (f = e.style);
      if (e.geometry) {
        var h = H();
        2 > I.zoom || e.attributes.a && h || e.attributes.o && !h ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(z.renderer.extent) ? (z.renderer.featureDx = 0, f.pointerEvents = "none", h || !e.attributes.h && d.realsize && (f.strokeWidth /= I.resolution)) : f = {display:"none"};
        return z.renderer.drawGeometry(e.geometry, f, e.id);
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
    A = new OpenLayers.Layer.Vector("Labels Vector", {uniqueName:"vectorLabels", styleMap:b, visibility:!d.startDisabled, });
    A.renderer.drawFeature = function(e, f) {
      var h = I.zoom;
      if (2 > h) {
        return !1;
      }
      null == f && (f = e.style);
      if (e.geometry) {
        var m = H();
        7 - e.attributes.u > h || e.attributes.a && m || e.attributes.o && !m ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(A.renderer.extent) ? (A.renderer.featureDx = 0, f.pointerEvents = "none", f.fontSize = m ? d.farZoomLabelSize : d.closeZoomLabelSize) : f = {display:"none"};
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
      q.parentNode || A.renderer.textRoot.appendChild(q);
    };
    aa(d);
    I.addLayer(z);
    I.addLayer(A);
    I.addLayer(E);
    "true" === window.localStorage.getItem("svlDebugOn") && (document.sv = z, document.lv = A, document.nv = E, document.svl_pref = d);
    a = I.getLayersBy("uniqueName", "roads");
    ca = null;
    1 === a.length && (ca = Fa(a).next().value);
    wa = !1;
    d.showUnderGPSPoints && Ch();
    Dh();
    Eh();
    I.events.register("zoomend", null, mi, !0);
    Ph();
    I.zoom <= d.useWMERoadLayerAtZoom ? M(0, !0) : ca.getVisibility() && d.disableRoadLayers && (M(0, !1), console.log("SVL: WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel."));
    z.events.register("visibilitychanged", z, Oh);
    Oh({object:z, });
    $(".olControlAttribution").click(function() {
      w("info", 'The preferences have been moved to the sidebar on the left. Please look for the "SVL \ud83d\uddfa\ufe0f" tab.');
    });
    a = W.prefs._events;
    "object" === typeof a && a["change:isImperial"].push({callback:X, });
    console.log("[SVL] v. 5.0.6 initialized correctly.");
  }
  function X() {
    x("DrawAllSegments");
    k();
    Da(Object.values(W.model.segments.objects));
    Jh(Object.values(W.model.nodes.objects));
  }
  function aa(a) {
    for (var c = 0; c < a.streets.length; c += 1) {
      if (a.streets[c]) {
        var b = a.streets[c].strokeColor;
        O[c] = {strokeColor:a.streets[c].strokeColor, strokeWidth:a.streets[c].strokeWidth, strokeDashstyle:a.streets[c].strokeDashstyle, outlineColor:127 > 0.299 * parseInt(b.substring(1, 3), 16) + 0.587 * parseInt(b.substring(3, 5), 16) + 0.114 * parseInt(b.substring(5, 7), 16) ? "#FFF" : "#000", };
      }
    }
    vh = a.clutterConstant;
    z.setOpacity(d.layerOpacity);
    X();
  }
  function Rh(a) {
    a = void 0 === a ? 0 : a;
    if (void 0 === W || void 0 === W.map) {
      console.log("SVL not ready to start, retrying in 600ms");
      var c = a + 1;
      20 > c ? setTimeout(function() {
        Rh(c);
      }, 600) : w("error", "Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!");
    } else {
      Qh();
    }
  }
  var Ea = "true" === window.localStorage.getItem("svlDebugOn"), x = Ea ? function(a) {
    for (var c = [], b = 0; b < arguments.length; ++b) {
      c[b] = arguments[b];
    }
    for (b = 0; b < c.length; b += 1) {
      "string" === typeof c[b] ? console.log("[SVL] 5.0.6: " + c[b]) : console.dir(c[b]);
    }
  } : function() {
  }, Mh = Ea ? console.group : function() {
  }, Nh = Ea ? console.groupEnd : function() {
  }, Ca = null, vh, O = [], z, E, A, N = !1, d, ca, wa, I, sa = {ROAD_LAYER:null, SVL_LAYER:null, }, Yh = "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079".split(""), yh = {strokeColor:"#F53BFF", strokeWidth:3, strokeDashstyle:"solid", }, Aa = {strokeColor:"#111111", strokeWidth:1, strokeDashstyle:"dash", strokeOpacity:0.6, }, ii = {stroke:!1, fillColor:"#0015FF", fillOpacity:0.9, pointRadius:3, pointerEvents:"none", }, hi = {stroke:!1, fillColor:"#C31CFF", fillOpacity:0.9, pointRadius:3, 
  pointerEvents:"none", }, $h = {graphicName:"x", strokeColor:"#f00", strokeWidth:1.5, fillColor:"#FFFF40", fillOpacity:0.7, pointRadius:7, pointerEvents:"none", }, ai = {stroke:!1, fillColor:"#000", fillOpacity:0.5, pointRadius:3.5, graphicZIndex:179, pointerEvents:"none", }, xh = {strokeColor:"#000", strokeDashstyle:"solid", }, zh = {strokeColor:"#C90", strokeDashstyle:"longdash", }, Ba = {strokeColor:"#fff", strokeOpacity:0.8, strokeDashstyle:"longdash", }, Ha = {1:5.0, 2:5.5, 3:22.5, 4:6.0, 5:2.0, 
  6:10.0, 7:9.0, 8:4.0, 10:2.0, 15:8.0, 16:2.0, 17:5.0, 18:6.0, 19:5.0, 20:5.0, 22:3.0, }, Lh = null;
  Rh();
})();

