// The MIT License (MIT)
//
// Copyright (C) 2015 osd-spot-viewer contributors
// Copyright (C) 2016 Karolinska institutet
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// 
function add_layout_image(osd_viewer, overlay, layoutimage_datafile, title,
			  x_coord, y_coord,  image_info, layout_index,
			  tiled_images_index) {
    const tile_conversion_index = 0; // TODO: this should be configurable
    // somehow. The exeperiment might include more than one tile_conversion
    const image_index = 0;
    const arbitrary_estetic_adjustment = 1.1;
    osd_viewer.addTiledImage(
        {
            tileSource: {
                height: image_info.height,
                width: image_info.width,
                tileSize: image_info.tileSize,
                tileOverlap: image_info.tileOverlap,
                getTileUrl: function (datafile, level, x, y) {
                    return [image_index, tile_conversion_index, layout_index,
			    tiled_images_index, level, x, y].join("/");
                }.bind(null, layoutimage_datafile)
            },
            x: x_coord * arbitrary_estetic_adjustment,
            y: y_coord * arbitrary_estetic_adjustment,
            width: 1,
            index: 0
        }
    );
    const d3Rect = d3.select(overlay.node()).
          append("text")
          .attr("height", 0.1)
          .attr("x", x_coord * arbitrary_estetic_adjustment + 0.5)
          .attr("y", y_coord * arbitrary_estetic_adjustment + 1)
          .style("font-size","0.05px")
          .style("text-anchor", "middle")
          .text(title);
}

export default class {
    constructor(layout_json, data_files, layout_index, layout_renderers) {
	this.layout_renderers = layout_renderers;
	this.tiled_images = [];
        this.layout_json = layout_json;
	// The layout_index is just a temporary workaround for
	// https://github.com/eriksjolund/openseadragon/commit/d7bacf38a27851532f4dfe2815a933b86e56314b
	// We should improve OpenSeadragon instead so that we would not have to deal with
	// passing information over the getTileUrl().
	// (https://openseadragon.github.io/examples/tilesource-custom/)
	// Instead OpenSeadragon should be able to coup with something like getImage()
	// (or maybe a getCanvas())
	this.layout_index = layout_index;
	this.data_files = data_files;
        const osd_windows = document.getElementById('osd_windows');
        const layout_tab_div = document.createElement("div");
        osd_windows.appendChild(layout_tab_div);
        const number_string = osd_windows.children.length.toString();
        const osd_id_string = "osd-" + number_string;
        const json_id_string = "json-" + number_string;
        const osd_alink_id_string = "osd-alink-" + number_string;
        const json_text = JSON.stringify(this.layout_json,null, 2);
        layout_tab_div.innerHTML = `
            <div class="panel panel-default">
            <div class="panel-heading">
            <h3 class="panel-title">
	    Layout
  	</h3>
            </div>
            <div class="panel-body">
            <div class="container">
            <ul class="nav nav-tabs">
            <li class="active">
	    <a data-toggle="tab" href="#${osd_id_string}"  id="${osd_alink_id_string}">
	    Graphical view
	</a>
	    </li>
            <li>
	    <a data-toggle="tab" href="#${json_id_string}">
	    JSON
	</a>
	    </li>
            </ul>
            <div class="tab-content">
            <div id="${osd_id_string}" class="tab-pane fade in active">
            </div>
            <pre id="${json_id_string}"   contenteditable="true" class="tab-pane fade" style="text-align: left;">
            </pre>
            </div>
            </div>
            </div>
            </div>
            `;

        this.json_container_div = document.getElementById(json_id_string);
        $(document).on( 'shown.bs.tab', 'a[data-toggle="tab"][id="' + osd_alink_id_string + '"]', function (e) {
            const parsed_json = JSON.parse(this.json_container_div.innerText);
            // http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
            // Note as stated in the Stackoverflow answer, this is in most cases a correct comparison of JSON objects,
            // but for the cases it is wrong we are mistakingly replacing the OSD window with a new
            // one. Not such a big deal.
            if (!(JSON.stringify(parsed_json) === JSON.stringify(this.layout_json))) {
                this.layout_json = parsed_json;
                this.viewer.destroy();
                this.viewer = null;
                this.setViewerFromLayoutJson();
            }
        }.bind(this))
        this.json_container_div.textContent = json_text;
        this.osd_container_div = document.getElementById(osd_id_string);
        this.osd_container_div.style.width = "1200px";
        this.osd_container_div.style.height = "1200px";
        this.setViewerFromLayoutJson();
    }
    setViewerFromLayoutJson() {
	this.viewer = new OpenSeadragon({
            id: this.osd_container_div.id,
            prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
            debugMode:  false,
            showNavigator:  true,
            zoomPerScroll: 1.8,
            maxImageCacheCount: 400  // 200 is the default
        });
	const overlay = this.viewer.svgOverlay();
        // This seems to be a bug in
	// https://github.com/openseadragon/svg-overlay
	//
	// At least the "update-viewport" handler is used in a similar plugin
	// https://github.com/altert/OpenseadragonFabricjsOverlay/blob/master/openseadragon-fabricjs-overlay.js
	// but it is missing from
	// https://github.com/openseadragon/svg-overlay
	//
	// If this code is not added here the gene name text is sometimes not updated and therefore
	// located at the wrong place.
	this.tiled_images.length = 0; // Clear any previous TiledImage entries
	this.viewer.addHandler('update-viewport', function() {
	    overlay.resize();
        });
	const layoutimages = this.layout_json['layoutimages'];
        const layout_image_promises = [];
	for (const layoutimage of layoutimages) {
            if (layoutimage.rendering_type in this.layout_renderers) {
		const rendering_data = layoutimage.rendering_data;
		const tiled_image = this.layout_renderers[layoutimage.rendering_type](rendering_data,
										      this.data_files);
                const image_info_promise = tiled_image.ImageInfoPromise();
		const slice_promise = tiled_image.GetSlicePromise();
		const title_promise = tiled_image.GetTitlePromise();		
                layout_image_promises.push(
		    Promise.all([slice_promise, image_info_promise, title_promise]).then(
			function(layoutimage,  layout_index, tiled_images_index, values) {
                            const slice = values[0];
                            const image_info = values[1];
			    const title = values[2];
                            add_layout_image(this.viewer, overlay, rendering_data.data_filename, title,
					     layoutimage.x, layoutimage.y, image_info, layout_index,
					     tiled_images_index);
			}.bind(this, layoutimage, this.layout_index, this.tiled_images.length)));
		this.tiled_images.push(tiled_image);
            } else {
		throw "Unknown layoutimage.rendering_type = " + layoutimage.rendering_type;
	    }
        }
        Promise.all(layout_image_promises).then(
	    // If we don't run goHome(true), the zoom and pan is set so that only one experiment image is shown.
	    // But it is better if all layout images are shown by default.
	    // Therefore this callback is run once after all layoutimages have been added.
            function(viewer) {
		setTimeout(function(osd_viewer) {
		    osd_viewer.viewport.goHome(true);
		    osd_viewer.viewport.update();
		}.bind(null,viewer),0); }.bind(null, this.viewer)
	);
    }
}
