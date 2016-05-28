# osd-spot-viewer

License: The MIT License.

Demonstrating how to use [OpenSeadragon](http://openseadragon.github.io/) to create a viewer for
displaying colored circles on top of a high resolution photo. The photo tiles and the circle colors
are retrieved from a single data file.

Three different software designs have been tried out:

1. Painting the circles with https://github.com/eriksjolund/OpenSeadragonPaperjsOverlay. (javascript running in web browser)
2. Painting the circles on top the tiles as they are retrieved. (javascript running in web browser)
3. Painting the circles on top the tiles as they are retrieved. (multi-threaded desktop application made with [nw.js](http://nwjs.io/) + [node.js](https://nodejs.org/))


Currently the git repo contains code for design nr 2. There is also an online demo to make the circles draggable with the mouse. That demo is an example of design nr 1 but instead of fetching the image tiles from a single file it uses the normal DZI file format.



## Drag the circles (spots) with the mouse.

The circles can be selected with a mouse lasso (press the CTRL-key) and then dragged
with the mouse.

Demo:
http://eriksjolund.github.io/osd-spot-viewer/adjust_spots.html

(The circles are connected by grid lines in the example):
