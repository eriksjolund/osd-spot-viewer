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
export default class {
    constructor(file_api_file) {
        this.file = file_api_file;
    }
    filename() {
      return this.file.name;
    }
    get_slice(start_pos, size) {
        const promise = new Promise(function(file, resolve, reject) {
            const file_reader = new FileReader();
            const blob = file.slice(start_pos, start_pos + size);
            file_reader.onloadend = function(evt) {
                if (evt.target.readyState == FileReader.DONE) {
                    resolve(evt.target.result);
                } else {
                    reject(Error("could not read local file"));
                }
            }
            file_reader.onerror = function(evt) {
                reject(Error("could not read local file (onerror)"));
            }
            file_reader.onabort = function(evt) {
                reject(Error("could not read local file (onabort)"));
            }
            file_reader.readAsArrayBuffer(blob);
        }.bind(null, this.file));
        return promise;
    }
}
