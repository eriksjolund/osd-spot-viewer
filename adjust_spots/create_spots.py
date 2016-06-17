#!/usr/bin/python
"""This script creates an example JSON file for adjust_spots.html

The script creates an example JSON file to be used as input for
http://eriksjolund.github.io/osd-spot-viewer/adjust_spots/adjust_spots.html

The script can produce example JSON files having different number of spots.
That is useful when we want to see the performance characteristics of
adjust_spots.html. In other words:
How is the speed of the web page influenced by the number 
of spots?

"""

import sys
import json
import math

import argparse
parser = argparse.ArgumentParser()

# http://openseadragon.github.io/example-images/highsmith/highsmith.dzi
# has the image size : height=9221 width="7026.
# We use those values as the default image size.

parser.add_argument("-w", "--image-width",  type=int, help="width of image (pixels)", default=7026)
parser.add_argument("-t", "--image-height", type=int, help="height of image (pixels)", default=9221)
parser.add_argument("numspots", type=int, help="number of spots")
parser.add_argument("output", help="filepath where to save the resulting json")

args = parser.parse_args()

filepath = args.output
number_of_spots = args.numspots

data = {}
spots = []

number_of_spots_x_axis = int(math.sqrt(number_of_spots * args.image_width / args.image_height))
number_of_spots_y_axis = int(math.sqrt(number_of_spots * args.image_height / args.image_width))

# Note that we do not get exactly the specified number of spots, but
# number_of_spots_x_axis * number_of_spots_y_axis should be a good estimate for
# args.numspots

number_of_pixels = args.image_width * args.image_height
pixels_per_spot = number_of_pixels / number_of_spots

# circle_coverage is just a factor to describe how big the circle radius are
# The value can be set arbitrarily.

circle_coverage = 0.2
radius = circle_coverage * args.image_width / number_of_spots_x_axis
for x in range(number_of_spots_x_axis):
   for y in range(number_of_spots_y_axis):
       spot = {}
       spot['grid_x'] = x
       spot['grid_y'] = y
       spot['pixel_x'] = int(args.image_width / number_of_spots_x_axis * (x + 0.5))
       spot['pixel_y'] = int(args.image_height / number_of_spots_y_axis * (y + 0.5))
       spot['radius'] = radius
       spots.append(spot)

data['spots'] = spots

json_serialized = json.dumps(data, indent=4, sort_keys=True)
    
with open(filepath, 'w') as file:
    file.write(json_serialized)
            
                
        
        
