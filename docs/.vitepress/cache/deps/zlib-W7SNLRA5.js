import {
  unzlibSync,
  zlibSync
} from "./chunk-DEAERLGJ.js";
import "./chunk-WWNKGBK4.js";
import {
  __publicField
} from "./chunk-RGIOIEUU.js";

// node_modules/numcodecs/dist/zlib.js
var _a;
var Zlib = (_a = class {
  constructor(level = 1) {
    __publicField(this, "level");
    if (level < -1 || level > 9) {
      throw new Error("Invalid zlib compression level, it should be between -1 and 9");
    }
    this.level = level;
  }
  static fromConfig({ level }) {
    return new _a(level);
  }
  encode(data) {
    return zlibSync(data, { level: this.level });
  }
  decode(data) {
    return unzlibSync(data);
  }
}, __publicField(_a, "codecId", "zlib"), _a);
var zlib_default = Zlib;
export {
  zlib_default as default
};
//# sourceMappingURL=zlib-W7SNLRA5.js.map
