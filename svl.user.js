// ==UserScript==
// @name       Street Vector Layer
// @namespace  wme-champs-it
// @version    4.9.3.1
// @description  Adds a vector layer for drawing streets on the Waze Map editor
// @include    /^https:\/\/(www|beta)\.waze\.com(\/\w{2,3}|\/\w{2,3}-\w{2,3}|\/\w{2,3}-\w{2,3}-\w{2,3})?\/editor\b/
// @downloadURL  https://github.com/bedo2991/svl/raw/develop/svl.user.js
// @supportURL https://www.waze.com/forum/viewtopic.php?f=819&t=149535
// @require    https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @author     bedo2991
// @grant    GM_setClipboard
// @copyright  2015+, bedo2991
// ==/UserScript==

// @updateURL  http://code.waze.tools/repository/475e72a8-9df5-4a82-928c-7cd78e21e88d.user.js

/*jslint browser: true*/
/*jslint white: true */
/*jslint nomen: true */ //for variable starting with _
/*jshint esversion: 6*/
/* jshint nocomma:true, maxcomplexity: 10, freeze: true, forin: true, latedef: nofunc, curly: true, bitwise: true, undef: true, unused: true, browser: true, strict: true, devel:true*/
/* globals I18n:false, W:false, OpenLayers:false, WazeWrap:false, GM_info:false, $:false, GM_setClipboard:false */


//Code minifier: https://closure-compiler.appspot.com/home
//debugger;
(function () {
    "use strict";
    const consoleDebug = localStorage.getItem("svlDebugOn") === "true" ? (...args) => {
        for (let i = 0; i < args.length; i++) {
            if (typeof args[i] === "string") {
                console.log(`[SVL] ${GM_info.script.version}: ${args[i]}`);
            } else {
                console.dir(args[i]);
            }
        }
    } : () => { };

    let autoLoadInterval = null,
        clutterConstant,
        thresholdDistance,
        streetStyles = [],
        streetVector,
        nodesVector,
        labelsVector,
        labelOutlineWidth,
        arrowDeclutter,
        preferences,
        WMERoadLayer,
        SVLAutomDisabled,
        OLMap;

    const FARZOOMTHRESHOLD = 5; //To increase performance change this value to 6.
    const clutterMax = 700;
    const fontSizeMax = 32;
    const superScript = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
    const svlIgnoredStreets = {
        8: true,
        10: true,
        16: true,
        17: true,
        19: true,
        20: true,
        22: true,
    };

    //Styles that are not changeable in the preferences:
    const validatedStyle = {
        strokeColor: "#F53BFF",
        strokeWidth: 3,
        strokeDashstyle: "solid",
    };

    const roundaboutStyle = {
        strokeColor: "#111111",
        strokeWidth: 1,
        strokeDashstyle: "dash",
        strokeOpacity: 0.6,
    };

    const nodeStyle = {
        stroke: false,
        fillColor: "#0015FF",
        fillOpacity: 0.9,
        pointRadius: 2.5,
        pointerEvents: "none"
    };

    const nodeStyleDeadEnd = {
        stroke: false,
        fillColor: "#C31CFF",
        fillOpacity: 0.9,
        pointRadius: 2.5,
        pointerEvents: "none"
    };

    const unknownDirStyle = {
        graphicName: "x",
        strokeColor: "#f00",
        strokeWidth: 1.5,
        fillColor: "#FFFF40",
        fillOpacity: 0.7,
        pointRadius: 7,
        pointerEvents: "none"
    };

    const geometryNodeStyle = {
        stroke: false,
        fillColor: "#000",
        fillOpacity: 0.5,
        pointRadius: 3.3,
        graphicZIndex: 179,
        pointerEvents: "none"
    };

    const nonEditableStyle = {
        strokeColor: "#000",
        //strokeWidth: 2, 20%
        strokeDashstyle: "solid",
    };
    const tunnelFlagStyle2 = {
        strokeColor: "#C90",
        strokeDashstyle: "longdash",
    };
    const tunnelFlagStyle1 = {
        strokeColor: "#fff",
        strokeOpacity: 0.8,
        strokeDashstyle: "longdash",
    };

    //End of global variable declaration
    function isFarZoom(zoom = OLMap.zoom) {
        return zoom < FARZOOMTHRESHOLD;
    }

    function svlGlobals() {
        OLMap = W.map.getOLMap();
        preferences = null;
        OpenLayers.Renderer.symbol.myTriangle = [-2, 0, 2, 0, 0, -6, -2, 0];
    }

    function svlWazeBits() {
        ////Utilities variable to avoid writing long names
        if (W !== undefined) {
            //wazeMap = unsafeWindow.W.map;
            if (W.map !== undefined) {
                if (W.model !== undefined) {
                    return;
                }
            }
        }
        throw "Model Not ready";
    }

    function refreshWME() {
        if (W.model.actionManager.unsavedActionsNum() === 0 && !WazeWrap.hasSelectedFeatures() && document.querySelectorAll(".place-update-edit.show").length === 0) {
            W.controller.reload();
        }
    }

    //TODO
    function hasToBeSkipped(roadid) {
        return preferences.hideMinorRoads && OLMap.zoom === 3 && svlIgnoredStreets[roadid] === true;
    }

    function savePreferences(preferences) {
        preferences.version = GM_info.script.version;
        localStorage.setItem("svl", JSON.stringify(preferences));
    }


    function saveDefaultPreferences() {
        preferences = {};

        preferences.autoReload = {};
        preferences.autoReload.interval = 60000;
        preferences.autoReload.enabled = false;

        preferences.showSLSinglecolor = false;
        preferences.SLColor = "#ffdf00";

        preferences.fakelock = WazeWrap?.User?.Rank() || 6; // jshint ignore:line
        preferences.hideMinorRoads = true;
        preferences.showDashedUnverifiedSL = true;
        preferences.showSLcolor = true;
        preferences.showSLtext = true;
        preferences.version = GM_info.script.version;
        preferences.disableRoadLayers = true;
        preferences.startDisabled = false;
        preferences.clutterConstant = 400;
        preferences.labelOutlineWidth = 3;
        preferences.closeZoomLabelSize = 11;
        preferences.farZoomLabelSize = 11;
        preferences.streets = [];
        //Street: 1
        preferences.streets[1] = {
            strokeColor: "#FFFFFF",
            strokeWidth: 5,
            strokeDashstyle: "solid",
        };
        //Parking: 20
        preferences.streets[20] = {
            strokeColor: "#2282ab",
            strokeWidth: 5,
            strokeDashstyle: "solid",
        };
        //Ramp: 4
        preferences.streets[4] = {
            strokeColor: "#3FC91C",
            strokeWidth: 6,
            strokeDashstyle: "solid",
        };
        //Freeway: 3
        preferences.streets[3] = {
            strokeColor: "#387FB8",
            strokeWidth: 9,
            strokeDashstyle: "solid",
        };
        //Minor: 7
        preferences.streets[7] = {
            strokeColor: "#ECE589",
            strokeWidth: 7,
            strokeDashstyle: "solid",
        };
        //Major: 6
        preferences.streets[6] = {
            strokeColor: "#C13040",
            strokeWidth: 8,
            strokeDashstyle: "solid",
        };
        //Stairway: 16
        preferences.streets[16] = {
            strokeColor: "#B700FF",
            strokeWidth: 3,
            strokeDashstyle: "dash",
        };
        //Walking: 5
        preferences.streets[5] = {
            strokeColor: "#00FF00",
            strokeWidth: 3,
            strokeDashstyle: "dash",
        };
        //Dirty: 8
        preferences.streets[8] = {
            strokeColor: "#82614A",
            strokeWidth: 5,
            strokeDashstyle: "solid",
        };
        //Ferry: 15
        preferences.streets[15] = {
            strokeColor: "#FF8000",
            strokeWidth: 3,
            strokeDashstyle: "dashdot",
        };
        //Railroad: 18
        preferences.streets[18] = {
            strokeColor: "#FFFFFF",
            strokeWidth: 4,
            strokeDashstyle: "dash",
        };
        //Private: 17
        preferences.streets[17] = {
            strokeColor: "#00FFB3",
            strokeWidth: 4,
            strokeDashstyle: "solid",
        };
        //Alley: 22
        preferences.streets[22] = {
            strokeColor: "#C6C7FF",
            strokeWidth: 4,
            strokeDashstyle: "solid",
        };
        //Runway: 19
        preferences.streets[19] = {
            strokeColor: "#00FF00",
            strokeWidth: 4,
            strokeDashstyle: "dashdot",
        };
        //Primary: 2
        preferences.streets[2] = {
            strokeColor: "#CBA12E",
            strokeWidth: 6,
            strokeDashstyle: "solid",
        };
        //Pedestrian: 10
        preferences.streets[10] = {
            strokeColor: "#0000FF",
            strokeWidth: 6,
            strokeDashstyle: "dash",
        };
        //Red segments (without names)
        preferences.red = {
            strokeColor: "#FF0000",
            strokeWidth: 6,
            strokeDashstyle: "solid",
        };

        preferences.roundabout = {
            strokeColor: "#111",
            strokeWidth: 1,
            strokeDashstyle: "dash",
        };
        preferences.lanes = {
            strokeColor: "#454443",
            strokeWidth: 3,
            strokeDashstyle: "dash",
        };
        preferences.toll = {
            strokeColor: "#00E1FF",
            strokeWidth: 2,
            strokeDashstyle: "solid"
        };
        preferences.closure = {
            strokeColor: "#FF00FF",
            strokeWidth: 4,
            strokeDashstyle: "dash",
        };
        preferences.headlights = {
            strokeColor: "#bfff00",
            strokeWidth: 3,
            strokeDashstyle: "dot",
        };
        preferences.restriction = {
            strokeColor: "#F2FF00",
            strokeWidth: 2,
            strokeDashstyle: "dash",
        };
        preferences.dirty = {
            strokeColor: "#82614A",
            strokeOpacity: 0.6,
            strokeDashstyle: "longdash",
        };
        preferences.arrowDeclutter = 25;

        preferences.showUnderGPSPoints = false;
        preferences.routingModeEnabled = false;
        preferences.realsize = false;
        preferences.showANs = false;

        savePreferences(preferences);
    }

    const defaultSegmentWidhtMeters = {
        1: 5.0,// "Street",
        2: 5.5,//"Primary Street",
        3: 22.5,//"Freeway",
        4: 6.0,//"Ramp",
        5: 2.0,//"Walking Trail",
        6: 10.0,//"Major Highway",
        7: 9.0,//"Minor Highway",
        8: 4.0,//"Dirt Road",
        10: 2.0,//"Pedestrian Boardwalk",
        15: 8.0,//"Ferry",
        16: 2.0,//"Stairway",
        17: 5.0,//"Private Road",
        18: 10.0,//"Railroad",
        19: 5.0,//"Runway",
        20: 5.0,//"Parking Lot Road",
        22: 3.0//"Alley"
        /*"service": 21,*/
    };

    function getWidth({ segmentWidth, roadType, twoWay }) {
        //If in close zoom and user enabled the realsize mode
        if (false) {
            //If the segment has a widht set, use it
            if (segmentWidth) {
                return (twoWay ? segmentWidth : (segmentWidth / 2.0)) / OLMap.resolution;
            } else {
                return (twoWay ? defaultSegmentWidhtMeters[roadType] : (defaultSegmentWidhtMeters[roadType] / 2.0)) / OLMap.resolution;
            }
        } else {
            //Use the value stored in the preferences //TODO: parseInt should not be needed
            const prefInt = parseInt(streetStyles[roadType].strokeWidth, 10);
            return (!twoWay && preferences.realsize) ? prefInt * 0.6 : prefInt;
        }
    }


    function loadPreferences() {
        preferences = JSON.parse(localStorage.getItem("svl"));
        //consoleDebug("Loading preferences");
        if (preferences === null) {
            //consoleDebug("Creating new preferences from default");
            saveDefaultPreferences();
            return false;
        } else {
            if (typeof preferences.dirty.strokeOpacity === "undefined" || preferences.dirty.strokeOpacity > 1) {
                preferences.dirty.strokeOpacity = 0.6;
            }
            clutterConstant = preferences.clutterConstant || 400;
            thresholdDistance = getThreshold();
        }
        return true;
    }

    function getThreshold() {
        if (clutterConstant === clutterMax) {
            return 0;
        }
        return clutterConstant / OLMap.zoom;
    }

    function bestBackground(color) {
        let oppositeColor = parseInt(color.substring(1, 3), 16) * 0.299 + parseInt(color.substring(3, 5), 16) * 0.587 + parseInt(color.substring(5, 7), 16) * 0.114;
        if (oppositeColor < 127) {
            return "#FFF";
        }
        return "#000";
    }

    function getColorStringFromSpeed(speed) {
        if (preferences.showSLSinglecolor) {
            return preferences.SLColor;
        }

        if (W.prefs.attributes.isImperial) { // adjust scale for Imperial
            // speeds 15 to 75 mph (7 increments) are tuned to HSL 95 to 395 (35) for easy visual speed differentiation at common speeds
            return `hsl(${((speed / 1.609344 * 5) + 20) % 360}, 100%, 50%)`;
        } //else
        return `hsl(${(speed * 3) % 360}, 100%, 50%)`; // :150 * 450
    }

    function getAngle(isForward, p0, p1) {
        let dx, dy, angle;
        dx = 0;
        dy = 0;
        if (isForward) {
            dx = p1.x - p0.x;
            dy = p1.y - p0.y;
        } else {
            dx = p0.x - p1.x;
            dy = p0.y - p1.y;
        }
        angle = Math.atan2(dx, dy);
        return angle * 180 / Math.PI; //360-(...) -90 removed from here
    }

    function getSuperScript(number) {
        let res, i;
        res = "";
        if (number) {
            if (W.prefs.attributes.isImperial) { //Convert the speed limit to mph
                number = Math.round(number / 1.609344);
            }
            number = number.toString();
            for (i = 0; i < number.length; i += 1) {
                res += superScript[number.charAt(i)];
            }
        }
        return res;
    }

    function drawLabels(model, simplified, delayed = false) {
        //consoleDebug("drawLabels");
        let labels, labelFeature, len, attributes, address, /* maxDistance, maxDistanceIndex,*/ p, streetPart, speedPart, speed, distance,
            labelText, dx, dy, centroid, angle, degrees, directionArrow, streetNameThresholdDistance, p0, p1, doubleLabelDistance, ANsShown, i, altStreet, altStreetPart;
        labels = [];
        labelFeature = null;
        attributes = model.attributes;
        address = model.getAddress();
        //consoleDebug(address, attributes);
        if (attributes.primaryStreetID !== null && address.attributes.state === undefined) {
            //console.error("NOT READY");
            setTimeout(function () {
                drawLabels(model, simplified, true);
            }, 500);
        } else /*if ((preferences.showSLtext && attributes.fwdMaxSpeed | attributes.revMaxSpeed) || (address.street && !address.street.isEmpty))*/ {
            //maxDistance = 0;
            //maxDistanceIndex = -1;
            address = address.attributes;
            streetPart = ((address.street !== null && !address.street.isEmpty) ? address.street.name : (attributes.roadType < 10 && attributes.junctionID === null ? "⚑" : ""));
            //consoleDebug("Streetpart:" +streetPart);

            // add alt street names
            altStreetPart = "";
            if (preferences.showANs) {
                for (i = 0, ANsShown = 0; i < attributes.streetIDs.length; i++) {
                    if (ANsShown === 2) {//Show maximum 2 alternative names
                        altStreetPart += " …";
                        break;
                    }
                    altStreet = model.model.streets.objects[attributes.streetIDs[i]];
                    if (altStreet && altStreet.name !== address.street.name) {
                        ANsShown++;
                        altStreetPart += (altStreet.name ? "(" + altStreet.name + ")" : "");
                    }
                }
                altStreetPart = altStreetPart.replace(")(", ", ");
                if (altStreetPart != "") {
                    altStreetPart = "\n" + altStreetPart;
                }
            }

            if (!streetStyles[attributes.roadType]) {
                streetPart += "\n!! UNSUPPORTED ROAD TYPE !!";
            }
            speedPart = "";
            speed = attributes.fwdMaxSpeed || attributes.revMaxSpeed;
            if (speed && preferences.showSLtext) {
                if (attributes.fwdMaxSpeed === attributes.revMaxSpeed) {
                    speedPart = getSuperScript(attributes.fwdMaxSpeed);
                } else {
                    if (attributes.fwdMaxSpeed) {
                        speedPart = getSuperScript(attributes.fwdMaxSpeed);
                        if (attributes.revMaxSpeed) {
                            speedPart += "'" + getSuperScript(attributes.revMaxSpeed);
                        }
                    } else {
                        speedPart = getSuperScript(attributes.revMaxSpeed);
                        if (attributes.fwdMaxSpeed) {
                            speedPart += "'" + getSuperScript(attributes.fwdMaxSpeed);
                        }
                    }
                }
                /*jslint bitwise: true */
                if (attributes.fwdMaxSpeedUnverified | attributes.revMaxSpeedisVerified) {
                    /*jslint bitwise: false */
                    speedPart += "?";
                }
            }
            labelText = streetPart + " " + speedPart;
            if (labelText === " ") {
                return [];
            }
            streetNameThresholdDistance = labelText.length * 2.3 * (8 - OLMap.zoom) + Math.random() * 30;
            doubleLabelDistance = 4 * streetNameThresholdDistance;

            const sampleLabel = new OpenLayers.Feature.Vector(simplified[0], {
                myId: attributes.id,
                color: streetStyles[attributes.roadType] ? streetStyles[attributes.roadType].strokeColor : "#f00",
                outlinecolor: streetStyles[attributes.roadType] ? streetStyles[attributes.roadType].outlineColor : "#fff",
                outlinewidth: labelOutlineWidth
            });


            for (p = 0, len = simplified.length - 1; p < len; p += 1) {
                distance = simplified[p].distanceTo(simplified[p + 1]);
                if (distance >= thresholdDistance) {
                    //consoleDebug("Label can be inserted:");
                    //console.dir(address);
                    dx = 0;
                    dy = 0;
                    if (distance > streetNameThresholdDistance) {
                        //consoleDebug("Label inserted");
                        //p = maxDistanceIndex;
                        if (distance < doubleLabelDistance) { // || farzoom
                            p0 = simplified[p];
                            p1 = simplified[p + 1];
                        } else {
                            p0 = simplified[p];
                            p1 = new OpenLayers.Geometry.LineString([p0, simplified[p + 1]]).getCentroid(true);
                        }
                        centroid = new OpenLayers.Geometry.LineString([p0, p1]).getCentroid(true); /*Important pass true parameter otherwise it will return start point as centroid*/
                        //Clone the label
                        labelFeature = sampleLabel.clone();
                        labelFeature.geometry = centroid;
                        if (attributes.fwdDirection) {
                            dx = p1.x - p0.x;
                            dy = p1.y - p0.y;
                        } else {
                            dx = p0.x - p1.x;
                            dy = p0.y - p1.y;
                        }
                        angle = Math.atan2(dx, dy);
                        degrees = 90 + angle * 180 / Math.PI;
                        directionArrow = " ▶ ";
                        if (degrees > 90 && degrees < 270) {
                            degrees -= 180;
                            //directionArrow = " ▶ ";
                        } else {
                            directionArrow = " ◀ ";
                        }
                        if (!model.isOneWay()) {
                            directionArrow = ""; //The degree has to be computed anyway
                        }
                        labelFeature.attributes.label = directionArrow + labelText + directionArrow + altStreetPart;

                        labelFeature.attributes.angle = degrees;
                        labelFeature.attributes.closeZoomOnly = p % 2 == 1;
                        labels.push(labelFeature);
                        if (distance >= doubleLabelDistance) { //Create the second label on a long segment //!farZoom &&
                            p0 = p1;
                            p1 = simplified[p + 1];
                            centroid = new OpenLayers.Geometry.LineString([p0, p1]).getCentroid(true);
                            labelFeature = labelFeature.clone();
                            labelFeature.geometry = centroid;
                            labelFeature.attributes.closeZoomOnly = true;
                            labels.push(labelFeature);
                        }
                    }
                }
            }
        }
        if (delayed && labelFeature) {
            labelsVector.addFeatures(labels);
        }
        return labels;
    }

    function createAverageSpeedCamera(id, rev, isForward, p0, p1) {
        let degrees;
        degrees = getAngle(isForward, rev ? p1 : p0, rev ? p0 : p1);
        return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(p0.x + Math.sin(degrees) * 10, p0.y + Math.cos(degrees) * 10), {
            myId: id
        }, {
            rotation: degrees,
            externalGraphic: "https://raw.githubusercontent.com/bedo2991/svl/master/average.png",
            graphicWidth: 36,
            graphicHeight: 36,
            graphicZIndex: 300,
            fillOpacity: 1,
            pointerEvents: "none"
        });

    }

    function drawSegment(model) {
        //consoleDebug("DrawSegment");
        let lineFeature, locked, speed,
            speedStrokeStyle, speedValue, simplifiedPoints, arrowFeature, p, len, dx, dy, labels,
            left, right, k, pk, pk1, offset, m, mb, temp,
            step, degrees, segmentLenght, minDistance, segmentLineString,
            numPoints, stepx, stepy, px, py, ix; //dx, dy
        const attributes = model.attributes;
        //TODO const hasToBeSk = hasToBeSkipped(attributes.roadType)
        const points = attributes.geometry.components;
        const pointList = attributes.geometry.getVertices(); //is an array
        const simplified = new OpenLayers.Geometry.LineString(pointList).simplify(1.5).components;
        const myFeatures = [];
        const baselevel = attributes.level * 100;
        const isTwoWay = attributes.fwdDirection && attributes.revDirection;
        let width = 0;
        lineFeature = null;
        if (null === attributes.primaryStreetID) {
            //consoleDebug("RED segment", model);
            lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: preferences.red.strokeColor,
                width: (!isTwoWay && preferences.realsize) ? preferences.red.strokeWidth * 0.6 : preferences.red.strokeWidth,
                dash: preferences.red.strokeDashstyle
            });
            myFeatures.push(lineFeature);
        } else {
            let roadType = attributes.roadType;
            width = getWidth({
                segmentWidth: attributes.width,
                roadType: attributes.roadType,
                twoWay: isTwoWay
            });
            //consoleDebug(width);
            if (preferences.routingModeEnabled && attributes.routingRoadType !== null) {
                roadType = attributes.routingRoadType;
            }

            if (streetStyles[roadType] !== undefined) {

                locked = false;
                speed = attributes.fwdMaxSpeed || attributes.revMaxSpeed; //If it remains null it does not have a speed limit
                //consoleDebug("Road Type: ", roadType);
                if (attributes.level > 0) { //it is a bridge
                    //consoleDebug("Bridge");
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: "#000000",
                        zIndex: baselevel + 100,
                        width: width + (speed && preferences.showSLcolor ? 4 : 2),
                    });
                    myFeatures.push(lineFeature);
                }

                if (speed && preferences.showSLcolor) { //it has a speed limit
                    //consoleDebug("SpeedLimit");
                    speedStrokeStyle = (preferences.showDashedUnverifiedSL && (attributes.fwdMaxSpeedUnverified || attributes.revMaxSpeedUnverified) ? "dash" : "solid");

                    if (!preferences.showSLSinglecolor && (attributes.fwdMaxSpeed || attributes.revMaxSpeed) && attributes.fwdMaxSpeed !== attributes.revMaxSpeed && !model.isOneWay()) {
                        //consoleDebug("The segment has 2 different speed limits");
                        //It has 2 different speeds:
                        left = [];
                        right = [];
                        for (k = 0, len = pointList.length - 1; k < len; k += 1) {
                            pk = pointList[k];
                            pk1 = pointList[k + 1];
                            dx = pk.x - pk1.x;
                            dy = pk.y - pk1.y;
                            left[0] = pk.clone();
                            right[0] = pk.clone();
                            left[1] = pk1.clone();
                            right[1] = pk1.clone();
                            offset = (width / 5.0) * (30.0 / (OLMap.zoom * OLMap.zoom)); //((Wmap.zoom+1)/11)+0.6*(1/(11-Wmap.zoom));// (10-Wmap.zoom/3)/(10-Wmap.zoom);
                            //of2 = 11 * Math.pow(2.0, 5 - W.map.zoom);
                            //console.error(of2);
                            //console.log(offset);
                            if (Math.abs(dx) < 0.5) { //segment is vertical
                                if (dy > 0) {
                                    //console.error("A");
                                    left[0].move(-offset, 0);
                                    left[1].move(-offset, 0);
                                    right[0].move(offset, 0);
                                    right[1].move(offset, 0);
                                } else {
                                    //console.error("B");
                                    left[0].move(offset, 0);
                                    left[1].move(offset, 0);
                                    right[0].move(-offset, 0);
                                    right[1].move(-offset, 0);
                                }
                            } else {
                                m = dy / dx;
                                mb = -1 / m;
                                //consoleDebug("m: ", m);
                                if (Math.abs(m) < 0.05) {
                                    //Segment is horizontal
                                    if (dx > 0) {
                                        //console.error("C");
                                        left[0].move(0, offset);
                                        left[1].move(0, offset);
                                        right[0].move(0, -offset);
                                        right[1].move(0, -offset);
                                    } else {
                                        //console.error("D");
                                        left[0].move(0, -offset);
                                        left[1].move(0, -offset);
                                        right[0].move(0, offset);
                                        right[1].move(0, offset);
                                    }
                                } else {
                                    if ((dy > 0 && dx > 0) || (dx < 0 && dy > 0)) { //1st and 4th q.
                                        offset *= -1;
                                    }
                                    //console.log(offset);
                                    temp = Math.sqrt(1 + (mb * mb));
                                    //console.error("E");
                                    //console.dir(left[0]);
                                    left[0].move(offset / temp, offset * (mb / temp));
                                    //console.dir(left[0]);
                                    left[1].move(offset / temp, offset * (mb / temp));
                                    right[0].move(-offset / temp, -offset * (mb / temp));
                                    right[1].move(-offset / temp, -offset * (mb / temp));
                                }
                            }
                            //consoleDebug("Adding 2 speeds");
                            //consoleDebug(left);
                            //consoleDebug(right);
                            lineFeature = new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.LineString(left), {
                                myId: attributes.id,
                                color: getColorStringFromSpeed(attributes.fwdMaxSpeed),
                                width: width + 0.5,
                                dash: speedStrokeStyle,
                                closeZoomOnly: true,
                                zIndex: baselevel + 105
                            });
                            myFeatures.push(lineFeature);
                            lineFeature = new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.LineString(right), {
                                myId: attributes.id,
                                color: getColorStringFromSpeed(attributes.revMaxSpeed),
                                width: width + 0.5,
                                dash: speedStrokeStyle,
                                closeZoomOnly: true,
                                zIndex: baselevel + 110
                            });
                            myFeatures.push(lineFeature);
                        }
                    } else {
                        //The segment is two way street with the same speed limit on both sides or one way street
                        speedValue = attributes.fwdMaxSpeed; //If the segment is two way, take any speed, they are equal.
                        if (model.isOneWay()) {
                            if (attributes.fwdDirection) {
                                speedValue = attributes.fwdMaxSpeed;
                            } else {
                                speedValue = attributes.revMaxSpeed;
                            }
                        }
                        if (speedValue) {
                            lineFeature = new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.LineString(pointList), {
                                myId: attributes.id,
                                color: getColorStringFromSpeed(speedValue),
                                width: width + 2,
                                dash: speedStrokeStyle,
                                closeZoomOnly: true,
                                zIndex: baselevel + 115
                            });
                            myFeatures.push(lineFeature);
                        }
                    }
                }

                //Draw the road
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                    myId: attributes.id,
                    color: streetStyles[roadType].strokeColor,
                    width: width,
                    dash: streetStyles[roadType].strokeDashstyle,
                    zIndex: baselevel + 120
                });
                myFeatures.push(lineFeature);

                if (attributes.level < 0) {
                    //Tunnel
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: "#000000",
                        width: width,
                        opacity: 0.35,
                        zIndex: baselevel + 125
                        //dash:"solid"
                    });
                    myFeatures.push(lineFeature);
                }

                const currentLock = model.getLockRank() + 1;
                if (currentLock > preferences.fakelock || currentLock > WazeWrap?.User?.Rank()) { // jshint ignore:line
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id,
                        color: nonEditableStyle.strokeColor,
                        width: width * 0.15,
                        dash: nonEditableStyle.strokeDashstyle,
                        zIndex: baselevel + 147
                    });

                    myFeatures.push(lineFeature);
                    locked = true;
                }
            }

            /*jslint bitwise: true */
            if (attributes.flags & 16) { //The unpaved flag is enabled
                /*jslint bitwise: false */
                //Unpaved
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                    myId: attributes.id,
                    color: preferences.dirty.strokeColor,
                    width: width - 2,
                    opacity: preferences.dirty.strokeOpacity,
                    dash: preferences.dirty.strokeDashstyle,
                    zIndex: baselevel + 135
                });
                myFeatures.push(lineFeature);
            }
        }
        //Check segment properties


        //CLOSE Zoom properties
        if (attributes.hasClosures) {
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: preferences.closure.strokeColor,
                width: preferences.closure.strokeWidth,
                dash: preferences.closure.strokeDashstyle,
                closeZoomOnly: true,
                zIndex: baselevel + 140
            });
            myFeatures.push(lineFeature);
        }

        if (attributes.fwdToll || attributes.revToll || attributes.restrictions.some(r => r._defaultType === "TOLL")) { //It is a toll road
            //consoleDebug("Segment is toll");
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: preferences.toll.strokeColor,
                width: width * 0.2,//TODO preferences.toll.strokeWidth,
                dash: preferences.toll.strokeDashstyle,
                opacity: 0.9,
                zIndex: baselevel + 145
            });
            myFeatures.push(lineFeature);
        }

        if (null !== attributes.junctionID) { //It is a roundabout
            //consoleDebug("Segment is a roundabout");
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: roundaboutStyle.strokeColor,
                width: roundaboutStyle.strokeWidth,
                dash: roundaboutStyle.strokeDashstyle,
                opacity: roundaboutStyle.strokeOpacity,
                closeZoomOnly: true,
                zIndex: baselevel + 150
            });
            myFeatures.push(lineFeature);
        }


        if (attributes.restrictions.length > 0) {
            //It has restrictions
            //consoleDebug("Segment has restrictions");
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: preferences.restriction.strokeColor,
                width: preferences.restriction.strokeWidth,
                dash: preferences.restriction.strokeDashstyle,
                closeZoomOnly: true,
                zIndex: baselevel + 155
            });
            myFeatures.push(lineFeature);
        }

        if (!locked && attributes.validated === false) { //Segments that needs validation
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: validatedStyle.strokeColor,
                width: validatedStyle.strokeWidth,
                dash: validatedStyle.strokeDashstyle,
                closeZoomOnly: true,
                zIndex: baselevel + 160
            });
            myFeatures.push(lineFeature);
        }

        //Headlights
        /*jslint bitwise: true */
        if (attributes.flags & 32) {
            /*jslint bitwise: false */
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: preferences.headlights.strokeColor,
                width: preferences.headlights.strokeWidth,
                dash: preferences.headlights.strokeDashstyle,
                closeZoomOnly: true,
                zIndex: baselevel + 165
            });
            myFeatures.push(lineFeature);
        }

        if (attributes.fwdLaneCount > 0) {
            //console.log("LANE fwd");
            let res = pointList.slice(-2);
            //if(pointList.length === 2){
            res[0] = new OpenLayers.Geometry.LineString([res[0], res[1]]).getCentroid(true);
            //}
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(res), {
                myId: attributes.id,
                color: preferences.lanes.strokeColor,
                width: preferences.lanes.strokeWidth,
                dash: preferences.lanes.strokeDashstyle,
                opacity: 0.9,
                closeZoomOnly: true,
                zIndex: baselevel + 170
            });
            myFeatures.push(lineFeature);
        }

        if (attributes.revLaneCount > 0) {
            //console.log("LANE rev");
            let res = pointList.slice(0, 2);
            //if(pointList.length === 2){
            res[1] = new OpenLayers.Geometry.LineString([res[0], res[1]]).getCentroid(true);
            //}
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(res), {
                myId: attributes.id,
                color: preferences.lanes.strokeColor,
                width: preferences.lanes.strokeWidth,
                dash: preferences.lanes.strokeDashstyle,
                opacity: 0.9,
                closeZoomOnly: true,
                zIndex: baselevel + 175
            });
            myFeatures.push(lineFeature);
        }

        if ((attributes.fwdDirection === false || attributes.revDirection === false)) {
            //consoleDebug("The segment is oneway or has unknown direction");
            simplifiedPoints = points;
            if (attributes.junctionID === null && (attributes.length / points.length < arrowDeclutter)) {
                simplifiedPoints = simplified;
            }

            /*jslint bitwise: true */
            if ((attributes.fwdDirection | attributes.revDirection) === 0) {
                /*jslint bitwise: false */
                //Unknown direction
                for (p = 0, len = simplifiedPoints.length - 1; p < len; p += 1) {
                    //let shape = OpenLayers.Geometry.Polygon.createRegularPolygon(new OpenLayers.Geometry.LineString([simplifiedPoints[p],simplifiedPoints[p+1]]).getCentroid(true), 2, 6, 0); // origin, size, edges, rotation
                    arrowFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([simplifiedPoints[p], simplifiedPoints[p + 1]]).getCentroid(true), {
                        myId: attributes.id,
                        closeZoomOnly: true,
                        isArrow: true,
                        zIndex: baselevel + 180
                    }, unknownDirStyle);
                    myFeatures.push(arrowFeature);
                }
            } else {
                //Draw normal arrows

                step = attributes.junctionID !== null ? 3 : 1; //It is a roundabout
                for (p = step - 1, len = simplifiedPoints.length - 1; p < len; p += step) {
                    //it is one way
                    degrees = getAngle(attributes.fwdDirection, simplifiedPoints[p], simplifiedPoints[p + 1]);
                    segmentLenght = simplifiedPoints[p].distanceTo(simplifiedPoints[p + 1]);
                    minDistance = 15.0 * (11 - OLMap.zoom);
                    if (segmentLenght < minDistance * 2) {
                        segmentLineString = new OpenLayers.Geometry.LineString([simplifiedPoints[p], simplifiedPoints[p + 1]]);
                        arrowFeature = new OpenLayers.Feature.Vector(segmentLineString.getCentroid(true), {
                            myId: attributes.id,
                            closeZoomOnly: true,
                            isArrow: true
                        }, {
                            graphicName: "myTriangle",
                            rotation: degrees,
                            stroke: true,
                            strokeColor: "#000",
                            strokeWidth: 1.5,
                            fill: true,
                            fillColor: "#fff",
                            graphicZIndex: 180,
                            fillOpacity: 0.7,
                            pointRadius: 5,
                            pointerEvents: "none"
                        });
                        myFeatures.push(arrowFeature);
                    } else {
                        dx = simplifiedPoints[p + 1].x - simplifiedPoints[p].x;
                        dy = simplifiedPoints[p + 1].y - simplifiedPoints[p].y;

                        numPoints = Math.floor(Math.sqrt(dx * dx + dy * dy) / minDistance) - 1;

                        stepx = dx / numPoints;
                        stepy = dy / numPoints;
                        px = simplifiedPoints[p].x + stepx;
                        py = simplifiedPoints[p].y + stepy;
                        for (ix = 0; ix < numPoints; ix += 1) {
                            arrowFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(px, py), {
                                myId: attributes.id,
                                closeZoomOnly: true,
                                isArrow: true
                            }, {
                                graphicName: "myTriangle",
                                rotation: degrees,
                                stroke: true,
                                strokeColor: "#000",
                                graphiczIndex: baselevel + 180,
                                strokeWidth: 1.5,
                                fill: true,
                                fillColor: "#fff",
                                fillOpacity: 0.7,
                                pointRadius: 5,
                            });
                            myFeatures.push(arrowFeature);
                            px += stepx;
                            py += stepy;
                        }
                    }
                }
            }
        }


        /*jslint bitwise: true */
        if (attributes.fwdFlags & 0x1) { //check if speed camera
            /*jslint bitwise: false */
            myFeatures.push(createAverageSpeedCamera(attributes.id, false, attributes.fwdDirection, points[0], points[1]));
        }

        /*jslint bitwise: true */
        if (attributes.revFlags & 0x1) { //check if speed camera
            /*jslint bitwise: false */
            myFeatures.push(createAverageSpeedCamera(attributes.id, true, attributes.fwdDirection, points[points.length - 1], points[points.length - 2]));
        }

        //Show geometry points
        if (preferences.renderGeomNodes && (attributes.junctionID === null)) { //If it's not a roundabout
            for (p = 1, len = points.length - 2; p < len; p += 1) {
                //let shape = OpenLayers.Geometry.Polygon.createRegularPolygon(points[p], 2, 6, 0); // origin, size, edges, rotation
                arrowFeature = new OpenLayers.Feature.Vector(points[p], {
                    myId: attributes.id,
                    closeZoomOnly: true
                }, geometryNodeStyle);
                myFeatures.push(arrowFeature);
            }
        }
        //END: show geometry points
        // End: Close Zoom

        //In any Zoom:

        /*jslint bitwise: true */
        if (attributes.flags & 1) { //The tunnel flag is enabled
            /*jslint bitwise: false */
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: tunnelFlagStyle1.strokeColor,
                opacity: tunnelFlagStyle1.strokeOpacity,
                width: width * 0.3,
                dash: tunnelFlagStyle1.strokeDashstyle,
                zIndex: baselevel + 177
            });
            myFeatures.push(lineFeature);
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id,
                color: tunnelFlagStyle2.strokeColor,
                width: width * 0.1,
                dash: tunnelFlagStyle2.strokeDashstyle,
                zIndex: baselevel + 177
            });
            myFeatures.push(lineFeature);
        }


        //Add Label
        labels = drawLabels(model, simplified);
        if (labels.length > 0) {
            labelsVector.addFeatures(labels);
            //myFeatures = myFeatures.concat(labels);
        }
        return myFeatures;
    }

    function redrawAllSegments() {
        consoleDebug("DrawAllSegments");
        streetVector.destroyFeatures();
        labelsVector.destroyFeatures();
        addSegments(Object.values(W.model.segments.objects));
        nodesVector.destroyFeatures();
        addNodes(Object.values(W.model.nodes.objects));
    }

    function drawNode(model) {
        let point, pointFeature;
        point = new OpenLayers.Geometry.Point(model.attributes.geometry.x, model.attributes.geometry.y);
        pointFeature = new OpenLayers.Feature.Vector(point, {
            myid: model.attributes.id
        }, getNodeStyle(model.attributes));
        return pointFeature;
    }

    /*
    function drawAllNodes() {
        //console.debug("Drawing ALL nodes");
        let node, nodeFeatures, nodes;
        //nodesVector.destroyFeatures();
        nodeFeatures = [];
        nodes = W.model.nodes.objects;
        addNodes(Object.values(W.model.nodes.objects));
        return;
        //consoleDebug("nodes", nodes);
        for (node in nodes) {
            if (nodes.hasOwnProperty(node)) {
                if (nodes[node].state !== "Delete") {
                    nodeFeatures.push(drawNode(nodes[node]));
                }
            }
        } //End: For all the nodes
        nodesVector.addFeatures(nodeFeatures);
    }*/

    //TODO remove
    // function doDraw() {
    //     if (OLMap.zoom < 2) {
    //         console.warn("Tried to draw at bad zoom");
    //         return;
    //     }
    // }

    function updateStylesFromPreferences(preferences) {
        let i, len;
        for (i = 0, len = preferences.streets.length; i < len; i += 1) {
            if (preferences.streets[i]) {
                streetStyles[i] = {
                    strokeColor: preferences.streets[i].strokeColor,
                    strokeWidth: preferences.streets[i].strokeWidth,
                    strokeDashstyle: preferences.streets[i].strokeDashstyle,
                    outlineColor: bestBackground(preferences.streets[i].strokeColor),
                };
            }
        }


        //Rendering
        //Labels
        clutterConstant = preferences.clutterConstant;
        thresholdDistance = getThreshold();

        //ArrowDeclutter
        arrowDeclutter = preferences.arrowDeclutter;

        labelOutlineWidth = preferences.labelOutlineWidth + "px";
        //showSLtext = preferences.showSLtext;
        //showSLcolor = preferences.showSLcolor;

        //Delete all elements
        //nodesVector.destroyFeatures();
        //labelsVector.destroyFeatures();
        //streetVector.destroyFeatures();
        //doDraw();
        redrawAllSegments();
    }

    function rollbackPreferences() {
        loadPreferences();
        updateStylesFromPreferences(preferences);
        updatePreferenceValues();
    }

    function exportPreferences() {
        GM_setClipboard(JSON.stringify(preferences));
        alert("The configuration has been copied to your clipboard. Please paste it in a file (CTRL+V) to store it.");
    }

    function importPreferences() {
        let pastedText = prompt("N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!\n\nPaste your string here:");
        if (pastedText !== null && pastedText !== "") {
            try {
                preferences = JSON.parse(pastedText);
            } catch (ex) {
                alert("Your string seems to be somehow wrong. Place check that is a valid JSON string");
                return;
            }
            updateStylesFromPreferences(preferences);
            savePreferences(preferences);
            updatePreferenceValues();
        }
    }

    function updateLayerPosition() {
        let gps_layer_index;
        gps_layer_index = parseInt(W.map.getLayerByUniqueName("gps_points").getZIndex(), 10);

        if (preferences.showUnderGPSPoints) {
            streetVector.setZIndex(gps_layer_index - 2);
            nodesVector.setZIndex(gps_layer_index - 1);
        } else {
            streetVector.setZIndex(gps_layer_index + 1);
            nodesVector.setZIndex(gps_layer_index + 2);
        }
    }

    function updateRoutingModePanel() {
        let routingModeDiv;
        if (preferences.routingModeEnabled) {
            //Show the routing panel
            routingModeDiv = document.createElement('div');
            routingModeDiv.id = "routingModeDiv";
            routingModeDiv.className = "routingDiv";
            routingModeDiv.innerHTML = "Routing Mode<br><small>Hover to temporary disable it<small>";
            routingModeDiv.addEventListener("mouseenter", () => {
                //Temporary disable routing mode
                preferences.routingModeEnabled = false;
                streetVector.destroyFeatures();
                labelsVector.destroyFeatures();
                nodesVector.destroyFeatures();
                redrawAllSegments();
                //doDraw();
            });
            routingModeDiv.addEventListener("mouseleave", () => {
                //Enable routing mode again
                preferences.routingModeEnabled = true;
                streetVector.destroyFeatures();
                labelsVector.destroyFeatures();
                nodesVector.destroyFeatures();
                redrawAllSegments();
                //                doDraw();
            });
            document.getElementById("map").appendChild(routingModeDiv);
        } else {
            //Remove the routing panel
            document.getElementById("routingModeDiv")?.remove(); // jshint ignore:line
        }
    }

    function updateRefreshStatus() {
        clearInterval(autoLoadInterval);
        autoLoadInterval = null;
        if (preferences.autoReload && preferences.autoReload.enabled) {
            autoLoadInterval = setInterval(refreshWME, preferences.autoReload.interval);
        }
    }

    function updateValuesFromPreferences() {
        let i, len;
        document.getElementById("svl_saveNewPref").classList.remove("disabled");
        document.getElementById("svl_saveNewPref").classList.add("btn-primary");
        document.getElementById("svl_rollbackButton").classList.remove("disabled");
        //$("#svl_saveNewPref").removeClass("btn-primary").addClass("btn-warning");
        for (i = 0, len = preferences.streets.length; i < len; i += 1) {
            if (preferences.streets[i]) {
                preferences.streets[i] = {};
                preferences.streets[i].strokeColor = document.getElementById("streetColor_" + i).value;
                preferences.streets[i].strokeWidth = document.getElementById("streetWidth_" + i).value;
                preferences.streets[i].strokeDashstyle = document.querySelector(`#strokeDashstyle_${i} option:checked`).value;
            }
        }

        preferences.fakelock = document.getElementById("fakelock").value;


        //Red
        preferences.red = {};
        preferences.red.strokeColor = document.getElementById("streetColor_red").value;
        preferences.red.strokeWidth = document.getElementById("streetWidth_red").value;
        preferences.red.strokeDashstyle = document.querySelector("#strokeDashstyle_red option:checked").value;

        //Dirty
        preferences.dirty = {};
        preferences.dirty.strokeColor = document.getElementById("streetColor_dirty").value;
        preferences.dirty.strokeOpacity = document.getElementById("streetOpacity_dirty").value / 100.0;
        preferences.dirty.strokeDashstyle = document.querySelector("#strokeDashstyle_dirty option:checked").value;

        //Lanes
        preferences.lanes = {};
        preferences.lanes.strokeColor = document.getElementById("streetColor_lanes").value;
        preferences.lanes.strokeWidth = document.getElementById("streetWidth_lanes").value;
        preferences.lanes.strokeDashstyle = document.querySelector("#strokeDashstyle_lanes option:checked").value;

        //Toll
        preferences.toll = {};
        preferences.toll.strokeColor = document.getElementById("streetColor_toll").value;
        preferences.toll.strokeWidth = document.getElementById("streetWidth_toll").value;
        preferences.toll.strokeDashstyle = document.querySelector("#strokeDashstyle_toll option:checked").value;

        //Restrictions
        preferences.restriction = {};
        preferences.restriction.strokeColor = document.getElementById("streetColor_restriction").value;
        preferences.restriction.strokeWidth = document.getElementById("streetWidth_restriction").value;
        preferences.restriction.strokeDashstyle = document.querySelector("#strokeDashstyle_restriction option:checked").value;

        //Closures
        preferences.closure = {};
        preferences.closure.strokeColor = document.getElementById("streetColor_closure").value;
        preferences.closure.strokeWidth = document.getElementById("streetWidth_closure").value;
        preferences.closure.strokeDashstyle = document.querySelector("#strokeDashstyle_closure option:checked").value;

        //HeadlightsRequired
        preferences.headlights = {};
        preferences.headlights.strokeColor = document.getElementById("streetColor_headlights").value;
        preferences.headlights.strokeWidth = document.getElementById("streetWidth_headlights").value;
        preferences.headlights.strokeDashstyle = document.querySelector("#strokeDashstyle_headlights option:checked").value;

        //AutoReload
        preferences.autoReload = {};
        preferences.autoReload.interval = document.getElementById("autoReload_interval").value * 1000;
        preferences.autoReload.enabled = document.getElementById("autoReload_enabled").checked;

        preferences.clutterConstant = document.getElementById("clutterConstant").value;

        preferences.arrowDeclutter = document.getElementById("arrowDeclutter").value;
        preferences.labelOutlineWidth = document.getElementById("labelOutlineWidth").value;
        preferences.disableRoadLayers = document.getElementById("disableRoadLayers").checked;
        preferences.startDisabled = document.getElementById("startDisabled").checked;

        preferences.showSLtext = document.getElementById("showSLtext").checked;
        preferences.showSLcolor = document.getElementById("showSLcolor").checked;
        preferences.showSLSinglecolor = document.getElementById("showSLSinglecolor").checked;
        preferences.SLColor = document.getElementById("SLColor").value;

        preferences.hideMinorRoads = document.getElementById("hideMinorRoads").checked;
        preferences.showDashedUnverifiedSL = document.getElementById("showDashedUnverifiedSL").checked;
        preferences.farZoomLabelSize = document.getElementById("farZoomLabelSize").value;
        preferences.closeZoomLabelSize = document.getElementById("closeZoomLabelSize").value;

        preferences.renderGeomNodes = document.getElementById("renderGeomNodes").checked;

        //Check if showUnderGPSPoints has been toggled
        if (preferences.showUnderGPSPoints !== document.getElementById("showUnderGPSPoints").checked) {
            //This value has been updated, change the layer positions.
            preferences.showUnderGPSPoints = document.getElementById("showUnderGPSPoints").checked;
            updateLayerPosition();
        } else {
            preferences.showUnderGPSPoints = document.getElementById("showUnderGPSPoints").checked;
        }

        //Check if routing mode has been toggled
        if (preferences.routingModeEnabled !== document.getElementById("routingModeEnabled").checked) {
            //This value has been updated, change the layer positions.
            preferences.routingModeEnabled = document.getElementById("routingModeEnabled").checked;
            updateRoutingModePanel();
        } else {
            preferences.routingModeEnabled = document.getElementById("routingModeEnabled").checked;
        }

        preferences.showANs = document.getElementById("showANs").checked;
        preferences.realsize = document.getElementById("realsize").checked;

        if (preferences.realsize) {
            //Disable all width inputs
            $('input.segmentsWidth').prop("disabled", true);
        } else {
            $('input.segmentsWidth').prop("disabled", false);
        }

        updateStylesFromPreferences(preferences);
        updateRefreshStatus();
    }

    function saveNewPref() {
        updateValuesFromPreferences();
        savePreferences(preferences);
        updatePreferenceValues();
    }

    function rollbackDefault(dontask) {
        if (dontask === true || confirm("Are you sure you want to rollback to the default settings?\nANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!")) {
            saveDefaultPreferences();
            updateStylesFromPreferences(preferences);
            updatePreferenceValues();
        }
    }

    function createDashStyleDropdown(id) {
        let newSelect = document.createElement("select");
        newSelect.className = "prefElement";
        newSelect.title = "Stroke style";
        newSelect.id = id;
        newSelect.innerHTML = "<option value=\"solid\">Solid</option><option value=\"dash\">Dashed</option><option value=\"dashdot\">Dash Dot</option><option value=\"longdash\">Long Dash</option><option value=\"longdashdot\">Long Dash Dot</option><option value=\"dot\">Dot</option>";
        return newSelect;
    }

    function getLocalisedString(i) {
        const locale = I18n.translations[I18n.locale];
        switch (i) {
            case "red":
                return locale?.segment?.address?.none || i; // jshint ignore:line
            case "toll":
                return locale?.edit?.segment?.fields?.toll_road || i; // jshint ignore:line
            case "restriction":
                return locale?.restrictions?.modal_headers?.restriction_summary || i; // jshint ignore:line
            case "dirty":
                return locale?.edit?.segment?.fields?.unpaved || i; // jshint ignore:line
            case "closure":
                return locale?.objects?.roadClosure?.name || i; // jshint ignore:line
            case "headlights":
                return locale?.edit?.segment?.fields?.headlights || i; // jshint ignore:line
            case "lanes":
                return locale?.objects?.lanes?.title || i; // jshint ignore:line
        }
        return locale?.segment?.road_types[i] || i; // jshint ignore:line

    }

    function createStreetOptionLine(i, showWidth = true, showOpacity = false) {
        const title = document.createElement("h5");
        title.innerText = getLocalisedString(i);

        const color = document.createElement("input");
        color.id = "streetColor_" + i;
        color.className = "prefElement form-control";
        color.style.width = "55pt";
        color.title = "Color";
        color.type = "color";

        const inputs = document.createElement("div");

        if (showWidth) {
            const width = document.createElement("input");
            width.id = "streetWidth_" + i;
            width.className = Number.isInteger(i) ? "form-control prefElement segmentsWidth" : "form-control prefElement";
            width.style.width = "40pt";
            width.title = "Width (in meters)";
            width.type = "number";
            width.min = 1;
            width.max = 20;
            inputs.appendChild(width);
        }

        if (showOpacity) {
            const opacity = document.createElement("input");
            opacity.id = "streetOpacity_" + i;
            opacity.className = "form-control prefElement";
            opacity.style.width = "40pt";
            opacity.title = "Opacity";
            opacity.type = "number";
            opacity.min = 0;
            opacity.max = 100;
            opacity.step = 10;
            inputs.appendChild(opacity);
        }


        const select = createDashStyleDropdown("strokeDashstyle_" + i);
        select.className = "form-control prefElement";


        inputs.className = "expand";
        inputs.appendChild(color);
        inputs.appendChild(select);

        const line = document.createElement("div");
        line.className = "prefLineStreets";
        line.appendChild(title);
        line.appendChild(inputs);

        return line;
    }

    function getOptions() {
        return {
            streets: ["red"],
            decorations: ["lanes", "toll", "restriction", "closure", "headlights", "dirty"]
        };
    }

    /**
     * This function updates the values shown on the preference panel with the one saved in the preferences object.
     *
     */
    function updatePreferenceValues() {
        document.getElementById("svl_saveNewPref").classList.add("disabled");
        document.getElementById("svl_rollbackButton").classList.add("disabled");
        document.getElementById("svl_saveNewPref").classList.remove("btn-primary");
        for (let i = 0, len = preferences.streets.length; i < len; i++) {

            if (preferences.streets[i]) {
                document.getElementById("streetWidth_" + i).value = preferences.streets[i].strokeWidth;
                document.getElementById("streetColor_" + i).value = preferences.streets[i].strokeColor;
                document.getElementById("strokeDashstyle_" + i).value = preferences.streets[i].strokeDashstyle;
            }
        }

        const options = getOptions();
        for (let o of options.streets) {
            document.getElementById("streetWidth_" + o).value = preferences[o].strokeWidth;
            document.getElementById("streetColor_" + o).value = preferences[o].strokeColor;
            document.getElementById("strokeDashstyle_" + o).value = preferences[o].strokeDashstyle;
        }

        for (let o of options.decorations) {
            if (o === "dirty") {
                document.getElementById("streetOpacity_" + o).value = preferences[o].strokeOpacity * 100.0;
            } else {
                document.getElementById("streetWidth_" + o).value = preferences[o].strokeWidth;
            }
            document.getElementById("streetColor_" + o).value = preferences[o].strokeColor;
            document.getElementById("strokeDashstyle_" + o).value = preferences[o].strokeDashstyle;
        }

        document.getElementById("fakelock").value = WazeWrap && WazeWrap.User ? WazeWrap.User.Rank() : 7;
        document.getElementById("autoReload_enabled").checked = preferences.autoReload.enabled;
        document.getElementById("renderGeomNodes").checked = preferences.renderGeomNodes;
        document.getElementById("labelOutlineWidth").value = preferences.labelOutlineWidth;
        document.getElementById("hideMinorRoads").checked = preferences.hideMinorRoads;
        document.getElementById("autoReload_interval").value = preferences.autoReload.interval / 1000;

        document.getElementById("clutterConstant").value = preferences.clutterConstant || 400;
        document.getElementById("closeZoomLabelSize").value = preferences.closeZoomLabelSize;
        document.getElementById("farZoomLabelSize").value = preferences.farZoomLabelSize;
        document.getElementById("arrowDeclutter").value = preferences.arrowDeclutter;
        document.getElementById("disableRoadLayers").checked = preferences.disableRoadLayers;
        document.getElementById("startDisabled").checked = preferences.startDisabled;
        document.getElementById("showUnderGPSPoints").checked = preferences.showUnderGPSPoints;
        document.getElementById("routingModeEnabled").checked = preferences.routingModeEnabled;
        document.getElementById("showANs").checked = preferences.showANs;

        //Speed limits
        document.getElementById("showSLtext").checked = preferences.showSLtext;
        document.getElementById("showSLcolor").checked = preferences.showSLcolor;
        document.getElementById("showSLSinglecolor").checked = preferences.showSLSinglecolor;
        document.getElementById("showDashedUnverifiedSL").checked = preferences.showDashedUnverifiedSL;
        document.getElementById("SLColor").value = preferences.SLColor;
        document.getElementById("realsize").checked = preferences.realsize;

        const segmentWidhts = document.querySelectorAll(".segmentsWidth");
        segmentWidhts.forEach(el => { el.disabled = preferences.realsize; });
    }

    function createCheckboxOption({ id, title, description }) {
        const line = document.createElement("div");
        line.className = "prefLineCheckbox";
        const label = document.createElement("label");
        label.innerText = title;

        const input = document.createElement("input");
        input.className = "prefElement";
        input.title = "True or False";
        input.id = id;
        input.type = "checkbox";
        input.checked = preferences[id];

        label.appendChild(input);
        line.appendChild(label);

        const i = document.createElement("i");
        i.innerText = description;
        line.appendChild(i);

        return line;
    }

    function createIntegerOption({ id, title, description, min, max, step }) {
        const line = document.createElement("div");
        line.className = "prefLineInteger";
        const label = document.createElement("label");
        label.innerText = title;

        const input = document.createElement("input");
        input.className = "prefElement form-control";
        input.title = "Insert a number";
        input.id = id;
        input.type = "number";

        input.min = min;
        input.max = max;
        input.step = step;

        label.appendChild(input);
        line.appendChild(label);

        if (description) {
            const i = document.createElement("i");
            i.innerText = description;
            line.appendChild(i);
        }

        return line;
    }

    function createRangeOption({ id, title, description, min, max, step }) {
        const line = document.createElement("div");
        line.className = "prefLineSlider";
        const label = document.createElement("label");
        label.innerText = title;

        const input = document.createElement("input");
        input.className = "prefElement form-control";
        input.title = "Pick a value using the slider";
        input.id = id;
        input.type = "range";

        input.min = min;
        input.max = max;
        input.step = step;

        label.appendChild(input);
        line.appendChild(label);

        if (description) {
            const i = document.createElement("i");
            i.innerText = description;
            line.appendChild(i);
        }

        return line;
    }

    function initPreferences() {
        const style = document.createElement("style");
        style.innerHTML = `
        <style>
        #sidepanel-svl details{margin-bottom:9pt;}
        .expand{display:flex; width:100%; justify-content:space-around;}
        .prefLineCheckbox{width:100%; margin-bottom:1vh;}
        .prefLineCheckbox label{display:block;width:100%}
        .prefLineCheckbox input{float:right;}
        .prefLineInteger{width:100%; margin-bottom:1vh;}
        .prefLineInteger label{display:block;width:100%}
        .prefLineInteger input{float:right;}
        .prefLineSlider {width:100%; margin-bottom:1vh;}
        .prefLineSlider label{display:block;width:100%}
        .prefLineSlider input{float:right;}
        #sidepanel-svl h5{text-transform: capitalize;}
        .routingDiv{opacity: 0.95; font-size:1.2em; border:0.2em black solid; position:absolute; top:3em; right:2em; padding:0.5em; background-color:#b30000}
        summary{font-weight:bold}</style>`;
        document.body.appendChild(style);
        const mainDiv = document.createElement("div");
        mainDiv.id = "PrefDiv";

        const saveButton = document.createElement("button");
        saveButton.id = "svl_saveNewPref";
        saveButton.type = "button";
        saveButton.className = "btn disabled waze-icon-save";
        saveButton.innerText = "Save";
        saveButton.title = "Save your edited settings";


        const rollbackButton = document.createElement("button");
        rollbackButton.id = "svl_rollbackButton";
        rollbackButton.type = "button";
        rollbackButton.className = "btn btn-default disabled";
        rollbackButton.innerText = "Rollback";
        rollbackButton.title = "Discard your temporary changes";


        const resetButton = document.createElement("button");
        resetButton.id = "svl_resetButton";
        resetButton.type = "button";
        resetButton.className = "btn btn-default";
        resetButton.innerText = "Reset";
        resetButton.title = "Overwrite your current settings with the default ones";

        const buttons = document.createElement("div");
        buttons.appendChild(saveButton);
        buttons.appendChild(rollbackButton);
        buttons.appendChild(resetButton);
        buttons.style.position = "sticky";
        buttons.style.padding = "1vh";
        buttons.style.display = "flex";
        buttons.style.backgroundColor = "#eeeeee";
        buttons.style.justifyContent = "space-around";
        buttons.style.top = "0";

        mainDiv.appendChild(buttons);

        const streets = document.createElement("details");
        streets.open = true;
        const streetsSummary = document.createElement("summary");
        streetsSummary.innerText = "Road Types";
        streets.appendChild(streetsSummary);

        for (let i = 0, len = preferences.streets.length; i < len; i++) {
            if (preferences.streets[i]) {
                streets.appendChild(createStreetOptionLine(i));
            }
        }

        const decorations = document.createElement("details");
        const decorationSummary = document.createElement("summary");
        decorationSummary.innerText = "Segments Decorations";
        decorations.appendChild(decorationSummary);

        const labels = document.createElement("details");
        const labelsSummary = document.createElement("summary");
        labelsSummary.innerText = "Rendering Parameters";
        labels.appendChild(labelsSummary);

        const speedLimits = document.createElement("details");
        const speedLimitsSummary = document.createElement("summary");
        speedLimitsSummary.innerText = "Speed Limits";
        speedLimits.appendChild(speedLimitsSummary);

        const options = getOptions();
        for (let o of options.streets) {
            streets.appendChild(createStreetOptionLine(o));
        }

        for (let o of options.decorations) {
            if (o !== "dirty") {
                decorations.appendChild(createStreetOptionLine(o));
            } else {
                decorations.appendChild(createStreetOptionLine(o, false, true));
            }
        }

        mainDiv.appendChild(streets);
        mainDiv.appendChild(decorations);

        labels.appendChild(createCheckboxOption({
            id: "realsize",
            title: "Use real-life Width",
            description: "When enabled, the segments thickness will be computed from the segments width instead of using the value set in the preferences."
        }));

        labels.appendChild(createCheckboxOption({
            id: "showANs",
            title: "Show Alternative Names",
            description: "When enabled, at most 2 ANs that differ from the primary name are shown under the street name."
        }));

        labels.appendChild(createCheckboxOption({
            id: "routingModeEnabled",
            title: "Enable Routing Mode",
            description: "When enabled, roads are rendered by taking into consideration their routing attribute. E.g. a preferred Minor Highway is shown as a Major Highway."
        }));

        labels.appendChild(createCheckboxOption({
            id: "showUnderGPSPoints",
            title: "GPS Layer above Roads",
            description: "When enabled, the GPS layer gets shown above the road layer."
        }));

        labels.appendChild(createRangeOption({
            id: "labelOutlineWidth",
            title: "Labels Outline Width",
            description: "How much border should the labels have?",
            min: 0,
            max: 10,
            step: 1
        }));

        labels.appendChild(createCheckboxOption({
            id: "disableRoadLayers",
            title: "Hide WME Road Layer",
            description: "When enabled, the WME standard road layer gets hidden automatically."
        }));

        labels.appendChild(createCheckboxOption({
            id: "startDisabled",
            title: "SVL Initially Disabled",
            description: "When enabled, the SVL does not get enabled automatically."
        }));

        labels.appendChild(createRangeOption({
            id: "clutterConstant",
            title: "Street Names Density",
            description: "For an higher value, less elements will be shown.",
            min: 10, max: clutterMax, step: 1
        }));

        const closeZoomTitle = document.createElement("h5");
        closeZoomTitle.innerText = "Close-zoom only";

        labels.appendChild(closeZoomTitle);

        labels.appendChild(createCheckboxOption({
            id: "renderGeomNodes",
            title: "Render Geometry Nodes",
            description: "When enabled, the geometry nodes are drawn, too."
        }));

        labels.appendChild(createCheckboxOption({
            id: "autoReload_enabled",
            title: "Automatically Refresh the Map",
            description: "When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing."
        }));

        labels.appendChild(createIntegerOption({
            id: "autoReload_interval",
            title: "Auto Reload Time Interval (in Seconds)",
            description: "How often should the WME be refreshed for new edits?",
            min: 20, max: 3600, step: 1
        }));

        labels.appendChild(createIntegerOption({
            id: "fakelock",
            title: "Render Map as Level",
            description: "All segments locked above this level will be stroked through with a black line.",
            min: 1, max: 7, step: 1
        }));

        labels.appendChild(createRangeOption({
            id: "closeZoomLabelSize",
            title: "Font Size",
            description: "Increase this value if you can't read the street names because they are too small.",
            min: 8, max: fontSizeMax, step: 1
        }));

        labels.appendChild(createRangeOption({
            id: "arrowDeclutter",
            title: "Limit Arrows",
            description: "Increase this value if you want less arrows to be shown on streets (it increases the performance).",
            min: 1, max: 200, step: 1
        }));



        const farZoomTitle = document.createElement("h5");
        farZoomTitle.innerText = "Far-zoom only";
        labels.appendChild(farZoomTitle);

        labels.appendChild(createRangeOption({
            id: "farZoomLabelSize",
            title: "Font Size",
            description: "Increase this value if you can't read the street names because they are too small.",
            min: 8, max: fontSizeMax
        }));

        labels.appendChild(createCheckboxOption({
            id: "hideMinorRoads",
            title: "Hide minor roads at zoom 3",
            description: "The WME loads some type of roads when they probably shouldn't be, check this option for avoid displaying them at higher zooms."
        }));


        mainDiv.appendChild(labels);

        speedLimits.appendChild(createCheckboxOption({
            id: "showSLtext",
            title: "Show on the Street Name",
            description: "Show the speed limit as text at the end of the street name."
        }));

        speedLimits.appendChild(createCheckboxOption({
            id: "showSLcolor",
            title: "Show using Color Scale",
            description: "Show the speed limit by coloring the segment's outline."
        }));

        for (let k = W.prefs.attributes.isImperial ? 9 : 15; k > 1; k -= 1) {
            const span = document.createElement("span");
            if (W.prefs.attributes.isImperial) {
                span.style.color = getColorStringFromSpeed((k * 10 - 5) * 1.609344);
                span.innerText = k * 10 - 5;
            } else {
                span.style.color = getColorStringFromSpeed(k * 10);
                span.innerText = k * 10;
            }
            span.style.marginRight = "1pt";
            speedLimits.appendChild(span);
        }

        speedLimits.appendChild(createCheckboxOption({
            id: "showSLSinglecolor",
            title: "Show using Single Color",
            description: "Show the speed limit by coloring the segment's outline with a single color instead of a different color depending on the speed limit's value."
        }));

        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.className = "prefElement form-control";
        colorPicker.id = "SLColor";
        speedLimits.appendChild(colorPicker);

        speedLimits.appendChild(createCheckboxOption({
            id: "showDashedUnverifiedSL",
            title: "Show unverified Speed Limits with a dashed Line",
            description: "If the speed limit is not verified, it will be shown with a different style."
        }));

        mainDiv.appendChild(speedLimits);

        const subTitle = document.createElement("h5");
        subTitle.innerText = "Settings Backup";
        mainDiv.appendChild(subTitle);

        const utilityButtons = document.createElement("div");
        utilityButtons.className = "expand";

        const exportButton = document.createElement("button");
        exportButton.id = "svl_exportButton";
        exportButton.type = "button";
        exportButton.innerText = "Export";
        exportButton.className = "btn btn-default";

        const importButton = document.createElement("button");
        importButton.id = "svl_importButton";
        importButton.type = "button";
        importButton.innerText = "Import";
        importButton.className = "btn btn-default";

        utilityButtons.appendChild(importButton);
        utilityButtons.appendChild(exportButton);
        mainDiv.appendChild(utilityButtons);


        new WazeWrap.Interface.Tab('SVL 🗺️', mainDiv.innerHTML, updatePreferenceValues);

        const prefElements = document.querySelectorAll(".prefElement");
        prefElements.forEach(element => {
            element.addEventListener('change', updateValuesFromPreferences);
        });

        document.getElementById("svl_saveNewPref").addEventListener("click", saveNewPref);
        document.getElementById("svl_rollbackButton").addEventListener("click", rollbackPreferences);
        document.getElementById("svl_resetButton").addEventListener("click", rollbackDefault);
        document.getElementById("svl_importButton").addEventListener("click", importPreferences);
        document.getElementById("svl_exportButton").addEventListener("click", exportPreferences);
    }

    function removeNodeById(id) {
        nodesVector.destroyFeatures(nodesVector.getFeaturesByAttribute("myid", id));
    }

    function removeNodes(e) {
        //console.debug("Remove nodes");
        let i;
        for (i = 0; i < e.length; i += 1) {
            removeNodeById(e[i].attributes.id);
        }
        return true;
    }

    function getNodeStyle(attributes){
        if(attributes.segIDs?.length===1) //jshint ignore:line
        {
            return nodeStyleDeadEnd;
        }
        return nodeStyle;
    }
    function changeNodes(e) {
        consoleDebug("Change nodes");
        for (let node of e) {
            let attr = node.attributes;
            let nodeFeature = nodesVector.getFeaturesByAttribute("myid", attr.id)[0];
            if (nodeFeature) {
                nodeFeature.style = getNodeStyle(attr);
                nodeFeature.move(new OpenLayers.LonLat(attr.geometry.x, attr.geometry.y));
            } else if (attr.id > 0) {
                //The node has just been saved
                nodesVector.addFeatures(Array.of(drawNode(node)));
            }//Else it is a temporary node, we won't draw it.
        }
    }

    function nodeStateDeleted(e) {
        consoleDebug("Node state deleted");
        for (let i = 0; i < e.length; i++) {
            let n = e[i].attributes;
            removeNodeById(n.id);
        }
    }

    function segmentsStateDeleted(e) {
        for (let i = 0; i < e.length; i++) {
            let s = e[i].attributes;
            removeSegmentById(s.id);
        }
    }

    function addNodes(e) {
        consoleDebug("Add Nodes");
        let myFeatures, i;
        myFeatures = [];
        for (i = 0; i < e.length; i += 1) {
            //console.error(e[i].state);
            /*if (e[i].state === "Insert") {
                //If a new node was inserted, stop here and draw everything again to avoid keeping the one that was deleted
                //console.debug("SVL: drawing all nodes anew upon insert");
                drawAllNodes();
                return;
            }*/
            if (e[i].attributes.geometry !== undefined) {
                //TODO: check !== "Delete"?
                if (e[i].attributes.id > 0) {
                    myFeatures.push(drawNode(e[i]));
                }
            }
        }

        nodesVector.addFeatures(myFeatures);
        return true;
    }

    function removeSVLEvents(event) { //Keep all the events that don't have the svl flag enabled.
        return !event.svl;
    }

    function updateStatusBasedOnZoom(){
        consoleDebug("updateStatusBasedOnZoom running");
        if (OLMap.zoom < 2) { //There is nothing to draw, enable road layer
            //consoleDebug("Road layer automatically enabled because of zoom out");
            //consoleDebug("Vector visibility: ", streetVector.visibility);
            if (streetVector.visibility === true) {
                //consoleDebug("Setting vector visibility to false");
                streetVector.setVisibility(false);
                document.getElementById("layer-switcher-item_street_vector_layer").checked = false;
                document.getElementById("layer-switcher-item_road").checked = true;
                SVLAutomDisabled = true;
                WMERoadLayer.setVisibility(true);
            }
        } else if (SVLAutomDisabled) {
            SVLAutomDisabled = false;
            streetVector.setVisibility(true);
            document.getElementById("layer-switcher-item_street_vector_layer").checked = true;
            document.getElementById("layer-switcher-item_road").checked = false;
            SVLAutomDisabled = true;
            WMERoadLayer.setVisibility(false);
        }
    }

    let timer = null;
    function manageZoom() {
        //Event deferring
        clearTimeout(timer);
        consoleDebug("manageZoom clearing timer");
        timer = setTimeout(updateStatusBasedOnZoom, 600);
    }

    function registerSegmentsEvents() {
        //console.debug("SVL: Registering segment events");
        const events = W.model.segments._events;
        events.objectsadded.push({
            context: streetVector,
            callback: addSegments,
            svl: true
        });
        events.objectschanged.push({
            context: streetVector,
            callback: editSegments,
            svl: true
        });
        events.objectsremoved.push({
            context: streetVector,
            callback: removeSegments,
            svl: true
        });
        events['objects-state-deleted'].push({
            context: streetVector,
            callback: segmentsStateDeleted,
            svl: true
        });
    }

    function removeSegmentsEvents() {
        consoleDebug("SVL: Removing segments events");
        const events = W.model.segments._events;
        events.objectsadded = events.objectsadded.filter(removeSVLEvents);
        events.objectschanged = events.objectschanged.filter(removeSVLEvents);
        events.objectsremoved = events.objectsremoved.filter(removeSVLEvents);
        events['objects-state-deleted'] = events['objects-state-deleted'].filter(removeSVLEvents);
    }

    function removeNodeEvents() {
        consoleDebug("SVL: Removing node events");
        const events = W.model.nodes._events;
        events.objectsremoved = events.objectsremoved.filter(removeSVLEvents);
        events.objectsadded = events.objectsadded.filter(removeSVLEvents);
        events.objectschanged = events.objectschanged.filter(removeSVLEvents);
        events["objects-state-deleted"] = events["objects-state-deleted"].filter(removeSVLEvents);
    }
    function registerNodeEvents() {
        consoleDebug("SVL: Registering node events");
        const events = W.model.nodes._events;
        events.objectsremoved.push({
            context: nodesVector,
            callback: removeNodes,
            svl: true
        });
        events.objectsadded.push({
            context: nodesVector,
            callback: addNodes,
            svl: true
        });
        events.objectschanged.push({
            context: nodesVector,
            callback: changeNodes,
            svl: true
        });
        events["objects-state-deleted"].push({
            context: nodesVector,
            callback: nodeStateDeleted,
            svl: true
        });
    }

    /**
     * Draws the given array of segments
     *
     * @param {[]} segments
     */
    function addSegments(segments) {
        consoleDebug("Add Segments");
        let myFeatures = [];
        //console.log("Size: " + e.length);
        for (let el of segments) {
            if (el !== null) {
                myFeatures = myFeatures.concat(drawSegment(el));
                //myFeatures.push(...features);
            }
        }
        if (myFeatures.length > 0) {
            streetVector.addFeatures(myFeatures);
        }
    }

    function removeSegmentById(id) {
        consoleDebug("RemoveSegmentById", id, typeof (id));
        streetVector.destroyFeatures(streetVector.getFeaturesByAttribute("myId", id));
        labelsVector.destroyFeatures(labelsVector.getFeaturesByAttribute("myId", id));
    }

    function editSegments(e) {
        //console.debug("Changed Segment");
        let i;
        //consoleDebug("Segments modifed", e);
        for (i = 0; i < e.length; i += 1) {
            if (e[i]._prevID !== undefined) {
                removeSegmentById(parseInt(e[i]._prevID, 10));

            }
            removeSegmentById(e[i].attributes.id);
            //console.debug(e[i]);
            if (e[i].state !== "Delete") {
                addSegments([e[i]]);
            }
        }
        /* TODO see if this is still needed.
        if (e.length > 1 || e[0].state !== null) {
            if (!farZoom) {
                setTimeout(drawAllNodes, 50); //Without the timeout the last node remains in the model when rolling backs edit.
            }
        }*/
    }

    function removeSegments(e) {
        let i;
        //consoleDebug("Segments removed from model");
        for (i = 0; i < e.length; i += 1) {
            removeSegmentById(e[i].attributes.id);
        }
    }

    function manageVisibilityChanged(e) {
        //Toggle node layer visibility accordingly
        //consoleDebug("Manage nodes", e);
        nodesVector.setVisibility(e.object.visibility);
        labelsVector.setVisibility(e.object.visibility);
        if (e.object.visibility) {
            //SVL was just enabled
            consoleDebug("enabled: registering events");
            registerSegmentsEvents();
            if (!isFarZoom()) {
                registerNodeEvents();
            }
            updateStatusBasedOnZoom();
            redrawAllSegments();
        } else {
            //SVL was disabled
            consoleDebug("disabled: unregistering events");
            removeSegmentsEvents();
            removeNodeEvents();

            nodesVector.destroyFeatures();
            labelsVector.destroyFeatures();
            streetVector.destroyFeatures();
        }
    }

    function initWazeWrap(trial = 1) {
        if (trial > 30) {
            console.error("SVL: could not initialize WazeWrap");
            return;
        }

        if (!WazeWrap || !WazeWrap.Ready || WazeWrap.Interface === undefined) {
            console.log("SVL: WazeWrap not ready, retrying in 800ms");
            setTimeout(() => { initWazeWrap(++trial); }, 800);
            return;
        }
        initWazeWrapElements();
    }

    function initWazeWrapElements() {
        console.log("SVL: initializing WazeWrap");
        //Adding keyboard shortcut
        try {
            new WazeWrap.Interface.Shortcut('SVLToggleLayer', 'Toggle SVL', 'svl', 'Street Vector Layer', "A+l", function () {
                streetVector.setVisibility(!streetVector.visibility);
                document.getElementById("layer-switcher-item_street_vector_layer").checked = streetVector.visibility;
            }, null).add();
            console.log("Keyboard shortcut successfully added.");
        }
        catch (e) {
            console.error("Error while adding the keyboard shortcut:");
            console.error(e);
        }

        //Add the layer checkbox
        try {
            WazeWrap.Interface.AddLayerCheckbox("road", "Street Vector Layer", true, (checked) => { streetVector.setVisibility(checked); }, streetVector);
            if (preferences.startDisabled) {
                document.getElementById("layer-switcher-item_street_vector_layer").checked = false;
                streetVector.setVisibility(false);
            }
        } catch (e) {
            console.error("SVL: could not add layer checkbox");
        }
        initPreferences();
        WazeWrap.Interface.ShowScriptUpdate("Street Vector Layer", GM_info.script.version,
            `<b>Major update!</b>
        <br>- Added an option to render the streets based on their width;
        <br>- NEW: The width in the settings is now expressed in meters
        <br>- NEW: preference panel in the sidebar (SVL 🗺️)
        <br>- NEW: road types in the preference panel are now localised
        <br>- NEW: dead-end nodes are rendered with a different color
        <br>- NEW: Rendering completely rewritten: performance improvements
        <br>- Removed: the zoom-level indicator while editing the preferences
        <br>- Bug fixes and new bugs :)`);
    }


    function initValues() {
        labelOutlineWidth = preferences.labelOutlineWidth + "px";
    }

    function initSVL(svlAttempts = 0) {
        //Initialize variables
        let labelStyleMap, layerName, layers;
        try {
            svlWazeBits();
        } catch (e) {
            svlAttempts += 1;
            if (svlAttempts < 20) {
                console.warn(e);
                console.warn("Could not initialize SVL correctly. Maybe the Waze model was not ready. Retrying in 500ms...");
                setTimeout(() => { initSVL(++svlAttempts); }, 500);
                return;
            } /*else {*/
            console.error(e);
            alert("Street Vector Layer failed to inizialize. Maybe the Editor has been updated or your connection/pc is really slow.");
            return;
        }

        svlGlobals();

        if (loadPreferences() === false) {
            //First run, or new broswer
            alert("This is the first time that you run Street Vector Layer in this browser.\n" +
                "Some info about it:\n" +
                "By default, use ALT+L to toggle the layer.\n" +
                "You can change the streets color, thickness and style using the panel on the left sidebar.\n" +
                "Your preferences will be saved for the next time in your browser.\n" +
                "The other road layers will be automatically hidden (you can change this behaviour in the preference panel).\n" +
                "Have fun and tell us on the Waze forum if you liked the script!");
        }

        initValues();

        const roadStyleMap = new OpenLayers.StyleMap({
            pointerEvents: "none",
            strokeColor: "${color}",
            strokeWidth: "${width}",
            strokeOpacity: "${opacity}",
            strokeDashstyle: "${dash}",
            graphicZIndex: "${zIndex}"
        });

        labelStyleMap = new OpenLayers.StyleMap({
            fontFamily: "Rubik, Open Sans, Alef, helvetica, sans-serif",
            fontWeight: "800",
            fontColor: "${color}",
            labelOutlineColor: "${outlinecolor}",
            labelOutlineWidth: "${outlinewidth}",
            label: "${label}",
            visibility: preferences.startDisabled || true,
            angle: "${angle}",
            pointerEvents: "none",
            labelAlign: "cm" //set to center middle
        });
        layerName = "Street Vector Layer";

        streetVector = new OpenLayers.Layer.Vector(layerName, {
            styleMap: roadStyleMap,
            uniqueName: "vectorStreet",
            accelerator: "toggle" + layerName.replace(/\s+/g, ''),
            visibility: preferences.startDisabled || true,
            isVector: true,
            attribution: "SVL v. " + GM_info.script.version,
            rendererOptions: {
                zIndexing: true
            }
        });

        streetVector.renderer.drawFeature =
            function (feature, style) {
                if (style == null) {
                    style = feature.style;
                }

                if (feature.geometry) {
                    //if (bounds) {
                    const farZoom = isFarZoom();
                    if (OLMap.zoom < 2 || (feature.attributes.closeZoomOnly && farZoom) || (feature.attributes.farZoomOnly && !farZoom)) {
                        style = { display: "none" };
                    }
                    else {
                        const bounds = feature.geometry.getBounds();
                        if (!bounds.intersectsBounds(this.extent)) {
                            style = { display: "none" };
                        } else {
                            this.featureDx = 0;

                            style.pointerEvents = "none";
                            if (!farZoom) {
                                if (!feature.attributes.isArrow) {
                                    style.strokeWidth = style.strokeWidth / OLMap.resolution;
                                }
                            }
                        }
                    }

                    return this.drawGeometry(feature.geometry, style, feature.id);
                    //} else { alert("No bounds!"); }
                }
            };


        nodesVector = new OpenLayers.Layer.Vector("Nodes Vector", {
            uniqueName: "vectorNodes",
            visibility: preferences.startDisabled || true
        });

        nodesVector.renderer.drawFeature =
            function (feature, style) {
                if (OLMap.zoom < 2) {
                    style = { display: "none" };
                    return this.drawGeometry(feature.geometry, style, feature.id);
                }
                if (style == null) {
                    style = feature.style;
                }

                style = OpenLayers.Util.extend({}, style);


                if (feature.geometry) {

                    //if (bounds) {
                    const farZoom = isFarZoom();
                    if (!farZoom) {
                        const bounds = feature.geometry.getBounds();
                        if (!bounds.intersectsBounds(this.extent)) {
                            style = { display: "none" };
                        } else {
                            this.featureDx = 0;
                            style.pointRadius = style.pointRadius / OLMap.resolution;
                        }
                    } else {
                        style = { display: "none" };
                    }
                    return this.drawGeometry(feature.geometry, style, feature.id);

                    //} else { alert("No bounds!"); }
                }
            };

        labelsVector = new OpenLayers.Layer.Vector("Labels Vector", {
            uniqueName: "vectorLabels",
            styleMap: labelStyleMap,
            visibility: true,
        });

        labelsVector.renderer.drawFeature =
            function (feature, style) {
                if (OLMap.zoom < 2) {
                    return false;
                }
                if (style == null) {
                    style = feature.style;
                }


                if (feature.geometry) {
                    //if (bounds) {
                    const farZoom = isFarZoom();
                    if ((feature.attributes.closeZoomOnly && farZoom) || (feature.attributes.farZoomOnly && !farZoom)) {
                        style = { display: "none" };
                    }
                    else {
                        const bounds = feature.geometry.getBounds();
                        if (!bounds.intersectsBounds(this.extent)) {
                            style = { display: "none" };
                        } else {
                            this.featureDx = 0;
                            style.pointerEvents = "none";
                            style.fontSize = (farZoom ? preferences.farZoomLabelSize : preferences.closeZoomLabelSize) + "px";
                        }
                    }

                    var rendered = this.drawGeometry(feature.geometry, style, feature.id);
                    if (style.display != "none" && style.label && rendered !== false) {

                        var location = feature.geometry.getCentroid();
                        if (style.labelXOffset || style.labelYOffset) {
                            var xOffset = isNaN(style.labelXOffset) ? 0 : style.labelXOffset;
                            var yOffset = isNaN(style.labelYOffset) ? 0 : style.labelYOffset;
                            var res = this.getResolution();
                            location.move(xOffset * res, yOffset * res);
                        }
                        this.drawText(feature.id, style, location);
                    } else {
                        this.removeText(feature.id);
                    }
                    return rendered;
                    //} else { alert("No bounds!"); }
                }
            };


        labelsVector.renderer.drawText = function (featureId, style, location) {
            const drawOutline = (!!style.labelOutlineWidth);
            // First draw text in halo color and size and overlay the
            // normal text afterwards
            if (drawOutline) {
                const outlineStyle = OpenLayers.Util.extend({}, style);
                outlineStyle.fontColor = outlineStyle.labelOutlineColor;
                outlineStyle.fontStrokeColor = outlineStyle.labelOutlineColor;
                outlineStyle.fontStrokeWidth = style.labelOutlineWidth;
                if (style.labelOutlineOpacity) {
                    outlineStyle.fontOpacity = style.labelOutlineOpacity;
                }
                delete outlineStyle.labelOutlineWidth;
                this.drawText(featureId, outlineStyle, location);
            }

            const resolution = this.getResolution();

            const x = ((location.x - this.featureDx) / resolution + this.left);
            const y = (location.y / resolution - this.top);

            const suffix = (drawOutline) ? this.LABEL_OUTLINE_SUFFIX : this.LABEL_ID_SUFFIX;
            const label = this.nodeFactory(featureId + suffix, "text");

            label.setAttributeNS(null, "x", x);
            label.setAttributeNS(null, "y", -y);

            if (style.angle || style.angle === 0) {
                const rotate = `rotate(${style.angle},${x},${-y})`;
                label.setAttributeNS(null, "transform", rotate);
            }
            if (style.fontFamily) {
                label.setAttributeNS(null, "font-family", style.fontFamily);
            }
            if (style.fontWeight) {
                label.setAttributeNS(null, "font-weight", style.fontWeight);
            }

            if (style.fontSize) {
                label.setAttributeNS(null, "font-size", style.fontSize);
            }

            if (style.fontColor) {
                label.setAttributeNS(null, "fill", style.fontColor);
            }
            if (style.fontStrokeColor) {
                label.setAttributeNS(null, "stroke", style.fontStrokeColor);
            }

            if (style.fontStrokeWidth) {
                label.setAttributeNS(null, "stroke-width", style.fontStrokeWidth);
            }

            /*


            if (style.fontOpacity) {
                label.setAttributeNS(null, "opacity", style.fontOpacity);
            }

            if (style.fontStyle) {
                label.setAttributeNS(null, "font-style", style.fontStyle);
            }
            if (style.labelSelect === true) {
                label.setAttributeNS(null, "pointer-events", "visible");
                label._featureId = featureId;
            } else {
                label.setAttributeNS(null, "pointer-events", "none");
            }
            */
            label.setAttributeNS(null, "pointer-events", "none");

            const align = style.labelAlign || OpenLayers.Renderer.defaultSymbolizer.labelAlign;
            label.setAttributeNS(null, "text-anchor",
                OpenLayers.Renderer.SVG.LABEL_ALIGN[align[0]] || "middle");

            if (OpenLayers.IS_GECKO === true) {
                label.setAttributeNS(null, "dominant-baseline",
                    OpenLayers.Renderer.SVG.LABEL_ALIGN[align[1]] || "central");
            }

            const labelRows = style.label.split('\n');
            const numRows = labelRows.length;
            while (label.childNodes.length > numRows) {
                label.removeChild(label.lastChild);
            }
            for (let i = 0; i < numRows; i++) {
                const tspan = this.nodeFactory(featureId + suffix + "_tspan_" + i, "tspan");
                if (style.labelSelect === true) {
                    tspan._featureId = featureId;
                    tspan._geometry = location;
                    tspan._geometryClass = location.CLASS_NAME;
                }
                if (OpenLayers.IS_GECKO === false) {
                    tspan.setAttributeNS(null, "baseline-shift",
                        OpenLayers.Renderer.SVG.LABEL_VSHIFT[align[1]] || "-35%");
                }
                tspan.setAttribute("x", x);
                if (i == 0) {
                    let vfactor = OpenLayers.Renderer.SVG.LABEL_VFACTOR[align[1]];
                    if (vfactor == null) {
                        vfactor = -0.5;
                    }
                    tspan.setAttribute("dy", (vfactor * (numRows - 1)) + "em");
                } else {
                    tspan.setAttribute("dy", "1em");
                }
                tspan.textContent = (labelRows[i] === '') ? ' ' : labelRows[i];
                if (!tspan.parentNode) {
                    label.appendChild(tspan);
                }
            }

            if (!label.parentNode) {
                this.textRoot.appendChild(label);
            }
        };

        updateStylesFromPreferences(preferences);

        //Add layers to the map
        OLMap.addLayer(streetVector);
        OLMap.addLayer(labelsVector);
        OLMap.addLayer(nodesVector);

        if (localStorage.getItem("svlDebugOn") === "true") {
            document.sv = streetVector;
            document.nv = nodesVector;
        }


        streetVector.events.register("visibilitychanged", streetVector, manageVisibilityChanged);
        //Trigger the event manually
        manageVisibilityChanged({
            object: streetVector
        });
        //initialisation
        layers = OLMap.getLayersBy("uniqueName", "roads");
        WMERoadLayer = null;
        if (layers.length === 1) {
            WMERoadLayer = layers[0];
            if (OLMap.zoom <= 1) {
                WMERoadLayer.setVisibility(true);
            } else if (WMERoadLayer.getVisibility() && preferences.disableRoadLayers) {
                WMERoadLayer.setVisibility(false);
                document.getElementById("layer-switcher-item_road").checked = false;
                console.log("WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel.");
            }
        }
        SVLAutomDisabled = false;


        if (preferences.showUnderGPSPoints) { //By default, WME places the GPS points under the layer, no need to move it.
            updateLayerPosition();
        }

        updateRoutingModePanel();
        updateRefreshStatus();

        OLMap.events.register("zoomend", null, manageZoom, true);

        initWazeWrap();




        //TODO remove in the next releases
        $(".olControlAttribution").click(() => { alert("The preferences have been moved to the sidebar on the left. Please look for the \"SVL 🗺️\" tab."); });

        console.log("Street Vector Layer v. " + GM_info.script.version + " initialized correctly.");
    }

    function bootstrapSVL(trials = 0) {
        // Check all requisites for the script

        if (W === undefined || W.map === undefined || document.getElementById("layer-switcher-item_road") === null) {
            console.log("SVL not ready to start, retrying in 600ms");
            trials += 1;
            if (trials < 20) {
                setTimeout(() => { bootstrapSVL(++trials); }, 600);
            } else {
                alert("Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!");
            }
            return;
        }
        /* begin running the code! */
        initSVL();
    }

    bootstrapSVL();
}());
