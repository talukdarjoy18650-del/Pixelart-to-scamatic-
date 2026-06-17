import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileCode, 
  Download, 
  Settings, 
  HelpCircle, 
  Layers, 
  RefreshCw, 
  Eye, 
  Grid, 
  Check, 
  Search, 
  Compass, 
  Info, 
  Clipboard, 
  FileJson,
  CheckCircle2,
  ListFilter,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MC_BLOCKS, 
  MCBlock, 
  applyDitheringAndBlockMapping 
} from './utils/blocks';
import { 
  buildSchematicBuffer, 
  buildLitematicBuffer,
  compressSchematic,
  decompressSchematic,
  NBTReader,
  decodeVarIntList,
  unpackLitematicBlockStates
} from './utils/nbt';

interface SchematicResult {
  blockArray: MCBlock[];
  imgWidth: number;
  imgHeight: number;
  palette: Map<string, number>;
  blockDataIds: number[];
  uniqueBlocksUsed: { block: MCBlock; count: number; percentage: number }[];
  outputDataUrl: string;
}

interface HoveredPixel {
  x: number;
  y: number;
  mcX: number;
  mcY: number;
  mcZ: number;
  block: MCBlock;
}

export default function App() {
  // Console logging state matching High Density style
  const [logs, setLogs] = useState<string[]>([]);

  // Function to add structured logs
  const addLog = (msg: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [...prev.slice(-30), `[${timestamp}] ${msg}`]);
  };

  // Image loading states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('image');
  
  // Controls
  const [maxDim, setMaxDim] = useState<number>(64);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [formula, setFormula] = useState<'perceptual' | 'euclidean'>('perceptual');
  const [useDithering, setUseDithering] = useState<boolean>(true);
  const [smoothResize, setSmoothResize] = useState<boolean>(false);
  const [dataVersion, setDataVersion] = useState<number>(4189); // Default: 1.21.4
  const [fileFormat, setFileFormat] = useState<'litematic' | 'schem'>('litematic');
  
  // Allowed groups
  const [allowedGroups, setAllowedGroups] = useState<Set<string>>(
    new Set(['concrete', 'wool', 'terracotta', 'wood', 'gems', 'special'])
  );
  
  // App UI Helpers
  const [searchMaterial, setSearchMaterial] = useState<string>('');
  const [hoveredPixel, setHoveredPixel] = useState<HoveredPixel | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [schematicResult, setSchematicResult] = useState<SchematicResult | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [copiedMaterials, setCopiedMaterials] = useState<boolean>(false);

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minecraft version list with NBT DataVersion keys
  const MC_VERSIONS = [
    { label: '1.21.4 (4189)', value: 4189 },
    { label: '1.20+ (3437)', value: 3437 },
    { label: '1.19+ (3120)', value: 3120 },
    { label: '1.18+ (2975)', value: 2975 },
    { label: '1.17+ (2730)', value: 2730 },
    { label: '1.16+ (2586)', value: 2586 },
  ];

  // Initialize workspace logs on mount
  useEffect(() => {
    const ts = new Date().toTimeString().split(' ')[0];
    setLogs([
      `[${ts}] Workspace Initialized: PIXEL2SCHEM Compiler active.`,
      `[${ts}] Palette registry loaded: 168 available block definitions.`,
      `[${ts}] Compression configuration: GZIP big-endian NBT encoder ready.`,
      `[${ts}] System status: Awaiting voxel target stream...`
    ]);
  }, []);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const lowerName = file.name.toLowerCase();
      const isLitematic = lowerName.endsWith('.litematic');
      const isSchem = lowerName.endsWith('.schem') || lowerName.endsWith('.schematic');

      if (isLitematic || isSchem) {
        addLog(`Reader streaming: Loading schematic file "${file.name}" into decompression interface...`);
        setFileName(file.name);
        
        const gzippedBytes = await decompressSchematic(file);
        addLog(`Reader decompressed: Binary buffer size = ${gzippedBytes.length} bytes. Parsing NBT structural records...`);
        
        const reader = new NBTReader(gzippedBytes.buffer);
        const root = reader.readRoot();
        addLog(`NBT structural tree parsed successfully.`);
        
        let Width_mc = 0;
        let Height_mc = 0;
        let Length_mc = 0;
        let blockDataIds: number[] = [];
        let blockIdStrings: string[] = [];
        const palette = new Map<string, number>();

        if (isLitematic) {
          if (!root.val.Regions) {
            throw new Error('Litematic file contains no Regions tag.');
          }
          const regionKeys = Object.keys(root.val.Regions);
          if (regionKeys.length === 0) {
            throw new Error('Litematic Regions element is empty.');
          }
          const region = root.val.Regions[regionKeys[0]];
          Width_mc = Math.abs(Number(region.Size.x));
          Height_mc = Math.abs(Number(region.Size.y));
          Length_mc = Math.abs(Number(region.Size.z));
          addLog(`Litematica Region [${regionKeys[0]}] loaded: Size = (${Width_mc} x ${Height_mc} x ${Length_mc}).`);

          const paletteList = region.BlockStatePalette.list;
          for (let i = 0; i < paletteList.length; i++) {
            const name = paletteList[i].Name || 'minecraft:air';
            palette.set(name, i);
            blockIdStrings.push(name);
          }

          const rawLongs = region.BlockStates;
          blockDataIds = unpackLitematicBlockStates(rawLongs, Width_mc, Height_mc, Length_mc, paletteList.length);
        } else {
          Width_mc = Number(root.val.Width);
          Height_mc = Number(root.val.Height);
          Length_mc = Number(root.val.Length);
          addLog(`Sponge Schematic loaded: Size = (${Width_mc} x ${Height_mc} x ${Length_mc}).`);

          for (const [blockName, idxVal] of Object.entries(root.val.Palette || {})) {
            const numIdx = Number(idxVal);
            palette.set(blockName, numIdx);
            blockIdStrings[numIdx] = blockName;
          }

          blockDataIds = decodeVarIntList(root.val.BlockData);
        }

        // Standardize output bounds to 2D image coordinates
        const targetW = Width_mc;
        const targetH = Height_mc === 1 ? Length_mc : Height_mc;
        
        if (targetW > 1000 || targetH > 1000) {
          throw new Error('Schematic is too large to render safely in the browser.');
        }

        addLog(`Mapping schematic block indices to 2D image preview (${targetW}x${targetH}px)...`);

        const blockArray = new Array<MCBlock>(targetW * targetH);
        for (let row = 0; row < targetH; row++) {
          for (let col = 0; col < targetW; col++) {
            let unpackedIdx = 0;
            if (Height_mc === 1) {
              unpackedIdx = row * targetW + col; // Horizontal
            } else if (Length_mc === 1) {
              const y = (targetH - 1) - row; // Vertical (reverse Y)
              unpackedIdx = y * targetW + col;
            } else {
              unpackedIdx = row * targetW + col; // 3D fallback
            }

            const paletteId = blockDataIds[unpackedIdx] || 0;
            const blockName = blockIdStrings[paletteId] || 'minecraft:air';

            const blockDef = MC_BLOCKS.find(b => b.id === blockName) || {
              id: blockName,
              name: blockName.replace('minecraft:', '').replace(/_/g, ' ').toUpperCase(),
              hex: '#888888',
              r: 128, g: 128, b: 128,
              group: 'special' as const
            };
            blockArray[row * targetW + col] = blockDef as MCBlock;
          }
        }

        // Draw image pixels
        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetW;
        outCanvas.height = targetH;
        const outCtx = outCanvas.getContext('2d');
        if (outCtx) {
          const outImgData = outCtx.createImageData(targetW, targetH);
          const pixels = outImgData.data;
          for (let i = 0; i < blockArray.length; i++) {
            const block = blockArray[i];
            const pIdx = i * 4;
            pixels[pIdx] = block.r;
            pixels[pIdx + 1] = block.g;
            pixels[pIdx + 2] = block.b;
            pixels[pIdx + 3] = block.id === 'minecraft:air' ? 0 : 255; // transparent air
          }
          outCtx.putImageData(outImgData, 0, 0);
        }
        const outputDataUrl = outCanvas.toDataURL();

        // Calculate material totals
        const totalsMap = new Map<string, number>();
        for (const blk of blockArray) {
          if (blk.id !== 'minecraft:air') {
            totalsMap.set(blk.id, (totalsMap.get(blk.id) || 0) + 1);
          }
        }

        const totalValidBlocks = Array.from(totalsMap.values()).reduce((a, b) => a + b, 0);
        const uniqueBlocksUsed = Array.from(totalsMap.entries())
          .map(([id, count]) => {
            const blockDef = MC_BLOCKS.find(b => b.id === id) || {
              id,
              name: id.replace('minecraft:', '').replace(/_/g, ' ').toUpperCase(),
              hex: '#888888',
              r: 128, g: 128, b: 128,
              group: 'special' as const
            };
            return {
              block: blockDef as MCBlock,
              count,
              percentage: totalValidBlocks > 0 ? Math.round((count / totalValidBlocks) * 1000) / 10 : 0
            };
          })
          .sort((a, b) => b.count - a.count);

        setSchematicResult({
          blockArray,
          imgWidth: targetW,
          imgHeight: targetH,
          palette,
          blockDataIds,
          uniqueBlocksUsed,
          outputDataUrl
        });

        const rezippedBlob = await compressSchematic(gzippedBytes);
        setDownloadBlob(rezippedBlob);
        setFileFormat(isLitematic ? 'litematic' : 'schem');
        addLog(`Reader finished: Loaded and rendered "${file.name}" successfully!`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file (PNG, JPG, WEBP) or Minecraft schematic (.litematic, .schem, .schematic).');
        addLog(`Error: Invalid file type "${file.type}" rejected.`);
        return;
      }
      setFileName(file.name);
      addLog(`Stream detected: Loading image file "${file.name}" into virtual compiler...`);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      addLog(`❌ Reader failure: ${err.message || 'Error occurred while decoding schematic NBT.'}`);
      alert(`Failed to parse schematic: ${err.message || 'Invalid or corrupted file.'}`);
    }
  };

  // Toggle groups
  const toggleGroup = (group: string) => {
    const next = new Set(allowedGroups);
    if (next.has(group)) {
      if (next.size <= 1) return; // Must have at least one
      next.delete(group);
      addLog(`Config change: Excluded "${group}" palette blocks from match mapping.`);
    } else {
      next.add(group);
      addLog(`Config change: Included "${group}" palette blocks in match mapping.`);
    }
    setAllowedGroups(next);
  };

  // Process the image and map components client-side!
  useEffect(() => {
    if (!imageSrc) return;

    setIsProcessing(true);
    const img = new Image();
    img.src = imageSrc;

    img.onload = async () => {
      try {
        addLog(`Compiling: Raw image loaded (${img.width}x${img.height}px). Sizing...`);
        // Compute resized dimensions representing max constraint bounds
        let targetW = img.width;
        let targetH = img.height;

        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDim) / targetW);
            targetW = maxDim;
          } else {
            targetW = Math.round((targetW * maxDim) / targetH);
            targetH = maxDim;
          }
          addLog(`Resolution clamp: Scaled down model to fit target resolution bound ${maxDim}px.`);
        }

        // Just in case, constrain minimum 1px bounds
        targetW = Math.max(1, targetW);
        targetH = Math.max(1, targetH);

        addLog(`Target schematic volume: Width=${targetW} voxels, Height=${targetH} voxels.`);

        // Render on a virtual off-screen canvas to obtain pixels
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setIsProcessing(false);
          addLog(`Error: Could not render 2D context canvas.`);
          return;
        }

        // Use pixelated (sharp) scaling vs smoothed scaling
        ctx.imageSmoothingEnabled = smoothResize;
        ctx.drawImage(img, 0, 0, targetW, targetH);
        
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const pixels = imageData.data;

        // Filter standard blocks based on allowed choices
        const activeBlocksList = MC_BLOCKS.filter(b => allowedGroups.has(b.group));
        addLog(`Matching state: Active mapping palette contains ${activeBlocksList.length} blocks.`);

        // Execute block mapping and dither error distribution
        addLog(`Distance metrics: Formula = [${formula}], Dithering = [${useDithering ? 'FLOYD_STEINBERG' : 'NONE'}]. Converting...`);
        const { blockArray, outputPixels } = applyDitheringAndBlockMapping(
          pixels,
          targetW,
          targetH,
          activeBlocksList,
          formula,
          useDithering
        );

        // Generate matching output canvas data URL
        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetW;
        outCanvas.height = targetH;
        const outCtx = outCanvas.getContext('2d');
        if (outCtx) {
          const outImgData = outCtx.createImageData(targetW, targetH);
          outImgData.data.set(outputPixels);
          outCtx.putImageData(outImgData, 0, 0);
        }
        const outputDataUrl = outCanvas.toDataURL();

        // -----------------------------------------------------
        // NBT Palette and Voxel Coordinates assembly
        // Build WorldEdit palettes and VarInt layout mapping:
        // -----------------------------------------------------
        let Width_mc = 0;
        let Height_mc = 0;
        let Length_mc = 0;

        if (orientation === 'vertical') {
          Width_mc = targetW;
          Height_mc = targetH;
          Length_mc = 1;
        } else {
          Width_mc = targetW;
          Height_mc = 1;
          Length_mc = targetH;
        }

        addLog(`NBT block volume bounds defined: [Width:${Width_mc}, Height:${Height_mc}, Length:${Length_mc}].`);

        // Gather unique block types used to build the schematic Palette
        const palette = new Map<string, number>();
        // Add "minecraft:air" by default so we always have a background spacer state if transparent
        palette.set('minecraft:air', 0);

        let nextPaletteId = 1;
        const blockDataIds: number[] = [];

        // Loop over voxel coordinates sequentially to match standard Sponge index layout:
        // indexIndex = (y * Length + z) * Width + x
        for (let y = 0; y < Height_mc; y++) {
          for (let z = 0; z < Length_mc; z++) {
            for (let x = 0; x < Width_mc; x++) {
              let blockIdString = 'minecraft:air';

              if (orientation === 'vertical') {
                const imgCol = x;
                const imgRow = (targetH - 1) - y; // Inverse Y representing bottom upward placement
                const index = imgRow * targetW + imgCol;
                blockIdString = blockArray[index]?.id || 'minecraft:air';
              } else {
                const imgCol = x;
                const imgRow = z;
                const index = imgRow * targetW + imgCol;
                blockIdString = blockArray[index]?.id || 'minecraft:air';
              }

              // Allocate NBT key within the Palette compound
              if (!palette.has(blockIdString)) {
                palette.set(blockIdString, nextPaletteId);
                nextPaletteId++;
              }

              blockDataIds.push(palette.get(blockIdString)!);
            }
          }
        }

        // Material totals calculations
        const totalsMap = new Map<string, number>();
        for (const blk of blockArray) {
          if (blk.id !== 'minecraft:air') {
            totalsMap.set(blk.id, (totalsMap.get(blk.id) || 0) + 1);
          }
        }

        const totalValidBlocks = Array.from(totalsMap.values()).reduce((a, b) => a + b, 0);

        const uniqueBlocksUsed = Array.from(totalsMap.entries())
          .map(([id, count]) => {
            const blockDef = MC_BLOCKS.find(b => b.id === id) || {
              id,
              name: id.replace('minecraft:', '').replace(/_/g, ' ').toUpperCase(),
              hex: '#888888',
              r: 128, g: 128, b: 128,
              group: 'special' as const
            };
            return {
              block: blockDef as MCBlock,
              count,
              percentage: totalValidBlocks > 0 ? Math.round((count / totalValidBlocks) * 1000) / 10 : 0
            };
          })
          .sort((a, b) => b.count - a.count);

        addLog(`NBT Palette assembled: Included ${palette.size} unique block types.`);

        // Package into correct schematic buffer and compress synchronously!
        let nbtBytes: Uint8Array;
        if (fileFormat === 'litematic') {
          nbtBytes = buildLitematicBuffer({
            width: Width_mc,
            height: Height_mc,
            length: Length_mc,
            dataVersion,
            palette,
            blockDataIds,
            name: fileName
          });
          addLog(`Serializing Litematica structure... Compiling binary protocol.`);
        } else {
          nbtBytes = buildSchematicBuffer({
            width: Width_mc,
            height: Height_mc,
            length: Length_mc,
            dataVersion,
            palette,
            blockDataIds
          });
          addLog(`Serializing Sponge schematic... Compiling binary protocol.`);
        }

        addLog(`Executing GZIP compression stream...`);
        const zippedBlob = await compressSchematic(nbtBytes);

        setSchematicResult({
          blockArray,
          imgWidth: targetW,
          imgHeight: targetH,
          palette,
          blockDataIds,
          uniqueBlocksUsed,
          outputDataUrl
        });

        setDownloadBlob(zippedBlob);
        setIsProcessing(false);
        addLog(`✅ Pipeline SUCCESS: Generated ${fileFormat.toUpperCase()} of size ${(zippedBlob.size / 1024).toFixed(2)} KB.`);
      } catch (err) {
        console.error('Error generating block layout representation', err);
        setIsProcessing(false);
        addLog(`❌ Error compiling voxel map: ${(err as Error).message}`);
      }
    };

    img.onerror = () => {
      setIsProcessing(false);
      addLog(`❌ File structure error: Could not process uploaded image format.`);
      alert('Could not process the uploaded image.');
    };

  }, [imageSrc, maxDim, orientation, formula, useDithering, smoothResize, dataVersion, allowedGroups, fileFormat, fileName]);

  // Handle material inspect coordinates over the output preview img
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!schematicResult) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const col = Math.floor(xRatio * schematicResult.imgWidth);
    const row = Math.floor(yRatio * schematicResult.imgHeight);

    if (col >= 0 && col < schematicResult.imgWidth && row >= 0 && row < schematicResult.imgHeight) {
      const idx = row * schematicResult.imgWidth + col;
      const block = schematicResult.blockArray[idx];

      let mcX = col;
      let mcY = 0;
      let mcZ = 0;

      if (orientation === 'vertical') {
        mcY = (schematicResult.imgHeight - 1) - row;
        mcZ = 0;
      } else {
        mcY = 0;
        mcZ = row;
      }

      setHoveredPixel({
        x: col,
        y: row,
        mcX,
        mcY,
        mcZ,
        block
      });
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredPixel(null);
  };

  // Click on canvas to add placeholder sample image to try out
  const loadDemoImage = () => {
    addLog(`Demo trigger: Loading procedural 16x16 pixel icon...`);
    // Generate a beautiful, clean pixelated demo gradient grid representing an epic minecraft block logo
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background dirt tone
      ctx.fillStyle = '#866043';
      ctx.fillRect(0, 0, 16, 16);
      
      // Grass topper
      ctx.fillStyle = '#5bd73b';
      ctx.fillRect(0, 0, 16, 4);
      
      // A cute glowing heart pixel art inside the center
      ctx.fillStyle = '#f23a3a';
      // Center heart pixels
      ctx.fillRect(4, 7, 2, 2);
      ctx.fillRect(10, 7, 2, 2);
      ctx.fillRect(5, 9, 6, 2);
      ctx.fillRect(6, 11, 4, 2);
      ctx.fillRect(7, 13, 2, 2);
      ctx.fillRect(4, 6, 8, 1);
    }
    
    setImageSrc(canvas.toDataURL());
    setFileName('minecraft_demo.png');
    addLog(`Demo state: minecraft_demo.png generated. Ready for voxelization.`);
  };

  const handleDownload = () => {
    if (!downloadBlob) return;
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.href = url;
    a.download = `${cleanName || 'block_art'}.${fileFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export materials list as plain text markdown table
  const copyMaterialsList = () => {
    if (!schematicResult) return;
    let listText = `MINECRAFT SCHEMATIC CONVERSION LIST\n`;
    listText += `Dimensions: ${orientation === 'vertical' ? `${schematicResult.imgWidth}x${schematicResult.imgHeight}x1 (Vertical Wall)` : `${schematicResult.imgWidth}x1x${schematicResult.imgHeight} (Horizontal Floor)`}\n`;
    listText += `Total blocks: ${schematicResult.blockArray.filter(b => b.id !== 'minecraft:air').length}\n\n`;
    listText += `| Minecraft Block | Count | Percentage |\n`;
    listText += `| :--- | :--- | :--- |\n`;
    
    for (const item of schematicResult.uniqueBlocksUsed) {
      listText += `| ${item.block.name} (\`${item.block.id}\`) | ${item.count} | ${item.percentage}% |\n`;
    }

    navigator.clipboard.writeText(listText).then(() => {
      setCopiedMaterials(true);
      setTimeout(() => setCopiedMaterials(false), 2000);
    });
  };

  // Filter based on standard user search
  const filteredMaterials = useMemo(() => {
    if (!schematicResult) return [];
    if (!searchMaterial.trim()) return schematicResult.uniqueBlocksUsed;
    const query = searchMaterial.toLowerCase();
    return schematicResult.uniqueBlocksUsed.filter(
      item => item.block.name.toLowerCase().includes(query) || item.block.id.toLowerCase().includes(query)
    );
  }, [schematicResult, searchMaterial]);

  const totalBlockCount = useMemo(() => {
    if (!schematicResult) return 0;
    return schematicResult.blockArray.filter(b => b.id !== 'minecraft:air').length;
  }, [schematicResult]);

  return (
    <div className="min-h-screen flex flex-col bg-[#E4E3E0] text-[#141414] font-sans overflow-x-hidden border-[6px] md:border-[12px] border-[#141414] selection:bg-[#141414] selection:text-white transition-all">
      
      {/* 1. TOP DENSE HEADER */}
      <header className="h-auto min-h-12 flex flex-col md:flex-row items-center justify-between px-4 py-3 md:py-0 border-b-2 border-[#141414] bg-[#141414] text-white">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-black tracking-tighter text-lg uppercase">PIXEL2SCHEM</span>
          <span className="px-2 py-0.5 bg-[#22c55e] text-[10px] font-bold text-black uppercase tracking-wider">
            Engine v1.0.4-stable
          </span>
        </div>
        <div className="flex items-center gap-6 text-[10px] sm:text-[11px] font-mono opacity-80 mt-2 md:mt-0 flex-wrap justify-between w-full md:w-auto">
          <span className="hidden sm:inline">SYS_STATUS: OPTIMAL</span>
          <span className="hidden sm:inline">MEM_USAGE: 244MB</span>
          <span>SYSTEM_TIME: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          <button 
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-neutral-200 text-black border border-[#141414] text-[9px] font-extrabold uppercase transition-all duration-150 cursor-pointer active:translate-y-0.5"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Pasting Info {showGuide ? '▼' : '▲'}</span>
          </button>
        </div>
      </header>

      {/* 2. BRUTALIST PASTING COLLAPSIBLE TUTORIAL */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#DEDCD7] border-b-2 border-[#141414]"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 text-xs text-[#141414] grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
              <div className="flex gap-3 border-r-0 md:border-r border-[#141414]/20 last:border-0 pr-0 md:pr-4">
                <div className="flex-none h-6 w-6 bg-[#141414] text-white font-bold flex items-center justify-center border border-[#141414] ring-1 ring-white/30 text-[10px]">1</div>
                <div>
                  <h4 className="font-extrabold text-[#141414] uppercase mb-1">Place File</h4>
                  <p className="text-[11px] leading-relaxed opacity-85">
                    Download the file and save it inside your server directories under:
                    <code className="block mt-1 p-1 bg-white border border-[#141414] text-[10px] text-green-700 whitespace-pre-wrap break-all">
                      plugins/WorldEdit/schematics/
                    </code>
                  </p>
                </div>
              </div>
              <div className="flex gap-3 border-r-0 md:border-r border-[#141414]/20 last:border-0 pr-0 md:pr-4">
                <div className="flex-none h-6 w-6 bg-[#141414] text-white font-bold flex items-center justify-center border border-[#141414] ring-1 ring-white/30 text-[10px]">2</div>
                <div>
                  <h4 className="font-extrabold text-[#141414] uppercase mb-1">Load Schematic</h4>
                  <p className="text-[11px] leading-relaxed opacity-85">
                    Execute standard WorldEdit in-game loading command:
                    <code className="block mt-1 p-1 bg-white border border-[#141414] text-[10px] text-green-700">
                      /schematic load &lt;filename&gt;
                    </code>
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-none h-6 w-6 bg-[#141414] text-white font-bold flex items-center justify-center border border-[#141414] ring-1 ring-white/30 text-[10px]">3</div>
                <div>
                  <h4 className="font-extrabold text-[#141414] uppercase mb-1">Paste into World</h4>
                  <p className="text-[11px] leading-relaxed opacity-85">
                    Look in direction of placement and trigger paste:
                    <code className="block mt-1 p-1 bg-white border border-[#141414] text-[10px] text-green-700 mb-1">
                      //paste -a
                    </code>
                    <span className="text-[9px] opacity-70 block leading-tight">"-a" skips air blocks so you don't overwrite ground!</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ==================== LEFT COLUMN: CONTROLS (5 cols) ==================== */}
        <section className="lg:col-span-5 flex flex-col gap-6">

          {/* BRUTAL CONVERSION LOGIC ADAPTED PORTLET */}
          <div className="bg-white border-4 border-[#141414] shadow-[8px_8px_0px_#141414] p-5 flex flex-col gap-5">
            <div>
              <label className="block text-[10px] font-extrabold uppercase mb-2 opacity-60 tracking-wider">Source Pixel Input</label>
              
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed border-[#141414] bg-white transition-all p-5 text-center ${
                  (imageSrc || schematicResult)
                    ? 'bg-[#CECCC7]/30' 
                    : 'hover:bg-[#CECCC7]/20'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*,.litematic,.schem,.schematic" 
                  className="hidden" 
                />

                {!imageSrc && !schematicResult ? (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-[#141414] text-white flex items-center justify-center mb-2 shadow-[2px_2px_0px_#22c55e]">
                      <Upload className="h-5 w-5 text-[#22c55e]" />
                    </div>
                    <span className="text-[11px] font-black uppercase text-[#141414] tracking-tight">DRAG & DROP IMAGE OR SCHEMATIC</span>
                    <span className="text-[10px] opacity-75 mb-3">PNG, JPG, WEBP, .litematic, or .schem files.</span>
                    <div className="flex gap-2 w-full justify-center">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-[10px] font-bold bg-[#141414] text-white border border-[#141414] hover:bg-gray-800 transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        Choose File
                      </button>
                      <button 
                        type="button"
                        onClick={loadDemoImage}
                        className="px-3 py-1.5 text-[10px] font-bold bg-[#E4E3E0] text-[#141414] border border-[#141414] hover:bg-neutral-300 transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        Use Demo Art
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full text-left">
                    <div className="flex items-center gap-3 bg-[#E4E3E0] p-2 border border-[#141414]">
                      <img 
                        src={imageSrc || schematicResult?.outputDataUrl} 
                        alt="Original Thumb" 
                        className="h-12 w-12 object-contain bg-neutral-100 border border-[#141414] image-render-pixel" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[#141414] truncate font-mono uppercase">{fileName}</p>
                        <p className="text-[9px] text-[#141414] opacity-75 font-mono">
                          Parsed & Loaded OK.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setImageSrc(null);
                          setSchematicResult(null);
                          setDownloadBlob(null);
                        }}
                        className="text-[10px] font-extrabold px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white border border-[#141414] cursor-pointer"
                      >
                        RESET
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PARAMETERS PANEL */}
            <div className="flex flex-col gap-5 border-t-2 border-[#141414] pt-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-black" />
                <span className="font-extrabold text-xs uppercase tracking-wider">Schematic Compiler Config</span>
              </div>

              {/* RESOLUTION SLIDER */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#141414] uppercase tracking-wider flex items-center gap-1">
                    <span>Target Scale Bounds</span>
                    <Info className="h-3 w-3 text-gray-500 cursor-help" title="Max dimension in blocks. Larger blocks produce more detail but take more materials." />
                  </label>
                  <span className="text-[10px] font-mono font-black text-black bg-[#22c55e] px-2 py-0.5 border border-[#141414] shadow-[1px_1px_0px_#141414]">
                    {maxDim} &times; {maxDim} max
                  </span>
                </div>
                <input 
                  type="range"
                  min="16"
                  max="256"
                  step="8"
                  value={maxDim}
                  onChange={(e) => setMaxDim(parseInt(e.target.value))}
                  className="w-full accent-[#141414] bg-[#CECCC7] h-2 border border-[#141414] cursor-pointer"
                />
                <span className="text-[10px] text-black font-mono leading-normal opacity-75">
                  {maxDim <= 64 ? '⚡ Ultra-fast conversion. Fits easily in single selection pastes.' : maxDim <= 128 ? '⚖️ Balanced block count. Excellent for standard murals.' : '⚠️ High resolution. Large schematic output file, pasting requires caution!'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* PLACEMENT STYLE */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-[#141414] uppercase tracking-wider">
                    Placement Style
                  </label>
                  <div className="grid grid-cols-2 bg-[#DEDCD7] p-1 border-2 border-[#141414] text-[10px] font-bold">
                    <button 
                      type="button"
                      onClick={() => setOrientation('vertical')}
                      className={`py-1 rounded-none transition-all flex items-center justify-center gap-1 ${
                        orientation === 'vertical' 
                          ? 'bg-[#141414] text-white font-extrabold' 
                          : 'hover:bg-black/10 text-[#141414]'
                      }`}
                    >
                      <span>Wall (Y X)</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setOrientation('horizontal')}
                      className={`py-1 rounded-none transition-all flex items-center justify-center gap-1 ${
                        orientation === 'horizontal' 
                          ? 'bg-[#141414] text-white font-extrabold' 
                          : 'hover:bg-black/10 text-[#141414]'
                      }`}
                    >
                      <span>Floor (X Z)</span>
                    </button>
                  </div>
                </div>

                {/* EXPORT FILE SPEC */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-[#141414] uppercase tracking-wider">
                    Export Format
                  </label>
                  <div className="grid grid-cols-2 bg-[#DEDCD7] p-1 border-2 border-[#141414] text-[10px] font-bold">
                    <button 
                      type="button"
                      onClick={() => setFileFormat('litematic')}
                      className={`py-1 rounded-none transition-all flex items-center justify-center gap-1 ${
                        fileFormat === 'litematic' 
                          ? 'bg-[#141414] text-white font-extrabold' 
                          : 'hover:bg-black/10 text-[#141414]'
                      }`}
                      title="Litematica Mod (highly recommended for PojavLauncher/Litematica users)"
                    >
                      <span>Litematic</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFileFormat('schem')}
                      className={`py-1 rounded-none transition-all flex items-center justify-center gap-1 ${
                        fileFormat === 'schem' 
                          ? 'bg-[#141414] text-white font-extrabold' 
                          : 'hover:bg-black/10 text-[#141414]'
                      }`}
                      title="Sponge WorldEdit Schematic"
                    >
                      <span>Schematic</span>
                    </button>
                  </div>
                </div>

                {/* TARGET MC VERSION */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-[#141414] uppercase tracking-wider">
                    Target Format MC
                  </label>
                  <select 
                    value={dataVersion}
                    onChange={(e) => setDataVersion(parseInt(e.target.value))}
                    className="bg-white border-2 border-[#141414] text-black rounded-none p-1.5 text-xs font-mono font-bold focus:bg-yellow-50 focus:outline-none focus:ring-0"
                  >
                    {MC_VERSIONS.map((v) => (
                      <option key={v.value} value={v.value}>
                        MC {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* COLOR FORMULA & DITHERING */}
              <div className="bg-[#CECCC7] p-3.5 border-2 border-[#141414] flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* MATCH FORMULA */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-[#141414] tracking-wider">Match Algorithm</label>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 text-xs text-[#141414] cursor-pointer font-bold select-none">
                        <input 
                          type="radio" 
                          name="formula" 
                          checked={formula === 'perceptual'} 
                          onChange={() => setFormula('perceptual')}
                          className="accent-[#141414] h-3.5 w-3.5 border-2 border-[#141414]"
                        />
                        <span>Perceptual Human Weight</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#141414] cursor-pointer font-bold select-none">
                        <input 
                          type="radio" 
                          name="formula" 
                          checked={formula === 'euclidean'} 
                          onChange={() => setFormula('euclidean')}
                          className="accent-[#141414] h-3.5 w-3.5 border-2 border-[#141414]"
                        />
                        <span>Euclidean Distance</span>
                      </label>
                    </div>
                  </div>

                  {/* VISUAL LAYOUT TWEAKS */}
                  <div className="flex flex-col gap-2.5 justify-center">
                    <label className="flex items-center gap-2 text-xs text-[#141414] cursor-pointer font-bold select-none">
                      <input 
                        type="checkbox" 
                        checked={useDithering} 
                        onChange={() => setUseDithering(!useDithering)}
                        className="accent-[#141414] h-4 w-4 border-2 border-[#141414] rounded-none"
                      />
                      <div>
                        <span className="font-extrabold text-[11px] uppercase">Use Dithering</span>
                        <p className="text-[9px] text-[#141414] opacity-75 font-mono">Floyd-Steinberg gradients</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-2 text-xs text-[#141414] cursor-pointer font-bold select-none">
                      <input 
                        type="checkbox" 
                        checked={smoothResize} 
                        onChange={() => setSmoothResize(!smoothResize)}
                        className="accent-[#141414] h-4 w-4 border-2 border-[#141414] rounded-none"
                      />
                      <div>
                        <span className="font-extrabold text-[11px] uppercase">Smooth Resize</span>
                        <p className="text-[9px] text-[#141414] opacity-75 font-mono">Antialiased resize step</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* BLOCK GROUP SELECTION FILTER */}
              <div className="flex flex-col gap-2 border-t-2 border-[#141414] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#141414] uppercase tracking-wider flex items-center gap-1">
                    <ListFilter className="h-3.5 w-3.5 text-black" />
                    <span>Allowed Block Groups</span>
                  </span>
                  <span className="text-[10px] text-black font-mono font-bold">
                    {MC_BLOCKS.filter(b => allowedGroups.has(b.group)).length} ACTIVE
                  </span>
                </div>
                <p className="text-[10px] text-[#141414] opacity-75 font-mono leading-snug">
                  Filter categories of block types included in color-matching. Optimize for local block inventory.
                </p>
                
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(['concrete', 'wool', 'terracotta', 'wood', 'gems', 'special'] as const).map(group => {
                    const label = group.charAt(0).toUpperCase() + group.slice(1);
                    const isChecked = allowedGroups.has(group);
                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className={`flex items-center justify-between p-2 rounded-none text-[11px] font-mono transition-all border-2 ${
                          isChecked 
                            ? 'bg-[#141414] border-[#141414] text-white font-extrabold shadow-[2px_2px_0px_#22c55e]' 
                            : 'bg-white border-[#141414] text-[#141414] hover:bg-neutral-100'
                        }`}
                      >
                        <span>{label}</span>
                        {isChecked && <Check className="h-3.5 w-3.5 text-[#22c55e] stroke-[3px]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* DENSE LOGS CONSOLE */}
          <div className="bg-white border-4 border-[#141414] shadow-[8px_8px_0px_#141414] p-4 flex flex-col">
            <label className="block text-[10px] font-black uppercase mb-2 opacity-65 tracking-wider font-mono">Processing System Diagnostic Log</label>
            <div className="h-36 bg-black text-green-500 font-mono text-[9px] sm:text-[10px] p-2 pr-0 leading-relaxed overflow-y-auto border-2 border-[#141414] flex flex-col gap-1 scrollbar-thin scrollbar-thumb-white scrollbar-track-transparent">
              {logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">
                  {log}
                </div>
              ))}
              <div className="text-white opacity-40 animate-pulse">[ Awaiting subsequent instructions... ]</div>
            </div>
          </div>

        </section>

        {/* ==================== RIGHT COLUMN: PREVIEW & MATERIALS (7 cols) ==================== */}
        <section className="lg:col-span-7 flex flex-col gap-6">

          {/* MAIN PREVIEW CANVAS CARD */}
          <div className="bg-[#C7C4BF] border-4 border-[#141414] overflow-hidden flex flex-col min-h-[480px] shadow-[8px_8px_0px_#141414] relative">
            
            {/* Schematic dot details overlay */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "16px 16px" }} />

            <div className="border-b-2 border-[#141414] bg-[#141414] px-5 py-3 flex items-center justify-between text-white relative z-10">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#22c55e]" />
                <h3 className="font-black text-xs uppercase tracking-wider font-mono">Interactive Schematic Voxel Canvas</h3>
              </div>
              {schematicResult && (
                <div className="text-[10px] font-mono font-bold text-[#22c55e] bg-white/15 px-2 py-0.5 border border-white/20 uppercase tracking-widest">
                  {schematicResult.imgWidth}&times;{schematicResult.imgHeight} VOXELS
                </div>
              )}
            </div>

            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
              {!imageSrc ? (
                <div className="text-center py-12 flex flex-col items-center max-w-[320px] bg-white p-6 border-2 border-[#141414] shadow-[8px_8px_0px_#141414] relative z-10 font-mono">
                  <div className="h-10 w-10 bg-[#141414] text-[#22c55e] flex items-center justify-center mb-4 text-xs font-bold border border-[#141414]">
                    AIR
                  </div>
                  <h4 className="font-extrabold text-[#141414] text-xs uppercase mb-1">Canvas Uninitialized</h4>
                  <p className="text-[11px] text-gray-600 leading-normal text-center">
                    Inject a pixel-art model or load a demo asset via the sidebar to initialize the mapping pipeline.
                  </p>
                </div>
              ) : isProcessing ? (
                <div className="text-center py-12 flex flex-col items-center bg-white p-6 border-2 border-[#141414] shadow-[8px_8px_0px_#141414] relative z-10 font-mono">
                  <RefreshCw className="h-8 w-8 text-[#141414] animate-spin mb-3" />
                  <p className="text-xs text-[#141414] font-black uppercase animate-pulse">Rasterizing voxel palette stream...</p>
                </div>
              ) : schematicResult ? (
                <div className="flex flex-col items-center w-full gap-4">
                  
                  {/* Visual Render accurate bounding box */}
                  <div className="relative z-10 bg-white p-5 border-2 border-[#141414] shadow-[12px_12px_0px_#141414] max-w-full">
                    <div className="flex justify-between items-center mb-2.5 text-[9px] font-mono text-[#141414] uppercase border-b border-[#141414]/15 pb-1 select-none">
                      <span>PREVIEW: ACCURATE BLOCK COLOR</span>
                      <span>FORMAT: {fileFormat === 'litematic' ? 'litematic-nbt' : 'sponge-nbt-schem'}</span>
                    </div>

                    <div className="relative border border-[#141414] p-1 bg-[#E4E3E0] shadow-inner">
                      <div 
                        onMouseMove={handleCanvasMouseMove}
                        onMouseLeave={handleCanvasMouseLeave}
                        className="relative cursor-crosshair overflow-hidden"
                        style={{
                          maxHeight: '380px',
                          maxWidth: '100%',
                          aspectRatio: `${schematicResult.imgWidth} / ${schematicResult.imgHeight}`
                        }}
                      >
                        <img 
                          src={schematicResult.outputDataUrl} 
                          alt="Minecraft Block Art Output"
                          style={{
                            imageRendering: 'pixelated',
                            maxHeight: '380px',
                            display: 'block',
                            width: '100%',
                            height: 'auto'
                          }}
                        />
                      </div>
                    </div>

                    <p className="text-[9px] text-[#141414]/80 text-center uppercase font-mono tracking-tighter mt-1">
                      [ Hover pixels to inspect spatial coordinates & material states ]
                    </p>
                  </div>

                  {/* HOVER DETAILS METADATA COORDS OVERLAY */}
                  <div className="w-full bg-white border-2 border-[#141414] p-3.5 shadow-[4px_4px_0px_#141414] min-h-[64px] flex items-center justify-between mt-3 font-mono relative z-10 select-none">
                    {hoveredPixel ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-8 w-8 border-2 border-[#141414] shadow-[2px_2px_0px_#141414]" 
                            style={{ backgroundColor: hoveredPixel.block.hex }}
                          />
                          <div className="text-left">
                            <p className="text-xs font-black text-[#141414] leading-tight uppercase">
                              {hoveredPixel.block.name}
                            </p>
                            <p className="text-[9px] text-[#141414] opacity-75 uppercase truncate max-w-[180px] sm:max-w-[280px]">
                              {hoveredPixel.block.id}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] bg-[#CECCC7] px-2.5 py-1 border border-[#141414] font-black">
                          <span>X:<span className="text-black bg-white px-1 border border-[#141414]/20">{hoveredPixel.mcX}</span></span>
                          <span>Y:<span className="text-black bg-white px-1 border border-[#141414]/20">{hoveredPixel.mcY}</span></span>
                          <span>Z:<span className="text-black bg-white px-1 border border-[#141414]/20">{hoveredPixel.mcZ}</span></span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-center w-full text-[11px] text-[#141414] font-bold py-1.5 uppercase">
                        <Compass className="h-4 w-4 animate-spin text-[#141414]" />
                        <span>INSPECTOR: [ Hover canvas pixels to read voxel cords ]</span>
                      </div>
                    )}
                  </div>

                  {/* ACTION TRIGGER BUTTONS */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 relative z-10">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-green-600 text-black font-extrabold text-xs uppercase py-3 px-4 border-2 border-[#141414] shadow-[4px_4px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                    >
                      <Download className="h-4.5 w-4.5 stroke-[3px]" />
                      <span>Download {fileFormat === 'litematic' ? '.litematic' : '.schem'} file</span>
                    </button>

                    <button
                      type="button"
                      onClick={copyMaterialsList}
                      className={`flex items-center justify-center gap-2 border-2 text-xs py-3 px-4 font-mono font-extrabold uppercase transition-all cursor-pointer ${
                        copiedMaterials 
                          ? 'bg-yellow-400 border-[#141414] text-black shadow-none' 
                          : 'bg-white border-[#141414] hover:bg-neutral-100 text-black shadow-[4px_4px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                      }`}
                    >
                      {copiedMaterials ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-black stroke-[3px]" />
                          <span>COPIED TABLE!</span>
                        </>
                      ) : (
                        <>
                          <Clipboard className="h-4 w-4 text-black" />
                          <span>Copy Markdown List</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              ) : null}
            </div>
          </div>

          {/* MATERIALS LIST COMPONENT */}
          {schematicResult && (
            <div className="bg-white border-4 border-[#141414] shadow-[8px_8px_0px_#141414] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#141414] pb-3 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <Grid className="h-4.5 w-4.5 text-black" />
                  <h3 className="font-extrabold text-sm uppercase tracking-tight">Required Materials Shopping List</h3>
                </div>
                <div className="text-xs text-black font-mono font-bold bg-[#CECCC7] px-2 py-0.5 border border-[#141414]">
                  Total: <span className="font-extrabold text-blue-700">{totalBlockCount}</span> blocks
                </div>
              </div>

              {/* SEARCH BOX FOR MATERIAL */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#141414]" />
                <input 
                  type="text" 
                  placeholder="FILTER CHRONO MATERIALS (e.g. wool, stone, gold)..." 
                  value={searchMaterial}
                  onChange={(e) => setSearchMaterial(e.target.value)}
                  className="w-full bg-[#E4E3E0] border-2 border-[#141414] font-mono text-xs text-[#141414] py-2.5 pl-9 pr-4 rounded-none focus:bg-white placeholder-[#141414]/50 focus:outline-none"
                />
              </div>

              {/* LIST DISPLAY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
                {filteredMaterials.length === 0 ? (
                  <p className="text-center col-span-2 py-8 text-xs text-gray-500 italic uppercase">No matching materials found.</p>
                ) : (
                  filteredMaterials.map((item) => (
                    <div 
                      key={item.block.id}
                      className="flex items-center justify-between p-2.5 border-2 border-[#141414] bg-[#DEDCD7]/40 hover:bg-[#CECCC7]/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className="h-6 w-6 border border-[#141414] shadow-[1px_1px_0px_#141414] flex-shrink-0" 
                          style={{ backgroundColor: item.block.hex }}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-[#141414] truncate leading-tight uppercase font-mono">
                            {item.block.name}
                          </p>
                          <p className="text-[9px] text-[#141414] opacity-70 truncate leading-none font-mono">
                            {item.block.id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 font-mono">
                        <p className="text-xs font-extrabold text-black">
                          {item.count} <span className="text-[9px] opacity-70 font-normal">pcs</span>
                        </p>
                        <p className="text-[9px] text-green-700 font-extrabold leading-none">
                          {item.percentage}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </section>

      </main>

      {/* FOOTER */}
      <footer className="mt-12 py-6 text-center border-t-2 border-[#141414] bg-[#141414] text-white">
        <p className="text-[10px] md:text-xs text-neutral-400 font-mono uppercase tracking-widest leading-loose">
          PIXEL2SCHEM Build Engine v1.0.4-stable • Pure client-side big-endian GZIP raw NBT encoder • compliant with WorldEdit 1.13+
        </p>
      </footer>

    </div>
  );
}
