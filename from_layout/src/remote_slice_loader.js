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
function parse_url_get_filename(url) {
    const url_parser = document.createElement('a');
    url_parser.href = url;
    // Retrieving the experiment filename out of an URL will not work if the URL is something like:
    //
    // http://example.com
    // http://example.com/
    // http://example.com/mega/
    //
    // But it will work for
    // http://example.com/files/file.st_exp_protobuf?extraparam=value
    // http://example.com/files/file.st_exp_protobuf
    // http://example.com/file.st_exp_protobuf
    //
    // TODO: Maybe the experiment name should be stored inside the experiment file itself instead?
    const filename = url_parser.pathname.substr(url_parser.pathname.lastIndexOf("/")+1);
    return filename;
}

// It might be possible to implement the RemoteSliceLoader with the new Fetch API instead of XMLHttpRequest.
// Maybe something for the future?


export default class {
    constructor(url) {
        this.url = url;
        this.file_name = parse_url_get_filename(url);
    }
    filename() { return this.file_name };
    get_slice(start_pos, size) {
        return new Promise(function(url, resolve, reject) {
        const range_string = 'bytes=' +  start_pos + "-" + (start_pos + size - 1);
        const xhr = new XMLHttpRequest();
        xhr.open( "GET", url, true );
        xhr.responseType = "arraybuffer";
        xhr.setRequestHeader('Range', range_string);
        xhr.onload = function(e) {
            // Here we check whether the server supports the HTTP request header RANGE.
	    // Maybe we could improve the check? Here is some additional information:
	    // http://stackoverflow.com/questions/720419/how-can-i-find-out-whether-a-server-supports-the-range-header
            if (this.status == 206 && size == this.response.byteLength) {
                resolve(this.response);
            } else {
                const error_message = "It seems the web server does not support the HTTP request header RANGE.";
                alert(error_message);
                reject(error_message);
            }
        };
        xhr.send();
        }.bind(this, this.url) ) }
}
