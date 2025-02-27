import {
  __privateAdd,
  __privateGet,
  __privateMethod,
  __privateSet,
  __publicField
} from "./chunk-RGIOIEUU.js";

// node_modules/@zarrita/core/dist/src/errors.js
var NodeNotFoundError = class extends Error {
  constructor(context, options = {}) {
    super(`Node not found: ${context}`, options);
    this.name = "NodeNotFoundError";
  }
};
var KeyError = class extends Error {
  constructor(path) {
    super(`Missing key: ${path}`);
    this.name = "KeyError";
  }
};

// node_modules/@zarrita/core/dist/src/codecs/bitround.js
var BitroundCodec = class _BitroundCodec {
  constructor(configuration, _meta) {
    __publicField(this, "kind", "array_to_array");
    if (configuration.keepbits < 0) {
      throw new Error("keepbits must be zero or positive");
    }
  }
  static fromConfig(configuration, meta) {
    return new _BitroundCodec(configuration, meta);
  }
  /**
   * Encode a chunk of data with bit-rounding.
   * @param _arr - The chunk to encode
   */
  encode(_arr) {
    throw new Error("`BitroundCodec.encode` is not implemented. Please open an issue at https://github.com/manzt/zarrita.js/issues.");
  }
  /**
   * Decode a chunk of data (no-op).
   * @param arr - The chunk to decode
   * @returns The decoded chunk
   */
  decode(arr) {
    return arr;
  }
};

// node_modules/@zarrita/typedarray/dist/src/index.js
var _bytes;
var BoolArray = class {
  constructor(x, byteOffset, length) {
    __privateAdd(this, _bytes);
    if (typeof x === "number") {
      __privateSet(this, _bytes, new Uint8Array(x));
    } else if (x instanceof ArrayBuffer) {
      __privateSet(this, _bytes, new Uint8Array(x, byteOffset, length));
    } else {
      __privateSet(this, _bytes, new Uint8Array(Array.from(x, (v) => v ? 1 : 0)));
    }
  }
  get BYTES_PER_ELEMENT() {
    return 1;
  }
  get byteOffset() {
    return __privateGet(this, _bytes).byteOffset;
  }
  get byteLength() {
    return __privateGet(this, _bytes).byteLength;
  }
  get buffer() {
    return __privateGet(this, _bytes).buffer;
  }
  get length() {
    return __privateGet(this, _bytes).length;
  }
  get(idx) {
    let value = __privateGet(this, _bytes)[idx];
    return typeof value === "number" ? value !== 0 : value;
  }
  set(idx, value) {
    __privateGet(this, _bytes)[idx] = value ? 1 : 0;
  }
  fill(value) {
    __privateGet(this, _bytes).fill(value ? 1 : 0);
  }
  *[Symbol.iterator]() {
    for (let i = 0; i < this.length; i++) {
      yield this.get(i);
    }
  }
};
_bytes = new WeakMap();
var _encoder;
var ByteStringArray = class {
  constructor(chars, x, byteOffset, length) {
    __publicField(this, "_data");
    __publicField(this, "chars");
    __privateAdd(this, _encoder);
    this.chars = chars;
    __privateSet(this, _encoder, new TextEncoder());
    if (typeof x === "number") {
      this._data = new Uint8Array(x * chars);
    } else if (x instanceof ArrayBuffer) {
      if (length)
        length = length * chars;
      this._data = new Uint8Array(x, byteOffset, length);
    } else {
      let values = Array.from(x);
      this._data = new Uint8Array(values.length * chars);
      for (let i = 0; i < values.length; i++) {
        this.set(i, values[i]);
      }
    }
  }
  get BYTES_PER_ELEMENT() {
    return this.chars;
  }
  get byteOffset() {
    return this._data.byteOffset;
  }
  get byteLength() {
    return this._data.byteLength;
  }
  get buffer() {
    return this._data.buffer;
  }
  get length() {
    return this.byteLength / this.BYTES_PER_ELEMENT;
  }
  get(idx) {
    const view = new Uint8Array(this.buffer, this.byteOffset + this.chars * idx, this.chars);
    return new TextDecoder().decode(view).replace(/\x00/g, "");
  }
  set(idx, value) {
    const view = new Uint8Array(this.buffer, this.byteOffset + this.chars * idx, this.chars);
    view.fill(0);
    view.set(__privateGet(this, _encoder).encode(value));
  }
  fill(value) {
    const encoded = __privateGet(this, _encoder).encode(value);
    for (let i = 0; i < this.length; i++) {
      this._data.set(encoded, i * this.chars);
    }
  }
  *[Symbol.iterator]() {
    for (let i = 0; i < this.length; i++) {
      yield this.get(i);
    }
  }
};
_encoder = new WeakMap();
var _data;
var _UnicodeStringArray = class _UnicodeStringArray {
  constructor(chars, x, byteOffset, length) {
    __privateAdd(this, _data);
    __publicField(this, "chars");
    this.chars = chars;
    if (typeof x === "number") {
      __privateSet(this, _data, new Int32Array(x * chars));
    } else if (x instanceof ArrayBuffer) {
      if (length)
        length *= chars;
      __privateSet(this, _data, new Int32Array(x, byteOffset, length));
    } else {
      const values = x;
      const d = new _UnicodeStringArray(chars, 1);
      __privateSet(this, _data, new Int32Array(function* () {
        for (let str of values) {
          d.set(0, str);
          yield* __privateGet(d, _data);
        }
      }()));
    }
  }
  get BYTES_PER_ELEMENT() {
    return __privateGet(this, _data).BYTES_PER_ELEMENT * this.chars;
  }
  get byteLength() {
    return __privateGet(this, _data).byteLength;
  }
  get byteOffset() {
    return __privateGet(this, _data).byteOffset;
  }
  get buffer() {
    return __privateGet(this, _data).buffer;
  }
  get length() {
    return __privateGet(this, _data).length / this.chars;
  }
  get(idx) {
    const offset = this.chars * idx;
    let result = "";
    for (let i = 0; i < this.chars; i++) {
      result += String.fromCodePoint(__privateGet(this, _data)[offset + i]);
    }
    return result.replace(/\u0000/g, "");
  }
  set(idx, value) {
    const offset = this.chars * idx;
    const view = __privateGet(this, _data).subarray(offset, offset + this.chars);
    view.fill(0);
    for (let i = 0; i < this.chars; i++) {
      view[i] = value.codePointAt(i) ?? 0;
    }
  }
  fill(value) {
    this.set(0, value);
    let encoded = __privateGet(this, _data).subarray(0, this.chars);
    for (let i = 1; i < this.length; i++) {
      __privateGet(this, _data).set(encoded, i * this.chars);
    }
  }
  *[Symbol.iterator]() {
    for (let i = 0; i < this.length; i++) {
      yield this.get(i);
    }
  }
};
_data = new WeakMap();
var UnicodeStringArray = _UnicodeStringArray;

// node_modules/@zarrita/core/dist/src/util.js
function json_encode_object(o) {
  const str = JSON.stringify(o, null, 2);
  return new TextEncoder().encode(str);
}
function json_decode_object(bytes) {
  const str = new TextDecoder().decode(bytes);
  return JSON.parse(str);
}
function byteswap_inplace(view, bytes_per_element2) {
  const numFlips = bytes_per_element2 / 2;
  const endByteIndex = bytes_per_element2 - 1;
  let t = 0;
  for (let i = 0; i < view.length; i += bytes_per_element2) {
    for (let j = 0; j < numFlips; j += 1) {
      t = view[i + j];
      view[i + j] = view[i + endByteIndex - j];
      view[i + endByteIndex - j] = t;
    }
  }
}
var CONSTRUCTORS = {
  int8: Int8Array,
  int16: Int16Array,
  int32: Int32Array,
  int64: globalThis.BigInt64Array,
  uint8: Uint8Array,
  uint16: Uint16Array,
  uint32: Uint32Array,
  uint64: globalThis.BigUint64Array,
  float32: Float32Array,
  float64: Float64Array,
  bool: BoolArray
};
var V2_STRING_REGEX = /v2:([US])(\d+)/;
function get_ctr(data_type) {
  if (data_type === "v2:object") {
    return globalThis.Array;
  }
  let match = data_type.match(V2_STRING_REGEX);
  if (match) {
    let [, kind, chars] = match;
    return (kind === "U" ? UnicodeStringArray : ByteStringArray).bind(null, Number(chars));
  }
  let ctr = CONSTRUCTORS[data_type];
  if (!ctr) {
    throw new Error(`Unknown or unsupported data_type: ${data_type}`);
  }
  return ctr;
}
function get_strides(shape, order) {
  return (order === "C" ? row_major_stride : col_major_stride)(shape);
}
function row_major_stride(shape) {
  const ndim = shape.length;
  const stride = globalThis.Array(ndim);
  for (let i = ndim - 1, step = 1; i >= 0; i--) {
    stride[i] = step;
    step *= shape[i];
  }
  return stride;
}
function col_major_stride(shape) {
  const ndim = shape.length;
  const stride = globalThis.Array(ndim);
  for (let i = 0, step = 1; i < ndim; i++) {
    stride[i] = step;
    step *= shape[i];
  }
  return stride;
}
function create_chunk_key_encoder({ name, configuration }) {
  if (name === "default") {
    const separator = (configuration == null ? void 0 : configuration.separator) ?? "/";
    return (chunk_coords) => ["c", ...chunk_coords].join(separator);
  }
  if (name === "v2") {
    const separator = (configuration == null ? void 0 : configuration.separator) ?? ".";
    return (chunk_coords) => chunk_coords.join(separator) || "0";
  }
  throw new Error(`Unknown chunk key encoding: ${name}`);
}
function get_array_order(codecs) {
  var _a2;
  const maybe_transpose_codec = codecs.find((c) => c.name === "transpose");
  return ((_a2 = maybe_transpose_codec == null ? void 0 : maybe_transpose_codec.configuration) == null ? void 0 : _a2.order) === "F" ? "F" : "C";
}
var endian_regex = /^([<|>])(.*)$/;
function coerce_dtype(dtype) {
  if (dtype === "|O") {
    return { data_type: "v2:object" };
  }
  let match = dtype.match(endian_regex);
  if (!match) {
    throw new Error(`Invalid dtype: ${dtype}`);
  }
  let [, endian, rest] = match;
  let data_type = {
    b1: "bool",
    i1: "int8",
    u1: "uint8",
    i2: "int16",
    u2: "uint16",
    i4: "int32",
    u4: "uint32",
    i8: "int64",
    u8: "uint64",
    f4: "float32",
    f8: "float64"
  }[rest] ?? (rest.startsWith("S") || rest.startsWith("U") ? `v2:${rest}` : void 0);
  if (!data_type) {
    throw new Error(`Unsupported or unknown dtype: ${dtype}`);
  }
  if (endian === "|") {
    return { data_type };
  }
  return { data_type, endian: endian === "<" ? "little" : "big" };
}
function v2_to_v3_array_metadata(meta, attributes = {}) {
  let codecs = [];
  let dtype = coerce_dtype(meta.dtype);
  if (meta.order === "F") {
    codecs.push({ name: "transpose", configuration: { order: "F" } });
  }
  if ("endian" in dtype && dtype.endian === "big") {
    codecs.push({ name: "bytes", configuration: { endian: "big" } });
  }
  for (let { id, ...configuration } of meta.filters ?? []) {
    codecs.push({ name: id, configuration });
  }
  if (meta.compressor) {
    let { id, ...configuration } = meta.compressor;
    codecs.push({ name: id, configuration });
  }
  return {
    zarr_format: 3,
    node_type: "array",
    shape: meta.shape,
    data_type: dtype.data_type,
    chunk_grid: {
      name: "regular",
      configuration: {
        chunk_shape: meta.chunks
      }
    },
    chunk_key_encoding: {
      name: "v2",
      configuration: {
        separator: meta.dimension_separator ?? "."
      }
    },
    codecs,
    fill_value: meta.fill_value,
    attributes
  };
}
function v2_to_v3_group_metadata(_meta, attributes = {}) {
  return {
    zarr_format: 3,
    node_type: "group",
    attributes
  };
}
function is_dtype(dtype, query) {
  if (query !== "number" && query !== "bigint" && query !== "boolean" && query !== "object" && query !== "string") {
    return dtype === query;
  }
  let is_boolean = dtype === "bool";
  if (query === "boolean")
    return is_boolean;
  let is_string = dtype.startsWith("v2:U") || dtype.startsWith("v2:S");
  if (query === "string")
    return is_string;
  let is_bigint = dtype === "int64" || dtype === "uint64";
  if (query === "bigint")
    return is_bigint;
  let is_object = dtype === "v2:object";
  if (query === "object")
    return is_object;
  return !is_string && !is_bigint && !is_boolean && !is_object;
}
function is_sharding_codec(codec) {
  return (codec == null ? void 0 : codec.name) === "sharding_indexed";
}
function ensure_correct_scalar(metadata) {
  if ((metadata.data_type === "uint64" || metadata.data_type === "int64") && metadata.fill_value != null) {
    return BigInt(metadata.fill_value);
  }
  return metadata.fill_value;
}

// node_modules/@zarrita/core/dist/src/codecs/bytes.js
var LITTLE_ENDIAN_OS = system_is_little_endian();
function system_is_little_endian() {
  const a = new Uint32Array([305419896]);
  const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  return !(b[0] === 18);
}
function bytes_per_element(TypedArray) {
  if ("BYTES_PER_ELEMENT" in TypedArray) {
    return TypedArray.BYTES_PER_ELEMENT;
  }
  return 4;
}
var _strides, _TypedArray, _BYTES_PER_ELEMENT, _shape, _endian;
var _BytesCodec = class _BytesCodec {
  constructor(configuration, meta) {
    __publicField(this, "kind", "array_to_bytes");
    __privateAdd(this, _strides);
    __privateAdd(this, _TypedArray);
    __privateAdd(this, _BYTES_PER_ELEMENT);
    __privateAdd(this, _shape);
    __privateAdd(this, _endian);
    __privateSet(this, _endian, configuration == null ? void 0 : configuration.endian);
    __privateSet(this, _TypedArray, get_ctr(meta.data_type));
    __privateSet(this, _shape, meta.shape);
    __privateSet(this, _strides, get_strides(meta.shape, get_array_order(meta.codecs)));
    const sample = new (__privateGet(this, _TypedArray))(0);
    __privateSet(this, _BYTES_PER_ELEMENT, sample.BYTES_PER_ELEMENT);
  }
  static fromConfig(configuration, meta) {
    return new _BytesCodec(configuration, meta);
  }
  encode(arr) {
    let bytes = new Uint8Array(arr.data.buffer);
    if (LITTLE_ENDIAN_OS && __privateGet(this, _endian) === "big") {
      byteswap_inplace(bytes, bytes_per_element(__privateGet(this, _TypedArray)));
    }
    return bytes;
  }
  decode(bytes) {
    if (LITTLE_ENDIAN_OS && __privateGet(this, _endian) === "big") {
      byteswap_inplace(bytes, bytes_per_element(__privateGet(this, _TypedArray)));
    }
    return {
      data: new (__privateGet(this, _TypedArray))(bytes.buffer, bytes.byteOffset, bytes.byteLength / __privateGet(this, _BYTES_PER_ELEMENT)),
      shape: __privateGet(this, _shape),
      stride: __privateGet(this, _strides)
    };
  }
};
_strides = new WeakMap();
_TypedArray = new WeakMap();
_BYTES_PER_ELEMENT = new WeakMap();
_shape = new WeakMap();
_endian = new WeakMap();
var BytesCodec = _BytesCodec;

// node_modules/@zarrita/core/dist/src/codecs/crc32c.js
var Crc32cCodec = class _Crc32cCodec {
  constructor() {
    __publicField(this, "kind", "bytes_to_bytes");
  }
  static fromConfig() {
    return new _Crc32cCodec();
  }
  encode(_) {
    throw new Error("Not implemented");
  }
  decode(arr) {
    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength - 4);
  }
};

// node_modules/@zarrita/core/dist/src/codecs/json2.js
function throw_on_nan_replacer(_key, value) {
  if (Number.isNaN(value)) {
    throw new Error("JsonCodec allow_nan is false but NaN was encountered during encoding.");
  }
  if (value === Number.POSITIVE_INFINITY) {
    throw new Error("JsonCodec allow_nan is false but Infinity was encountered during encoding.");
  }
  if (value === Number.NEGATIVE_INFINITY) {
    throw new Error("JsonCodec allow_nan is false but -Infinity was encountered during encoding.");
  }
  return value;
}
function sort_keys_replacer(_key, value) {
  return value instanceof Object && !Array.isArray(value) ? Object.keys(value).sort().reduce((sorted, key) => {
    sorted[key] = value[key];
    return sorted;
  }, {}) : value;
}
var _encoder_config, _decoder_config;
var _JsonCodec = class _JsonCodec {
  constructor(configuration = {}) {
    __publicField(this, "configuration");
    __publicField(this, "kind", "array_to_bytes");
    __privateAdd(this, _encoder_config);
    __privateAdd(this, _decoder_config);
    this.configuration = configuration;
    const { encoding = "utf-8", skipkeys = false, ensure_ascii = true, check_circular = true, allow_nan = true, sort_keys = true, indent, strict = true } = configuration;
    let separators = configuration.separators;
    if (!separators) {
      if (!indent) {
        separators = [",", ":"];
      } else {
        separators = [", ", ": "];
      }
    }
    __privateSet(this, _encoder_config, {
      encoding,
      skipkeys,
      ensure_ascii,
      check_circular,
      allow_nan,
      indent,
      separators,
      sort_keys
    });
    __privateSet(this, _decoder_config, { strict });
  }
  static fromConfig(configuration) {
    return new _JsonCodec(configuration);
  }
  encode(buf) {
    const { indent, encoding, ensure_ascii, check_circular, allow_nan, sort_keys } = __privateGet(this, _encoder_config);
    if (encoding !== "utf-8") {
      throw new Error("JsonCodec does not yet support non-utf-8 encoding.");
    }
    const replacer_functions = [];
    if (!check_circular) {
      throw new Error("JsonCodec does not yet support skipping the check for circular references during encoding.");
    }
    if (!allow_nan) {
      replacer_functions.push(throw_on_nan_replacer);
    }
    if (sort_keys) {
      replacer_functions.push(sort_keys_replacer);
    }
    const items = Array.from(buf.data);
    items.push("|O");
    items.push(buf.shape);
    let replacer = void 0;
    if (replacer_functions.length) {
      replacer = (key, value) => {
        let new_value = value;
        for (let sub_replacer of replacer_functions) {
          new_value = sub_replacer(key, new_value);
        }
        return new_value;
      };
    }
    let json_str = JSON.stringify(items, replacer, indent);
    if (ensure_ascii) {
      json_str = json_str.replace(/[\u007F-\uFFFF]/g, (chr) => {
        const full_str = `0000${chr.charCodeAt(0).toString(16)}`;
        const sub_str = full_str.substring(full_str.length - 4);
        return `\\u${sub_str}`;
      });
    }
    return new TextEncoder().encode(json_str);
  }
  decode(bytes) {
    const { strict } = __privateGet(this, _decoder_config);
    if (!strict) {
      throw new Error("JsonCodec does not yet support non-strict decoding.");
    }
    const items = json_decode_object(bytes);
    const shape = items.pop();
    items.pop();
    if (!shape) {
      throw new Error("0D not implemented for JsonCodec.");
    }
    const stride = get_strides(shape, "C");
    const data = items;
    return { data, shape, stride };
  }
};
_encoder_config = new WeakMap();
_decoder_config = new WeakMap();
var JsonCodec = _JsonCodec;

// node_modules/@zarrita/core/dist/src/codecs/transpose.js
function proxy(arr) {
  if (arr instanceof BoolArray || arr instanceof ByteStringArray || arr instanceof UnicodeStringArray) {
    const arrp = new Proxy(arr, {
      get(target, prop) {
        return target.get(Number(prop));
      },
      set(target, prop, value) {
        target.set(Number(prop), value);
        return true;
      }
    });
    return arrp;
  }
  return arr;
}
function empty_like(chunk, order) {
  let data;
  if (chunk.data instanceof ByteStringArray || chunk.data instanceof UnicodeStringArray) {
    data = new chunk.constructor(
      // @ts-expect-error
      chunk.data.length,
      chunk.data.chars
    );
  } else {
    data = new chunk.constructor(chunk.data.length);
  }
  return {
    data,
    shape: chunk.shape,
    stride: get_strides(chunk.shape, order)
  };
}
function convert_array_order(src, target) {
  let out = empty_like(src, target);
  let n_dims = src.shape.length;
  let size = src.data.length;
  let index = Array(n_dims).fill(0);
  let src_data = proxy(src.data);
  let out_data = proxy(out.data);
  for (let src_idx = 0; src_idx < size; src_idx++) {
    let out_idx = 0;
    for (let dim = 0; dim < n_dims; dim++) {
      out_idx += index[dim] * out.stride[dim];
    }
    out_data[out_idx] = src_data[src_idx];
    index[0] += 1;
    for (let dim = 0; dim < n_dims; dim++) {
      if (index[dim] === src.shape[dim]) {
        if (dim + 1 === n_dims) {
          break;
        }
        index[dim] = 0;
        index[dim + 1] += 1;
      }
    }
  }
  return out;
}
function get_order(arr) {
  if (!arr.stride)
    return "C";
  let row_major_strides = get_strides(arr.shape, "C");
  return arr.stride.every((s, i) => s === row_major_strides[i]) ? "C" : "F";
}
var TransposeCodec = class _TransposeCodec {
  constructor(configuration) {
    __publicField(this, "configuration");
    __publicField(this, "kind", "array_to_array");
    this.configuration = configuration;
  }
  static fromConfig(configuration) {
    return new _TransposeCodec(configuration);
  }
  encode(arr) {
    var _a2, _b2;
    if (get_order(arr) === ((_a2 = this.configuration) == null ? void 0 : _a2.order)) {
      return arr;
    }
    return convert_array_order(arr, ((_b2 = this.configuration) == null ? void 0 : _b2.order) ?? "C");
  }
  decode(arr) {
    return arr;
  }
};

// node_modules/@zarrita/core/dist/src/codecs/vlen-utf8.js
var _shape2, _strides2;
var _VLenUTF8 = class _VLenUTF8 {
  constructor(shape) {
    __publicField(this, "kind", "array_to_bytes");
    __privateAdd(this, _shape2);
    __privateAdd(this, _strides2);
    __privateSet(this, _shape2, shape);
    __privateSet(this, _strides2, get_strides(shape, "C"));
  }
  static fromConfig(_, meta) {
    return new _VLenUTF8(meta.shape);
  }
  encode(_chunk) {
    throw new Error("Method not implemented.");
  }
  decode(bytes) {
    let decoder = new TextDecoder();
    let view = new DataView(bytes.buffer);
    let data = Array(view.getUint32(0, true));
    let pos = 4;
    for (let i = 0; i < data.length; i++) {
      let item_length = view.getUint32(pos, true);
      pos += 4;
      data[i] = decoder.decode(bytes.buffer.slice(pos, pos + item_length));
      pos += item_length;
    }
    return { data, shape: __privateGet(this, _shape2), stride: __privateGet(this, _strides2) };
  }
};
_shape2 = new WeakMap();
_strides2 = new WeakMap();
var VLenUTF8 = _VLenUTF8;

// node_modules/@zarrita/core/dist/src/codecs.js
function create_default_registry() {
  return (/* @__PURE__ */ new Map()).set("blosc", () => import("./blosc-3Y6GJYBO.js").then((m) => m.default)).set("gzip", () => import("./gzip-AWV4HBQL.js").then((m) => m.default)).set("lz4", () => import("./lz4-ZOONVFNS.js").then((m) => m.default)).set("zlib", () => import("./zlib-W7SNLRA5.js").then((m) => m.default)).set("zstd", () => import("./zstd-HTJEZFWP.js").then((m) => m.default)).set("transpose", () => TransposeCodec).set("bytes", () => BytesCodec).set("crc32c", () => Crc32cCodec).set("vlen-utf8", () => VLenUTF8).set("json2", () => JsonCodec).set("bitround", () => BitroundCodec);
}
var registry = create_default_registry();
function create_codec_pipeline(chunk_metadata) {
  let codecs;
  return {
    async encode(chunk) {
      if (!codecs)
        codecs = await load_codecs(chunk_metadata);
      for (const codec of codecs.array_to_array) {
        chunk = await codec.encode(chunk);
      }
      let bytes = await codecs.array_to_bytes.encode(chunk);
      for (const codec of codecs.bytes_to_bytes) {
        bytes = await codec.encode(bytes);
      }
      return bytes;
    },
    async decode(bytes) {
      if (!codecs)
        codecs = await load_codecs(chunk_metadata);
      for (let i = codecs.bytes_to_bytes.length - 1; i >= 0; i--) {
        bytes = await codecs.bytes_to_bytes[i].decode(bytes);
      }
      let chunk = await codecs.array_to_bytes.decode(bytes);
      for (let i = codecs.array_to_array.length - 1; i >= 0; i--) {
        chunk = await codecs.array_to_array[i].decode(chunk);
      }
      return chunk;
    }
  };
}
async function load_codecs(chunk_meta) {
  let promises = chunk_meta.codecs.map(async (meta) => {
    var _a2;
    let Codec = await ((_a2 = registry.get(meta.name)) == null ? void 0 : _a2());
    if (!Codec) {
      throw new Error(`Unknown codec: ${meta.name}`);
    }
    return { Codec, meta };
  });
  let array_to_array = [];
  let array_to_bytes;
  let bytes_to_bytes = [];
  for await (let { Codec, meta } of promises) {
    let codec = Codec.fromConfig(meta.configuration, chunk_meta);
    switch (codec.kind) {
      case "array_to_array":
        array_to_array.push(codec);
        break;
      case "array_to_bytes":
        array_to_bytes = codec;
        break;
      default:
        bytes_to_bytes.push(codec);
    }
  }
  if (!array_to_bytes) {
    if (!is_typed_array_like_meta(chunk_meta)) {
      throw new Error(`Cannot encode ${chunk_meta.data_type} to bytes without a codec`);
    }
    array_to_bytes = BytesCodec.fromConfig({ endian: "little" }, chunk_meta);
  }
  return { array_to_array, array_to_bytes, bytes_to_bytes };
}
function is_typed_array_like_meta(meta) {
  return meta.data_type !== "v2:object";
}

// node_modules/@zarrita/core/dist/src/codecs/sharding.js
var MAX_BIG_UINT = 18446744073709551615n;
function create_sharded_chunk_getter(location, shard_shape, encode_shard_key, sharding_config) {
  if (location.store.getRange === void 0) {
    throw new Error("Store does not support range requests");
  }
  let get_range = location.store.getRange.bind(location.store);
  let index_shape = shard_shape.map((d, i) => d / sharding_config.chunk_shape[i]);
  let index_codec = create_codec_pipeline({
    data_type: "uint64",
    shape: [...index_shape, 2],
    codecs: sharding_config.index_codecs
  });
  let cache = {};
  return async (chunk_coord) => {
    let shard_coord = chunk_coord.map((d, i) => Math.floor(d / index_shape[i]));
    let shard_path = location.resolve(encode_shard_key(shard_coord)).path;
    let index;
    if (shard_path in cache) {
      index = cache[shard_path];
    } else {
      let checksum_size = 4;
      let index_size = 16 * index_shape.reduce((a, b) => a * b, 1);
      let bytes = await get_range(shard_path, {
        suffixLength: index_size + checksum_size
      });
      index = cache[shard_path] = bytes ? await index_codec.decode(bytes) : null;
    }
    if (index === null) {
      return void 0;
    }
    let { data, shape, stride } = index;
    let linear_offset = chunk_coord.map((d, i) => d % shape[i]).reduce((acc, sel, idx) => acc + sel * stride[idx], 0);
    let offset = data[linear_offset];
    let length = data[linear_offset + 1];
    if (offset === MAX_BIG_UINT && length === MAX_BIG_UINT) {
      return void 0;
    }
    return get_range(shard_path, {
      offset: Number(offset),
      length: Number(length)
    });
  };
}

// node_modules/@zarrita/core/dist/src/hierarchy.js
var Location = class _Location {
  constructor(store, path = "/") {
    __publicField(this, "store");
    __publicField(this, "path");
    this.store = store;
    this.path = path;
  }
  resolve(path) {
    let root2 = new URL(`file://${this.path.endsWith("/") ? this.path : `${this.path}/`}`);
    return new _Location(this.store, new URL(path, root2).pathname);
  }
};
function root(store) {
  return new Location(store ?? /* @__PURE__ */ new Map());
}
var _metadata;
var Group = class extends Location {
  constructor(store, path, metadata) {
    super(store, path);
    __publicField(this, "kind", "group");
    __privateAdd(this, _metadata);
    __privateSet(this, _metadata, metadata);
  }
  get attrs() {
    return __privateGet(this, _metadata).attributes;
  }
};
_metadata = new WeakMap();
var CONTEXT_MARKER = Symbol("zarrita.context");
function get_context(obj) {
  return obj[CONTEXT_MARKER];
}
function create_context(location, metadata) {
  let { configuration } = metadata.codecs.find(is_sharding_codec) ?? {};
  let shared_context = {
    encode_chunk_key: create_chunk_key_encoder(metadata.chunk_key_encoding),
    TypedArray: get_ctr(metadata.data_type),
    fill_value: metadata.fill_value
  };
  if (configuration) {
    let native_order2 = get_array_order(configuration.codecs);
    return {
      ...shared_context,
      kind: "sharded",
      chunk_shape: configuration.chunk_shape,
      codec: create_codec_pipeline({
        data_type: metadata.data_type,
        shape: configuration.chunk_shape,
        codecs: configuration.codecs
      }),
      get_strides(shape, order) {
        return get_strides(shape, order ?? native_order2);
      },
      get_chunk_bytes: create_sharded_chunk_getter(location, metadata.chunk_grid.configuration.chunk_shape, shared_context.encode_chunk_key, configuration)
    };
  }
  let native_order = get_array_order(metadata.codecs);
  return {
    ...shared_context,
    kind: "regular",
    chunk_shape: metadata.chunk_grid.configuration.chunk_shape,
    codec: create_codec_pipeline({
      data_type: metadata.data_type,
      shape: metadata.chunk_grid.configuration.chunk_shape,
      codecs: metadata.codecs
    }),
    get_strides(shape, order) {
      return get_strides(shape, order ?? native_order);
    },
    async get_chunk_bytes(chunk_coords, options) {
      let chunk_key = shared_context.encode_chunk_key(chunk_coords);
      let chunk_path = location.resolve(chunk_key).path;
      return location.store.get(chunk_path, options);
    }
  };
}
var _a, _b, _metadata2;
var Array2 = class extends (_b = Location, _a = CONTEXT_MARKER, _b) {
  constructor(store, path, metadata) {
    super(store, path);
    __publicField(this, "kind", "array");
    __privateAdd(this, _metadata2);
    __publicField(this, _a);
    __privateSet(this, _metadata2, {
      ...metadata,
      fill_value: ensure_correct_scalar(metadata)
    });
    this[CONTEXT_MARKER] = create_context(this, metadata);
  }
  get attrs() {
    return __privateGet(this, _metadata2).attributes;
  }
  get shape() {
    return __privateGet(this, _metadata2).shape;
  }
  get chunks() {
    return this[CONTEXT_MARKER].chunk_shape;
  }
  get dtype() {
    return __privateGet(this, _metadata2).data_type;
  }
  async getChunk(chunk_coords, options) {
    let context = this[CONTEXT_MARKER];
    let maybe_bytes = await context.get_chunk_bytes(chunk_coords, options);
    if (!maybe_bytes) {
      let size = context.chunk_shape.reduce((a, b) => a * b, 1);
      let data = new context.TypedArray(size);
      data.fill(context.fill_value);
      return {
        data,
        shape: context.chunk_shape,
        stride: context.get_strides(context.chunk_shape)
      };
    }
    return context.codec.decode(maybe_bytes);
  }
  /**
   * A helper method to narrow `zarr.Array` Dtype.
   *
   * ```typescript
   * let arr: zarr.Array<DataType, FetchStore> = zarr.open(store, { kind: "array" });
   *
   * // Option 1: narrow by scalar type (e.g. "bool", "raw", "bigint", "number")
   * if (arr.is("bigint")) {
   *   // zarr.Array<"int64" | "uint64", FetchStore>
   * }
   *
   * // Option 3: exact match
   * if (arr.is("float32")) {
   *   // zarr.Array<"float32", FetchStore, "/">
   * }
   * ```
   */
  is(query) {
    return is_dtype(this.dtype, query);
  }
};
_metadata2 = new WeakMap();

// node_modules/@zarrita/core/dist/src/open.js
var VERSION_COUNTER = create_version_counter();
function create_version_counter() {
  let version_counts = /* @__PURE__ */ new WeakMap();
  function get_counts(store) {
    let counts = version_counts.get(store) ?? { v2: 0, v3: 0 };
    version_counts.set(store, counts);
    return counts;
  }
  return {
    increment(store, version) {
      get_counts(store)[version] += 1;
    },
    version_max(store) {
      let counts = get_counts(store);
      return counts.v3 > counts.v2 ? "v3" : "v2";
    }
  };
}
async function load_attrs(location) {
  let meta_bytes = await location.store.get(location.resolve(".zattrs").path);
  if (!meta_bytes)
    return {};
  return json_decode_object(meta_bytes);
}
async function open_v2(location, options = {}) {
  let loc = "store" in location ? location : new Location(location);
  let attrs = {};
  if (options.attrs ?? true)
    attrs = await load_attrs(loc);
  if (options.kind === "array")
    return open_array_v2(loc, attrs);
  if (options.kind === "group")
    return open_group_v2(loc, attrs);
  return open_array_v2(loc, attrs).catch((err) => {
    if (err instanceof NodeNotFoundError)
      return open_group_v2(loc, attrs);
    throw err;
  });
}
async function open_array_v2(location, attrs) {
  let { path } = location.resolve(".zarray");
  let meta = await location.store.get(path);
  if (!meta) {
    throw new NodeNotFoundError("v2 array", {
      cause: new KeyError(path)
    });
  }
  VERSION_COUNTER.increment(location.store, "v2");
  return new Array2(location.store, location.path, v2_to_v3_array_metadata(json_decode_object(meta), attrs));
}
async function open_group_v2(location, attrs) {
  let { path } = location.resolve(".zgroup");
  let meta = await location.store.get(path);
  if (!meta) {
    throw new NodeNotFoundError("v2 group", {
      cause: new KeyError(path)
    });
  }
  VERSION_COUNTER.increment(location.store, "v2");
  return new Group(location.store, location.path, v2_to_v3_group_metadata(json_decode_object(meta), attrs));
}
async function _open_v3(location) {
  let { store, path } = location.resolve("zarr.json");
  let meta = await location.store.get(path);
  if (!meta) {
    throw new NodeNotFoundError("v3 array or group", {
      cause: new KeyError(path)
    });
  }
  let meta_doc = json_decode_object(meta);
  if (meta_doc.node_type === "array") {
    meta_doc.fill_value = ensure_correct_scalar(meta_doc);
  }
  return meta_doc.node_type === "array" ? new Array2(store, location.path, meta_doc) : new Group(store, location.path, meta_doc);
}
async function open_v3(location, options = {}) {
  let loc = "store" in location ? location : new Location(location);
  let node = await _open_v3(loc);
  VERSION_COUNTER.increment(loc.store, "v3");
  if (options.kind === void 0)
    return node;
  if (options.kind === "array" && node instanceof Array2)
    return node;
  if (options.kind === "group" && node instanceof Group)
    return node;
  let kind = node instanceof Array2 ? "array" : "group";
  throw new Error(`Expected node of kind ${options.kind}, found ${kind}.`);
}
async function open(location, options = {}) {
  let store = "store" in location ? location.store : location;
  let version_max = VERSION_COUNTER.version_max(store);
  let open_primary = version_max === "v2" ? open.v2 : open.v3;
  let open_secondary = version_max === "v2" ? open.v3 : open.v2;
  return open_primary(location, options).catch((err) => {
    if (err instanceof NodeNotFoundError) {
      return open_secondary(location, options);
    }
    throw err;
  });
}
open.v2 = open_v2;
open.v3 = open_v3;

// node_modules/@zarrita/core/dist/src/create.js
async function create(location, options = {}) {
  let loc = "store" in location ? location : new Location(location);
  if ("shape" in options) {
    let arr = await create_array(loc, options);
    return arr;
  }
  return create_group(loc, options);
}
async function create_group(location, options = {}) {
  let metadata = {
    zarr_format: 3,
    node_type: "group",
    attributes: options.attributes ?? {}
  };
  await location.store.set(location.resolve("zarr.json").path, json_encode_object(metadata));
  return new Group(location.store, location.path, metadata);
}
async function create_array(location, options) {
  let metadata = {
    zarr_format: 3,
    node_type: "array",
    shape: options.shape,
    data_type: options.data_type,
    chunk_grid: {
      name: "regular",
      configuration: {
        chunk_shape: options.chunk_shape
      }
    },
    chunk_key_encoding: {
      name: "default",
      configuration: {
        separator: options.chunk_separator ?? "/"
      }
    },
    codecs: options.codecs ?? [],
    fill_value: options.fill_value ?? null,
    attributes: options.attributes ?? {}
  };
  await location.store.set(location.resolve("zarr.json").path, json_encode_object(metadata));
  return new Array2(location.store, location.path, metadata);
}

// node_modules/@zarrita/core/dist/src/consolidated.js
async function get_consolidated_metadata(store) {
  let bytes = await store.get("/.zmetadata");
  if (!bytes) {
    throw new NodeNotFoundError("v2 consolidated metadata", {
      cause: new KeyError("/.zmetadata")
    });
  }
  let meta = json_decode_object(bytes);
  if (meta.zarr_consolidated_format !== 1) {
    throw new Error("Unsupported consolidated format.");
  }
  return meta;
}
function is_meta_key(key) {
  return key.endsWith(".zarray") || key.endsWith(".zgroup") || key.endsWith(".zattrs") || key.endsWith("zarr.json");
}
function is_v3(meta) {
  return "zarr_format" in meta && meta.zarr_format === 3;
}
async function withConsolidated(store) {
  let v2_meta = await get_consolidated_metadata(store);
  let known_meta = {};
  for (let [key, value] of Object.entries(v2_meta.metadata)) {
    known_meta[`/${key}`] = value;
  }
  return {
    async get(...args) {
      let [key, opts] = args;
      if (known_meta[key]) {
        return json_encode_object(known_meta[key]);
      }
      let maybe_bytes = await store.get(key, opts);
      if (is_meta_key(key) && maybe_bytes) {
        let meta = json_decode_object(maybe_bytes);
        known_meta[key] = meta;
      }
      return maybe_bytes;
    },
    contents() {
      let contents = [];
      for (let [key, value] of Object.entries(known_meta)) {
        let parts = key.split("/");
        let filename = parts.pop();
        let path = parts.join("/") || "/";
        if (filename === ".zarray")
          contents.push({ path, kind: "array" });
        if (filename === ".zgroup")
          contents.push({ path, kind: "group" });
        if (is_v3(value)) {
          contents.push({ path, kind: value.node_type });
        }
      }
      return contents;
    }
  };
}
async function tryWithConsolidated(store) {
  return withConsolidated(store).catch((e) => {
    if (e instanceof NodeNotFoundError) {
      return store;
    }
    throw e;
  });
}

// node_modules/@zarrita/indexing/dist/src/util.js
function* range(start, stop, step = 1) {
  if (stop === void 0) {
    stop = start;
    start = 0;
  }
  for (let i = start; i < stop; i += step) {
    yield i;
  }
}
function* product(...iterables) {
  if (iterables.length === 0) {
    return;
  }
  const iterators = iterables.map((it) => it[Symbol.iterator]());
  const results = iterators.map((it) => it.next());
  if (results.some((r) => r.done)) {
    throw new Error("Input contains an empty iterator.");
  }
  for (let i = 0; ; ) {
    if (results[i].done) {
      iterators[i] = iterables[i][Symbol.iterator]();
      results[i] = iterators[i].next();
      if (++i >= iterators.length) {
        return;
      }
    } else {
      yield results.map(({ value }) => value);
      i = 0;
    }
    results[i] = iterators[i].next();
  }
}
function slice_indices({ start, stop, step }, length) {
  if (step === 0) {
    throw new Error("slice step cannot be zero");
  }
  step = step ?? 1;
  const step_is_negative = step < 0;
  const [lower, upper] = step_is_negative ? [-1, length - 1] : [0, length];
  if (start === null) {
    start = step_is_negative ? upper : lower;
  } else {
    if (start < 0) {
      start += length;
      if (start < lower) {
        start = lower;
      }
    } else if (start > upper) {
      start = upper;
    }
  }
  if (stop === null) {
    stop = step_is_negative ? lower : upper;
  } else {
    if (stop < 0) {
      stop += length;
      if (stop < lower) {
        stop = lower;
      }
    } else if (stop > upper) {
      stop = upper;
    }
  }
  return [start, stop, step];
}
function slice(start, stop, step = null) {
  if (stop === void 0) {
    stop = start;
    start = null;
  }
  return {
    start,
    stop,
    step
  };
}
function create_queue() {
  const promises = [];
  return {
    add: (fn) => promises.push(fn()),
    onIdle: () => Promise.all(promises)
  };
}

// node_modules/@zarrita/indexing/dist/src/indexer.js
var IndexError = class extends Error {
  constructor(msg) {
    super(msg);
    this.name = "IndexError";
  }
};
function err_too_many_indices(selection, shape) {
  throw new IndexError(`too many indicies for array; expected ${shape.length}, got ${selection.length}`);
}
function err_boundscheck(dim_len) {
  throw new IndexError(`index out of bounds for dimension with length ${dim_len}`);
}
function err_negative_step() {
  throw new IndexError("only slices with step >= 1 are supported");
}
function check_selection_length(selection, shape) {
  if (selection.length > shape.length) {
    err_too_many_indices(selection, shape);
  }
}
function normalize_integer_selection(dim_sel, dim_len) {
  dim_sel = Math.trunc(dim_sel);
  if (dim_sel < 0) {
    dim_sel = dim_len + dim_sel;
  }
  if (dim_sel >= dim_len || dim_sel < 0) {
    err_boundscheck(dim_len);
  }
  return dim_sel;
}
var IntDimIndexer = class {
  constructor({ dim_sel, dim_len, dim_chunk_len }) {
    __publicField(this, "dim_sel");
    __publicField(this, "dim_len");
    __publicField(this, "dim_chunk_len");
    __publicField(this, "nitems");
    dim_sel = normalize_integer_selection(dim_sel, dim_len);
    this.dim_sel = dim_sel;
    this.dim_len = dim_len;
    this.dim_chunk_len = dim_chunk_len;
    this.nitems = 1;
  }
  *[Symbol.iterator]() {
    const dim_chunk_ix = Math.floor(this.dim_sel / this.dim_chunk_len);
    const dim_offset = dim_chunk_ix * this.dim_chunk_len;
    const dim_chunk_sel = this.dim_sel - dim_offset;
    yield { dim_chunk_ix, dim_chunk_sel };
  }
};
var SliceDimIndexer = class {
  constructor({ dim_sel, dim_len, dim_chunk_len }) {
    __publicField(this, "start");
    __publicField(this, "stop");
    __publicField(this, "step");
    __publicField(this, "dim_len");
    __publicField(this, "dim_chunk_len");
    __publicField(this, "nitems");
    __publicField(this, "nchunks");
    const [start, stop, step] = slice_indices(dim_sel, dim_len);
    this.start = start;
    this.stop = stop;
    this.step = step;
    if (this.step < 1)
      err_negative_step();
    this.dim_len = dim_len;
    this.dim_chunk_len = dim_chunk_len;
    this.nitems = Math.max(0, Math.ceil((this.stop - this.start) / this.step));
    this.nchunks = Math.ceil(this.dim_len / this.dim_chunk_len);
  }
  *[Symbol.iterator]() {
    const dim_chunk_ix_from = Math.floor(this.start / this.dim_chunk_len);
    const dim_chunk_ix_to = Math.ceil(this.stop / this.dim_chunk_len);
    for (const dim_chunk_ix of range(dim_chunk_ix_from, dim_chunk_ix_to)) {
      const dim_offset = dim_chunk_ix * this.dim_chunk_len;
      const dim_limit = Math.min(this.dim_len, (dim_chunk_ix + 1) * this.dim_chunk_len);
      const dim_chunk_len = dim_limit - dim_offset;
      let dim_out_offset = 0;
      let dim_chunk_sel_start = 0;
      if (this.start < dim_offset) {
        const remainder = (dim_offset - this.start) % this.step;
        if (remainder)
          dim_chunk_sel_start += this.step - remainder;
        dim_out_offset = Math.ceil((dim_offset - this.start) / this.step);
      } else {
        dim_chunk_sel_start = this.start - dim_offset;
      }
      const dim_chunk_sel_stop = this.stop > dim_limit ? dim_chunk_len : this.stop - dim_offset;
      const dim_chunk_sel = [
        dim_chunk_sel_start,
        dim_chunk_sel_stop,
        this.step
      ];
      const dim_chunk_nitems = Math.ceil((dim_chunk_sel_stop - dim_chunk_sel_start) / this.step);
      const dim_out_sel = [
        dim_out_offset,
        dim_out_offset + dim_chunk_nitems,
        1
      ];
      yield { dim_chunk_ix, dim_chunk_sel, dim_out_sel };
    }
  }
};
function normalize_selection(selection, shape) {
  let normalized = [];
  if (selection === null) {
    normalized = shape.map((_) => slice(null));
  } else if (Array.isArray(selection)) {
    normalized = selection.map((s) => s ?? slice(null));
  }
  check_selection_length(normalized, shape);
  return normalized;
}
var BasicIndexer = class {
  constructor({ selection, shape, chunk_shape }) {
    __publicField(this, "dim_indexers");
    __publicField(this, "shape");
    this.dim_indexers = normalize_selection(selection, shape).map((dim_sel, i) => {
      return new (typeof dim_sel === "number" ? IntDimIndexer : SliceDimIndexer)({
        // @ts-expect-error ts inference not strong enough to know correct chunk
        dim_sel,
        dim_len: shape[i],
        dim_chunk_len: chunk_shape[i]
      });
    });
    this.shape = this.dim_indexers.filter((ixr) => ixr instanceof SliceDimIndexer).map((sixr) => sixr.nitems);
  }
  *[Symbol.iterator]() {
    for (const dim_projections of product(...this.dim_indexers)) {
      const chunk_coords = dim_projections.map((p) => p.dim_chunk_ix);
      const mapping = dim_projections.map((p) => {
        if ("dim_out_sel" in p) {
          return { from: p.dim_chunk_sel, to: p.dim_out_sel };
        }
        return { from: p.dim_chunk_sel, to: null };
      });
      yield { chunk_coords, mapping };
    }
  }
};

// node_modules/@zarrita/indexing/dist/src/get.js
function unwrap(arr, idx) {
  return "get" in arr ? arr.get(idx) : arr[idx];
}
async function get(arr, selection, opts, setter2) {
  var _a2;
  let context = get_context(arr);
  let indexer = new BasicIndexer({
    selection,
    shape: arr.shape,
    chunk_shape: arr.chunks
  });
  let out = setter2.prepare(new context.TypedArray(indexer.shape.reduce((a, b) => a * b, 1)), indexer.shape, context.get_strides(indexer.shape, opts.order));
  let queue = ((_a2 = opts.create_queue) == null ? void 0 : _a2.call(opts)) ?? create_queue();
  for (const { chunk_coords, mapping } of indexer) {
    queue.add(async () => {
      let { data, shape, stride } = await arr.getChunk(chunk_coords, opts.opts);
      let chunk = setter2.prepare(data, shape, stride);
      setter2.set_from_chunk(out, chunk, mapping);
    });
  }
  await queue.onIdle();
  return indexer.shape.length === 0 ? unwrap(out.data, 0) : out;
}

// node_modules/@zarrita/indexing/dist/src/set.js
function flip_indexer_projection(m) {
  if (m.to == null)
    return { from: m.to, to: m.from };
  return { from: m.to, to: m.from };
}
async function set(arr, selection, value, opts, setter2) {
  const context = get_context(arr);
  if (context.kind === "sharded") {
    throw new Error("Set not supported for sharded arrays.");
  }
  const indexer = new BasicIndexer({
    selection,
    shape: arr.shape,
    chunk_shape: arr.chunks
  });
  const chunk_size = arr.chunks.reduce((a, b) => a * b, 1);
  const queue = opts.create_queue ? opts.create_queue() : create_queue();
  for (const { chunk_coords, mapping } of indexer) {
    const chunk_selection = mapping.map((i) => i.from);
    const flipped = mapping.map(flip_indexer_projection);
    queue.add(async () => {
      const chunk_path = arr.resolve(context.encode_chunk_key(chunk_coords)).path;
      let chunk_data;
      const chunk_shape = arr.chunks.slice();
      const chunk_stride = context.get_strides(chunk_shape);
      if (is_total_slice(chunk_selection, chunk_shape)) {
        chunk_data = new context.TypedArray(chunk_size);
        if (typeof value === "object") {
          const chunk = setter2.prepare(chunk_data, chunk_shape.slice(), chunk_stride.slice());
          setter2.set_from_chunk(chunk, value, flipped);
        } else {
          chunk_data.fill(value);
        }
      } else {
        chunk_data = await arr.getChunk(chunk_coords).then(({ data }) => data);
        const chunk = setter2.prepare(chunk_data, chunk_shape.slice(), chunk_stride.slice());
        if (typeof value === "object") {
          setter2.set_from_chunk(chunk, value, flipped);
        } else {
          setter2.set_scalar(chunk, chunk_selection, value);
        }
      }
      await arr.store.set(chunk_path, await context.codec.encode({
        data: chunk_data,
        shape: chunk_shape,
        stride: chunk_stride
      }));
    });
  }
  await queue.onIdle();
}
function is_total_slice(selection, shape) {
  return selection.every((s, i) => {
    if (typeof s === "number")
      return false;
    const [start, stop, step] = s;
    return stop - start === shape[i] && step === 1;
  });
}

// node_modules/@zarrita/indexing/dist/src/ops.js
function object_array_view(arr, offset = 0, size) {
  let length = size ?? arr.length - offset;
  return {
    length,
    subarray(from, to = length) {
      return object_array_view(arr, offset + from, to - from);
    },
    set(data, start = 0) {
      for (let i = 0; i < data.length; i++) {
        arr[offset + start + i] = data.get(i);
      }
    },
    get(index) {
      return arr[offset + index];
    }
  };
}
function compat_chunk(arr) {
  if (globalThis.Array.isArray(arr.data)) {
    return {
      // @ts-expect-error
      data: object_array_view(arr.data),
      stride: arr.stride,
      bytes_per_element: 1
    };
  }
  return {
    data: new Uint8Array(arr.data.buffer, arr.data.byteOffset, arr.data.byteLength),
    stride: arr.stride,
    bytes_per_element: arr.data.BYTES_PER_ELEMENT
  };
}
function get_typed_array_constructor(arr) {
  if ("chars" in arr) {
    return arr.constructor.bind(null, arr.chars);
  }
  return arr.constructor;
}
function compat_scalar(arr, value) {
  if (globalThis.Array.isArray(arr.data)) {
    return object_array_view([value]);
  }
  let TypedArray = get_typed_array_constructor(arr.data);
  let data = new TypedArray([value]);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}
var setter = {
  prepare(data, shape, stride) {
    return { data, shape, stride };
  },
  set_scalar(dest, sel, value) {
    let view = compat_chunk(dest);
    set_scalar_binary(view, sel, compat_scalar(dest, value), view.bytes_per_element);
  },
  set_from_chunk(dest, src, projections) {
    let view = compat_chunk(dest);
    set_from_chunk_binary(view, compat_chunk(src), view.bytes_per_element, projections);
  }
};
async function get2(arr, selection = null, opts = {}) {
  return get(arr, selection, opts, setter);
}
async function set2(arr, selection, value, opts = {}) {
  return set(arr, selection, value, opts, setter);
}
function indices_len(start, stop, step) {
  if (step < 0 && stop < start) {
    return Math.floor((start - stop - 1) / -step) + 1;
  }
  if (start < stop)
    return Math.floor((stop - start - 1) / step) + 1;
  return 0;
}
function set_scalar_binary(out, out_selection, value, bytes_per_element2) {
  if (out_selection.length === 0) {
    out.data.set(value, 0);
    return;
  }
  const [slice2, ...slices] = out_selection;
  const [curr_stride, ...stride] = out.stride;
  if (typeof slice2 === "number") {
    const data = out.data.subarray(curr_stride * slice2 * bytes_per_element2);
    set_scalar_binary({ data, stride }, slices, value, bytes_per_element2);
    return;
  }
  const [from, to, step] = slice2;
  const len = indices_len(from, to, step);
  if (slices.length === 0) {
    for (let i = 0; i < len; i++) {
      out.data.set(value, curr_stride * (from + step * i) * bytes_per_element2);
    }
    return;
  }
  for (let i = 0; i < len; i++) {
    const data = out.data.subarray(curr_stride * (from + step * i) * bytes_per_element2);
    set_scalar_binary({ data, stride }, slices, value, bytes_per_element2);
  }
}
function set_from_chunk_binary(dest, src, bytes_per_element2, projections) {
  const [proj, ...projs] = projections;
  const [dstride, ...dstrides] = dest.stride;
  const [sstride, ...sstrides] = src.stride;
  if (proj.from === null) {
    if (projs.length === 0) {
      dest.data.set(src.data.subarray(0, bytes_per_element2), proj.to * bytes_per_element2);
      return;
    }
    set_from_chunk_binary({
      data: dest.data.subarray(dstride * proj.to * bytes_per_element2),
      stride: dstrides
    }, src, bytes_per_element2, projs);
    return;
  }
  if (proj.to === null) {
    if (projs.length === 0) {
      let offset = proj.from * bytes_per_element2;
      dest.data.set(src.data.subarray(offset, offset + bytes_per_element2), 0);
      return;
    }
    set_from_chunk_binary(dest, {
      data: src.data.subarray(sstride * proj.from * bytes_per_element2),
      stride: sstrides
    }, bytes_per_element2, projs);
    return;
  }
  const [from, to, step] = proj.to;
  const [sfrom, _, sstep] = proj.from;
  const len = indices_len(from, to, step);
  if (projs.length === 0) {
    if (step === 1 && sstep === 1 && dstride === 1 && sstride === 1) {
      let offset = sfrom * bytes_per_element2;
      let size = len * bytes_per_element2;
      dest.data.set(src.data.subarray(offset, offset + size), from * bytes_per_element2);
      return;
    }
    for (let i = 0; i < len; i++) {
      let offset = sstride * (sfrom + sstep * i) * bytes_per_element2;
      dest.data.set(src.data.subarray(offset, offset + bytes_per_element2), dstride * (from + step * i) * bytes_per_element2);
    }
    return;
  }
  for (let i = 0; i < len; i++) {
    set_from_chunk_binary({
      data: dest.data.subarray(dstride * (from + i * step) * bytes_per_element2),
      stride: dstrides
    }, {
      data: src.data.subarray(sstride * (sfrom + i * sstep) * bytes_per_element2),
      stride: sstrides
    }, bytes_per_element2, projs);
  }
}

// node_modules/@zarrita/storage/dist/src/util.js
function fetch_range(url, offset, length, opts = {}) {
  if (offset !== void 0 && length !== void 0) {
    opts = {
      ...opts,
      headers: {
        ...opts.headers,
        Range: `bytes=${offset}-${offset + length - 1}`
      }
    };
  }
  return fetch(url, opts);
}
function merge_init(storeOverrides, requestOverrides) {
  return {
    ...storeOverrides,
    ...requestOverrides,
    headers: {
      ...storeOverrides.headers,
      ...requestOverrides.headers
    }
  };
}

// node_modules/@zarrita/storage/dist/src/fetch.js
function resolve(root2, path) {
  const base = typeof root2 === "string" ? new URL(root2) : root2;
  if (!base.pathname.endsWith("/")) {
    base.pathname += "/";
  }
  const resolved = new URL(path.slice(1), base);
  resolved.search = base.search;
  return resolved;
}
async function handle_response(response) {
  if (response.status === 404) {
    return void 0;
  }
  if (response.status === 200 || response.status === 206) {
    return new Uint8Array(await response.arrayBuffer());
  }
  throw new Error(`Unexpected response status ${response.status} ${response.statusText}`);
}
async function fetch_suffix(url, suffix_length, init, use_suffix_request) {
  if (use_suffix_request) {
    return fetch(url, {
      ...init,
      headers: { ...init.headers, Range: `bytes=-${suffix_length}` }
    });
  }
  let response = await fetch(url, { ...init, method: "HEAD" });
  if (!response.ok) {
    return response;
  }
  let content_length = response.headers.get("Content-Length");
  let length = Number(content_length);
  return fetch_range(url, length - suffix_length, length, init);
}
var _overrides, _use_suffix_request, _FetchStore_instances, merge_init_fn;
var FetchStore = class {
  constructor(url, options = {}) {
    __privateAdd(this, _FetchStore_instances);
    __publicField(this, "url");
    __privateAdd(this, _overrides);
    __privateAdd(this, _use_suffix_request);
    this.url = url;
    __privateSet(this, _overrides, options.overrides ?? {});
    __privateSet(this, _use_suffix_request, options.useSuffixRequest ?? false);
  }
  async get(key, options = {}) {
    let href = resolve(this.url, key).href;
    let response = await fetch(href, __privateMethod(this, _FetchStore_instances, merge_init_fn).call(this, options));
    return handle_response(response);
  }
  async getRange(key, range2, options = {}) {
    let url = resolve(this.url, key);
    let init = __privateMethod(this, _FetchStore_instances, merge_init_fn).call(this, options);
    let response;
    if ("suffixLength" in range2) {
      response = await fetch_suffix(url, range2.suffixLength, init, __privateGet(this, _use_suffix_request));
    } else {
      response = await fetch_range(url, range2.offset, range2.length, init);
    }
    return handle_response(response);
  }
};
_overrides = new WeakMap();
_use_suffix_request = new WeakMap();
_FetchStore_instances = new WeakSet();
merge_init_fn = function(overrides) {
  return merge_init(__privateGet(this, _overrides), overrides);
};
var fetch_default = FetchStore;
export {
  Array2 as Array,
  fetch_default as FetchStore,
  Group,
  KeyError,
  Location,
  NodeNotFoundError,
  get_context as _internal_get_array_context,
  create,
  get2 as get,
  open,
  registry,
  root,
  set2 as set,
  slice,
  tryWithConsolidated,
  withConsolidated
};
//# sourceMappingURL=zarrita.js.map
