export interface MCBlock {
  id: string; // e.g. "minecraft:white_wool"
  name: string; // e.g. "White Wool"
  hex: string; // Hex color
  r: number;
  g: number;
  b: number;
  group: 'concrete' | 'wool' | 'terracotta' | 'wood' | 'gems' | 'special';
}

export const MC_BLOCKS: MCBlock[] = [
  // --- CONCRETE ---
  { id: 'minecraft:white_concrete', name: 'White Concrete', hex: '#cfd5d6', r: 207, g: 213, b: 214, group: 'concrete' },
  { id: 'minecraft:orange_concrete', name: 'Orange Concrete', hex: '#e06100', r: 224, g: 97, b: 0, group: 'concrete' },
  { id: 'minecraft:magenta_concrete', name: 'Magenta Concrete', hex: '#a9309f', r: 169, g: 48, b: 159, group: 'concrete' },
  { id: 'minecraft:light_blue_concrete', name: 'Light Blue Concrete', hex: '#2389c7', r: 35, g: 137, b: 199, group: 'concrete' },
  { id: 'minecraft:yellow_concrete', name: 'Yellow Concrete', hex: '#f1af15', r: 241, g: 175, b: 21, group: 'concrete' },
  { id: 'minecraft:lime_concrete', name: 'Lime Concrete', hex: '#5ea818', r: 94, g: 168, b: 24, group: 'concrete' },
  { id: 'minecraft:pink_concrete', name: 'Pink Concrete', hex: '#d97591', r: 217, g: 117, b: 145, group: 'concrete' },
  { id: 'minecraft:gray_concrete', name: 'Gray Concrete', hex: '#53575a', r: 83, g: 87, b: 90, group: 'concrete' },
  { id: 'minecraft:light_gray_concrete', name: 'Light Gray Concrete', hex: '#8d8d88', r: 141, g: 141, b: 136, group: 'concrete' },
  { id: 'minecraft:cyan_concrete', name: 'Cyan Concrete', hex: '#157788', r: 21, g: 119, b: 136, group: 'concrete' },
  { id: 'minecraft:purple_concrete', name: 'Purple Concrete', hex: '#641f9c', r: 100, g: 31, b: 156, group: 'concrete' },
  { id: 'minecraft:blue_concrete', name: 'Blue Concrete', hex: '#2c2e8f', r: 44, g: 46, b: 143, group: 'concrete' },
  { id: 'minecraft:brown_concrete', name: 'Brown Concrete', hex: '#603c20', r: 96, g: 60, b: 32, group: 'concrete' },
  { id: 'minecraft:green_concrete', name: 'Green Concrete', hex: '#495b24', r: 73, g: 91, b: 36, group: 'concrete' },
  { id: 'minecraft:red_concrete', name: 'Red Concrete', hex: '#8e2020', r: 142, g: 32, b: 32, group: 'concrete' },
  { id: 'minecraft:black_concrete', name: 'Black Concrete', hex: '#080a0f', r: 8, g: 10, b: 15, group: 'concrete' },

  // --- WOOL ---
  { id: 'minecraft:white_wool', name: 'White Wool', hex: '#e9ecec', r: 233, g: 236, b: 236, group: 'wool' },
  { id: 'minecraft:orange_wool', name: 'Orange Wool', hex: '#f07613', r: 240, g: 118, b: 19, group: 'wool' },
  { id: 'minecraft:magenta_wool', name: 'Magenta Wool', hex: '#bd44b3', r: 189, g: 68, b: 179, group: 'wool' },
  { id: 'minecraft:light_blue_wool', name: 'Light Blue Wool', hex: '#3aaad9', r: 58, g: 170, b: 217, group: 'wool' },
  { id: 'minecraft:yellow_wool', name: 'Yellow Wool', hex: '#f8c627', r: 248, g: 198, b: 39, group: 'wool' },
  { id: 'minecraft:lime_wool', name: 'Lime Wool', hex: '#70b91a', r: 112, g: 185, b: 26, group: 'wool' },
  { id: 'minecraft:pink_wool', name: 'Pink Wool', hex: '#ed8dac', r: 237, g: 141, b: 172, group: 'wool' },
  { id: 'minecraft:gray_wool', name: 'Gray Wool', hex: '#3e4447', r: 62, g: 68, b: 71, group: 'wool' },
  { id: 'minecraft:light_gray_wool', name: 'Light Gray Wool', hex: '#8e8e86', r: 142, g: 142, b: 134, group: 'wool' },
  { id: 'minecraft:cyan_wool', name: 'Cyan Wool', hex: '#158991', r: 21, g: 137, b: 145, group: 'wool' },
  { id: 'minecraft:purple_wool', name: 'Purple Wool', hex: '#792aac', r: 121, g: 42, b: 172, group: 'wool' },
  { id: 'minecraft:blue_wool', name: 'Blue Wool', hex: '#35399d', r: 53, g: 57, b: 157, group: 'wool' },
  { id: 'minecraft:brown_wool', name: 'Brown Wool', hex: '#724728', r: 114, g: 71, b: 40, group: 'wool' },
  { id: 'minecraft:green_wool', name: 'Green Wool', hex: '#4e691c', r: 78, g: 105, b: 28, group: 'wool' },
  { id: 'minecraft:red_wool', name: 'Red Wool', hex: '#9e2b27', r: 158, g: 43, b: 39, group: 'wool' },
  { id: 'minecraft:black_wool', name: 'Black Wool', hex: '#141519', r: 20, g: 21, b: 25, group: 'wool' },

  // --- TERRACOTTA ---
  { id: 'minecraft:terracotta', name: 'Terracotta (Plain)', hex: '#9b5f44', r: 155, g: 95, b: 68, group: 'terracotta' },
  { id: 'minecraft:white_terracotta', name: 'White Terracotta', hex: '#d1b1a1', r: 209, g: 177, b: 161, group: 'terracotta' },
  { id: 'minecraft:orange_terracotta', name: 'Orange Terracotta', hex: '#a15325', r: 161, g: 83, b: 37, group: 'terracotta' },
  { id: 'minecraft:magenta_terracotta', name: 'Magenta Terracotta', hex: '#95576c', r: 149, g: 87, b: 108, group: 'terracotta' },
  { id: 'minecraft:light_blue_terracotta', name: 'Light Blue Terracotta', hex: '#706e80', r: 112, g: 110, b: 128, group: 'terracotta' },
  { id: 'minecraft:yellow_terracotta', name: 'Yellow Terracotta', hex: '#ba8523', r: 186, g: 133, b: 35, group: 'terracotta' },
  { id: 'minecraft:lime_terracotta', name: 'Lime Terracotta', hex: '#677535', r: 103, g: 117, b: 53, group: 'terracotta' },
  { id: 'minecraft:pink_terracotta', name: 'Pink Terracotta', hex: '#a04d4f', r: 160, g: 77, b: 79, group: 'terracotta' },
  { id: 'minecraft:gray_terracotta', name: 'Gray Terracotta', hex: '#392923', r: 57, g: 41, b: 35, group: 'terracotta' },
  { id: 'minecraft:light_gray_terracotta', name: 'Light Gray Terracotta', hex: '#876a61', r: 135, g: 106, b: 97, group: 'terracotta' },
  { id: 'minecraft:cyan_terracotta', name: 'Cyan Terracotta', hex: '#565a5b', r: 86, g: 90, b: 91, group: 'terracotta' },
  { id: 'minecraft:purple_terracotta', name: 'Purple Terracotta', hex: '#764656', r: 118, g: 70, b: 86, group: 'terracotta' },
  { id: 'minecraft:blue_terracotta', name: 'Blue Terracotta', hex: '#4a3b5c', r: 74, g: 59, b: 92, group: 'terracotta' },
  { id: 'minecraft:brown_terracotta', name: 'Brown Terracotta', hex: '#4d3224', r: 77, g: 50, b: 36, group: 'terracotta' },
  { id: 'minecraft:green_terracotta', name: 'Green Terracotta', hex: '#4b522a', r: 75, g: 82, b: 42, group: 'terracotta' },
  { id: 'minecraft:red_terracotta', name: 'Red Terracotta', hex: '#813c1c', r: 129, g: 60, b: 28, group: 'terracotta' },
  { id: 'minecraft:black_terracotta', name: 'Black Terracotta', hex: '#251610', r: 37, g: 22, b: 16, group: 'terracotta' },

  // --- WOODS / WOOD PLANKS ---
  { id: 'minecraft:oak_planks', name: 'Oak Planks', hex: '#a7834e', r: 167, g: 131, b: 78, group: 'wood' },
  { id: 'minecraft:spruce_planks', name: 'Spruce Planks', hex: '#604526', r: 96, g: 69, b: 38, group: 'wood' },
  { id: 'minecraft:birch_planks', name: 'Birch Planks', hex: '#c5b075', r: 197, g: 176, b: 117, group: 'wood' },
  { id: 'minecraft:jungle_planks', name: 'Jungle Planks', hex: '#a0744d', r: 160, g: 116, b: 77, group: 'wood' },
  { id: 'minecraft:acacia_planks', name: 'Acacia Planks', hex: '#ad5e32', r: 173, g: 94, b: 50, group: 'wood' },
  { id: 'minecraft:dark_oak_planks', name: 'Dark Oak Planks', hex: '#3b2713', r: 59, g: 39, b: 19, group: 'wood' },
  { id: 'minecraft:mangrove_planks', name: 'Mangrove Planks', hex: '#713028', r: 113, g: 48, b: 40, group: 'wood' },
  { id: 'minecraft:cherry_planks', name: 'Cherry Planks', hex: '#e1a293', r: 225, g: 162, b: 147, group: 'wood' },
  { id: 'minecraft:bamboo_planks', name: 'Bamboo Planks', hex: '#bda34e', r: 189, g: 163, b: 78, group: 'wood' },

  // --- GEMS & METALS ---
  { id: 'minecraft:gold_block', name: 'Gold Block', hex: '#fce144', r: 252, g: 225, b: 68, group: 'gems' },
  { id: 'minecraft:emerald_block', name: 'Emerald Block', hex: '#2ff171', r: 47, g: 241, b: 113, group: 'gems' },
  { id: 'minecraft:diamond_block', name: 'Diamond Block', hex: '#61f2e8', r: 97, g: 242, b: 232, group: 'gems' },
  { id: 'minecraft:iron_block', name: 'Iron Block', hex: '#dcdcdc', r: 220, g: 220, b: 220, group: 'gems' },
  { id: 'minecraft:coal_block', name: 'Coal Block', hex: '#101010', r: 16, g: 16, b: 16, group: 'gems' },
  { id: 'minecraft:redstone_block', name: 'Redstone Block', hex: '#be1313', r: 190, g: 19, b: 19, group: 'gems' },
  { id: 'minecraft:lapis_block', name: 'Lapis Lazuli Block', hex: '#1b45ac', r: 27, g: 69, b: 172, group: 'gems' },
  { id: 'minecraft:copper_block', name: 'Block of Copper', hex: '#c56f4e', r: 197, g: 111, b: 78, group: 'gems' },
  { id: 'minecraft:netherite_block', name: 'Block of Netherite', hex: '#312e31', r: 49, g: 46, b: 49, group: 'special' },

  // --- SPECIAL & MISC ---
  { id: 'minecraft:obsidian', name: 'Obsidian', hex: '#140e1b', r: 20, g: 14, b: 27, group: 'special' },
  { id: 'minecraft:glowstone', name: 'Glowstone', hex: '#ceac5c', r: 206, g: 172, b: 92, group: 'special' },
  { id: 'minecraft:sea_lantern', name: 'Sea Lantern', hex: '#cadecg', r: 194, g: 214, b: 194, group: 'special' },
  { id: 'minecraft:shroomlight', name: 'Shroomlight', hex: '#f1a34e', r: 241, g: 163, b: 78, group: 'special' },
  { id: 'minecraft:prismarine', name: 'Prismarine', hex: '#598f8d', r: 89, g: 143, b: 141, group: 'special' },
  { id: 'minecraft:dark_prismarine', name: 'Dark Prismarine', hex: '#384a47', r: 56, g: 74, b: 71, group: 'special' },
  { id: 'minecraft:quartz_block', name: 'Block of Quartz', hex: '#ebece8', r: 235, g: 236, b: 232, group: 'special' },
  { id: 'minecraft:purpur_block', name: 'Purpur Block', hex: '#a87ca8', r: 168, g: 124, b: 168, group: 'special' },
  { id: 'minecraft:slime_block', name: 'Slime Block', hex: '#7bb423', r: 123, g: 180, b: 35, group: 'special' },
  { id: 'minecraft:end_stone', name: 'End Stone', hex: '#dee3a4', r: 222, g: 227, b: 164, group: 'special' },
  { id: 'minecraft:bone_block', name: 'Bone Block', hex: '#dedac9', r: 222, g: 218, b: 201, group: 'special' },
];

/**
 * Calculates distance between two colors.
 * Formula can be 'euclidean' (straight pixel Euclidean distance)
 * or 'perceptual' (human eye weighted perception).
 */
export function getDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
  formula: 'euclidean' | 'perceptual'
): number {
  if (formula === 'euclidean') {
    return Math.sqrt(
      (r1 - r2) ** 2 +
      (g1 - g2) ** 2 +
      (b1 - b2) ** 2
    );
  } else {
    // Human weighted / perceptual distance:
    // Red: 0.3, Green: 0.59, Blue: 0.11 or modern approximation:
    const meanR = (r1 + r2) / 2;
    const rDiff = r1 - r2;
    const gDiff = g1 - g2;
    const bDiff = b1 - b2;
    const weightR = 2 + meanR / 256;
    const weightG = 4.0;
    const weightB = 2 + (255 - meanR) / 256;
    return Math.sqrt(weightR * (rDiff ** 2) + weightG * (gDiff ** 2) + weightB * (bDiff ** 2));
  }
}

/**
 * Finds the closest block in the provided list to the target RGB color.
 */
export function findClosestBlock(
  r: number,
  g: number,
  b: number,
  blocks: MCBlock[],
  formula: 'euclidean' | 'perceptual' = 'perceptual'
): MCBlock {
  if (blocks.length === 0) {
    return MC_BLOCKS[0]; // Fallback
  }

  let minDistance = Infinity;
  let closestBlock = blocks[0];

  for (const block of blocks) {
    const dist = getDistance(r, g, b, block.r, block.g, block.b, formula);
    if (dist < minDistance) {
      minDistance = dist;
      closestBlock = block;
    }
  }

  return closestBlock;
}

/**
 * Processes image pixels using Floyd-Steinberg dithering
 * and maps pixels to the selected Minecraft blocks.
 */
export function applyDitheringAndBlockMapping(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  availableBlocks: MCBlock[],
  formula: 'euclidean' | 'perceptual' = 'perceptual',
  useDithering: boolean = true
): { blockArray: MCBlock[]; outputPixels: Uint8ClampedArray } {
  const size = width * height;
  const blockArray: MCBlock[] = new Array(size);
  const outputPixels = new Uint8ClampedArray(pixels.length);

  if (!useDithering) {
    // Direct mapping
    for (let i = 0; i < size; i++) {
      const pxIdx = i * 4;
      const r = pixels[pxIdx];
      const g = pixels[pxIdx + 1];
      const b = pixels[pxIdx + 2];
      const alpha = pixels[pxIdx + 3];

      if (alpha < 64) {
        // Transparent is mapped to air (transparency helper)
        blockArray[i] = { id: 'minecraft:air', name: 'Air', hex: '#000000', r: 0, g: 0, b: 0, group: 'special' };
        outputPixels[pxIdx] = 0;
        outputPixels[pxIdx + 1] = 0;
        outputPixels[pxIdx + 2] = 0;
        outputPixels[pxIdx + 3] = 0;
      } else {
        const closest = findClosestBlock(r, g, b, availableBlocks, formula);
        blockArray[i] = closest;
        outputPixels[pxIdx] = closest.r;
        outputPixels[pxIdx + 1] = closest.g;
        outputPixels[pxIdx + 2] = closest.b;
        outputPixels[pxIdx + 3] = 255;
      }
    }
    return { blockArray, outputPixels };
  }

  // Floyd-Steinberg Dithering
  // Work with a mutable copy of coordinates of pixels representing RGB
  const imgData = new Float32Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    imgData[i] = pixels[i];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = imgData[idx + 3];

      if (alpha < 64) {
        blockArray[y * width + x] = { id: 'minecraft:air', name: 'Air', hex: '#000000', r: 0, g: 0, b: 0, group: 'special' };
        outputPixels[idx] = 0;
        outputPixels[idx + 1] = 0;
        outputPixels[idx + 2] = 0;
        outputPixels[idx + 3] = 0;
        continue;
      }

      const oldR = imgData[idx];
      const oldG = imgData[idx + 1];
      const oldB = imgData[idx + 2];

      const closest = findClosestBlock(oldR, oldG, oldB, availableBlocks, formula);
      blockArray[y * width + x] = closest;

      outputPixels[idx] = closest.r;
      outputPixels[idx + 1] = closest.g;
      outputPixels[idx + 2] = closest.b;
      outputPixels[idx + 3] = 255;

      const errR = oldR - closest.r;
      const errG = oldG - closest.g;
      const errB = oldB - closest.b;

      // Distribute error
      // Pixel right: (x + 1, y)   weight = 7/16
      if (x + 1 < width) {
        const nextIdx = (y * width + (x + 1)) * 4;
        if (imgData[nextIdx + 3] >= 64) {
          imgData[nextIdx] += errR * (7 / 16);
          imgData[nextIdx + 1] += errG * (7 / 16);
          imgData[nextIdx + 2] += errB * (7 / 16);
        }
      }
      // Pixel bottom-left: (x - 1, y + 1)   weight = 3/16
      if (y + 1 < height && x - 1 >= 0) {
        const nextIdx = ((y + 1) * width + (x - 1)) * 4;
        if (imgData[nextIdx + 3] >= 64) {
          imgData[nextIdx] += errR * (3 / 16);
          imgData[nextIdx + 1] += errG * (3 / 16);
          imgData[nextIdx + 2] += errB * (3 / 16);
        }
      }
      // Pixel bottom: (x, y + 1)   weight = 5/16
      if (y + 1 < height) {
        const nextIdx = ((y + 1) * width + x) * 4;
        if (imgData[nextIdx + 3] >= 64) {
          imgData[nextIdx] += errR * (5 / 16);
          imgData[nextIdx + 1] += errG * (5 / 16);
          imgData[nextIdx + 2] += errB * (5 / 16);
        }
      }
      // Pixel bottom-right: (x + 1, y + 1)   weight = 1/16
      if (y + 1 < height && x + 1 < width) {
        const nextIdx = ((y + 1) * width + (x + 1)) * 4;
        if (imgData[nextIdx + 3] >= 64) {
          imgData[nextIdx] += errR * (1 / 16);
          imgData[nextIdx + 1] += errG * (1 / 16);
          imgData[nextIdx + 2] += errB * (1 / 16);
        }
      }
    }
  }

  return { blockArray, outputPixels };
}
