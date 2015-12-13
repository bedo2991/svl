Street Vector Layer (SVL)
The Road layer for the Waze editors, made by editors.

Current Waze road layer is generated on a Waze server and is just downloaded on the user's client.
This work allows to generate a vector layer based on the Waze model. The layer is generated on the client side and therefore is fully customizable.

Pros:
* It's possible to customize it (color of the road, size of the road, ...)
* It keeps working if the tile server is down
* Saves bandwidth (I guess not much, but better than nothing).
* What you see is what you can edit. When the elements are loaded they are drawn. No more clicking on segments that can't be selected.
* You don't have to save to see the edit, segments are redrawn when you move/delete them (less confusion when deleting/moving segments).
* Tries to take the good things of the old and new layers and puts them together (mostly old colors for street, primary and highways and new colors for non-drivable/dirty/parking lot streets, plus restrictions and toll).
* Extra decorations for features which are not rendered on the standard layer.

Cons (so far):  :( 
* Makes your CPU work a little bit more
* Street names might overlap.

This code was not created, supervised or approved by Waze. Use it at your own risk.

No Warranty: The Software is provided "as is" without warranty of any kind, either express or implied, including without limitation any implied warranties of condition, uninterrupted use, merchantability, fitness for a particular purpose, or non-infringement.

LICENCE
SVL, originally by Francesco Bedini, is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
http://creativecommons.org/licenses/by-nc-sa/4.0/
See the full list of authors on github: https://github.com/bedo2991/svl
