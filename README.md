# osd-spot-viewer

License: The MIT License.

Demonstrating how to use [OpenSeadragon](http://openseadragon.github.io/) to create a viewer for
displaying colored circles on top of a high resolution photo. The photo tiles and the circle colors
are retrieved from a single data file.

The problem can be solved by at least four different software designs:

1. Painting the circles with https://github.com/eriksjolund/OpenSeadragonPaperjsOverlay. (javascript running in web browser)
2. Painting the circles on top of the image tiles as they are retrieved. (javascript running in web browser)
3. Like 2 but painting the circles inside Web Workers
4. Painting the circles on top of the image tiles as they are retrieved. (multi-threaded desktop application made with [nw.js](http://nwjs.io/) + [node.js](https://nodejs.org/) + [Nan::AsyncWorker](https://github.com/nodejs/nan/blob/master/doc/asyncworker.md#api_nan_async_worker) + [cairo](https://www.cairographics.org/))

The design approaches 1,2 and 4 have been tried out, but not design nr 3.
Currently the git repo contains code for design nr 1 and nr 2 but code for design nr 4 has not yet been included.

# Demos
## Viewing gene expression
An example of software design nr 2. 
http://eriksjolund.github.io/osd-spot-viewer/from_layout/index.html

A json file defines what genes and what experiments should be displayed. 


    { "layoutimages" : [
        { "datafile" : "file.st_exp_protobuf",
          "rendering" : { "type" : "fromgene",  "gene_name" : "Sbds" },
          "x" : 1,
          "y" : 1
        } ,
        { "datafile" : "file.st_exp_protobuf",
          "rendering" : { "type" : "fromgene",  "gene_name" : "Tbc1d9b" },
          "x" : 2,
          "y" : 1
        },
        { "datafile" : "file.st_exp_protobuf",
          "rendering" : { "type" : "fromgene",  "gene_name" : "Vstm2l" },
          "x" : 1,
          "y" : 2
        },
        { "datafile" : "file.st_exp_protobuf",
          "rendering" : { "type" : "fromgene",  "gene_name" : "Ndufaf4" },
          "x" : 2,
          "y" : 2
        }
    ]}

Unfortunately, no experiment data files are available as of today, so there is currently no way to see how the demo works.

## Draggable circles
This demo is an example of software design nr 1 but instead of fetching the image tiles from a single file it uses the normal DZI file format.

http://eriksjolund.github.io/osd-spot-viewer/adjust_spots.html

The circles can be selected with a mouse lasso (press the CTRL-key) and then dragged
with the mouse.

(The circles are connected by grid lines in the example):
