export class BinaryWriter {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  constructor(initialCapacity = 256 * 1024) {
    this.buffer = new ArrayBuffer(initialCapacity);
    this.view = new DataView(this.buffer);
  }

  private ensureCapacity(needs: number) {
    if (this.offset + needs > this.buffer.byteLength) {
      const newCapacity = Math.max(this.buffer.byteLength * 2, this.offset + needs);
      const newBuffer = new ArrayBuffer(newCapacity);
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
      this.buffer = newBuffer;
      this.view = new DataView(newBuffer); // Correct reference
    }
  }

  writeByte(val: number) {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, val);
    this.offset += 1;
  }

  writeShort(val: number) {
    this.ensureCapacity(2);
    this.view.setInt16(this.offset, val, false); // Big-endian
    this.offset += 2;
  }

  writeInt(val: number) {
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, val, false); // Big-endian
    this.offset += 4;
  }

  writeLong(val: bigint) {
    this.ensureCapacity(8);
    // Wrap to 64-bit signed integer representation to prevent RangeError/clamping on positive bigints >= 2^63
    const signed64 = BigInt.asIntN(64, val);
    this.view.setBigInt64(this.offset, signed64, false); // Big-endian
    this.offset += 8;
  }

  writeUTF8String(str: string) {
    const bytes = new TextEncoder().encode(str);
    this.ensureCapacity(2 + bytes.length);
    this.writeShort(bytes.length);
    new Uint8Array(this.buffer).set(bytes, this.offset);
    this.offset += bytes.length;
  }

  writeBytes(bytes: Uint8Array) {
    this.ensureCapacity(bytes.length);
    new Uint8Array(this.buffer).set(bytes, this.offset);
    this.offset += bytes.length;
  }

  getUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer, 0, this.offset);
  }
}

/**
 * Encodes a number into a Minecraft/Protocol-compatible VarInt byte array.
 */
export function encodeVarInt(value: number): number[] {
  const bytes: number[] = [];
  let temp = value;
  while ((temp & 0xffffff80) !== 0) {
    bytes.push((temp & 0x7f) | 0x80);
    temp >>>= 7;
  }
  bytes.push(temp & 0x7f);
  return bytes;
}

/**
 * Builds the fully configured Sponge Schematic NBT buffer.
 *
 * Schematic structure fields (Sponge Schematic v2):
 * - Root Tag ID = 10 (Compound)
 * - Name = "" (Standard empty string)
 * - Payload contains:
 *     - Width (Short)
 *     - Height (Short)
 *     - Length (Short)
 *     - Version (Int)
 *     - DataVersion (Int)
 *     - PaletteMax (Int)
 *     - Palette (Compound { string_key -> int_val })
 *     - Offset (Int Array [x, y, z])
 *     - BlockData (Byte Array ofVarInts)
 * - Finished with TAG_End (0)
 */
export function buildSchematicBuffer(opts: {
  width: number;
  height: number;
  length: number;
  dataVersion: number;
  palette: Map<string, number>;
  blockDataIds: number[];
}): Uint8Array {
  const writer = new BinaryWriter();

  // Root compound tag
  writer.writeByte(10); // TAG_Compound
  writer.writeUTF8String(''); // Empty name wrapper

  // 1. Version (TAG_Int = 3)
  writer.writeByte(3);
  writer.writeUTF8String('Version');
  writer.writeInt(2); // Sponge Schematic Version 2

  // 2. DataVersion (TAG_Int = 3)
  writer.writeByte(3);
  writer.writeUTF8String('DataVersion');
  writer.writeInt(opts.dataVersion); // e.g. 3437 for Minecraft 1.20

  // 3. Width (TAG_Short = 2)
  writer.writeByte(2);
  writer.writeUTF8String('Width');
  writer.writeShort(opts.width);

  // 4. Height (TAG_Short = 2)
  writer.writeByte(2);
  writer.writeUTF8String('Height');
  writer.writeShort(opts.height);

  // 5. Length (TAG_Short = 2)
  writer.writeByte(2);
  writer.writeUTF8String('Length');
  writer.writeShort(opts.length);

  // 6. PaletteMax (TAG_Int = 3)
  writer.writeByte(3);
  writer.writeUTF8String('PaletteMax');
  writer.writeInt(opts.palette.size);

  // 7. Palette Compound (TAG_Compound = 10)
  writer.writeByte(10);
  writer.writeUTF8String('Palette');
  for (const [blockState, indexVal] of opts.palette.entries()) {
    writer.writeByte(3); // TAG_Int element
    writer.writeUTF8String(blockState);
    writer.writeInt(indexVal);
  }
  writer.writeByte(0); // TAG_End for Palette Compound

  // 8. Offset Int Array (TAG_Int_Array = 11)
  writer.writeByte(11);
  writer.writeUTF8String('Offset');
  writer.writeInt(3); // 3-element offset array
  writer.writeInt(0); // x
  writer.writeInt(0); // y
  writer.writeInt(0); // z

  // 9. BlockData (TAG_Byte_Array = 7)
  // Consists of sequential VarInt-encoded numerical block IDs
  const varIntBytesList: number[] = [];
  for (const blockId of opts.blockDataIds) {
    varIntBytesList.push(...encodeVarInt(blockId));
  }
  const serializedBlockData = new Uint8Array(varIntBytesList);

  writer.writeByte(7);
  writer.writeUTF8String('BlockData');
  writer.writeInt(serializedBlockData.length);
  writer.writeBytes(serializedBlockData);

  // End of root compound
  writer.writeByte(0); // TAG_End for root

  return writer.getUint8Array();
}

/**
 * Builds the fully configured Litematica (.litematic) NBT buffer.
 *
 * Litematica structure representation:
 * - Root Tag ID = 10 (Compound)
 * - Name = "" (Standard empty name)
 * - Payload contains:
 *     - Version (Int, standard = 5)
 *     - MinecraftDataVersion (Int)
 *     - Metadata (Compound)
 *         - Author (String)
 *         - Description (String)
 *         - EnclosingSize (Compound {x, y, z})
 *         - Name (String)
 *         - RegionCount (Int = 1)
 *         - TimeCreated (Long)
 *         - TimeModified (Long)
 *         - TotalBlocks (Int)
 *         - TotalVolume (Int)
 *     - Regions (Compound)
 *         - <RegionName> (Compound)
 *             - Position (Compound {x, y, z})
 *             - Size (Compound {x, y, z})
 *             - BlockStatePalette (TAG_List of Couples/Compounds)
 *                 - Each Compound item has a String "Name" key-value payload.
 *             - BlockStates (TAG_Long_Array)
 *                 - Unaligned / non-spanning bit-packed 64-bit BigInt long array.
 * - Finished with TAG_End (0)
 */
export function buildLitematicBuffer(opts: {
  width: number;
  height: number;
  length: number;
  dataVersion: number;
  palette: Map<string, number>;
  blockDataIds: number[];
  name?: string;
}): Uint8Array {
  const writer = new BinaryWriter();

  // Root compound tag
  writer.writeByte(10); // TAG_Compound
  writer.writeUTF8String(''); // Empty name wrapper

  // 1. Version (TAG_Int = 3)
  writer.writeByte(3);
  writer.writeUTF8String('Version');
  writer.writeInt(5); // Compatible Litematica Version 5

  // 2. MinecraftDataVersion (TAG_Int = 3)
  writer.writeByte(3);
  writer.writeUTF8String('MinecraftDataVersion');
  writer.writeInt(opts.dataVersion);

  // 3. Metadata (TAG_Compound = 10)
  writer.writeByte(10);
  writer.writeUTF8String('Metadata');

  writer.writeByte(8); // TAG_String
  writer.writeUTF8String('Author');
  writer.writeUTF8String('Pixel2Schem');

  writer.writeByte(8); // TAG_String
  writer.writeUTF8String('Description');
  writer.writeUTF8String('Created by Pixel2Schem Voxelizer App');

  writer.writeByte(10); // TAG_Compound
  writer.writeUTF8String('EnclosingSize');
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('x');
  writer.writeInt(opts.width);
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('y');
  writer.writeInt(opts.height);
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('z');
  writer.writeInt(opts.length);
  writer.writeByte(0); // TAG_End for EnclosingSize

  const safeName = (opts.name || 'pixel_art').replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  writer.writeByte(8); // TAG_String
  writer.writeUTF8String('Name');
  writer.writeUTF8String(safeName);

  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('RegionCount');
  writer.writeInt(1);

  writer.writeByte(4); // TAG_Long
  writer.writeUTF8String('TimeCreated');
  writer.writeLong(BigInt(Date.now()));

  writer.writeByte(4); // TAG_Long
  writer.writeUTF8String('TimeModified');
  writer.writeLong(BigInt(Date.now()));

  // Count active non-air blocks (index 0 is air in our mapping)
  const nonAirBlocksCount = opts.blockDataIds.filter(id => id !== 0).length;
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('TotalBlocks');
  writer.writeInt(nonAirBlocksCount);

  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('TotalVolume');
  writer.writeInt(opts.width * opts.height * opts.length);

  writer.writeByte(0); // TAG_End for Metadata Compound

  // 4. Regions (TAG_Compound = 10)
  writer.writeByte(10);
  writer.writeUTF8String('Regions');

  // We have exactly 1 region inside Regions compound
  const regionName = safeName || 'pixel_region';
  writer.writeByte(10); // TAG_Compound
  writer.writeUTF8String(regionName);

  // Region parameters: Position (TAG_Compound = 10)
  writer.writeByte(10);
  writer.writeUTF8String('Position');
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('x');
  writer.writeInt(0);
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('y');
  writer.writeInt(0);
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('z');
  writer.writeInt(0);
  writer.writeByte(0); // TAG_End for Position

  // Region parameters: Size (TAG_Compound = 10)
  writer.writeByte(10);
  writer.writeUTF8String('Size');
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('x');
  writer.writeInt(opts.width);
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('y');
  writer.writeInt(opts.height);
  writer.writeByte(3); // TAG_Int
  writer.writeUTF8String('z');
  writer.writeInt(opts.length);
  writer.writeByte(0); // TAG_End for Size

  // Region parameters: BlockStatePalette (TAG_List = 9)
  writer.writeByte(9);
  writer.writeUTF8String('BlockStatePalette');
  writer.writeByte(10); // List content type = TAG_Compound

  const sortedPalette = new Array<string>(opts.palette.size);
  for (const [blockName, idxVal] of opts.palette.entries()) {
    sortedPalette[idxVal] = blockName;
  }

  writer.writeInt(sortedPalette.length); // Element count
  for (const blockName of sortedPalette) {
    // Write Compound structure for standard blockstate palette item
    writer.writeByte(8); // TAG_String
    writer.writeUTF8String('Name');
    writer.writeUTF8String(blockName);
    writer.writeByte(0); // TAG_End for individual list item
  }

  // Region parameters: BlockStates (TAG_Long_Array = 12)
  // Compute non-spanning bit-packed array representation
  const bitsPerBlock = Math.max(2, Math.ceil(Math.log2(opts.palette.size)));
  const blocksPerLong = Math.floor(64 / bitsPerBlock);
  const totalBlocks = opts.width * opts.height * opts.length;
  const numLongs = Math.ceil(totalBlocks / blocksPerLong);

  const longs = new Array<bigint>(numLongs).fill(0n);
  const mask = (1n << BigInt(bitsPerBlock)) - 1n;

  for (let i = 0; i < totalBlocks; i++) {
    const blockIndex = BigInt(opts.blockDataIds[i]) & mask;
    const longIdx = Math.floor(i / blocksPerLong);
    const bitOffset = BigInt((i % blocksPerLong) * bitsPerBlock);
    longs[longIdx] |= (blockIndex << bitOffset);
  }

  writer.writeByte(12); // TAG_Long_Array
  writer.writeUTF8String('BlockStates');
  writer.writeInt(longs.length);
  for (const val of longs) {
    writer.writeLong(val);
  }

  // Region parameters: TileEntities (TAG_List = 9)
  writer.writeByte(9);
  writer.writeUTF8String('TileEntities');
  writer.writeByte(10); // Element Type = TAG_Compound (10) (standard for list of compounds)
  writer.writeInt(0);  // Count = 0

  // Region parameters: Entities (TAG_List = 9)
  writer.writeByte(9);
  writer.writeUTF8String('Entities');
  writer.writeByte(10); // Element Type = TAG_Compound (10)
  writer.writeInt(0);  // Count = 0

  writer.writeByte(0); // TAG_End for Region Compound
  writer.writeByte(0); // TAG_End for Regions Compound

  // End of root compound
  writer.writeByte(0); // TAG_End for root

  return writer.getUint8Array();
}

/**
 * Compresses the raw NBT byte buffer using Gzip and returns a Blob.

 * Uses browser's native CompressionStream.
 */
export async function compressSchematic(nbtBytes: Uint8Array): Promise<Blob> {
  const fileBlob = new Blob([nbtBytes], { type: 'application/octet-stream' });
  
  // Verify if CompressionStream is available
  if (typeof CompressionStream !== 'undefined') {
    try {
      const gzippedStream = fileBlob.stream().pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(gzippedStream).blob();
      return new Blob([compressedBlob], { type: 'application/octet-stream' });
    } catch (e) {
      console.error('Core CompressionStream error, falling back to uncompressed or alternative', e);
    }
  }

  // Fallback (some environments might not support CompressionStream, though extremely rare in 2026)
  return fileBlob;
}

/**
 * Decompresses a Gzipped NBT Blob/File into raw bytes.
 */
export async function decompressSchematic(gzipBlob: Blob): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const decompressedStream = gzipBlob.stream().pipeThrough(new DecompressionStream('gzip'));
      const arrBuffer = await new Response(decompressedStream).arrayBuffer();
      return new Uint8Array(arrBuffer);
    } catch (e) {
      console.warn('DecompressionStream failed, attempting raw read', e);
    }
  }
  
  // Fallback
  const arrBuffer = await gzipBlob.arrayBuffer();
  return new Uint8Array(arrBuffer);
}

/**
 * Decodes a relative stream of VarInt bytes to individual block indices.
 */
export function decodeVarIntList(bytes: Uint8Array): number[] {
  const list: number[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    let value = 0;
    let shift = 0;
    while (true) {
      if (offset >= bytes.length) break;
      const b = bytes[offset++];
      value |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    list.push(value);
  }
  return list;
}

/**
 * Unpacks the Litematica bit-packed BlockStates long array.
 */
export function unpackLitematicBlockStates(
  longs: BigInt64Array,
  width: number,
  height: number,
  length: number,
  paletteSize: number
): number[] {
  const totalBlocks = width * height * length;
  const bitsPerBlock = Math.max(2, Math.ceil(Math.log2(paletteSize)));
  const blocksPerLong = Math.floor(64 / bitsPerBlock);
  const mask = (1n << BigInt(bitsPerBlock)) - 1n;

  const blockDataIds = new Array<number>(totalBlocks).fill(0);
  for (let i = 0; i < totalBlocks; i++) {
    const longIdx = Math.floor(i / blocksPerLong);
    if (longIdx >= longs.length) break;
    const bitOffset = BigInt((i % blocksPerLong) * bitsPerBlock);
    const val = longs[longIdx];
    const blockId = Number((val >> bitOffset) & mask);
    blockDataIds[i] = blockId;
  }
  return blockDataIds;
}

/**
 * Safe, fast NBT Binary Reader supporting all NBT spec types.
 */
export class NBTReader {
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  readByte(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readShort(): number {
    const val = this.view.getInt16(this.offset, false); // Big-endian
    this.offset += 2;
    return val;
  }

  readInt(): number {
    const val = this.view.getInt32(this.offset, false); // Big-endian
    this.offset += 4;
    return val;
  }

  readLong(): bigint {
    const val = this.view.getBigInt64(this.offset, false); // Big-endian
    this.offset += 8;
    return val;
  }

  readFloat(): number {
    const val = this.view.getFloat32(this.offset, false); // Big-endian
    this.offset += 4;
    return val;
  }

  readDouble(): number {
    const val = this.view.getFloat64(this.offset, false); // Big-endian
    this.offset += 8;
    return val;
  }

  readUTF8String(): string {
    const len = this.readShort();
    if (len === 0) return '';
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    this.offset += len;
    return new TextDecoder('utf-8').decode(bytes);
  }

  readTag(typeId: number): any {
    switch (typeId) {
      case 0: // TAG_End
        return null;
      case 1: // TAG_Byte
        return this.readByte();
      case 2: // TAG_Short
        return this.readShort();
      case 3: // TAG_Int
        return this.readInt();
      case 4: // TAG_Long
        return this.readLong();
      case 5: // TAG_Float
        return this.readFloat();
      case 6: // TAG_Double
        return this.readDouble();
      case 7: { // TAG_Byte_Array
        const len = this.readInt();
        const arr = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
        this.offset += len;
        // Make a fresh copy to prevent slice reference retaining larger buffer
        return new Uint8Array(arr);
      }
      case 8: // TAG_String
        return this.readUTF8String();
      case 9: { // TAG_List
        const elemTypeId = this.readByte();
        const len = this.readInt();
        const list: any[] = [];
        for (let i = 0; i < len; i++) {
          list.push(this.readTag(elemTypeId));
        }
        return { type: elemTypeId, list };
      }
      case 10: { // TAG_Compound
        const compound: Record<string, any> = {};
        while (true) {
          const innerType = this.readByte();
          if (innerType === 0) break;
          const name = this.readUTF8String();
          compound[name] = this.readTag(innerType);
        }
        return compound;
      }
      case 11: { // TAG_Int_Array
        const len = this.readInt();
        const arr = new Int32Array(len);
        for (let i = 0; i < len; i++) {
          arr[i] = this.readInt();
        }
        return arr;
      }
      case 12: { // TAG_Long_Array
        const len = this.readInt();
        const arr = new BigInt64Array(len);
        for (let i = 0; i < len; i++) {
          arr[i] = this.readLong();
        }
        return arr;
      }
      default:
        throw new Error(`Invalid NBT tag type reached: ${typeId}`);
    }
  }

  readRoot(): { name: string; val: any } {
    const rootType = this.readByte();
    if (rootType !== 10) {
      throw new Error(`Invalid root tag ID [${rootType}] - expected NBT Compound (10).`);
    }
    const name = this.readUTF8String();
    const val = this.readTag(10);
    return { name, val };
  }
}
