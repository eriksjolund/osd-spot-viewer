# adjust_spots.html

## About the current software design

Right now the paper.Path.Circle objects from [Paper.js](http://paperjs.org/) are "misused" to also
store references to the spot data (that can later be serialized to the result JSON file).

```
        var circle = new paper.Path.Circle(new paper.Point(spot.pixel_x, spot.pixel_y), spot.radius);
        circle.neighbours = [];
        circle.fillColor = 'red';
        circle.visible = true;
        circle.spot_is_selected = false;
        circle.spot = spot;
```

This makes it easy to implement the dragging of the circles. For moving the actual circles on the canvas
something like this http://paperjs.org/examples/hit-testing/ is being done. The circle.spot is used
as a reference into the spot data (the data model) so that it can get updated when the position of a circle has
changed.

Future plans: Probably a clearer GUI and Data Model separation should be implemented that also could be
reused in the [from_layout viewer](https://github.com/eriksjolund/osd-spot-viewer/tree/master/from_layout).

One way to implement a clear GUI/data-model separation is to use [React](http://facebook.github.io/react/) and [Redux](https://github.com/reactjs/redux). That seems to be the most popular way nowadays. For more details see: https://github.com/openseadragon/openseadragon/issues/942