// ==UserScript==
// @name       Street Vector Layer
// @namespace  wme-champs-it
// @version    4.7.7
// @description  Adds a vector layer for drawing streets on the Waze Map editor
// @include    /^https:\/\/(www|beta)\.waze\.com(\/\w{2,3}|\/\w{2,3}-\w{2,3}|\/\w{2,3}-\w{2,3}-\w{2,3})?\/editor\b/
// @updateURL  http://code.waze.tools/repository/475e72a8-9df5-4a82-928c-7cd78e21e88d.user.js
// @supportURL https://www.waze.com/forum/viewtopic.php?f=819&t=149535
// @require    https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @author     bedo2991
// @grant    GM_setClipboard
// @copyright  2015+, bedo2991
// ==/UserScript==

/*jslint browser: true*/
/*jslint white: true */
/*global $, jQuery, W, OpenLayers, WazeWrap, GM_info.script*/
/*jslint nomen: true */ //for variable starting with _


//Code minifier: https://closure-compiler.appspot.com/home
//debugger;
(function () {
    "use strict";
    const consoleDebug = localStorage.getItem("svlDebugOn")==="true" ? (...args) =>
         {
             for (let i = 0; i < args.length; i++){
                 console.dir(args[i]);
             }
         } : ()=>{};

    let autoLoadInterval = null,
        clutterConstant,
        thresholdDistance,
        streetStyle = [],
        labelFontSize,
        streetVector,
        nodesVector,
        labelOutlineWidth,
        svlIgnoredStreets,
        arrowDeclutter,
        clutterMax,
        fontSizeMax,
        farZoom,
        svlVersion,
        preferences,
        svlStreetTypes,
        nonEditableStyle,
        tunnelFlagStyle2,
        superScript,
        tunnelFlagStyle1,
        headlightsFlagStyle,
        laneStyle,
        roundaboutStyle,
        tollStyle,
        closureStyle,
        validatedStyle,
        restrStyle,
        redStyle,
        nodeStyle,
        unknownDirStyle,
        geometryNodeStyle,
        roadLayer,
        vectorAutomDisabled,
        farZoomThreshold,
        Wmap;
        //splittedSpeedLimits;

    //End of global variable declaration

    function svlGlobals() {
        Wmap = W.map;
        //splittedSpeedLimits = false;
        farZoomThreshold = 5; //To increase performance change this value to 6.
        arrowDeclutter = 25;
        clutterMax = 700;
        fontSizeMax = 32;
        farZoom = Wmap.zoom < farZoomThreshold;
        svlVersion = GM_info.script.version;
        preferences = null;
        superScript = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
        svlIgnoredStreets = {
            8: true,
            10: true,
            16: true,
            17: true,
            19: true,
            20: true
        };
        svlStreetTypes = {
            1: "Street",
            2: "Primary Street",
            3: "Freeway",
            4: "Ramp",
            5: "Walking Trail",
            6: "Major Highway",
            7: "Minor Highway",
            8: "Dirt Road",
            10: "Pedestrian Boardwalk",
            15: "Ferry",
            16: "Stairway",
            17: "Private Road",
            18: "Railroad",
            19: "Runway",
            20: "Parking Lot Road",
            22: "Alley"
            /*"service": 21,*/
        };

        OpenLayers.Renderer.symbol.myTriangle = [-2, 0, 2, 0, 0, -6, -2, 0];
        nonEditableStyle = {
            strokeColor: "#000",
            strokeWidth: 2,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        tunnelFlagStyle2 = {
            strokeColor: "#C90",
            strokeWidth: 1,
            strokeDashstyle: "longdash",
            pointerEvents: "none"
        };
        tunnelFlagStyle1 = {
            strokeColor: "#fff",
            strokeWidth: 2,
            strokeDashstyle: "longdash",
            pointerEvents: "none"
        };
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
        if (W.model.actionManager.unsavedActionsNum() === 0 && !WazeWrap.hasSelectedFeatures() && $(".place-update-edit.show").size() === 0) {
            W.controller.reload();
        }
    }

    function hasToBeSkipped(roadid) {
        return preferences.hideMinorRoads && Wmap.getZoom() === 3 && svlIgnoredStreets[roadid] === true;

    }

    function savePreferences(preferences) {
        preferences.version = svlVersion;
        localStorage.setItem("svl", JSON.stringify(preferences));
    }

    function saveDefaultPreferences() {
        preferences = {};

        preferences.autoReload = {};
        preferences.autoReload.interval = 60000;
        preferences.autoReload.enabled = false;

        preferences.showSLSinglecolor = false;
        preferences.SLColor = "#ffdf00";
        if (WazeWrap && WazeWrap.User) {
            preferences.fakelock = WazeWrap.User.Rank();
        } else {
            preferences.fakelock = 6;
        }
        preferences.hideMinorRoads = false;
        preferences.showDashedUnverifiedSL = true;
        preferences.showSLcolor = true;
        preferences.showSLtext = true;
        preferences.version = svlVersion;
        preferences.disableRoadLayers = true;
        preferences.startDisabled = false;
        preferences.clutterCostantNearZoom = 400.0;
        preferences.labelOutlineWidth = "3";
        preferences.clutterCostantFarZoom = 410.0;
        preferences.streets = [];
        //Street: 1
        preferences.streets[1] = {
            strokeColor: "#FFFFFF",
            outlineColor: "#000",
            strokeWidth: 5,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Parking: 20
        preferences.streets[20] = {
            strokeColor: "#2282ab",
            strokeWidth: 5,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Ramp: 4
        preferences.streets[4] = {
            strokeColor: "#3FC91C",
            strokeWidth: 6,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Freeway: 3
        preferences.streets[3] = {
            strokeColor: "#387FB8",
            strokeWidth: 9,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Minor: 7
        preferences.streets[7] = {
            strokeColor: "#ECE589",
            strokeWidth: 7,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Major: 6
        preferences.streets[6] = {
            strokeColor: "#C13040",
            strokeWidth: 8,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Stairway: 16
        preferences.streets[16] = {
            strokeColor: "#B700FF",
            strokeWidth: 3,
            strokeDashstyle: "dash",
            pointerEvents: "none"
        };
        //Walking: 5
        preferences.streets[5] = {
            strokeColor: "#00FF00",
            strokeWidth: 3,
            strokeDashstyle: "dash",
            pointerEvents: "none"
        };
        //Dirty: 8
        preferences.streets[8] = {
            strokeColor: "#82614A",
            strokeWidth: 5,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Ferry: 15
        preferences.streets[15] = {
            strokeColor: "#FF8000",
            strokeWidth: 3,
            strokeDashstyle: "dashdot",
            pointerEvents: "none"
        };
        //Railroad: 18
        preferences.streets[18] = {
            strokeColor: "#FFFFFF",
            strokeWidth: 4,
            strokeDashstyle: "dash",
            pointerEvents: "none"
        };
        //Private: 17
        preferences.streets[17] = {
            strokeColor: "#00FFB3",
            strokeWidth: 4,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Alley: 22
        preferences.streets[22] = {
            strokeColor: "#C6C7FF",
            strokeWidth: 4,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Runway: 19
        preferences.streets[19] = {
            strokeColor: "#00FF00",
            strokeWidth: 4,
            strokeDashstyle: "dashdot",
            pointerEvents: "none"
        };
        //Primary: 2
        preferences.streets[2] = {
            strokeColor: "#CBA12E",
            strokeWidth: 6,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        //Pedestrian: 10
        preferences.streets[10] = {
            strokeColor: "#0000FF",
            strokeWidth: 6,
            strokeDashstyle: "dash",
            pointerEvents: "none"
        };
        //Red segments (without names)
        preferences.red = {
            strokeColor: "#FF0000",
            strokeWidth: 6,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };

        preferences.roundabout = {
            strokeColor: "#111",
            strokeWidth: 1,
            strokeDashstyle: "dash",
            pointerEvents: "none"
        };
        preferences.lanes = {
            strokeColor: "#454443",
            strokeWidth: 3,
            strokeDashstyle: "dash",
            pointerEvents: "none"
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
            pointerEvents: "none"
        };
        preferences.headlights = {
            strokeColor: "#bfff00",
            strokeWidth: 3,
            strokeDashstyle: "dot",
            pointerEvents: "none"
        };
        preferences.restriction = {
            strokeColor: "#F2FF00",
            strokeWidth: 2,
            strokeDashstyle: "dash",
            pointerEvents: "none"
        };
        preferences.dirty = {
            strokeColor: "#82614A",
            opacity: 60,
            strokeDashstyle: "longdash",
            pointerEvents: "none"
        };
        preferences.arrowDeclutter = 10;

        preferences.showUnderGPSPoints = false;
        preferences.routingModeEnabled = false;
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

    function getWidth({segmentWidth, roadType, twoWay}){
        //If in close zoom and user enabled the realsize mode
        if(!farZoom && preferences.realsize){
            //If the segment has a widht set, use it
            if(segmentWidth){
                return (twoWay ? segmentWidth : (segmentWidth / 2.0)) / W.map.getOLMap().getResolution();
            }else{
                return (twoWay ? defaultSegmentWidhtMeters[roadType] : (defaultSegmentWidhtMeters[roadType] / 2.0)) / W.map.getOLMap().getResolution();
            }
        }else{
            //Use the value stored in the preferences //TODO: parseInt should not be needed
         return parseInt(streetStyle[roadType].strokeWidth,10);
        }
    }


    function loadPreferences() {
        preferences = JSON.parse(localStorage.getItem("svl"));
        //consoleDebug("Loading preferences");
        if (preferences === null) {
            //consoleDebug("Creating new preferences from default");
            saveDefaultPreferences();
            return false;
        }
        return true;
    }

    function animateAndClose(element_id) {
        $(document.getElementById(element_id)).hide(400, function () {
            $(document.getElementById(element_id)).remove();
        });
    }


    function closePrefPanel() {
        animateAndClose("zoomStyleDiv");
        animateAndClose("PrefDiv");
    }

    function getThreshold() {
        if (clutterConstant === clutterMax) {
            return 0;
        }
        return clutterConstant / Wmap.getZoom();
    }

    function bestBackground(color) {
        let oppositeColor = parseInt(color.substring(1, 3), 16) * 0.299 + parseInt(color.substring(3, 5), 16) * 0.587 + parseInt(color.substring(5, 7), 16) * 0.114;
        if (oppositeColor < 127) {
            return "#FFF";
        }
        return "#000";
    }

    function getColorSpeed(speed) {
        if (preferences.showSLSinglecolor) {
            return preferences.SLColor;
        }

        if (W.prefs.attributes.isImperial) { // adjust scale for Imperial
            // speeds 15 to 75 mph (7 increments) are tuned to HSL 95 to 395 (35) for easy visual speed differentiation at common speeds
            return ((speed / 1.609344 * 5) + 20) % 360;
        } //else
        return (speed * 3) % 360; // :150 * 450
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

    function drawLabels(model, simplified, delayed) {
        //consoleDebug("drawLabels");
        let labels, labelFeature, len, attributes, address, /* maxDistance, maxDistanceIndex,*/ p, streetPart, speedPart, speed, distance,
            labelText, dx, dy, centroid, angle, degrees, directionArrow, streetNameThresholdDistance, p0, p1, defaultLabel, doubleLabelDistance, ANsShown, i, altStreet, altStreetPart;
        defaultLabel = null;
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
           if(preferences.showANs){
               for(i = 0, ANsShown = 0; i < attributes.streetIDs.length; i++)
               {
                 if(ANsShown === 2)
                 {//Show maximum 2 alternative names
                   altStreetPart+=" …";
                   break;
                 }
                  altStreet = model.model.streets.objects[attributes.streetIDs[i]];
                  if(altStreet && altStreet.name !== address.street.name){
                    ANsShown++;
                    altStreetPart += (altStreet.name ? "(" + altStreet.name + ")":"");
                }
               }
               altStreetPart = altStreetPart.replace(")(", ", ");
               if(altStreetPart != "")
               {
                 altStreetPart = "\n" + altStreetPart;
               }
           }

            if (!streetStyle[attributes.roadType]) {
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
            streetNameThresholdDistance = labelText.length * 2.3 * (8 - Wmap.getZoom()) + Math.random() * 30;
            doubleLabelDistance = 4 * streetNameThresholdDistance;

            defaultLabel = new OpenLayers.Feature.Vector(simplified[0], {
                myId: attributes.id
            });

            defaultLabel.attributes.color = streetStyle[attributes.roadType] ? streetStyle[attributes.roadType].strokeColor : "#f00";
            defaultLabel.attributes.outlinecolor = streetStyle[attributes.roadType] ? streetStyle[attributes.roadType].outlineColor : "#fff";
            defaultLabel.attributes.outlinewidth = labelOutlineWidth;
            defaultLabel.attributes.fsize = labelFontSize;


            for (p = 0, len = simplified.length - 1; p < len; p += 1) {
                distance = simplified[p].distanceTo(simplified[p + 1]);
                if (thresholdDistance && distance >= thresholdDistance) {
                    //consoleDebug("Label can be inserted:");
                    //console.dir(address);
                    dx = 0;
                    dy = 0;
                    if (distance > streetNameThresholdDistance) {
                        //consoleDebug("Label inserted");
                        //p = maxDistanceIndex;
                        if (farZoom || distance < doubleLabelDistance) {
                            p0 = simplified[p];
                            p1 = simplified[p + 1];
                        } else {
                            p0 = simplified[p];
                            p1 = new OpenLayers.Geometry.LineString([p0, simplified[p + 1]]).getCentroid(true);
                        }
                        centroid = new OpenLayers.Geometry.LineString([p0, p1]).getCentroid(true); /*Important pass true parameter otherwise it will return start point as centroid*/
                        //Clone the label
                        labelFeature = defaultLabel.clone();
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
                        labels.push(labelFeature);
                        if (!farZoom && distance >= doubleLabelDistance) { //Create the second label on a long segment
                            p0 = p1;
                            p1 = simplified[p + 1];
                            centroid = new OpenLayers.Geometry.LineString([p0, p1]).getCentroid(true);
                            labelFeature = labelFeature.clone();
                            labelFeature.geometry = centroid;
                            labels.push(labelFeature);
                        }
                    }
                }
            }

        }
        if (delayed && labelFeature) {
            streetVector.addFeatures(labels);
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
            graphicZIndex: 100,
            fillOpacity: 1
        });

    }

    function drawSegment(model) {
        //consoleDebug("DrawSegment");
        let i, attributes, points, pointList, simplified, myFeatures, lineFeature, roadType, locked, speed,
            bridgeStyle, speedStyleLeft, speedStyleRight, speedStrokeStyle, speedValue, tunnelsStyle, restr, speedStyle, dirtyStyle, simplifiedPoints, arrowFeature, p, len, dx, dy, labels,
            left, right, k, pk, pk1, offset, m, mb, temp,
            step, degrees, segmentLenght, minDistance, segmentLineString,
            numPoints, stepx, stepy, px, py, ix; //dx, dy
        attributes = model.attributes;
        if (hasToBeSkipped(attributes.roadType)) {
            return [];
        }
        points = attributes.geometry.components;
        pointList = attributes.geometry.getVertices(); //is an array
        simplified = new OpenLayers.Geometry.LineString(pointList).simplify(1.5).components;
        myFeatures = [];
        lineFeature = null;
        if (null === attributes.primaryStreetID) {
            //consoleDebug("RED segment", model);
            lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(pointList), {
                myId: attributes.id
            }, redStyle);
            myFeatures.push(lineFeature);
        } else {
            roadType = attributes.roadType;
            let width = getWidth({segmentWidth:attributes.width,
                                  roadType:attributes.roadType,
                                  twoWay: attributes.fwdDirection && attributes.revDirection});
            consoleDebug(width);
            if (preferences.routingModeEnabled && attributes.routingRoadType !== null) {
                roadType = attributes.routingRoadType;
            }
            if (streetStyle[roadType] !== undefined) {
                locked = false;
                speed = attributes.fwdMaxSpeed || attributes.revMaxSpeed; //If it remains null it does not have a speed limit
                //consoleDebug("Road Type: ", roadType);
                if (attributes.level > 0) { //it is a bridge
                    //consoleDebug("Bridge");
                    bridgeStyle = {
                        strokeColor: "#000",
                        strokeWidth: width + (speed && preferences.showSLcolor && !farZoom ? 6 : 4),
                        //strokeDashstyle: "solid",
                        pointerEvents: "none"
                    };
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                            myId: attributes.id
                        }, bridgeStyle);
                    myFeatures.push(lineFeature);
                }

                if (speed && !farZoom && preferences.showSLcolor) { //it has a speed limit
                    //consoleDebug("SpeedLimit");
                    speedStrokeStyle = (preferences.showDashedUnverifiedSL && (attributes.fwdMaxSpeedUnverified || attributes.revMaxSpeedUnverified) ? "dash" : "solid");

                    if (!preferences.showSLSinglecolor && (attributes.fwdMaxSpeed || attributes.revMaxSpeed) && attributes.fwdMaxSpeed !== attributes.revMaxSpeed && !model.isOneWay()) {
                        //consoleDebug("The segment has 2 different speed limits");
                        //splittedSpeedLimits = true;
                        speed = getColorSpeed(attributes.fwdMaxSpeed);
                        speedStyleLeft = {
                            strokeColor: speed.toString().charAt(0) === "#" ? speed : "hsl(" + speed + ", 100%, 50%)",
                            strokeWidth: width,
                            strokeDashstyle: speedStrokeStyle,
                            pointerEvents: "none"
                        };
                        speed = getColorSpeed(attributes.revMaxSpeed);
                        speedStyleRight = {
                            strokeColor: speed.toString().charAt(0) === "#" ? speed : "hsl(" + speed + ", 100%, 50%)",
                            strokeWidth: width,
                            strokeDashstyle: speedStrokeStyle,
                            pointerEvents: "none"
                        };
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
                            offset = (width / 5.0) * (30.0 / (Wmap.getZoom() * Wmap.getZoom())); //((Wmap.getZoom()+1)/11)+0.6*(1/(11-Wmap.getZoom()));// (10-Wmap.getZoom()/3)/(10-Wmap.getZoom());
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
                                    myId: attributes.id
                                }, speedStyleLeft);
                            myFeatures.push(lineFeature);
                            lineFeature = new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.LineString(right), {
                                    myId: attributes.id
                                }, speedStyleRight);
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
                            speed = getColorSpeed(speedValue);
                            speedStyle = {
                                strokeColor: speed.toString().charAt(0) === "#" ? speed : "hsl(" + speed + ", 100%, 50%)",
                                strokeWidth: width + 4,
                                strokeDashstyle: speedStrokeStyle,
                                pointerEvents: "none"
                            };
                            lineFeature = new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.LineString(pointList), {
                                    myId: attributes.id
                                }, speedStyle);
                            myFeatures.push(lineFeature);
                        }
                    }
                }

                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id
                    }, Object.assign({}, streetStyle[roadType]));
                //console.dir(lineFeature);
                lineFeature.style.strokeWidth = width;
                myFeatures.push(lineFeature);

                if (attributes.level < 0) {
                    tunnelsStyle = {
                        strokeColor: "#000",
                        strokeWidth: width,
                        strokeOpacity: 0.35,
                        strokeDashstyle: "solid",
                        pointerEvents: "none"
                    };
                    lineFeature = new OpenLayers.Feature.Vector(
                        new OpenLayers.Geometry.LineString(pointList), {
                            myId: attributes.id
                        }, tunnelsStyle);
                    myFeatures.push(lineFeature);
                }
                let u;
                try{
                    u = WazeWrap.User;
                }catch(e){}
                if(u){
                    let currentLock = model.getLockRank() + 1;
                    if (currentLock > preferences.fakelock || currentLock > u.Rank()) {
                        lineFeature = new OpenLayers.Feature.Vector(
                            new OpenLayers.Geometry.LineString(pointList), {
                                myId: attributes.id
                            }, nonEditableStyle);
                        myFeatures.push(lineFeature);
                        locked = true;
                    }
                }
            }

            /*jslint bitwise: true */
            if (attributes.flags & 16) { //The dirty flag is enabled
                /*jslint bitwise: false */
                dirtyStyle = {
                    strokeColor: preferences.dirty.strokeColor,
                    strokeWidth: width - 2,
                    strokeOpacity: preferences.dirty.opacity / 100.0,
                    strokeDashstyle: preferences.dirty.strokeDashstyle,
                    pointerEvents: "none"
                };
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id
                    }, dirtyStyle);
                myFeatures.push(lineFeature);
            }
        }
        //Check segment properties


        if (!farZoom) {
            if (attributes.hasClosures) {
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id
                    }, closureStyle);
                myFeatures.push(lineFeature);
            }
            if (null !== attributes.junctionID) { //It is a roundabout
                //consoleDebug("Segment is a roundabout");
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id
                    }, roundaboutStyle);
                myFeatures.push(lineFeature);
            }

            if (!locked && (attributes.fwdToll || attributes.revToll)) { //It is a toll road
                //consoleDebug("Segment is toll");
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id
                    }, tollStyle);
                myFeatures.push(lineFeature);
            } else {
                restr = attributes.restrictions;
                for (i = 0; i < restr.length; i += 1) {
                    if (restr[i]._defaultType === "TOLL") { //If it has at least a "toll free" restriction
                        lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(pointList), {
                            myId: attributes.id
                        }, tollStyle);
                        myFeatures.push(lineFeature);
                        break;
                    }
                }
            }
            if (attributes.restrictions.length > 0) {
                //It has restrictions
                //consoleDebug("Segment has restrictions");
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id
                    }, restrStyle);
                myFeatures.push(lineFeature);
            }

            if (!locked && attributes.validated === false) { //Segments that needs validation
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id
                    }, validatedStyle);
                myFeatures.push(lineFeature);
            }

            //Headlights
            /*jslint bitwise: true */
            if (attributes.flags & 32) {
                /*jslint bitwise: false */
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(pointList), {
                        myId: attributes.id
                    }, headlightsFlagStyle);
                myFeatures.push(lineFeature);
            }

            if(attributes.fwdLaneCount > 0){
                //console.log("LANE fwd");
                let res = pointList.slice(-2);
                //if(pointList.length === 2){
                    res[0] = new OpenLayers.Geometry.LineString([res[0], res[1]]).getCentroid(true);
                //}
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(res), {
                        myId: attributes.id
                    }, laneStyle);
                myFeatures.push(lineFeature);
            }

            if(attributes.revLaneCount > 0){
                //console.log("LANE rev");
                let res = pointList.slice(0,2);
                //if(pointList.length === 2){
                    res[1] = new OpenLayers.Geometry.LineString([res[0], res[1]]).getCentroid(true);
                //}
                lineFeature = new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.LineString(res), {
                        myId: attributes.id
                    },laneStyle);
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
                            myId: attributes.id
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
                        minDistance = 15.0 * (11 - Wmap.getZoom());
                        if (segmentLenght < minDistance * 2) {
                            segmentLineString = new OpenLayers.Geometry.LineString([simplifiedPoints[p], simplifiedPoints[p + 1]]);
                            arrowFeature = new OpenLayers.Feature.Vector(segmentLineString.getCentroid(true), {
                                myId: attributes.id
                            }, {
                                graphicName: "myTriangle",
                                rotation: degrees,
                                stroke: true,
                                strokeColor: "#000",
                                strokeWidth: 1.5,
                                fill: true,
                                fillColor: "#fff",
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
                                    myId: attributes.id
                                }, {
                                    graphicName: "myTriangle",
                                    rotation: degrees,
                                    stroke: true,
                                    strokeColor: "#000",
                                    strokeWidth: 1.5,
                                    fill: true,
                                    fillColor: "#fff",
                                    fillOpacity: 0.7,
                                    pointRadius: 5,
                                    pointerEvents: "none"
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
                        myId: attributes.id
                    }, geometryNodeStyle);
                    myFeatures.push(arrowFeature);
                }
            }
            //END: show geometry points
        } // End: Close Zoom

        //Far Zoom:

        /*jslint bitwise: true */
        if (attributes.flags & 1) { //The tunnel flag is enabled
            /*jslint bitwise: false */
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                    myId: attributes.id
                }, tunnelFlagStyle1);
            myFeatures.push(lineFeature);
            lineFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString(pointList), {
                    myId: attributes.id
                }, tunnelFlagStyle2);
            myFeatures.push(lineFeature);
        }


        //Add Label
        labels = drawLabels(model, simplified);
        if (labels.length > 0) {
            myFeatures = myFeatures.concat(labels);
        }
        return myFeatures;
    }

    function drawAllSegments() {
        //console.log("DrawAllSegments");
        let segments = W.model.segments.objects,
            keysSorted, myFeatures = [],
            i, len;
        streetVector.destroyFeatures();
        //consoleDebug(W.model.segments);
        if (Object.keys(segments).length === 0) {
            return; // exit now if there are no segments to draw, otherwise remainder of function will bomb out
        }
        keysSorted = Object.keys(segments).sort(function (a, b) {
            return segments[a].attributes.level - segments[b].attributes.level;
        });
        for (i = 0, len = keysSorted.length; i < len; i += 1) {
            myFeatures.push.apply(myFeatures, drawSegment(segments[keysSorted[i]]));
        }
        streetVector.addFeatures(myFeatures);
    }

    function drawNode(model) {
        let point, pointFeature;
        point = new OpenLayers.Geometry.Point(model.attributes.geometry.x, model.attributes.geometry.y);
        pointFeature = new OpenLayers.Feature.Vector(point, {
            myid: model.attributes.id
        }, nodeStyle);
        return pointFeature;
    }

    function drawAllNodes() {
        //console.debug("Drawing ALL nodes");
        let node, nodeFeatures, nodes;
        nodesVector.destroyFeatures();
        nodeFeatures = [];
        nodes = W.model.nodes.objects;
        //consoleDebug("nodes", nodes);
        for (node in nodes) {
            if (nodes.hasOwnProperty(node)) {
                if (nodes[node].state !== "Delete") {
                    nodeFeatures.push(drawNode(nodes[node]));
                }
            }
        } //End: For all the nodes
        nodesVector.addFeatures(nodeFeatures);
    }

    function doDraw() {
        //consoleDebug("Drawing everything anew");
        //splittedSpeedLimits = false;
        drawAllSegments();

        if (!farZoom) {
            drawAllNodes();
        }
    }

    function updateStylesFromPreferences(preferences) {
        let i, len;
        for (i = 0, len = preferences.streets.length; i < len; i += 1) {
            if (preferences.streets[i]) {
                streetStyle[i].strokeColor = preferences.streets[i].strokeColor;
                streetStyle[i].strokeWidth = preferences.streets[i].strokeWidth;
                streetStyle[i].strokeDashstyle = preferences.streets[i].strokeDashstyle;
                streetStyle[i].outlineColor = bestBackground(preferences.streets[i].strokeColor);
            }
        }

        //Red
        redStyle.strokeColor = preferences.red.strokeColor;
        redStyle.strokeWidth = preferences.red.strokeWidth;
        redStyle.strokeDashstyle = preferences.red.strokeDashstyle;

        //Lanes
        laneStyle.strokeColor = preferences.lanes.strokeColor;
        laneStyle.strokeWidth = preferences.lanes.strokeWidth;
        laneStyle.strokeDashstyle = preferences.lanes.strokeDashstyle;

        //Toll
        tollStyle.strokeColor = preferences.toll.strokeColor;
        tollStyle.strokeWidth = preferences.toll.strokeWidth;
        tollStyle.strokeDashstyle = preferences.toll.strokeDashstyle;

        //Restrictions
        restrStyle.strokeColor = preferences.restriction.strokeColor;
        restrStyle.strokeWidth = preferences.restriction.strokeWidth;
        restrStyle.strokeDashstyle = preferences.restriction.strokeDashstyle;

        //Closures
        closureStyle.strokeColor = preferences.closure.strokeColor;
        closureStyle.strokeWidth = preferences.closure.strokeWidth;
        closureStyle.strokeDashstyle = preferences.closure.strokeDashstyle;

        //Headlights Required
        headlightsFlagStyle.strokeColor = preferences.headlights.strokeColor;
        headlightsFlagStyle.strokeWidth = preferences.headlights.strokeWidth;
        headlightsFlagStyle.strokeDashstyle = preferences.headlights.strokeDashstyle;

        //Rendering
        //Labels
        //clutterCostantNearZoom = preferences.clutterCostantNearZoom;
        //clutterCostantFarZoom = preferences.clutterCostantFarZoom;
        clutterConstant = farZoom ? preferences.clutterCostantFarZoom : preferences.clutterCostantNearZoom;
        thresholdDistance = getThreshold();

        //ArrowDeclutter
        arrowDeclutter = preferences.arrowDeclutter;
        labelOutlineWidth = preferences.labelOutlineWidth;

        labelFontSize = farZoom ? preferences.farZoomLabelSize : preferences.closeZoomLabelSize;
        labelOutlineWidth = preferences.labelOutlineWidth + "px";
        //showSLtext = preferences.showSLtext;
        //showSLcolor = preferences.showSLcolor;

        doDraw();
    }

    function rollbackPreferences() {
        loadPreferences();
        updateStylesFromPreferences(preferences);
        closePrefPanel();
    }

    function exportPreferences() {
        //prompt("Please copy this string (CTRL+C):", JSON.stringify(preferences));
        /*jslint newcap: true */
        GM_setClipboard(JSON.stringify(preferences));
        /*jslint bitwise: false */
        alert("The configuration has been copied to your clipboard. Please paste it in a file (CTRL+V) to store it");
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
            closePrefPanel();
        }
    }

    function updateLayerPosition() {
        let gps_layer_index;
        gps_layer_index = parseInt(Wmap.getLayerByUniqueName("gps_points").getZIndex(), 10);

        if (preferences.showUnderGPSPoints) {
            streetVector.setZIndex(gps_layer_index - 2);
            nodesVector.setZIndex(gps_layer_index - 1);
        } else {
            streetVector.setZIndex(gps_layer_index + 1);
            nodesVector.setZIndex(gps_layer_index + 2);
        }
    }

    function closeRoutingPanel() {
        animateAndClose("routingModeDiv");
        preferences.routingModeEnabled = false;
        doDraw();
    }

    function updateRoutingModePanel() {
        let $routingModeDiv;
        //console.error("ROTUING MODE ENABLED? ", preferences.routingModeEnabled);
        if (preferences.routingModeEnabled) {
            $routingModeDiv = $("<div id=\"routingModeDiv\" class=\"routingDiv\">Routing Mode<br><small>Hover to temporary disable it<small></div>");
            $routingModeDiv.hover(
                function () {
                    //Temporary disable routing mode
                    preferences.routingModeEnabled = false;
                    doDraw();
                },
                function () {
                    //Enable routing mode again
                    preferences.routingModeEnabled = true;
                    doDraw();
                }
            );
            $("#closeRoutingMode").click(closeRoutingPanel);
            $(document.getElementById("map")).append($routingModeDiv);
        } else {
            $(document.getElementById("routingModeDiv")).remove();
        }
    }

    function updateRefreshStatus() {
        clearInterval(autoLoadInterval);
        autoLoadInterval = null;
        if (preferences.autoReload && preferences.autoReload.enabled) {
            autoLoadInterval = setInterval(refreshWME, preferences.autoReload.interval);
        }
    }

    function updatePref() {
        let i, len;
        $("#saveNewPref").removeClass("btn-primary").addClass("btn-warning");
        for (i = 0, len = preferences.streets.length; i < len; i += 1) {
            if (preferences.streets[i]) {
                preferences.streets[i] = {};
                preferences.streets[i].strokeColor = $("#streetColor_" + i).val();
                preferences.streets[i].strokeWidth = $("#streetWidth_" + i).val();
                preferences.streets[i].strokeDashstyle = $("#strokeDashstyle_" + i + " option:selected").val();
            }
        }

        preferences.fakelock = $("#fakeLock").val();


        //AutoReload
        preferences.autoReload = {};
        preferences.autoReload.interval = $("#autoReload_interval").val() * 1000;
        preferences.autoReload.enabled = $("#autoReload_enabled").prop("checked");

        //Red
        preferences.red = {};
        preferences.red.strokeColor = $("#streetColor_red").val();
        preferences.red.strokeWidth = $("#streetWidth_red").val();
        preferences.red.strokeDashstyle = $("#strokeDashstyle_red option:selected").val();

        //Dirty
        preferences.dirty = {};
        preferences.dirty.strokeColor = $("#streetColor_dirty").val();
        preferences.dirty.opacity = $("#opacity_dirty").val();
        preferences.dirty.strokeDashstyle = $("#strokeDashstyle_dirty option:selected").val();

        //Lanes
        preferences.lanes = {};
        preferences.lanes.strokeColor = $("#streetColor_lanes").val();
        preferences.lanes.strokeWidth = $("#streetWidth_lanes").val();
        preferences.lanes.strokeDashstyle = $("#strokeDashstyle_lanes option:selected").val();

        //Toll
        preferences.toll = {};
        preferences.toll.strokeColor = $("#streetColor_toll").val();
        preferences.toll.strokeWidth = $("#streetWidth_toll").val();
        preferences.toll.strokeDashstyle = $("#strokeDashstyle_toll option:selected").val();

        //Restrictions
        preferences.restriction = {};
        preferences.restriction.strokeColor = $("#streetColor_restriction").val();
        preferences.restriction.strokeWidth = $("#streetWidth_restriction").val();
        preferences.restriction.strokeDashstyle = $("#strokeDashstyle_restriction option:selected").val();

        //Closures
        preferences.closure = {};
        preferences.closure.strokeColor = $("#streetColor_closure").val();
        preferences.closure.strokeWidth = $("#streetWidth_closure").val();
        preferences.closure.strokeDashstyle = $("#strokeDashstyle_closure option:selected").val();

        //HeadlightsRequired
        preferences.headlights = {};
        preferences.headlights.strokeColor = $("#streetColor_headlights").val();
        preferences.headlights.strokeWidth = $("#streetWidth_headlights").val();
        preferences.headlights.strokeDashstyle = $("#strokeDashstyle_headlights option:selected").val();

        preferences.clutterCostantNearZoom = $("#clutterCostantNearZoom").val();
        preferences.clutterCostantFarZoom = $("#clutterCostantFarZoom").val();

        preferences.arrowDeclutter = $("#arrowDeclutter").val();
        preferences.labelOutlineWidth = $("#labelOutlineWidth").val();
        preferences.disableRoadLayers = $("#disableRoadLayers").prop("checked");
        preferences.startDisabled = $("#startdisabled").prop("checked");

        preferences.showSLtext = $("#showSLtext").prop("checked");
        preferences.showSLcolor = $("#showSLcolor").prop("checked");
        preferences.showSLSinglecolor = $("#showSLSinglecolor").prop("checked");
        preferences.SLColor = $("#SLColor").val();

        preferences.hideMinorRoads = $("#hideMinorRoads").prop("checked");
        preferences.showDashedUnverifiedSL = $("#showDashedUnverifiedSL").prop("checked");
        preferences.farZoomLabelSize = $("#farZoomLabelSize").val();
        preferences.closeZoomLabelSize = $("#closeZoomLabelSize").val();

        preferences.renderGeomNodes = $("#renderGeomNodes").prop("checked");

        //Check if showUnderGPSPoints has been toggled
        if (preferences.showUnderGPSPoints !== $("#showUnderGPSPoints").prop("checked")) {
            //This value has been updated, change the layer positions.
            preferences.showUnderGPSPoints = $("#showUnderGPSPoints").prop("checked");
            updateLayerPosition();
        } else {
            preferences.showUnderGPSPoints = $("#showUnderGPSPoints").prop("checked");
        }

        //Check if routing mode has been toggled
        if (preferences.routingModeEnabled !== $("#routingModeEnabled").prop("checked")) {
            //This value has been updated, change the layer positions.
            preferences.routingModeEnabled = $("#routingModeEnabled").prop("checked");
            updateRoutingModePanel();
        } else {
            preferences.routingModeEnabled = $("#routingModeEnabled").prop("checked");
        }

        preferences.showANs = $("#showANs").prop("checked");
        preferences.realsize = $("#realsize").prop("checked");

        if(preferences.realsize){
        //Disable all width inputs.
            $('input.segmentsWidth').prop( "disabled", true );
        }else{
            $('input.segmentsWidth').prop( "disabled", false );
        }

        updateStylesFromPreferences(preferences);
        updateRefreshStatus();
    }

    function saveNewPref() {
        updatePref();
        savePreferences(preferences);
        closePrefPanel();
    }

    function rollbackDefault(dontask) {
        if (dontask === true || confirm("Are you sure you want to rollback to the default style?\nANY CHANGE WILL BE LOST!")) {
            saveDefaultPreferences();
            updateStylesFromPreferences(preferences);
            closePrefPanel();
        }
    }

    function createDashStyleDropdown(id) {
        return $("<select class=\"prefElement\" title=\"Stroke style\" id=\"" + id + "\"><option value=\"solid\">Solid</option><option value=\"dash\">Dashed</option><option value=\"dashdot\">Dash Dot</option><option value=\"longdash\">Long Dash</option><option value=\"longdashdot\">Long Dash Dot</option><option value=\"dot\">Dot</option></select>");
    }

    function editPreferences() {
        let $zoomStyleDiv, $style, $mainDiv, $elementDiv, $streets, $decorations, $labels, $speedLimits, $select, i, k, len;
        if ($(document.getElementById("PrefDiv")).length > 0) {
            return;
        }
        $zoomStyleDiv = $("<div id=\"zoomStyleDiv\" class=\"zoomDiv\"></div>");
        if (farZoom) {
            $zoomStyleDiv.addClass("farZoom");
            $zoomStyleDiv.text("You are currently in FAR-zoom mode");
        } else {
            $zoomStyleDiv.addClass("closeZoom");
            $zoomStyleDiv.text("You are currently in CLOSE-zoom mode");
        }
        $(document.getElementById("map")).append($zoomStyleDiv);
        $style = $("<style>.routingDiv{opacity: 0.95; font-size:1.2em; border:0.2em black solid; position:absolute; top:3em; right:2em; padding:0.5em; background-color:#b30000}.farZoom{background-color:orange}.closeZoom{background-color:#6495ED}.zoomDiv{opacity: 0.95; font-size:1.2em; border:0.2em black solid; position:absolute; top:8em; right:2em; padding:1em;}.prefElement{margin-right:0.2em;}summary{font-weight:bold}</style>");
        $mainDiv = $("<div id=\"PrefDiv\" class=\"panel panel-default show\" style=\"width:24em; position:absolute; top:10vh; left:30em; z-index:200; background-color:#ffffff; resize:vertical; overflow:auto;\"></div>");
        $mainDiv.append($("<div class=\"panel-heading\"><button id=\"saveNewPref\" class=\"btn btn-primary waze-icon-save\">Save</button> <button id=\"rollbackPreferences\" class=\"btn btn-default\">Rollback</button> <button id=\"rollbackDefault\" class=\"btn btn-default\">Reset</button><a id=\"close\" class=\"close-panel\" /></div>"));
        $elementDiv = $("<div id=\"PrefElementDiv\" style=\"padding:1px 15px; max-height:60vh; overflow:auto\"></div>");

        $streets = $("<details open></details>");
        $decorations = $("<details></details>");
        $labels = $("<details></details>");
        $speedLimits = $("<details></details>");
        $streets.append("<summary>Road Types</summary>");
        for (i = 0, len = preferences.streets.length; i < len; i += 1) {

            if (preferences.streets[i]) {
                $streets.append($("<b>" + svlStreetTypes[i] + "</b><br>"));
                $streets.append($("<input class=\"prefElement\" title=\"Color\" id=\"streetColor_" + i + "\" value=\"" + preferences.streets[i].strokeColor + "\" type=\"color\"></input>&nbsp&nbsp"));
                $streets.append($("<input class=\"prefElement segmentsWidth\" title=\"Width\" id=\"streetWidth_" + i + "\" value=\"" + preferences.streets[i].strokeWidth + "\" type=\"number\" min=\"3\" max=\"15\"></input>&nbsp&nbsp"));
                $select = createDashStyleDropdown("strokeDashstyle_" + i);
                $select.val(preferences.streets[i].strokeDashstyle);
                $streets.append($select);
                $streets.append("<hr>");
            }
        }

        //Dirty
        $streets.append($("<b>Dirt Roads Flag</b><br>"));
        $streets.append($('<input class="prefElement"  title="Color" id="streetColor_dirty" value="' + preferences.dirty.strokeColor + '" type="color"></input>'));
        $streets.append($('<input class="prefElement" title="Width" id="opacity_dirty" value="' + preferences.dirty.opacity + '" type="range" min="0" max="100" step="10"></input>'));
        $select = createDashStyleDropdown("strokeDashstyle_dirty");
        $select.val(preferences.dirty.strokeDashstyle);
        $streets.append($select);
        $streets.append("<hr>");

        //Red segments
        $streets.append($("<b>Unnamed Segments</b><br>"));
        $streets.append($('<input class="prefElement"  title="Color" id="streetColor_red" value="' + preferences.red.strokeColor + '" type="color"></input>'));
        $streets.append($('<input class="prefElement" title="Width" id="streetWidth_red" value="' + preferences.red.strokeWidth + '" type="number" min="0" max="15"></input>'));
        $select = createDashStyleDropdown("strokeDashstyle_red");
        $select.val(preferences.red.strokeDashstyle);
        $streets.append($select);
        $streets.append("<hr>");

        $elementDiv.append($streets);

        $decorations.append("<summary>Decorations</summary>");
        //Lanes
        $decorations.append($("<b>Lanes</b><br>"));
        $decorations.append($('<input class="prefElement" title="Color" id="streetColor_lanes" value="' + preferences.lanes.strokeColor + '" type="color"></input>'));
        $decorations.append($('<input class="prefElement" title="Width" id="streetWidth_lanes" value="' + preferences.lanes.strokeWidth + '" type="number" min="0" max="15"></input>'));
        $select = createDashStyleDropdown("strokeDashstyle_lanes");
        $select.val(preferences.lanes.strokeDashstyle);
        $decorations.append($select);
        $decorations.append("<hr>");

        //Toll
        $decorations.append($("<b>Toll</b><br>"));
        $decorations.append($('<input class="prefElement" title="Color" id="streetColor_toll" value="' + preferences.toll.strokeColor + '" type="color"></input>'));
        $decorations.append($('<input class="prefElement" title="Width" id="streetWidth_toll" value="' + preferences.toll.strokeWidth + '" type="number" min="0" max="15"></input>'));
        $select = createDashStyleDropdown("strokeDashstyle_toll");
        $select.val(preferences.toll.strokeDashstyle);
        $decorations.append($select);
        $decorations.append("<hr>");

        //Restrictions
        $decorations.append($("<b>Restrictions</b><br>"));
        $decorations.append($('<input class="prefElement" title="Color" id="streetColor_restriction" value="' + preferences.restriction.strokeColor + '" type="color"></input>'));
        $decorations.append($('<input class="prefElement" title="Width" id="streetWidth_restriction" value="' + preferences.restriction.strokeWidth + '" type="number" min="0" max="15"></input>'));
        $select = createDashStyleDropdown("strokeDashstyle_restriction");
        $select.val(preferences.restriction.strokeDashstyle);
        $decorations.append($select);
        $decorations.append("<hr>");

        //Closures
        $decorations.append($("<b>Closures</b><br>"));
        $decorations.append($('<input class="prefElement" title="Color" id="streetColor_closure" value="' + preferences.closure.strokeColor + '" type="color"></input>'));
        $decorations.append($('<input class="prefElement" title="Width" id="streetWidth_closure" value="' + preferences.closure.strokeWidth + '" type="number" min="0" max="15"></input>'));
        $select = createDashStyleDropdown("strokeDashstyle_closure");
        $select.val(preferences.closure.strokeDashstyle);
        $decorations.append($select);
        $decorations.append("<hr>");

        //HeadlightsRequired
        $decorations.append($("<b>Headlights Required</b><br>"));
        $decorations.append($('<input class="prefElement" title="Color" id="streetColor_headlights" value="' + preferences.headlights.strokeColor + '" type="color"></input>'));
        $decorations.append($('<input class="prefElement" title="Width" id="streetWidth_headlights" value="' + preferences.headlights.strokeWidth + '" type="number" min="0" max="15"></input>'));
        $select = createDashStyleDropdown("strokeDashstyle_headlights");
        $select.val(preferences.headlights.strokeDashstyle);
        $decorations.append($select);
        $decorations.append("<hr>");


        $elementDiv.append($decorations);

        //Labels
        $labels.append("<summary>Rendering Parameters</summary>");

        $labels.append($("<b>Use real-life width instead of standard</b>"));
        $labels.append($("<br>"));
        $labels.append($("<i>When enabled, the segments thickness will be computed from the segments width instead of using the value set in the preferences&nbsp;</i>"));
        $labels.append($('<input class="prefElement" title="True or False" id="realsize" type="checkbox" ' + (preferences.realsize ? 'checked' : '') + '></input>'));
        $labels.append("<hr>");

        $labels.append($("<b>Show Alternative Names</b>"));
        $labels.append($("<br>"));
        $labels.append($("<i>When enabled, at most 2 ANs that differ from the primary name are shown under the street name&nbsp;</i>"));
        $labels.append($('<input class="prefElement" title="True or False" id="showANs" type="checkbox" ' + (preferences.showANs ? 'checked' : '') + '></input>'));
        $labels.append("<hr>");

        $labels.append($("<b>Enable Routing Mode</b>"));
        $labels.append($("<br>"));
        $labels.append($("<i>When enabled, roads are rendered by taking into consideration their &quot;routing&quot; attribute. E.g. a &quot;preferred&quot; Minor Highway is shown as a Major Highway.&nbsp;</i>"));
        $labels.append($('<input class="prefElement" title="True or False" id="routingModeEnabled" type="checkbox" ' + (preferences.routingModeEnabled ? 'checked' : '') + '></input>'));
        $labels.append("<hr>");

        $labels.append($("<b>Place the GPS Point Layer above the road layer&nbsp;</b>"));
        $labels.append($('<input class="prefElement" title="True or False" id="showUnderGPSPoints" type="checkbox" ' + (preferences.showUnderGPSPoints ? 'checked' : '') + '></input>'));
        $labels.append("<hr>");

        $labels.append("<b>Automatically refresh the Map</b>");
        $labels.append($("<br><i>Enabled&nbsp;</i>"));

        $labels.append($('<input class="prefElement" title="Enable Auto Reload" id="autoReload_enabled" ' + (preferences.autoReload.enabled ? 'checked' : '') + ' type="checkbox"></input>'));

        $labels.append($("<br><i>Update Interval (in seconds)</i><br>"));
        $labels.append($('<input class="prefElement" title="Auto Reload Time Interval in Seconds" id="autoReload_interval" value="' + preferences.autoReload.interval / 1000 + '" type="number" min="20" max="3600"></input>'));
        $labels.append($("<br><i>Note: it will only work if at that time you did not edit any segment and no elements were selected.</i><br>"));
        $labels.append("<hr>");

        $labels.append("<b>Render map as level</b><br>");
        $labels.append($('<input class="prefElement" title="fakeLock" id="fakeLock" value="' + (WazeWrap && WazeWrap.User ? WazeWrap.User.Rank():2) + '" type="number" min="1" max="7"></input>'));
        $labels.append("<hr>");

        $labels.append($("<b style='color:#6495ED'>Close Zoom</b><br>"));

        $labels.append($("<br><i>Render geometry nodes </i>"));
        $labels.append($('<input class="prefElement" title="True or False" id="renderGeomNodes" type="checkbox" ' + (preferences.renderGeomNodes ? 'checked' : '') + '></input>'));

        $labels.append($("<br><i>Density (the highest, the less)</i><br>"));
        $labels.append($('<input class="prefElement" title="Quantity" id="clutterCostantNearZoom" value="' + preferences.clutterCostantNearZoom + '" type="range" min="10" max="' + clutterMax + '"></input>'));

        $labels.append($("<br><i>Font Size</i><br>"));
        $labels.append($('<input class="prefElement" title="Quantity" id="closeZoomLabelSize" value="' + preferences.closeZoomLabelSize + '" type="range" min="8" max="' + fontSizeMax + '"></input>'));
        $labels.append("<hr>");

        $labels.append($("<b style='color:orange'>Far Zoom</b><br>"));
        $labels.append($("<br><i>Density (the highest, the less)</i><br>"));
        $labels.append($('<input class="prefElement" title="Quantity" id="clutterCostantFarZoom" value="' + preferences.clutterCostantFarZoom + '" type="range" min="10" max="' + clutterMax + '"></input>'));
        $labels.append($("<br><i>Font Size</i><br>"));
        $labels.append($('<input class="prefElement" title="Quantity" id="farZoomLabelSize" value="' + preferences.farZoomLabelSize + '" type="range" min="8" max="' + fontSizeMax + '"></input>'));
        $labels.append("<hr>");

        $labels.append($("<b>Label outline width</b><br>"));
        $labels.append($('<input class="prefElement" title="Quantity" id="labelOutlineWidth" value="' + preferences.labelOutlineWidth + '" type="range" min="0" max="10"></input>'));
        $labels.append("<hr>");

        $labels.append($("<b>Hide minor roads at zoom 3</b>"));
        $labels.append($('<input class="prefElement" title="True or False" id="hideMinorRoads" type="checkbox" ' + (preferences.hideMinorRoads ? 'checked' : '') + '></input>'));
        $labels.append("<hr>");

        //Arrow declutter
        $labels.append($("<b>Arrows (the highest, the less)</b><br>"));
        $labels.append($('<input class="prefElement" title="Quantity" id="arrowDeclutter" value="' + preferences.arrowDeclutter + '" type="range" min="1" max="200"></input>'));
        $labels.append("<hr>");

        $labels.append($("<b>Hide other road layers </b>"));
        $labels.append($('<input class="prefElement" title="True or False" id="disableRoadLayers" type="checkbox" ' + (preferences.disableRoadLayers ? 'checked' : '') + '></input>'));
        $labels.append("<hr>");

        $labels.append($("<b>Layer initially disabled</b>"));
        $labels.append($('<input class="prefElement" title="True or False" id="startdisabled" type="checkbox" ' + (preferences.startDisabled ? 'checked' : '') + '></input>'));
        $labels.append("<hr>");

        $elementDiv.append($labels);

        //Speed limits
        $speedLimits.append("<summary>Speed Limits</summary>");
        $speedLimits.append($("<b>Show text on streetname</b>"));
        $speedLimits.append($('<input class="prefElement" title="True or False" id="showSLtext" type="checkbox" ' + (preferences.showSLtext ? 'checked' : '') + '></input>'));
        $speedLimits.append("<hr>");

        $speedLimits.append($("<b>Show using color scale</b>"));
        $speedLimits.append($('<input class="prefElement" title="True or False" id="showSLcolor" type="checkbox" ' + (preferences.showSLcolor ? 'checked' : '') + ' ></input>'));
        $speedLimits.append("<hr>");
        $speedLimits.append($("<b>Show using single color</b>"));
        $speedLimits.append($('<input class="prefElement" title="Pick a color" id="SLColor" type="color" value="' + preferences.SLColor + '"></input>'));
        $speedLimits.append($('<input class="prefElement" title="True or False" id="showSLSinglecolor" type="checkbox" ' + (preferences.showSLSinglecolor ? 'checked' : '') + '></input>'));
        $speedLimits.append("<hr>");
        $speedLimits.append($("<b>Show unverified limits with a dashed line</b>"));
        $speedLimits.append($('<input class="prefElement" title="True or False" id="showDashedUnverifiedSL" type="checkbox" ' + (preferences.showDashedUnverifiedSL ? 'checked' : '') + '></input>'));
        $speedLimits.append("<hr>");

        $speedLimits.append($("<b>Reference colors</b>"));
        $speedLimits.append("<br/>");
        for (k = W.prefs.attributes.isImperial ? 9 : 15; k > 1; k -= 1) {
            if (W.prefs.attributes.isImperial) {
                $speedLimits.append($('<span style="color:hsl(' + getColorSpeed((k * 10 - 5) * 1.609344) + ',100%,50%)">' + (k * 10 - 5) + ' </span>'));
            } else {
                $speedLimits.append($('<span style="color:hsl(' + getColorSpeed(k * 10) + ',100%,50%)">' + k * 10 + ' </span>'));
            }
        }
        $speedLimits.append("<hr>");
        $elementDiv.append($speedLimits);

        $mainDiv.append($elementDiv);
        $mainDiv.append($('<div class="panel-footer" style="margin-top:2px"><button id="exportPreferences" class="btn btn-default">Export</button> <button id="importPreferences" class="btn btn-default">Import</button><div>'));
        $("body").append($style);
        $("body").append($mainDiv);
        $(".prefElement").change(updatePref);
        $("#close").click(closePrefPanel);
        $("#saveNewPref").click(saveNewPref);
        $("#updatePref").click(updatePref);
        $("#exportPreferences").click(exportPreferences);
        $("#importPreferences").click(importPreferences);
        $("#rollbackPreferences").click(rollbackPreferences);
        $("#rollbackDefault").click(rollbackDefault);

        if(preferences.realsize){
        //Disable all width inputs.
            $('input.segmentsWidth').prop( "disabled", true );
        }
        //new WazeWrap.Interface.Tab('SVL', $mainDiv, null);
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

    function changeNodes(e){
        //console.debug("Change nodes");
        if(farZoom){
            console.warn("SVL: This event should not happen in far zoom");
            return;
        }
        for(let i=0; i< e.length; i++){
            let node = e[i].attributes;
            let nodeFeature = nodesVector.getFeaturesByAttribute("myid", node.id)[0];
            if(nodeFeature)
            {
                nodeFeature.move(new OpenLayers.LonLat(node.geometry.x, node.geometry.y));
            }else if(node.id>0){
                //The node has just been saved
                nodesVector.addFeatures(Array.of(drawNode(e[i])));
            }//Else it is a temporary node, we won't draw it.
        }
    }

    function nodeStateDeleted(e){
        //console.debug("Node state deleted");
    }

    function segmentsStateDeleted(e){
        for(let i=0; i<e.length; i++){
            let s = e[i].attributes;
            removeSegmentById(s.id);
        }
    }

    function addNodes(e) {
        //console.debug("Add Nodes");
        let myFeatures, i;
        if (farZoom) {
            console.warn("SVL: This event should not happen in far zoom");
            return;
        }
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
                if(e[i].attributes.id>0) {
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

    function checkZoomLayer() {
        const zoom = Wmap.getZoom();
        let zoomChanged;
        //doDraw();
        //consoleDebug("Zoom: " + zoom);
        //Decide the SVL layer status
        if (preferences.disableRoadLayers && zoom > 1 && vectorAutomDisabled) {
            roadLayer.setVisibility(false);
            $("#layer-switcher-item_street_vector_layer").prop("checked", false);
        }
        if (zoom > 1) {
            // SVL is used from this zoom on (until 10, the closest zoom possible atm)
            if (streetVector.visibility === false && vectorAutomDisabled) {
                vectorAutomDisabled = false;
                //consoleDebug("Setting vector visibility to true");
                doDraw();
                streetVector.setVisibility(true);
                $("#layer-switcher-item_street_vector_layer").prop("checked", true);
                $("#layer-switcher-item_road").prop("checked", false);
                //streetVector.display(true)
            }
            else if(streetVector.visibility === false && !vectorAutomDisabled)
            {
                //The user disabled the layer, don't do anything else.
                return;
            }
        }
        let $zoomDiv = $("#zoomStyleDiv");
        if (zoom >= farZoomThreshold) {
            //Close zoom
            clutterConstant = preferences.clutterCostantNearZoom;
            labelFontSize = preferences.closeZoomLabelSize + "px";
            if (farZoom) { //Switched from far to close zoom
                farZoom = false;
                thresholdDistance = getThreshold();
                registerNodeEvents();
                if ($zoomDiv.length === 1) {
                    $zoomDiv.removeClass("farZoom");
                    $zoomDiv.addClass("closeZoom");
                    $zoomDiv.text("You are currently in CLOSE-zoom mode");
                }
            }
            doDraw();
        } else {
            //Far zoom
            zoomChanged = !farZoom;
            farZoom = true;
            clutterConstant = preferences.clutterCostantFarZoom;
            labelFontSize = preferences.farZoomLabelSize + "px";
            thresholdDistance = getThreshold();
            if (zoomChanged) {
                removeNodeEvents();
                if ($zoomDiv.length === 1) {
                    $zoomDiv.removeClass("closeZoom");
                    $zoomDiv.addClass("farZoom");
                    $zoomDiv.text("You are currently in FAR-zoom mode");
                }
                nodesVector.destroyFeatures();
                doDraw();
            }
            if (zoom < 2) { //There is nothing to draw, enable road layer
                //consoleDebug("Road layer automatically enabled because of zoom out");
                //consoleDebug("Vector visibility: ", streetVector.visibility);
                if (streetVector.getVisibility() === true) {
                    //consoleDebug("Setting vector visibility to false");
                    streetVector.setVisibility(false);
                    $("#layer-switcher-item_street_vector_layer").prop("checked", false);
                    $("#layer-switcher-item_road").prop("checked", true);
                    vectorAutomDisabled = true;
                    roadLayer.setVisibility(true);
                }
            }
        }
    }

    function registerSegmentsEvents(){
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

    function removeSegmentsEvents(){
        //console.debug("SVL: Removing segment events");
        const events = W.model.segments._events;
        events.objectsadded = events.objectsadded.filter(removeSVLEvents);
        events.objectschanged = events.objectschanged.filter(removeSVLEvents);
        events.objectsremoved = events.objectsremoved.filter(removeSVLEvents);
        events['objects-state-deleted'] = events['objects-state-deleted'].filter(removeSVLEvents);
    }

    function removeNodeEvents(){
        //console.debug("SVL: Removing node events");
        const events = W.model.nodes._events;
        events.objectsremoved = events.objectsremoved.filter(removeSVLEvents);
        events.objectsadded = events.objectsadded.filter(removeSVLEvents);
        events.objectschanged = events.objectschanged.filter(removeSVLEvents);
        events["objects-state-deleted"] = events["objects-state-deleted"].filter(removeSVLEvents);
    }
    function registerNodeEvents(){
        //console.debug("SVL: Registering node events");
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

    function addSegments(e) {
        //console.debug("Add Segments");
        let i, j, features, myFeatures;
        //console.log("Segments added to model");
        //console.log("Size: " + e.length);
        //e = e.filter(function(value) {return value != undefined;})
        //consoleDebug(e);
        e.sort(function (a, b) {
            return (a.attributes.level - b.attributes.level);
        });
        myFeatures = [];
        //console.log("Size: " + e.length);
        for (i = 0; i < e.length; i += 1) {
            if (e[i] !== null) {
                features = drawSegment(e[i]);
                myFeatures.push(...features);
                //for (j = 0; j < features.length; j += 1) {
                    //if (features[j] !== undefined) { //T0D0 find out what makes it undefined
                        //myFeatures.push(features[j]);
                    //} else {
                    //    console.warn("SVL, feature was undefined.", j, features.length);
                    //}
                //}
            }
        }
        streetVector.addFeatures(myFeatures);
    }

    function removeSegmentById(id) {
        //consoleDebug("RemoveById", id, typeof (id));
        streetVector.destroyFeatures(streetVector.getFeaturesByAttribute("myId", id));
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

    function manageNodes(e) {
        //Toggle node layer visibility accordingly
        //consoleDebug("Manage nodes", e);
        nodesVector.setVisibility(e.object.visibility);
        if (e.object.visibility) {
            //consoleDebug("Registering events");
            registerSegmentsEvents();
            if(!farZoom) {
                registerNodeEvents();
            }
            //checkZoomLayer();
            doDraw();
        } else {
            //consoleDebug("Unregistering events");
            removeSegmentsEvents();
            removeNodeEvents();

            nodesVector.destroyFeatures();
            streetVector.destroyFeatures();
        }
    }

    function initWazeWrap(trial = 1) {
        if(trial > 30){
            console.error("SVL: could not initialize WazeWrap");
            return;
        }

        if(!WazeWarp || !WazeWrap.Ready || WazeWrap.Interface === undefined){
            console.log("SVL: WazeWrap not ready, retrying in 800ms");
            setTimeout(()=>{initWazeWrap(++trial);}, 800);
            return;
        }
        initWazeWrapElements();
    }

    function initWazeWrapElements(){
        console.log("SVL: initializing WazeWrap");
        //Adding keyboard shortcut
        try{
        new WazeWrap.Interface.Shortcut('SVLToggleLayer', 'Toggle SVL', 'svl', 'Street Vector Layer', "A+l", function () {
                streetVector.setVisibility(!streetVector.visibility);
                $("#layer-switcher-item_street_vector_layer").prop("checked", streetVector.visibility);
            }, null).add();
            console.log("Keyboard shortcut successfully added.");
        }
        catch (e) {
            console.error("Error while adding the keyboard shortcut:");
            console.error(e);
        }

        //Add the layer checkbox
        try{
            WazeWrap.Interface.AddLayerCheckbox("road", "Street Vector Layer", true, (checked)=>{streetVector.setVisibility(checked);}, streetVector);
        }catch(e){
            console.error("SVL: could not add layer checkbox");
        }
        WazeWrap.Interface.ShowScriptUpdate("Street Vector Layer", svlVersion, "Added an option to render the streets based on their width.");
    }

    function initSVL(svlAttempts = 0) {
        //Initialize variables
        let i, labelStyleMap, layerName, len, layers;
        try {
            svlWazeBits();
        } catch (e) {
            svlAttempts += 1;
            if (svlAttempts < 20) {
                console.warn(e);
                console.warn("Could not initialize SVL correctly. Maybe the Waze model was not ready. Retrying in 500ms...");
                setTimeout(()=>{initSVL(++svlAttempts);}, 500);
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
                "You can change the streets color, thickness and style by clicking on the attribution bar at the bottom of the editor.\n" +
                "Your preferences will be saved for the next time in your browser.\n" +
                "The other road layers will be automatically hidden (you can change this behaviour in the preference panel).\n" +
                "Have fun and tell us on the Waze forum if you liked the script!");
        } else {
            if(!preferences.lanes){
                preferences.lanes = {
                    strokeColor: "#454443",
                    strokeWidth: 3,
                    strokeDashstyle: "dash",
                    pointerEvents: "none"
                };
            }
            //console.dir(preferences);
            if (!preferences.autoReload) {
                preferences.autoReload = {};
                preferences.autoReload.interval = 60000;
                preferences.autoReload.enabled = true;
                savePreferences(preferences);
            }
            if (!preferences.headlights) {
                preferences.headlights = {
                    strokeColor: "#bfff00",
                    strokeWidth: 3,
                    strokeDashstyle: "dot",
                    pointerEvents: "none"
                };

                savePreferences(preferences);
                alert("Street Vector Layer (SVL) has been updated to version " + svlVersion + "\n" +
                    "\nNEW:\n" +
                    "Headlights required (yellow long dashed by default, it can be changed)\n" +
                    "\nAuto Refresh: if you didn't edit anything and nothing is selected SVL refreshes the view every 60 seconds (the interval can be changed in the preference panel from 15 seconds to 1h, or completely disabled):\n");
            }
            if (preferences.dirty === undefined || preferences.SLColor === undefined || preferences.showSLcolor === undefined || preferences.showSLtext === undefined || preferences.clutterCostantNearZoom === undefined || preferences.labelOutlineWidth === undefined || preferences.disableRoadLayers === undefined || preferences.startDisabled === undefined) {
                preferences.dirty = preferences.dirty || {
                    strokeColor: "#82614A",
                    opacity: 60,
                    strokeDashstyle: "longdash",
                    pointerEvents: "none"
                };
                preferences.SLColor = preferences.SLColor || "#ffdf00";
                preferences.showSLcolor = preferences.showSLcolor || true;
                preferences.showSLtext = preferences.showSLtext || true;
                preferences.startDisabled = preferences.startDisabled || false;
                preferences.labelOutlineWidth = preferences.labelOutlineWidth || "3";
                preferences.disableRoadLayers = preferences.disableRoadLayers || true;
                preferences.clutterCostantNearZoom = preferences.clutterCostantNearZoom || 350; //float value, the highest the less label will be generated. Zoom >=5
                preferences.clutterCostantFarZoom = preferences.clutterCostantFarZoom || 410; //float value, the highest the less label will be generated. Zoom <5
                prompt("!!! IMPORTANT !!!\nStreet Vector layer got updated to the version " + svlVersion + " and needs to update your saved preferences in order to keep working.\nA backup of your previous settings has been copied to your clipboard.\nImport it later if you have made any change that you\'d like to keep (Open the preference panel, click on import down below and press CTRL+V to paste your current preferences).");
                /*jslint newcap: true */
                GM_setClipboard(JSON.stringify(preferences));
                /*jslint newcap: false */
                saveDefaultPreferences();
            }
            if (preferences.routingModeEnabled === undefined || preferences.showUnderGPSPoints === undefined) {
                preferences.routingModeEnabled = preferences.routingModeEnabled || false;
                preferences.showUnderGPSPoints = preferences.showUnderGPSPoints || false;
                savePreferences(preferences);
                alert("Street Vector Layer has been updated to v. " + svlVersion + ".\nIt is now possible to place the GPS points above the road layer and to enter the routing mode.\nMore information on the Waze forum and in the preference panel.");
            }
            if(preferences.streets[22] === undefined){
                preferences.streets[22]={
                    strokeColor: "#C6C7FF",
                    strokeWidth: "4",
                    strokeDashstyle: "solid",
                    pointerEvents: "none"
                };
                savePreferences(preferences);
                console.log("Street Vector Layer has been updated to v. " + svlVersion + ".\n");
            }
        }

        clutterConstant = farZoom ? preferences.clutterCostantFarZoom : preferences.clutterCostantNearZoom;
        thresholdDistance = getThreshold();
        if (preferences.farZoomLabelSize === undefined || preferences.closeZoomLabelSize === undefined || preferences.labelOutlineWidth === undefined) {
            preferences.labelOutlineWidth = 3;
            preferences.farZoomLabelSize = 11;
            preferences.closeZoomLabelSize = 11;
        }
        labelFontSize = (farZoom ? preferences.farZoomLabelSize : preferences.closeZoomLabelSize) + "px";
        labelOutlineWidth = preferences.labelOutlineWidth + "px";


        try{
            $(".olControlAttribution").click(editPreferences);
            $(".olControlScaleLineTop").click(editPreferences);
            $(".olControlScaleLineBottom").click(editPreferences);
        }catch(e){
            console.warn("SVL: could not set click event");
        }
        labelStyleMap = new OpenLayers.StyleMap({
            fontFamily: "Rubik, Open Sans, Alef, helvetica, sans-serif, monospace",
            fontWeight: "800",
            fontColor: "${color}",
            labelOutlineColor: "${outlinecolor}",
            fontSize: "${fsize}",
            labelXOffset: 0,
            labelYOffset: 0, //(attributes.id%2==0?1:-2.6)*7,
            // fontColor: streetStyle[attributes.roadType]?streetStyle[attributes.roadType].strokeColor:"#f00",
            //labelOutlineColor:  streetStyle[attributes.roadType]?streetStyle[attributes.roadType].outlineColor:"#fff",
            labelOutlineWidth: "${outlinewidth}",
            label: "${label}",
            //label: directionArrow + " " + streetPart+ " " + directionArrow+ " " +speedPart,
            angle: "${angle}",
            //angle: degrees,
            labelAlign: "cm" //set to center middle
        });
        layerName = "Street Vector Layer";

        streetVector = new OpenLayers.Layer.Vector(layerName, {
            styleMap: labelStyleMap,
            uniqueName: "vectorStreet",
            draggable: true,
            //shortcutKey:"A+l",
            displayInLayerSwitcher: true,
            accelerator: "toggle" + layerName.replace(/\s+/g, ''),
            visibility: true,
            isBaseLayer: false,
            isVector: true,
            sphericalMercator: true,
            attribution: "Street Vector Layer",
            rendererOptions: {
                zOrdering: true
            }
        });

        streetVector.renderer.drawText = function (e, t, i) {
            var n, s, r, layer, feature, rotate, h, c, p, g, f, o, a, l, u, d;
            n = !!t.labelOutlineWidth;
            if (n) {
                s = OpenLayers.Util.extend({}, t);
                s.fontColor = s.labelOutlineColor;
                s.fontStrokeColor = s.labelOutlineColor;
                s.fontStrokeWidth = t.labelOutlineWidth;
                delete s.labelOutlineWidth;
                this.drawText(e, s, i);
            }
            r = this.getResolution();
            layer = this.map.getLayer(this.container.id);
            feature = layer.getFeatureById(e);
            i = feature.attributes.centroid || i;
            o = (i.x - this.featureDx) / r + this.left;
            a = i.y / r - this.top;
            l = n ? this.LABEL_OUTLINE_SUFFIX : this.LABEL_ID_SUFFIX;
            u = this.nodeFactory(e + l, "text");
            u.setAttributeNS(null, "x", o);
            u.setAttributeNS(null, "y", -a);
            if (t.angle || t.angle === 0) {
                rotate = 'rotate(' + t.angle + ',' + o + "," + -a + ')';
                u.setAttributeNS(null, "transform", rotate);
            }
            if (t.fontColor) {
                u.setAttributeNS(null, "fill", t.fontColor);
            }
            if (t.fontStrokeColor) {
                u.setAttributeNS(null, "stroke", t.fontStrokeColor);
            }
            if (t.fontStrokeWidth) {
                u.setAttributeNS(null, "stroke-width", t.fontStrokeWidth);
            }
            if (t.fontOpacity) {
                u.setAttributeNS(null, "opacity", t.fontOpacity);
            }
            if (t.fontFamily) {
                u.setAttributeNS(null, "font-family", t.fontFamily);
            }
            if (t.fontSize) {
                u.setAttributeNS(null, "font-size", t.fontSize);
            }
            if (t.fontWeight) {
                u.setAttributeNS(null, "font-weight", t.fontWeight);
            }
            if (t.fontStyle) {
                u.setAttributeNS(null, "font-style", t.fontStyle);
            }
            if (t.labelSelect === true) {
                u.setAttributeNS(null, "pointer-events", "visible");
                u._featureId = e;
            } else {
                u.setAttributeNS(null, "pointer-events", "none");
            }
            h = t.labelAlign || OpenLayers.Renderer.defaultSymbolizer.labelAlign;
            u.setAttributeNS(null, "text-anchor", OpenLayers.Renderer.SVG.LABEL_ALIGN[h[0]] || "middle");
            if (OpenLayers.IS_GECKO === true) {
                u.setAttributeNS(null, "dominant-baseline", OpenLayers.Renderer.SVG.LABEL_ALIGN[h[1]] || "central");
            }
            c = t.label.split("\n");
            d = c.length;
            while (u.childNodes.length > d) {
                u.removeChild(u.lastChild);
            }
            for (p = 0; d > p; p += 1) {
                g = this.nodeFactory(e + l + "_tspan_" + p, "tspan");
                if (t.labelSelect === true) {
                    g._featureId = e;
                    g._geometry = i;
                    g._geometryClass = i.CLASS_NAME;
                }
                if (OpenLayers.IS_GECKO === false) {
                    g.setAttributeNS(null, "baseline-shift", OpenLayers.Renderer.SVG.LABEL_VSHIFT[h[1]] || "-35%");
                }
                g.setAttribute("x", o);
                if (0 === p) {
                    f = OpenLayers.Renderer.SVG.LABEL_VFACTOR[h[1]];
                    if (f === undefined) {
                        f = -0.5;
                    }
                    g.setAttribute("dy", f * (d - 1) + "em");
                } else {
                    g.setAttribute("dy", "1em");
                }
                g.textContent = "" === c[p] ? " " : c[p];
                if (!g.parentNode) {
                    u.appendChild(g);
                }
            }
            if (!u.parentNode) {
                this.textRoot.appendChild(u);
            }
        };

        nodesVector = new OpenLayers.Layer.Vector("Nodes Vector", {
            uniqueName: "vectorNodes",
            //shortcutKey: "A+n",
            draggable: true,
            visibility: true,
            displayInLayerSwitcher: false,
            isBaseLayer: false,
            sphericalMercator: true
        });

        //Street types
        for (i = 0, len = preferences.streets.length; i < len; i += 1) {

            if (preferences.streets[i]) {
                streetStyle[i] = {
                    strokeColor: preferences.streets[i].strokeColor,
                    strokeWidth: preferences.streets[i].strokeWidth,
                    strokeDashstyle: preferences.streets[i].strokeDashstyle,
                    outlineColor: bestBackground(preferences.streets[i].strokeColor),
                    pointerEvents: "none"
                };
            }
        }
        roundaboutStyle = {
            strokeColor: preferences.roundabout.strokeColor,
            strokeWidth: preferences.roundabout.strokeWidth,
            strokeDashstyle: preferences.roundabout.strokeDashstyle,
            strokeOpacity: 0.9,
            pointerEvents: "none"
        };
        laneStyle = {
            strokeColor: preferences.lanes.strokeColor,
            strokeWidth: preferences.lanes.strokeWidth,
            strokeDashstyle: preferences.lanes.strokeDashstyle,
            strokeOpacity: 0.9,
            pointerEvents: "none"
        };
        tollStyle = {
            strokeColor: preferences.toll.strokeColor,
            strokeWidth: preferences.toll.strokeWidth,
            strokeDashstyle: preferences.toll.strokeDashstyle,
            strokeOpacity: 0.9,
            pointerEvents: "none"
        };
        closureStyle = {
            strokeColor: preferences.closure.strokeColor,
            strokeWidth: preferences.closure.strokeWidth,
            strokeDashstyle: preferences.closure.strokeDashstyle,
            pointerEvents: "none"
        };

        headlightsFlagStyle = {
            strokeColor: preferences.headlights.strokeColor,
            strokeWidth: preferences.headlights.strokeWidth,
            strokeDashstyle: preferences.headlights.strokeDashstyle,
            pointerEvents: "none"
        };

        validatedStyle = {
            strokeColor: "#F53BFF",
            strokeWidth: 3,
            strokeDashstyle: "solid",
            pointerEvents: "none"
        };
        restrStyle = {
            strokeColor: preferences.restriction.strokeColor,
            strokeWidth: preferences.restriction.strokeWidth,
            strokeDashstyle: preferences.restriction.strokeDashstyle,
            pointerEvents: "none"
        };
        redStyle = {
            strokeColor: preferences.red.strokeColor,
            strokeWidth: preferences.red.strokeWidth,
            strokeDashstyle: preferences.red.strokeDashstyle,
            pointerEvents: "none"
        };

        nodeStyle = {
            stroke: false,
            fillColor: "#0015FF",
            fillOpacity: 0.7,
            pointRadius: 4.0,
            pointerEvents: "none"
        };
        unknownDirStyle = {
            graphicName: "x",
            strokeColor: "#f00",
            strokeWidth: 1.5,
            fillColor: "#FFFF40",
            fillOpacity: 0.7,
            pointRadius: 7,
            pointerEvents: "none"
        };

        geometryNodeStyle = {
            stroke: false,
            fillColor: "#000",
            fillOpacity: 0.5,
            pointRadius: 3.3,
            pointerEvents: "none"
        };

        //clutterCostantNearZoom = preferences.clutterCostantNearZoom || 350.0; //float value, the highest the less label will be generated. Zoom >=5
        //clutterCostantFarZoom = preferences.clutterCostantFarZoom || 410.0; //float value, the highest the less label will be generated. Zoom <5
        arrowDeclutter = preferences.arrowDeclutter || 25;

        //var segmentLayer = Wmap.getLayersByName("Segments");

        Wmap.addLayer(streetVector);
        Wmap.addLayer(nodesVector);
        /*if(!Wmap.raiseLayer){
            Wmap.raiseLayer = function(){
                console.warn("SVL Info: W.map.raiseLayer has been removed!");
            }
        }*/
        //streetVector.setZIndex(streetVector.getZIndex() - 2);
        //nodesVector.setZIndex(streetVector.getZIndex() + 1);
        //Wmap.raiseLayer(streetVector, -2);
        //Wmap.raiseLayer(nodesVector, -1);

        streetVector.events.register("visibilitychanged", streetVector, manageNodes);
        manageNodes({
            object: streetVector
        });

        layers = Wmap.getLayersBy("uniqueName", "roads");
        roadLayer = null;
        if (layers.length === 1) {
            roadLayer = layers[0];
            if (Wmap.getZoom() <= 1) {
                roadLayer.setVisibility(true);
            } else if (roadLayer.getVisibility() && preferences.disableRoadLayers) {
                roadLayer.setVisibility(false);
                console.log("Roads layers were disabled by Street Vector Layer. You can change this behaviour in the preference panel.");
            }
        }
        vectorAutomDisabled = false;

        Wmap.events.register("zoomend", null, checkZoomLayer);

        if (preferences.startDisabled) {
            streetVector.setVisibility(false);
            $("#layer-switcher-item_street_vector_layer").prop("checked", false);
        }

        if (preferences.showUnderGPSPoints) { //By default, WME places the GPS points under the layer, no need to move it.
            updateLayerPosition();
        }

        updateRoutingModePanel();
        updateRefreshStatus();

        initWazeWrap();

        console.log("Street Vector Layer v. " + svlVersion + " initialized correctly.");
    }

    /*
function getRestrictions(r)
    {
        if (r==null || r.length==0)
            return "";
        var res = "";
     for (var i=0; i<r.length; r++)
     {
         if (!r[i].isAllDay())
         {
             res+="📆";
         }
         if (r[i].isPermanent()) {
             if (r[i].includesVehicleType(11))
                 return res+ "🚫";
             if (r[i].includesVehicleType(0))
                 res+= " 🚚";
             if (r[i].includesVehicleType(2))
                 res+= " 🚖";
             if (r[i].includesVehicleType(9))
                 res+= " 🚗";
             if (r[i].includesVehicleType(1))
                 res+= " 🚍";
             if (r[i].includesVehicleType(1))
                 res+= " 🚌";
         }
     }
        if (res=="") {
            console.warn("SVL: Unsupported restriction type");
            //console.debug(r);
        }
        return res;
    }
    */

    function bootstrapSVL(trials = 0) {
        // Check all requisites for the script
        if (W === undefined || W.map === undefined) {
            console.log("SVL not ready to start, retrying in 600ms");
            trials += 1;
            if (trials < 20) {
                setTimeout(()=>{bootstrapSVL(++trials);}, 600);
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
