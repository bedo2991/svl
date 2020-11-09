function va(k) {
  var n = 0;
  return function() {
    return n < k.length ? {done:!1, value:k[n++], } : {done:!0};
  };
}
function Ca(k) {
  var n = "undefined" != typeof Symbol && Symbol.iterator && k[Symbol.iterator];
  return n ? n.call(k) : {next:va(k)};
}
var Da = "function" == typeof Object.defineProperties ? Object.defineProperty : function(k, n, r) {
  if (k == Array.prototype || k == Object.prototype) {
    return k;
  }
  k[n] = r.value;
  return k;
};
function Jh(k) {
  k = ["object" == typeof globalThis && globalThis, k, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global, ];
  for (var n = 0; n < k.length; ++n) {
    var r = k[n];
    if (r && r.Math == Math) {
      return r;
    }
  }
  throw Error("Cannot find global object");
}
var Kh = Jh(this);
function P(k, n) {
  if (n) {
    a: {
      var r = Kh;
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
      n != w && null != n && Da(r, k, {configurable:!0, writable:!0, value:n});
    }
  }
}
P("Symbol", function(k) {
  function n(H) {
    if (this instanceof n) {
      throw new TypeError("Symbol is not a constructor");
    }
    return new r("jscomp_symbol_" + (H || "") + "_" + w++, H);
  }
  function r(H, Q) {
    this.o = H;
    Da(this, "description", {configurable:!0, writable:!0, value:Q});
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
P("Symbol.iterator", function(k) {
  if (k) {
    return k;
  }
  k = Symbol("Symbol.iterator");
  for (var n = "Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "), r = 0; r < n.length; r++) {
    var w = Kh[n[r]];
    "function" === typeof w && "function" != typeof w.prototype[k] && Da(w.prototype, k, {configurable:!0, writable:!0, value:function() {
      return Lh(va(this));
    }});
  }
  return k;
});
function Lh(k) {
  k = {next:k};
  k[Symbol.iterator] = function() {
    return this;
  };
  return k;
}
function Mh(k, n) {
  k instanceof String && (k += "");
  var r = 0, w = !1, H = {next:function() {
    if (!w && r < k.length) {
      var Q = r++;
      return {value:n(Q, k[Q]), done:!1};
    }
    w = !0;
    return {done:!0, value:void 0};
  }};
  H[Symbol.iterator] = function() {
    return H;
  };
  return H;
}
P("Array.prototype.keys", function(k) {
  return k ? k : function() {
    return Mh(this, function(n) {
      return n;
    });
  };
});
P("Number.isFinite", function(k) {
  return k ? k : function(n) {
    return "number" !== typeof n ? !1 : !isNaN(n) && Infinity !== n && -Infinity !== n;
  };
});
P("Number.isInteger", function(k) {
  return k ? k : function(n) {
    return Number.isFinite(n) ? n === Math.floor(n) : !1;
  };
});
P("Object.is", function(k) {
  return k ? k : function(n, r) {
    return n === r ? 0 !== n || 1 / n === 1 / r : n !== n && r !== r;
  };
});
P("Array.prototype.includes", function(k) {
  return k ? k : function(n, r) {
    var w = this;
    w instanceof String && (w = String(w));
    var H = w.length;
    r = r || 0;
    for (0 > r && (r = Math.max(r + H, 0)); r < H; r++) {
      var Q = w[r];
      if (Q === n || Object.is(Q, n)) {
        return !0;
      }
    }
    return !1;
  };
});
P("String.prototype.includes", function(k) {
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
P("Object.values", function(k) {
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
  function n(b) {
    b = void 0 === b ? I.zoom : b;
    return b < d.switchZoom;
  }
  function r() {
    0 !== W.model.actionManager.unsavedActionsNum() || WazeWrap.hasSelectedFeatures() || 0 !== document.querySelectorAll(".place-update-edit.show").length || W.controller.reload();
  }
  function w(b, c) {
    1 === b ? (x("Changing SVL Layer visibility to " + c), C.setVisibility(c)) : U ? (x("Changing Road Layer visibility to " + c), U.setVisibility(c)) : console.warn("SVL: cannot toggle the WME's road layer");
    if (!qa[b] && (x("Initialising layer " + b), qa[b] = document.getElementById(1 === b ? "layer-switcher-item_street_vector_layer" : "layer-switcher-item_road"), !qa[b])) {
      console.warn("SVL: cannot find checkbox for layer number " + b);
      return;
    }
    qa[b].checked = c;
  }
  function H(b) {
    x("savePreferences");
    b.version = "4.9.5.1";
    window.localStorage.setItem("svl", JSON.stringify(b));
  }
  function Q(b) {
    var c = b.v, a = b.u;
    b = b.B;
    return d.realsize ? c ? b ? c : 0.6 * c : b ? Ea[a] : 0.6 * Ea[a] : parseInt(N[a].strokeWidth, 10);
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
    var K, R;
    d.hideMinorRoads = null != (R = null == (K = a) ? void 0 : K.hideMinorRoads) ? R : !0;
    var J, z;
    d.showDashedUnverifiedSL = null != (z = null == (J = a) ? void 0 : J.showDashedUnverifiedSL) ? z : !0;
    var T, X;
    d.showSLcolor = null != (X = null == (T = a) ? void 0 : T.showSLcolor) ? X : !0;
    var Y, Z;
    d.showSLtext = null != (Z = null == (Y = a) ? void 0 : Y.showSLtext) ? Z : !0;
    var aa, ba;
    d.disableRoadLayers = null != (ba = null == (aa = a) ? void 0 : aa.disableRoadLayers) ? ba : !0;
    var ca, da;
    d.startDisabled = null != (da = null == (ca = a) ? void 0 : ca.startDisabled) ? da : !1;
    var ea, fa;
    d.clutterConstant = null != (fa = null == (ea = a) ? void 0 : ea.clutterConstant) ? fa : 7;
    var ha, ia;
    d.labelOutlineWidth = null != (ia = null == (ha = a) ? void 0 : ha.labelOutlineWidth) ? ia : 3;
    var ja, Fa;
    d.closeZoomLabelSize = null != (Fa = null == (ja = a) ? void 0 : ja.closeZoomLabelSize) ? Fa : 14;
    var Ga, Ha;
    d.farZoomLabelSize = null != (Ha = null == (Ga = a) ? void 0 : Ga.farZoomLabelSize) ? Ha : 12;
    var Ia, Ja;
    d.useWMERoadLayerAtZoom = null != (Ja = null == (Ia = a) ? void 0 : Ia.useWMERoadLayerAtZoom) ? Ja : 1;
    var Ka, La;
    d.switchZoom = null != (La = null == (Ka = a) ? void 0 : Ka.switchZoom) ? La : 5;
    var Ma, Na;
    d.arrowDeclutter = null != (Na = null == (Ma = a) ? void 0 : Ma.arrowDeclutter) ? Na : 140;
    var Oa, Pa;
    d.showUnderGPSPoints = null != (Pa = null == (Oa = a) ? void 0 : Oa.showUnderGPSPoints) ? Pa : !1;
    var Qa, Ra;
    d.routingModeEnabled = null != (Ra = null == (Qa = a) ? void 0 : Qa.routingModeEnabled) ? Ra : !1;
    var Sa, Ta;
    d.realsize = null != (Ta = null == (Sa = a) ? void 0 : Sa.realsize) ? Ta : !0;
    var Ua, Va;
    d.showANs = null != (Va = null == (Ua = a) ? void 0 : Ua.showANs) ? Va : !1;
    var Wa, Xa;
    d.renderGeomNodes = null != (Xa = null == (Wa = a) ? void 0 : Wa.renderGeomNodes) ? Xa : !1;
    d.streets = [];
    var Ya, Za, $a, ab, bb, cb, db, eb, fb;
    d.streets[1] = {strokeColor:null != (db = null == (Ya = a) ? void 0 : null == (Za = Ya.streets[1]) ? void 0 : Za.strokeColor) ? db : "#FFFFFF", strokeWidth:null != (eb = null == ($a = a) ? void 0 : null == (ab = $a.streets[1]) ? void 0 : ab.strokeWidth) ? eb : 10, strokeDashstyle:null != (fb = null == (bb = a) ? void 0 : null == (cb = bb.streets[1]) ? void 0 : cb.strokeDashstyle) ? fb : "solid", };
    var gb, hb, ib, jb, kb, lb, mb, nb, ob;
    d.streets[20] = {strokeColor:null != (mb = null == (gb = a) ? void 0 : null == (hb = gb.streets[20]) ? void 0 : hb.strokeColor) ? mb : "#2282ab", strokeWidth:null != (nb = null == (ib = a) ? void 0 : null == (jb = ib.streets[20]) ? void 0 : jb.strokeWidth) ? nb : 9, strokeDashstyle:null != (ob = null == (kb = a) ? void 0 : null == (lb = kb.streets[20]) ? void 0 : lb.strokeDashstyle) ? ob : "solid", };
    var pb, qb, rb, sb, tb, ub, vb, wb, xb;
    d.streets[4] = {strokeColor:null != (vb = null == (pb = a) ? void 0 : null == (qb = pb.streets[4]) ? void 0 : qb.strokeColor) ? vb : "#3FC91C", strokeWidth:null != (wb = null == (rb = a) ? void 0 : null == (sb = rb.streets[4]) ? void 0 : sb.strokeWidth) ? wb : 11, strokeDashstyle:null != (xb = null == (tb = a) ? void 0 : null == (ub = tb.streets[4]) ? void 0 : ub.strokeDashstyle) ? xb : "solid", };
    var yb, zb, Ab, Bb, Cb, Db, Eb, Fb, Gb;
    d.streets[3] = {strokeColor:null != (Eb = null == (yb = a) ? void 0 : null == (zb = yb.streets[3]) ? void 0 : zb.strokeColor) ? Eb : "#387FB8", strokeWidth:null != (Fb = null == (Ab = a) ? void 0 : null == (Bb = Ab.streets[3]) ? void 0 : Bb.strokeWidth) ? Fb : 18, strokeDashstyle:null != (Gb = null == (Cb = a) ? void 0 : null == (Db = Cb.streets[3]) ? void 0 : Db.strokeDashstyle) ? Gb : "solid", };
    var Hb, Ib, Jb, Kb, Lb, Mb, Nb, Ob, Pb;
    d.streets[7] = {strokeColor:null != (Nb = null == (Hb = a) ? void 0 : null == (Ib = Hb.streets[7]) ? void 0 : Ib.strokeColor) ? Nb : "#ECE589", strokeWidth:null != (Ob = null == (Jb = a) ? void 0 : null == (Kb = Jb.streets[7]) ? void 0 : Kb.strokeWidth) ? Ob : 14, strokeDashstyle:null != (Pb = null == (Lb = a) ? void 0 : null == (Mb = Lb.streets[7]) ? void 0 : Mb.strokeDashstyle) ? Pb : "solid", };
    var Qb, Rb, Sb, Tb, Ub, Vb, Wb, Xb, Yb;
    d.streets[6] = {strokeColor:null != (Wb = null == (Qb = a) ? void 0 : null == (Rb = Qb.streets[6]) ? void 0 : Rb.strokeColor) ? Wb : "#C13040", strokeWidth:null != (Xb = null == (Sb = a) ? void 0 : null == (Tb = Sb.streets[6]) ? void 0 : Tb.strokeWidth) ? Xb : 16, strokeDashstyle:null != (Yb = null == (Ub = a) ? void 0 : null == (Vb = Ub.streets[6]) ? void 0 : Vb.strokeDashstyle) ? Yb : "solid", };
    var Zb, $b, ac, bc, cc, dc, ec, fc, gc;
    d.streets[16] = {strokeColor:null != (ec = null == (Zb = a) ? void 0 : null == ($b = Zb.streets[16]) ? void 0 : $b.strokeColor) ? ec : "#B700FF", strokeWidth:null != (fc = null == (ac = a) ? void 0 : null == (bc = ac.streets[16]) ? void 0 : bc.strokeWidth) ? fc : 5, strokeDashstyle:null != (gc = null == (cc = a) ? void 0 : null == (dc = cc.streets[16]) ? void 0 : dc.strokeDashstyle) ? gc : "dash", };
    var hc, ic, jc, kc, lc, mc, nc, oc, pc;
    d.streets[5] = {strokeColor:null != (nc = null == (hc = a) ? void 0 : null == (ic = hc.streets[5]) ? void 0 : ic.strokeColor) ? nc : "#00FF00", strokeWidth:null != (oc = null == (jc = a) ? void 0 : null == (kc = jc.streets[5]) ? void 0 : kc.strokeWidth) ? oc : 5, strokeDashstyle:null != (pc = null == (lc = a) ? void 0 : null == (mc = lc.streets[5]) ? void 0 : mc.strokeDashstyle) ? pc : "dash", };
    var qc, rc, sc, tc, uc, vc, wc, xc, yc;
    d.streets[8] = {strokeColor:null != (wc = null == (qc = a) ? void 0 : null == (rc = qc.streets[8]) ? void 0 : rc.strokeColor) ? wc : "#82614A", strokeWidth:null != (xc = null == (sc = a) ? void 0 : null == (tc = sc.streets[8]) ? void 0 : tc.strokeWidth) ? xc : 7, strokeDashstyle:null != (yc = null == (uc = a) ? void 0 : null == (vc = uc.streets[8]) ? void 0 : vc.strokeDashstyle) ? yc : "solid", };
    var zc, Ac, Bc, Cc, Dc, Ec, Fc, Gc, Hc;
    d.streets[15] = {strokeColor:null != (Fc = null == (zc = a) ? void 0 : null == (Ac = zc.streets[15]) ? void 0 : Ac.strokeColor) ? Fc : "#FF8000", strokeWidth:null != (Gc = null == (Bc = a) ? void 0 : null == (Cc = Bc.streets[15]) ? void 0 : Cc.strokeWidth) ? Gc : 5, strokeDashstyle:null != (Hc = null == (Dc = a) ? void 0 : null == (Ec = Dc.streets[15]) ? void 0 : Ec.strokeDashstyle) ? Hc : "dashdot", };
    var Ic, Jc, Kc, Lc, Mc, Nc, Oc, Pc, Qc;
    d.streets[18] = {strokeColor:null != (Oc = null == (Ic = a) ? void 0 : null == (Jc = Ic.streets[18]) ? void 0 : Jc.strokeColor) ? Oc : "#FFFFFF", strokeWidth:null != (Pc = null == (Kc = a) ? void 0 : null == (Lc = Kc.streets[18]) ? void 0 : Lc.strokeWidth) ? Pc : 8, strokeDashstyle:null != (Qc = null == (Mc = a) ? void 0 : null == (Nc = Mc.streets[18]) ? void 0 : Nc.strokeDashstyle) ? Qc : "dash", };
    var Rc, Sc, Tc, Uc, Vc, Wc, Xc, Yc, Zc;
    d.streets[17] = {strokeColor:null != (Xc = null == (Rc = a) ? void 0 : null == (Sc = Rc.streets[17]) ? void 0 : Sc.strokeColor) ? Xc : "#00FFB3", strokeWidth:null != (Yc = null == (Tc = a) ? void 0 : null == (Uc = Tc.streets[17]) ? void 0 : Uc.strokeWidth) ? Yc : 7, strokeDashstyle:null != (Zc = null == (Vc = a) ? void 0 : null == (Wc = Vc.streets[17]) ? void 0 : Wc.strokeDashstyle) ? Zc : "solid", };
    var $c, ad, bd, cd, dd, ed, fd, gd, hd;
    d.streets[22] = {strokeColor:null != (fd = null == ($c = a) ? void 0 : null == (ad = $c.streets[22]) ? void 0 : ad.strokeColor) ? fd : "#C6C7FF", strokeWidth:null != (gd = null == (bd = a) ? void 0 : null == (cd = bd.streets[22]) ? void 0 : cd.strokeWidth) ? gd : 6, strokeDashstyle:null != (hd = null == (dd = a) ? void 0 : null == (ed = dd.streets[22]) ? void 0 : ed.strokeDashstyle) ? hd : "solid", };
    var id, jd, kd, ld, md, nd, od, pd, qd;
    d.streets[19] = {strokeColor:null != (od = null == (id = a) ? void 0 : null == (jd = id.streets[19]) ? void 0 : jd.strokeColor) ? od : "#00FF00", strokeWidth:null != (pd = null == (kd = a) ? void 0 : null == (ld = kd.streets[19]) ? void 0 : ld.strokeWidth) ? pd : 5, strokeDashstyle:null != (qd = null == (md = a) ? void 0 : null == (nd = md.streets[19]) ? void 0 : nd.strokeDashstyle) ? qd : "dashdot", };
    var rd, sd, td, ud, vd, wd, xd, yd, zd;
    d.streets[2] = {strokeColor:null != (xd = null == (rd = a) ? void 0 : null == (sd = rd.streets[2]) ? void 0 : sd.strokeColor) ? xd : "#CBA12E", strokeWidth:null != (yd = null == (td = a) ? void 0 : null == (ud = td.streets[2]) ? void 0 : ud.strokeWidth) ? yd : 12, strokeDashstyle:null != (zd = null == (vd = a) ? void 0 : null == (wd = vd.streets[2]) ? void 0 : wd.strokeDashstyle) ? zd : "solid", };
    var Ad, Bd, Cd, Dd, Ed, Fd, Gd, Hd, Id;
    d.streets[10] = {strokeColor:null != (Gd = null == (Ad = a) ? void 0 : null == (Bd = Ad.streets[10]) ? void 0 : Bd.strokeColor) ? Gd : "#0000FF", strokeWidth:null != (Hd = null == (Cd = a) ? void 0 : null == (Dd = Cd.streets[10]) ? void 0 : Dd.strokeWidth) ? Hd : 5, strokeDashstyle:null != (Id = null == (Ed = a) ? void 0 : null == (Fd = Ed.streets[10]) ? void 0 : Fd.strokeDashstyle) ? Id : "dash", };
    var Jd, Kd, Ld, Md, Nd, Od;
    d.red = {strokeColor:null != (Nd = null == (Jd = a) ? void 0 : null == (Kd = Jd.red) ? void 0 : Kd.strokeColor) ? Nd : "#FF0000", strokeDashstyle:null != (Od = null == (Ld = a) ? void 0 : null == (Md = Ld.red) ? void 0 : Md.strokeDashstyle) ? Od : "solid", };
    var Pd, Qd, Rd, Sd, Td, Ud, Vd, Wd, Xd;
    d.roundabout = {strokeColor:null != (Vd = null == (Pd = a) ? void 0 : null == (Qd = Pd.roundabout) ? void 0 : Qd.strokeColor) ? Vd : "#111", strokeWidth:null != (Wd = null == (Rd = a) ? void 0 : null == (Sd = Rd.roundabout) ? void 0 : Sd.strokeWidth) ? Wd : 1, strokeDashstyle:null != (Xd = null == (Td = a) ? void 0 : null == (Ud = Td.roundabout) ? void 0 : Ud.strokeDashstyle) ? Xd : "dash", };
    var Yd, Zd, $d, ae, be, ce, de, ee;
    d.lanes = {strokeColor:null != (ce = null == (Yd = a) ? void 0 : null == (Zd = Yd.lanes) ? void 0 : Zd.strokeColor) ? ce : "#454443", strokeDashstyle:null != (de = null == ($d = a) ? void 0 : null == (ae = $d.lanes) ? void 0 : ae.strokeDashstyle) ? de : "dash", strokeOpacity:null != (ee = null == V ? void 0 : null == (be = V.lanes) ? void 0 : be.strokeOpacity) ? ee : 0.9, };
    var fe, ge, he, ie, je, ke, le, me, ne;
    d.toll = {strokeColor:null != (le = null == (fe = a) ? void 0 : null == (ge = fe.toll) ? void 0 : ge.strokeColor) ? le : "#00E1FF", strokeDashstyle:null != (me = null == (he = a) ? void 0 : null == (ie = he.toll) ? void 0 : ie.strokeDashstyle) ? me : "solid", strokeOpacity:null != (ne = null == (je = a) ? void 0 : null == (ke = je.toll) ? void 0 : ke.strokeOpacity) ? ne : 1.0, };
    var oe, pe, qe, re, se, te, ue, ve, we;
    d.closure = {strokeColor:null != (ue = null == (oe = a) ? void 0 : null == (pe = oe.closure) ? void 0 : pe.strokeColor) ? ue : "#FF00FF", strokeOpacity:null != (ve = null == (qe = a) ? void 0 : null == (re = qe.closure) ? void 0 : re.strokeOpacity) ? ve : 1.0, strokeDashstyle:null != (we = null == (se = a) ? void 0 : null == (te = se.closure) ? void 0 : te.strokeDashstyle) ? we : "dash", };
    var xe, ye, ze, Ae, Be, Ce, De, Ee, Fe;
    d.headlights = {strokeColor:null != (De = null == (xe = a) ? void 0 : null == (ye = xe.headlights) ? void 0 : ye.strokeColor) ? De : "#bfff00", strokeOpacity:null != (Ee = null == (ze = a) ? void 0 : null == (Ae = ze.headlights) ? void 0 : Ae.strokeOpacity) ? Ee : 0.9, strokeDashstyle:null != (Fe = null == (Be = a) ? void 0 : null == (Ce = Be.headlights) ? void 0 : Ce.strokeDashstyle) ? Fe : "dot", };
    var Ge, He, Ie, Je, Ke, Le, Me, Ne, Oe;
    d.nearbyHOV = {strokeColor:null != (Me = null == (Ge = a) ? void 0 : null == (He = Ge.nearbyHOV) ? void 0 : He.strokeColor) ? Me : "#ff66ff", strokeOpacity:null != (Ne = null == (Ie = a) ? void 0 : null == (Je = Ie.nearbyHOV) ? void 0 : Je.strokeOpacity) ? Ne : 1.0, strokeDashstyle:null != (Oe = null == (Ke = a) ? void 0 : null == (Le = Ke.nearbyHOV) ? void 0 : Le.strokeDashstyle) ? Oe : "dash", };
    var Pe, Qe, Re, Se, Te, Ue, Ve, We, Xe;
    d.restriction = {strokeColor:null != (Ve = null == (Pe = a) ? void 0 : null == (Qe = Pe.restriction) ? void 0 : Qe.strokeColor) ? Ve : "#F2FF00", strokeOpacity:null != (We = null == (Re = a) ? void 0 : null == (Se = Re.restriction) ? void 0 : Se.strokeOpacity) ? We : 1.0, strokeDashstyle:null != (Xe = null == (Te = a) ? void 0 : null == (Ue = Te.restriction) ? void 0 : Ue.strokeDashstyle) ? Xe : "dash", };
    var Ye, Ze, $e, af, bf, cf, df, ef, ff;
    d.dirty = {strokeColor:null != (df = null == (Ye = a) ? void 0 : null == (Ze = Ye.dirty) ? void 0 : Ze.strokeColor) ? df : "#82614A", strokeOpacity:null != (ef = null == ($e = a) ? void 0 : null == (af = $e.dirty) ? void 0 : af.strokeOpacity) ? ef : 0.6, strokeDashstyle:null != (ff = null == (bf = a) ? void 0 : null == (cf = bf.dirty) ? void 0 : cf.strokeDashstyle) ? ff : "longdash", };
    d.speeds = {};
    var gf, hf, jf;
    d.speeds["default"] = null != (jf = null == (gf = a) ? void 0 : null == (hf = gf.speed) ? void 0 : hf["default"]) ? jf : "#cc0000";
    var kf, lf;
    if (null == (kf = a) ? 0 : null == (lf = kf.speeds) ? 0 : lf.metric) {
      d.speeds.metric = a.speeds.metric;
    } else {
      d.speeds.metric = {};
      var mf, nf, of;
      d.speeds.metric[5] = null != (of = null == (mf = a) ? void 0 : null == (nf = mf.speeds) ? void 0 : nf.metric[5]) ? of : "#542344";
      var pf, qf, rf;
      d.speeds.metric[7] = null != (rf = null == (pf = a) ? void 0 : null == (qf = pf.speeds) ? void 0 : qf.metric[7]) ? rf : "#ff5714";
      var sf, tf, uf;
      d.speeds.metric[10] = null != (uf = null == (sf = a) ? void 0 : null == (tf = sf.speeds) ? void 0 : tf.metric[10]) ? uf : "#ffbf00";
      var vf, wf, xf;
      d.speeds.metric[20] = null != (xf = null == (vf = a) ? void 0 : null == (wf = vf.speeds) ? void 0 : wf.metric[20]) ? xf : "#ee0000";
      var yf, zf, Af;
      d.speeds.metric[30] = null != (Af = null == (yf = a) ? void 0 : null == (zf = yf.speeds) ? void 0 : zf.metric[30]) ? Af : "#e4ff1a";
      var Bf, Cf, Df;
      d.speeds.metric[40] = null != (Df = null == (Bf = a) ? void 0 : null == (Cf = Bf.speeds) ? void 0 : Cf.metric[40]) ? Df : "#993300";
      var Ef, Ff, Gf;
      d.speeds.metric[50] = null != (Gf = null == (Ef = a) ? void 0 : null == (Ff = Ef.speeds) ? void 0 : Ff.metric[50]) ? Gf : "#33ff33";
      var Hf, If, Jf;
      d.speeds.metric[60] = null != (Jf = null == (Hf = a) ? void 0 : null == (If = Hf.speeds) ? void 0 : If.metric[60]) ? Jf : "#639fab";
      var Kf, Lf, Mf;
      d.speeds.metric[70] = null != (Mf = null == (Kf = a) ? void 0 : null == (Lf = Kf.speeds) ? void 0 : Lf.metric[70]) ? Mf : "#00ffff";
      var Nf, Of, Pf;
      d.speeds.metric[80] = null != (Pf = null == (Nf = a) ? void 0 : null == (Of = Nf.speeds) ? void 0 : Of.metric[80]) ? Pf : "#00bfff";
      var Qf, Rf, Sf;
      d.speeds.metric[90] = null != (Sf = null == (Qf = a) ? void 0 : null == (Rf = Qf.speeds) ? void 0 : Rf.metric[90]) ? Sf : "#0066ff";
      var Tf, Uf, Vf;
      d.speeds.metric[100] = null != (Vf = null == (Tf = a) ? void 0 : null == (Uf = Tf.speeds) ? void 0 : Uf.metric[100]) ? Vf : "#ff00ff";
      var Wf, Xf, Yf;
      d.speeds.metric[110] = null != (Yf = null == (Wf = a) ? void 0 : null == (Xf = Wf.speeds) ? void 0 : Xf.metric[110]) ? Yf : "#ff0080";
      var Zf, $f, ag;
      d.speeds.metric[120] = null != (ag = null == (Zf = a) ? void 0 : null == ($f = Zf.speeds) ? void 0 : $f.metric[120]) ? ag : "#ff0000";
      var bg, cg, dg;
      d.speeds.metric[130] = null != (dg = null == (bg = a) ? void 0 : null == (cg = bg.speeds) ? void 0 : cg.metric[130]) ? dg : "#ff9000";
      var eg, fg, gg;
      d.speeds.metric[140] = null != (gg = null == (eg = a) ? void 0 : null == (fg = eg.speeds) ? void 0 : fg.metric[140]) ? gg : "#ff4000";
      var hg, ig, jg;
      d.speeds.metric[150] = null != (jg = null == (hg = a) ? void 0 : null == (ig = hg.speeds) ? void 0 : ig.metric[150]) ? jg : "#0040ff";
    }
    var kg, lg;
    if (null == (kg = a) ? 0 : null == (lg = kg.speeds) ? 0 : lg.imperial) {
      d.speeds.imperial = a.speeds.imperial;
    } else {
      d.speeds.imperial = {};
      var mg, ng, og;
      d.speeds.imperial[5] = null != (og = null == (mg = a) ? void 0 : null == (ng = mg.speeds) ? void 0 : ng.imperial[5]) ? og : "#ff0000";
      var pg, qg, rg;
      d.speeds.imperial[10] = null != (rg = null == (pg = a) ? void 0 : null == (qg = pg.speeds) ? void 0 : qg.imperial[10]) ? rg : "#ff8000";
      var sg, tg, ug;
      d.speeds.imperial[15] = null != (ug = null == (sg = a) ? void 0 : null == (tg = sg.speeds) ? void 0 : tg.imperial[15]) ? ug : "#ffb000";
      var vg, wg, xg;
      d.speeds.imperial[20] = null != (xg = null == (vg = a) ? void 0 : null == (wg = vg.speeds) ? void 0 : wg.imperial[20]) ? xg : "#bfff00";
      var yg, zg, Ag;
      d.speeds.imperial[25] = null != (Ag = null == (yg = a) ? void 0 : null == (zg = yg.speeds) ? void 0 : zg.imperial[25]) ? Ag : "#993300";
      var Bg, Cg, Dg;
      d.speeds.imperial[30] = null != (Dg = null == (Bg = a) ? void 0 : null == (Cg = Bg.speeds) ? void 0 : Cg.imperial[30]) ? Dg : "#33ff33";
      var Eg, Fg, Gg;
      d.speeds.imperial[35] = null != (Gg = null == (Eg = a) ? void 0 : null == (Fg = Eg.speeds) ? void 0 : Fg.imperial[35]) ? Gg : "#00ff90";
      var Hg, Ig, Jg;
      d.speeds.imperial[40] = null != (Jg = null == (Hg = a) ? void 0 : null == (Ig = Hg.speeds) ? void 0 : Ig.imperial[40]) ? Jg : "#00ffff";
      var Kg, Lg, Mg;
      d.speeds.imperial[45] = null != (Mg = null == (Kg = a) ? void 0 : null == (Lg = Kg.speeds) ? void 0 : Lg.imperial[45]) ? Mg : "#00bfff";
      var Ng, Og, Pg;
      d.speeds.imperial[50] = null != (Pg = null == (Ng = a) ? void 0 : null == (Og = Ng.speeds) ? void 0 : Og.imperial[50]) ? Pg : "#0066ff";
      var Qg, Rg, Sg;
      d.speeds.imperial[55] = null != (Sg = null == (Qg = a) ? void 0 : null == (Rg = Qg.speeds) ? void 0 : Rg.imperial[55]) ? Sg : "#ff00ff";
      var Tg, Ug, Vg;
      d.speeds.imperial[60] = null != (Vg = null == (Tg = a) ? void 0 : null == (Ug = Tg.speeds) ? void 0 : Ug.imperial[60]) ? Vg : "#ff0050";
      var Wg, Xg, Yg;
      d.speeds.imperial[65] = null != (Yg = null == (Wg = a) ? void 0 : null == (Xg = Wg.speeds) ? void 0 : Xg.imperial[65]) ? Yg : "#ff9010";
      var Zg, $g, ah;
      d.speeds.imperial[70] = null != (ah = null == (Zg = a) ? void 0 : null == ($g = Zg.speeds) ? void 0 : $g.imperial[70]) ? ah : "#0040ff";
      var bh, ch, dh;
      d.speeds.imperial[75] = null != (dh = null == (bh = a) ? void 0 : null == (ch = bh.speeds) ? void 0 : ch.imperial[75]) ? dh : "#10ff10";
      var eh, fh, gh;
      d.speeds.imperial[80] = null != (gh = null == (eh = a) ? void 0 : null == (fh = eh.speeds) ? void 0 : fh.imperial[80]) ? gh : "#ff4000";
      var hh, ih, jh;
      d.speeds.imperial[85] = null != (jh = null == (hh = a) ? void 0 : null == (ih = hh.speeds) ? void 0 : ih.imperial[85]) ? jh : "#ff0000";
    }
    H(d);
    return c;
  }
  function wa(b) {
    if (d.showSLSinglecolor) {
      return d.SLColor;
    }
    var c;
    return null != (c = d.speeds[W.prefs.attributes.isImperial ? "imperial" : "metric"][b]) ? c : d.speeds["default"];
  }
  function kh(b, c, a) {
    b ? (b = a.x - c.x, c = a.y - c.y) : (b = c.x - a.x, c = c.y - a.y);
    return 180 * Math.atan2(b, c) / Math.PI;
  }
  function ka(b) {
    var c = "";
    if (b) {
      b = b.toString();
      for (var a = 0; a < b.length; a += 1) {
        c += Nh[b.charAt(a)];
      }
    }
    return c;
  }
  function lh(b, c, a) {
    a = void 0 === a ? !1 : a;
    var e, f, h = [];
    var m = null;
    var l = b.getAttributes(), q = b.getAddress(), u = b.hasNonEmptyStreet();
    if (null !== l.primaryStreetID && void 0 === q.attributes.state) {
      x("Address not ready", q, l), setTimeout(function() {
        lh(b, c, !0);
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
      N[l.roadType] || (q += "\n!! UNSUPPORTED ROAD TYPE !!");
      p = "";
      (null != (e = l.fwdMaxSpeed) ? e : l.revMaxSpeed) && d.showSLtext && (l.fwdMaxSpeed === l.revMaxSpeed ? p = ka(l.fwdMaxSpeed) : l.fwdMaxSpeed ? (p = ka(l.fwdMaxSpeed), l.revMaxSpeed && (p += "'" + ka(l.revMaxSpeed))) : (p = ka(l.revMaxSpeed), l.fwdMaxSpeed && (p += "'" + ka(l.fwdMaxSpeed))), l.fwdMaxSpeedUnverified || l.revMaxSpeedisVerified) && (p += "?");
      e = q + " " + p;
      if (" " === e) {
        return [];
      }
      p = l.roadType;
      p = new OpenLayers.Feature.Vector(c[0], {myId:l.id, color:N[p] ? N[p].strokeColor : "#f00", outlinecolor:N[p] ? N[p].outlineColor : "#fff", outlinewidth:d.labelOutlineWidth, });
      y = [];
      for (v = 0; v < c.length - 1; v += 1) {
        g = c[v].distanceTo(c[v + 1]), y.push({index:v, h:g});
      }
      y.sort(function(G, K) {
        return G.h > K.h ? -1 : G.h < K.h ? 1 : 0;
      });
      v = "" === q ? 1 : y.length;
      g = mh * e.length;
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
  function nh(b) {
    var c = b.id, a = b.rev, e = b.l, f = b.m;
    b = kh(b.j, a ? f : e, a ? e : f);
    return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(e.x + 10 * Math.sin(b), e.y + 10 * Math.cos(b)), {myId:c, }, {rotation:b, externalGraphic:"https://raw.githubusercontent.com/bedo2991/svl/master/average.png", graphicWidth:36, graphicHeight:36, graphicZIndex:300, fillOpacity:1, pointerEvents:"none", });
  }
  function Oh(b) {
    var c = b.getAttributes();
    x("Drawing segment: " + c.id);
    var a = c.geometry.components, e = c.geometry.getVertices(), f = (new OpenLayers.Geometry.LineString(e)).simplify(1.5).components, h = [], m = 100 * c.level, l = c.fwdDirection && c.revDirection, q = b.isInRoundabout(), u = !1, p = !1, y = c.roadType, v = Q({v:c.width, u:y, B:l, });
    l = v;
    var g = null;
    if (null === c.primaryStreetID) {
      return g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.red.strokeColor, width:v, dash:d.red.strokeDashstyle, }), h.push(g), h;
    }
    d.routingModeEnabled && null !== c.routingRoadType && (y = c.routingRoadType);
    if (void 0 !== N[y]) {
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
          p = c.fwdMaxSpeed, b.isOneWay() && c.revDirection && (p = c.revMaxSpeed), p && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:wa(p), width:u ? 0.8 * v : v, dash:B, a:!0, zIndex:m + 115, }), h.push(g));
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
              var R = K / g;
              G = -1 / R;
              if (0.05 > Math.abs(R)) {
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
            g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(p), {myId:c.id, color:wa(c.fwdMaxSpeed), width:l, dash:B, a:!0, zIndex:m + 105, });
            h.push(g);
            g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(F), {myId:c.id, color:wa(c.revMaxSpeed), width:l, dash:B, a:!0, zIndex:m + 110, });
            h.push(g);
          }
        }
      }
      g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:N[y].strokeColor, width:l, dash:N[y].strokeDashstyle, zIndex:m + 120, });
      h.push(g);
      0 > c.level && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:"#000000", width:l, opacity:0.3, zIndex:m + 125, }), h.push(g));
      u = b.getLockRank() + 1;
      var J, z;
      if (u > d.fakelock || u > (null == (J = WazeWrap) ? void 0 : null == (z = J.User) ? void 0 : z.Rank())) {
        g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:oh.strokeColor, width:0.1 * l, dash:oh.g, zIndex:m + 147, }), h.push(g);
      }
      J = b.getFlagAttributes();
      J.unpaved && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.dirty.strokeColor, width:0.7 * l, opacity:d.dirty.strokeOpacity, dash:d.dirty.strokeDashstyle, zIndex:m + 135, }), h.push(g));
      c.hasClosures && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.closure.strokeColor, width:0.6 * l, dash:d.closure.strokeDashstyle, opacity:d.closure.strokeOpacity, a:!0, zIndex:m + 140, }), h.push(g));
      if (c.fwdToll || c.revToll || c.restrictions.some(function(T) {
        return "TOLL" === T.getDefaultType();
      })) {
        g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.toll.strokeColor, width:0.3 * l, dash:d.toll.strokeDashstyle, opacity:d.toll.strokeOpacity, zIndex:m + 145, }), h.push(g);
      }
      q && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:xa.strokeColor, width:0.15 * l, dash:xa.g, opacity:xa.strokeOpacity, a:!0, zIndex:m + 150, }), h.push(g));
      0 < c.restrictions.length && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.restriction.strokeColor, width:0.4 * l, dash:d.restriction.strokeDashstyle, opacity:d.restriction.strokeOpacity, a:!0, zIndex:m + 155, }), h.push(g));
      !1 === c.validated && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:ph.strokeColor, width:0.5 * l, dash:ph.g, a:!0, zIndex:m + 160, }), h.push(g));
      J.headlights && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.headlights.strokeColor, width:0.2 * l, dash:d.headlights.strokeDashstyle, opacity:d.headlights.strokeOpacity, a:!0, zIndex:m + 165, }));
      J.nearbyHOV && h.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:d.nearbyHOV.strokeColor, width:0.25 * l, dash:d.nearbyHOV.strokeDashstyle, opacity:d.nearbyHOV.strokeOpacity, a:!0, zIndex:m + 166, }));
      0 < c.fwdLaneCount && (z = e.slice(-2), z[0] = (new OpenLayers.Geometry.LineString([z[0], z[1], ])).getCentroid(!0), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(z), {myId:c.id, color:d.lanes.strokeColor, width:0.3 * l, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:m + 170, }), h.push(g));
      0 < c.revLaneCount && (z = e.slice(0, 2), z[1] = (new OpenLayers.Geometry.LineString([z[0], z[1], ])).getCentroid(!0), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(z), {myId:c.id, color:d.lanes.strokeColor, width:0.3 * l, dash:d.lanes.strokeDashstyle, opacity:d.lanes.strokeOpacity, a:!0, zIndex:m + 175, }), h.push(g));
      if (!1 === c.fwdDirection || !1 === c.revDirection) {
        if (z = a, !q && c.length / a.length < d.arrowDeclutter && (z = f), !1 === (c.fwdDirection || c.revDirection)) {
          for (u = 0; u < z.length - 1; u += 1) {
            h.push(new OpenLayers.Feature.Vector((new OpenLayers.Geometry.LineString([z[u], z[u + 1], ])).getCentroid(!0), {myId:c.id, a:!0, i:!0, zIndex:m + 180, }, Ph));
          }
        } else {
          for (u = q ? 3 : 1, y = u - 1; y < z.length - 1; y += u) {
            v = kh(c.fwdDirection, z[y], z[y + 1]), B = new OpenLayers.Geometry.LineString([z[y], z[y + 1], ]), h.push(new OpenLayers.Feature.Vector(B.getCentroid(!0), {myId:c.id, a:!0, i:!0, }, {graphicName:"myTriangle", rotation:v, stroke:!0, strokeColor:"#000", graphiczIndex:m + 180, strokeWidth:1.5, fill:!0, fillColor:"#fff", fillOpacity:0.7, pointRadius:5, }));
          }
        }
      }
      J.fwdSpeedCamera && h.push(nh({id:c.id, rev:!1, j:c.fwdDirection, l:a[0], m:a[1], }));
      J.revSpeedCamera && h.push(nh({id:c.id, rev:!0, j:c.fwdDirection, l:a[a.length - 1], m:a[a.length - 2], }));
      if (!0 === d.renderGeomNodes && !q) {
        for (q = 1; q < a.length - 2; q += 1) {
          h.push(new OpenLayers.Feature.Vector(a[q], {myId:c.id, zIndex:m + 200, a:!0, i:!0, }, Qh));
        }
      }
      J.tunnel && (g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:ya.strokeColor, opacity:ya.strokeOpacity, width:0.3 * l, dash:ya.g, zIndex:m + 177, }), h.push(g), g = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(e), {myId:c.id, color:qh.strokeColor, width:0.1 * l, dash:qh.g, zIndex:m + 177, }), h.push(g));
    }
    b = lh(b, f);
    0 < b.length && A.addFeatures(b);
    return h;
  }
  function rh(b) {
    b = b.getAttributes();
    var c = new OpenLayers.Geometry.Point(b.geometry.x, b.geometry.y);
    return new OpenLayers.Feature.Vector(c, {myid:b.id, }, sh(b));
  }
  function Rh() {
    V();
    la(d);
    ma();
  }
  function Sh() {
    GM_setClipboard(JSON.stringify(d));
    alert("The configuration has been copied to your clipboard. Please paste it in a file (CTRL+V) to store it.");
  }
  function Th() {
    var b = prompt("N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!\n\nPaste your string here:");
    if (null !== b && "" !== b) {
      try {
        d = JSON.parse(b);
      } catch (c) {
        alert("Your string seems to be somehow wrong. Place check that is a valid JSON string");
        return;
      }
      null !== d && d.streets ? (la(d), H(d), ma()) : alert("Something went wrong. Is your string correct?");
    }
  }
  function th() {
    var b = parseInt(W.map.getLayerByUniqueName("gps_points").getZIndex(), 10);
    d.showUnderGPSPoints ? (C.setZIndex(b - 2), E.setZIndex(b - 1)) : (C.setZIndex(b + 1), E.setZIndex(b + 2));
  }
  function uh() {
    if (d.routingModeEnabled) {
      var b = document.createElement("div");
      b.id = "routingModeDiv";
      b.className = "routingDiv";
      b.innerHTML = "Routing Mode<br><small>Hover to temporary disable it<small>";
      b.addEventListener("mouseenter", function() {
        d.routingModeEnabled = !1;
        na();
      });
      b.addEventListener("mouseleave", function() {
        d.routingModeEnabled = !0;
        na();
      });
      document.getElementById("map").appendChild(b);
    } else {
      null == (b = document.getElementById("routingModeDiv")) || b.remove();
    }
  }
  function vh() {
    clearInterval(za);
    za = null;
    d.autoReload && d.autoReload.enabled && (za = setInterval(r, d.autoReload.interval));
  }
  function wh() {
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
    d.showUnderGPSPoints !== document.getElementById("svl_showUnderGPSPoints").checked ? (d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked, th()) : d.showUnderGPSPoints = document.getElementById("svl_showUnderGPSPoints").checked;
    d.routingModeEnabled !== document.getElementById("svl_routingModeEnabled").checked ? (d.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked, uh()) : d.routingModeEnabled = document.getElementById("svl_routingModeEnabled").checked;
    d.useWMERoadLayerAtZoom = document.getElementById("svl_useWMERoadLayerAtZoom").value;
    d.switchZoom = document.getElementById("svl_switchZoom").value;
    d.showANs = document.getElementById("svl_showANs").checked;
    d.realsize = document.getElementById("svl_realsize").checked;
    d.realsize ? $("input.segmentsWidth").prop("disabled", !0) : $("input.segmentsWidth").prop("disabled", !1);
    la(d);
    vh();
  }
  function Uh() {
    wh();
    H(d);
    ma();
  }
  function Vh(b) {
    x("rollbackDefault");
    if (null != b ? b : confirm("Are you sure you want to rollback to the default settings?\nANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!")) {
      x("rollbacking preferences"), x("saveDefaultPreferences"), V(!0), la(d), ma();
    }
  }
  function xh(b) {
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
        var K, R, J, z;
        return null != (z = null == c ? void 0 : null == (K = c.edit) ? void 0 : null == (R = K.segment) ? void 0 : null == (J = R.fields) ? void 0 : J.headlights) ? z : b;
      case "lanes":
        var T, X, Y;
        return null != (Y = null == c ? void 0 : null == (T = c.objects) ? void 0 : null == (X = T.lanes) ? void 0 : X.title) ? Y : b;
      case "speed limit":
        var Z, aa, ba, ca;
        return null != (ca = null == c ? void 0 : null == (Z = c.edit) ? void 0 : null == (aa = Z.segment) ? void 0 : null == (ba = aa.fields) ? void 0 : ba.speed_limit) ? ca : b;
      case "nearbyHOV":
        var da, ea, fa, ha;
        return null != (ha = null == c ? void 0 : null == (da = c.edit) ? void 0 : null == (ea = da.segment) ? void 0 : null == (fa = ea.fields) ? void 0 : fa.nearbyHOV) ? ha : b;
    }
    var ia, ja;
    return null != (ja = null == c ? void 0 : null == (ia = c.segment) ? void 0 : ia.road_types[b]) ? ja : b;
  }
  function O(b) {
    var c = b.f, a = void 0 === b.c ? !0 : b.c, e = void 0 === b.b ? !1 : b.b;
    b = document.createElement("h5");
    b.innerText = xh(c);
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
  function yh(b, c) {
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
    b.className = "prefLineSL";
    b.appendChild(f);
    return b;
  }
  function zh() {
    return {streets:["red"], decorations:"lanes toll restriction closure headlights dirty nearbyHOV".split(" "), };
  }
  function ma() {
    document.getElementById("svl_saveNewPref").classList.add("disabled");
    document.getElementById("svl_rollbackButton").classList.add("disabled");
    document.getElementById("svl_saveNewPref").classList.remove("btn-primary");
    document.getElementById("sidepanel-svl").classList.remove("svl_unsaved");
    for (var b = 0; b < d.streets.length; b += 1) {
      d.streets[b] && (document.getElementById("svl_streetWidth_" + b).value = d.streets[b].strokeWidth, document.getElementById("svl_streetColor_" + b).value = d.streets[b].strokeColor, document.getElementById("svl_strokeDashstyle_" + b).value = d.streets[b].strokeDashstyle);
    }
    b = zh();
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
    c = W.prefs.attributes.isImperial ? "imperial" : "metric";
    a = Object.keys(d.speeds[c]);
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
  function ra(b) {
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
  function oa(b) {
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
  function pa(b, c) {
    var a = document.createElement("details");
    a.open = void 0 === c ? !1 : c;
    c = document.createElement("summary");
    c.innerText = b;
    a.appendChild(c);
    return a;
  }
  function Wh() {
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
    c.innerText = "Version 4.9.5.1";
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
    var h = pa("Roads Properties", !0);
    h.appendChild(L({id:"realsize", title:"Use real-life Width", description:"When enabled, the segments thickness will be computed from the segments width instead of using the value set in the preferences", }));
    for (c = 0; c < d.streets.length; c += 1) {
      d.streets[c] && h.appendChild(O({f:c, c:!0, b:!1}));
    }
    e = pa("Segments Decorations");
    a = pa("Rendering Parameters");
    c = pa("Speed Limits");
    zh().streets.forEach(function(m) {
      "red" !== m ? h.appendChild(O({f:m, c:!0, b:!1, })) : h.appendChild(O({f:m, c:!1, b:!1, }));
    });
    e.appendChild(O({f:"lanes", c:!1, b:!0, }));
    e.appendChild(O({f:"toll", c:!1, b:!0, }));
    e.appendChild(O({f:"restriction", c:!1, b:!0, }));
    e.appendChild(O({f:"closure", c:!1, b:!0, }));
    e.appendChild(O({f:"headlights", c:!1, b:!0, }));
    e.appendChild(O({f:"dirty", c:!1, b:!0, }));
    e.appendChild(O({f:"nearbyHOV", c:!1, b:!0, }));
    h.appendChild(e);
    b.appendChild(h);
    h.appendChild(L({id:"showANs", title:"Show Alternative Names", description:"When enabled, at most 2 ANs that differ from the primary name are shown under the street name.", }));
    a.appendChild(L({id:"routingModeEnabled", title:"Enable Routing Mode", description:"When enabled, roads are rendered by taking into consideration their routing attribute. E.g. a preferred Minor Highway is shown as a Major Highway.", }));
    a.appendChild(L({id:"showUnderGPSPoints", title:"GPS Layer above Roads", description:"When enabled, the GPS layer gets shown above the road layer.", }));
    h.appendChild(oa({id:"labelOutlineWidth", title:"Labels Outline Width", description:"How much border should the labels have?", min:0, max:10, step:1, }));
    a.appendChild(L({id:"disableRoadLayers", title:"Hide WME Road Layer", description:"When enabled, the WME standard road layer gets hidden automatically.", }));
    a.appendChild(L({id:"startDisabled", title:"SVL Initially Disabled", description:"When enabled, the SVL does not get enabled automatically.", }));
    h.appendChild(oa({id:"clutterConstant", title:"Street Names Density", description:"For an higher value, less elements will be shown.", min:1, max:20, step:1, }));
    a.appendChild(ra({id:"useWMERoadLayerAtZoom", title:"Stop using SVL at zoom level", description:"When you reach this zoom level, the road layer gets automatically enabled.", min:0, max:5, step:1, }));
    a.appendChild(ra({id:"switchZoom", title:"Close-zoom until level", description:"When the zoom is lower then this value, it will switch to far-zoom mode (rendering less details)", min:5, max:9, step:1, }));
    e = document.createElement("h5");
    e.innerText = "Close-zoom only";
    a.appendChild(e);
    a.appendChild(L({id:"renderGeomNodes", title:"Render Geometry Nodes", description:"When enabled, the geometry nodes are drawn, too.", }));
    a.appendChild(ra({id:"fakelock", title:"Render Map as Level", description:"All segments locked above this level will be stroked through with a black line.", min:1, max:7, step:1, }));
    a.appendChild(oa({id:"closeZoomLabelSize", title:"Font Size (at close zoom)", description:"Increase this value if you can't read the street names because they are too small.", min:8, max:32, step:1, }));
    a.appendChild(oa({id:"arrowDeclutter", title:"Limit Arrows", description:"Increase this value if you want less arrows to be shown on streets (it increases the performance).", min:1, max:200, step:1, }));
    e = document.createElement("h5");
    e.innerText = "Far-zoom only";
    a.appendChild(e);
    a.appendChild(oa({id:"farZoomLabelSize", title:"Font Size (at far zoom)", description:"Increase this value if you can't read the street names because they are too small.", min:8, max:32, }));
    a.appendChild(L({id:"hideMinorRoads", title:"Hide minor roads at zoom 3", description:"The WME loads some type of roads when they probably shouldn't be, check this option for avoid displaying them at higher zooms.", }));
    b.appendChild(a);
    a = pa("Utilities");
    a.appendChild(L({id:"autoReload_enabled", title:"Automatically Refresh the Map", description:"When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing.", }));
    a.appendChild(ra({id:"autoReload_interval", title:"Auto Reload Time Interval (in Seconds)", description:"How often should the WME be refreshed for new edits?", min:20, max:3600, step:1, }));
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
    a.innerText = xh("speed limit");
    c.appendChild(a);
    a = W.prefs.attributes.isImperial ? "imperial" : "metric";
    c.appendChild(yh("Default"));
    for (e = 1; e < Object.keys(d.speeds[a]).length + 1; e += 1) {
      c.appendChild(yh(e, !W.prefs.attributes.isImperial));
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
    new WazeWrap.Interface.Tab("SVL \ud83d\uddfa\ufe0f", b.innerHTML, ma);
    document.querySelectorAll(".prefElement").forEach(function(m) {
      m.addEventListener("change", wh);
    });
    document.getElementById("svl_saveNewPref").addEventListener("click", Uh);
    document.getElementById("svl_rollbackButton").addEventListener("click", Rh);
    document.getElementById("svl_resetButton").addEventListener("click", Vh);
    document.getElementById("svl_importButton").addEventListener("click", Th);
    document.getElementById("svl_exportButton").addEventListener("click", Sh);
  }
  function Xh(b) {
    x("Removing " + b.length + " nodes");
    if (I.zoom <= d.useWMERoadLayerAtZoom) {
      x("Destroy all nodes"), E.destroyFeatures();
    } else {
      if (M || 4000 < b.length) {
        M || sa();
      } else {
        var c;
        for (c = 0; c < b.length; c += 1) {
          E.destroyFeatures(E.getFeaturesByAttribute("myid", b[c].attributes.id));
        }
      }
    }
  }
  function sh(b) {
    var c;
    return 1 === (null == (c = b.segIDs) ? void 0 : c.length) ? Yh : Zh;
  }
  function $h(b) {
    x("Change nodes");
    b.forEach(function(c) {
      var a = c.attributes, e = E.getFeaturesByAttribute("myid", a.id)[0];
      e ? (e.style = sh(a), e.move(new OpenLayers.LonLat(a.geometry.x, a.geometry.y))) : 0 < a.id && E.addFeatures([rh(c)]);
    });
  }
  function ai(b) {
    x("Node state deleted");
    for (var c = 0; c < b.length; c += 1) {
      E.destroyFeatures(E.getFeaturesByAttribute("myid", b[c].getID()));
    }
  }
  function bi(b) {
    for (var c = 0; c < b.length; c += 1) {
      ta(b[c].getID());
    }
  }
  function Ah(b) {
    x("Adding " + b.length + " nodes");
    if (M || 4000 < b.length) {
      M || sa();
    } else {
      if (I.zoom <= d.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        for (var c = [], a = 0; a < b.length; a += 1) {
          void 0 !== b[a].attributes.geometry ? 0 < b[a].attributes.id && c.push(rh(b[a])) : console.warn("[SVL] Geometry of node is undefined");
        }
        E.addFeatures(c);
        return !0;
      }
    }
  }
  function S(b) {
    return !b.H;
  }
  function Bh() {
    x("updateStatusBasedOnZoom running");
    var b = !0;
    M && (3000 > Object.keys(W.model.segments.objects).length && 4000 > Object.keys(W.model.nodes.objects).length ? (M = !1, w(1, !0), w(0, !1), na()) : console.warn("[SVL] Still too many elements to draw: Segments: " + Object.keys(W.model.segments.objects).length + "/3000, Nodes: " + Object.keys(W.model.nodes.objects).length + "/4000"));
    I.zoom <= d.useWMERoadLayerAtZoom ? (x("Road layer automatically enabled because of zoom out"), !0 === C.visibility && (ua = !0, w(0, !0), w(1, !1)), b = !1) : ua && (x("Re-enabling SVL after zoom in"), w(1, !0), w(0, !1), ua = !1);
    return b;
  }
  function ci() {
    clearTimeout(Ch);
    x("manageZoom clearing timer");
    Ch = setTimeout(Bh, 800);
  }
  function sa() {
    console.warn("[SVL] Abort drawing, too many elements");
    M = !0;
    w(0, !0);
    w(1, !1);
    k();
  }
  function Aa(b) {
    x("Adding " + b.length + " segments");
    if (M || 3000 < b.length) {
      M || sa();
    } else {
      if (I.zoom <= d.useWMERoadLayerAtZoom) {
        x("Not adding them because of the zoom");
      } else {
        Dh();
        var c = [];
        b.forEach(function(a) {
          null !== a && (c = c.concat(Oh(a)));
        });
        0 < c.length ? (x(c.length + " features added to the street layer"), C.addFeatures(c)) : console.warn("[SVL] no features drawn");
        Eh();
      }
    }
  }
  function ta(b) {
    x("RemoveSegmentById: " + b);
    C.destroyFeatures(C.getFeaturesByAttribute("myId", b));
    A.destroyFeatures(A.getFeaturesByAttribute("myId", b));
  }
  function di(b) {
    x("Edit " + b.length + " segments");
    b.forEach(function(c) {
      var a = c.getOldID();
      a && ta(parseInt(a, 10));
      ta(c.getID());
      "Delete" !== c.state && Aa([c]);
    });
  }
  function ei(b) {
    x("Removing " + b.length + " segments");
    I.zoom <= d.useWMERoadLayerAtZoom ? (x("Destroy all segments and labels because of zoom out"), C.destroyFeatures(), A.destroyFeatures()) : M || 3000 < b.length ? M || sa() : (Dh(), b.forEach(function(c) {
      ta(c.attributes.id);
    }), Eh());
  }
  function Fh(b) {
    x("ManageVisibilityChanged", b);
    E.setVisibility(b.object.visibility);
    A.setVisibility(b.object.visibility);
    b.object.visibility ? (x("enabled: registering events"), b = W.model.segments._events, b.objectsadded.push({context:C, callback:Aa, svl:!0, }), b.objectschanged.push({context:C, callback:di, svl:!0, }), b.objectsremoved.push({context:C, callback:ei, svl:!0, }), b["objects-state-deleted"].push({context:C, callback:bi, svl:!0, }), x("SVL: Registering node events"), b = W.model.nodes._events, b.objectsremoved.push({context:E, callback:Xh, svl:!0, }), b.objectsadded.push({context:E, callback:Ah, 
    svl:!0, }), b.objectschanged.push({context:E, callback:$h, svl:!0, }), b["objects-state-deleted"].push({context:E, callback:ai, svl:!0, }), !0 === Bh() && na()) : (x("disabled: unregistering events"), x("SVL: Removing segments events"), b = W.model.segments._events, b.objectsadded = b.objectsadded.filter(S), b.objectschanged = b.objectschanged.filter(S), b.objectsremoved = b.objectsremoved.filter(S), b["objects-state-deleted"] = b["objects-state-deleted"].filter(S), x("SVL: Removing node events"), 
    b = W.model.nodes._events, b.objectsremoved = b.objectsremoved.filter(S), b.objectsadded = b.objectsadded.filter(S), b.objectschanged = b.objectschanged.filter(S), b["objects-state-deleted"] = b["objects-state-deleted"].filter(S), k());
  }
  function Gh(b) {
    b = void 0 === b ? 1 : b;
    30 < b ? console.error("SVL: could not initialize WazeWrap") : WazeWrap && WazeWrap.Ready && WazeWrap.Interface ? fi() : (console.log("SVL: WazeWrap not ready, retrying in 800ms"), setTimeout(function() {
      Gh(b + 1);
    }, 800));
  }
  function fi() {
    console.log("SVL: initializing WazeWrap");
    try {
      (new WazeWrap.Interface.Shortcut("SVLToggleLayer", "Toggle SVL", "svl", "Street Vector Layer", "A+l", function() {
        w(1, !C.visibility);
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
    d.startDisabled && w(1, !1);
    Wh();
    WazeWrap.Interface.ShowScriptUpdate("Street Vector Layer", "4.9.5.1", '<b>Major update!</b>\n            <br>Many things have changed! You may need to change some settings to have a similar view as before (for example increasing the streets width)\n        <br>- NEW: Rendering completely rewritten: performance improvements\n        <br>- NEW: The preference panel was redesigned and is now in the sidebar (SVL \ud83d\uddfa\ufe0f)\n        <br>- NEW: You can set what color to use for each speed limit (User request)\n        <br>- NEW: Added an option to render the streets based on their width (one way streets are thinner, their size changes when you zoom)\n        <br>- NEW: Some options are now are now localised using WME\'s strings\n        <br>- NEW: Dead-end nodes are rendered with a different color\n        <br>- NEW: The Preference panel changes color when you have unsaved changes\n        <br>- NEW: The "Next to Carpool/HOV/bus lane" is also shown\n        <br>- Removed: the zoom-level indicator while editing the preferences\n        <br>- Bug fixes and new bugs :)');
  }
  function Hh(b) {
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
          Hh(c);
        }, 500);
        return;
      }
      console.error(e);
      alert("Street Vector Layer failed to inizialize. Maybe the Editor has been updated or your connection/pc is really slow.");
      return;
    }
    I = W.map.getOLMap();
    d = null;
    OpenLayers.Renderer.symbol.myTriangle = [-2, 0, 2, 0, 0, -6, -2, 0];
    !1 === V() && alert("This is the first time that you run Street Vector Layer in this browser.\nSome info about it:\nBy default, use ALT+L to toggle the layer.\nYou can change the streets color, thickness and style using the panel on the left sidebar.\nYour preferences will be saved for the next time in your browser.\nThe other road layers will be automatically hidden (you can change this behaviour in the preference panel).\nHave fun and tell us on the Waze forum if you liked the script!");
    b = new OpenLayers.StyleMap({pointerEvents:"none", strokeColor:"${color}", strokeWidth:"${width}", strokeOpacity:"${opacity}", strokeDashstyle:"${dash}", graphicZIndex:"${zIndex}", });
    var a = new OpenLayers.StyleMap({fontFamily:"Rubik, Open Sans, Alef, helvetica, sans-serif", fontWeight:"800", fontColor:"${color}", labelOutlineColor:"${outlinecolor}", labelOutlineWidth:"${outlinewidth}", label:"${label}", visibility:!d.startDisabled, angle:"${angle}", pointerEvents:"none", labelAlign:"cm", });
    C = new OpenLayers.Layer.Vector("Street Vector Layer", {styleMap:b, uniqueName:"vectorStreet", accelerator:"toggle" + "Street Vector Layer".replace(/\s+/g, ""), visibility:!d.startDisabled, isVector:!0, attribution:"SVL v. 4.9.5.1", rendererOptions:{zIndexing:!0, }, });
    C.renderer.drawFeature = function(e, f) {
      null == f && (f = e.style);
      if (e.geometry) {
        var h = n();
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
        return n() ? f = {display:"none"} : e.geometry.getBounds().intersectsBounds(E.renderer.extent) ? (E.renderer.featureDx = 0, d.realsize && (f.pointRadius /= I.resolution)) : f = {display:"none"}, E.renderer.drawGeometry(e.geometry, f, e.id);
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
        var m = n();
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
    la(d);
    I.addLayer(C);
    I.addLayer(A);
    I.addLayer(E);
    "true" === window.localStorage.getItem("svlDebugOn") && (document.sv = C, document.lv = A, document.nv = E, document.svl_pref = d);
    b = I.getLayersBy("uniqueName", "roads");
    U = null;
    1 === b.length && (U = Ca(b).next().value);
    ua = !1;
    d.showUnderGPSPoints && th();
    uh();
    vh();
    I.events.register("zoomend", null, ci, !0);
    Gh();
    I.zoom <= d.useWMERoadLayerAtZoom ? w(0, !0) : U.getVisibility() && d.disableRoadLayers && (w(0, !1), console.log("SVL: WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel."));
    C.events.register("visibilitychanged", C, Fh);
    Fh({object:C, });
    $(".olControlAttribution").click(function() {
      alert('The preferences have been moved to the sidebar on the left. Please look for the "SVL \ud83d\uddfa\ufe0f" tab.');
    });
    console.log("[SVL] v. 4.9.5.1 initialized correctly.");
  }
  function na() {
    x("DrawAllSegments");
    k();
    Aa(Object.values(W.model.segments.objects));
    Ah(Object.values(W.model.nodes.objects));
  }
  function la(b) {
    for (var c = 0; c < b.streets.length; c += 1) {
      if (b.streets[c]) {
        var a = b.streets[c].strokeColor;
        N[c] = {strokeColor:b.streets[c].strokeColor, strokeWidth:b.streets[c].strokeWidth, strokeDashstyle:b.streets[c].strokeDashstyle, outlineColor:127 > 0.299 * parseInt(a.substring(1, 3), 16) + 0.587 * parseInt(a.substring(3, 5), 16) + 0.114 * parseInt(a.substring(5, 7), 16) ? "#FFF" : "#000", };
      }
    }
    mh = b.clutterConstant;
    na();
  }
  function Ih(b) {
    b = void 0 === b ? 0 : b;
    if (void 0 === W || void 0 === W.map) {
      console.log("SVL not ready to start, retrying in 600ms");
      var c = b + 1;
      20 > c ? setTimeout(function() {
        Ih(c);
      }, 600) : alert("Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!");
    } else {
      Hh();
    }
  }
  var Ba = "true" === window.localStorage.getItem("svlDebugOn"), x = Ba ? function(b) {
    for (var c = [], a = 0; a < arguments.length; ++a) {
      c[a] = arguments[a];
    }
    for (a = 0; a < c.length; a += 1) {
      "string" === typeof c[a] ? console.log("[SVL] 4.9.5.1: " + c[a]) : console.dir(c[a]);
    }
  } : function() {
  }, Dh = Ba ? console.group : function() {
  }, Eh = Ba ? console.groupEnd : function() {
  }, za = null, mh, N = [], C, E, A, M = !1, d, U, ua, I, qa = {ROAD_LAYER:null, SVL_LAYER:null, }, Nh = "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079".split(""), ph = {strokeColor:"#F53BFF", strokeWidth:3, g:"solid", }, xa = {strokeColor:"#111111", strokeWidth:1, g:"dash", strokeOpacity:0.6, }, Zh = {stroke:!1, fillColor:"#0015FF", fillOpacity:0.9, pointRadius:3, pointerEvents:"none", }, Yh = {stroke:!1, fillColor:"#C31CFF", fillOpacity:0.9, pointRadius:3, pointerEvents:"none", }, 
  Ph = {graphicName:"x", strokeColor:"#f00", strokeWidth:1.5, fillColor:"#FFFF40", fillOpacity:0.7, pointRadius:7, pointerEvents:"none", }, Qh = {stroke:!1, fillColor:"#000", fillOpacity:0.5, pointRadius:3.5, graphicZIndex:179, pointerEvents:"none", }, oh = {strokeColor:"#000", strokeDashstyle:"solid", }, qh = {strokeColor:"#C90", g:"longdash", }, ya = {strokeColor:"#fff", strokeOpacity:0.8, g:"longdash", }, Ea = {1:5.0, 2:5.5, 3:22.5, 4:6.0, 5:2.0, 6:10.0, 7:9.0, 8:4.0, 10:2.0, 15:8.0, 16:2.0, 17:5.0, 
  18:10.0, 19:5.0, 20:5.0, 22:3.0, }, Ch = null;
  Ih();
})();

