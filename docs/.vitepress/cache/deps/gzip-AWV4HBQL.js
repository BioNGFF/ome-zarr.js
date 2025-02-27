import {
  gunzipSync,
  gzipSync
} from "./chunk-DEAERLGJ.js";
import "./chunk-WWNKGBK4.js";
import {
  __publicField
} from "./chunk-RGIOIEUU.js";

// node_modules/numcodecs/dist/gzip.js
var _a;
var GZip = (_a = class {
  constructor(level = 1) {
    __publicField(this, "level");
    if (level < 0 || level > 9) {
      throw new Error("Invalid gzip compression level, it should be between 0 and 9");
    }
    this.level = level;
  }
  static fromConfig({ level }) {
    return new _a(level);
  }
  encode(data) {
    return gzipSync(data, { level: this.level });
  }
  decode(data) {
    return gunzipSync(data);
  }
}, __publicField(_a, "codecId", "gzip"), _a);
var gzip_default = GZip;
export {
  gzip_default as default
};
//# sourceMappingURL=gzip-AWV4HBQL.js.map
