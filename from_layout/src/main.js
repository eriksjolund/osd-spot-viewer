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

'use strict';

import { App, get_tile_function } from './app';

import fromgene_parser from './fromgene_parser';
import fromcolor_parser from './fromcolor_parser';

import randomcolor_createlayout from './randomcolor_createlayout';
import fromgene_createlayout from './fromgene_createlayout';
import st_exp_protobuf_datafiles_container from './st_exp_protobuf_datafiles_container';

var datafiles_container = new st_exp_protobuf_datafiles_container();
var app = new App(datafiles_container,
		  [fromgene_parser, fromcolor_parser],
		  [fromgene_createlayout, randomcolor_createlayout]);

$(document).ready(function(){
      $('#handleAddDataFileURLbutton').click(function () {
    app.handleAddDataFileURL();
});

$('#layout_files_input').change(function (files) {
    app.handleOpenLocalLayoutFiles(this.files);
});

$('#experiment_files_input').change(function (files) {
    app.handleOpenLocalDataFiles(this.files);
});
});

window.startFunction2 = get_tile_function.bind(null, app.layouts);
