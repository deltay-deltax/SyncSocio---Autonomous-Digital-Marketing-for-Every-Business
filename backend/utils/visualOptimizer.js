import sharp from 'sharp';

/**
 * Wraps text into multiple lines based on an approximate character limit per line.
 */
const wrapText = (text, maxChars) => {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length > maxChars) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  lines.push(currentLine.trim());
  return lines;
};

/**
 * Overlays text and subtext onto an image using sharp and SVG composition.
 */
export const overlayText = async (inputImage, metadata) => {
  const { headline, subtext, position = 'bottom-left', primaryColor = '#ffffff', secondaryColor = '#E2E8F0' } = metadata;
  
  if (!headline && !subtext) return inputImage;

  const image = sharp(inputImage);
  const { width, height } = await image.metadata();

  // Multi-line wrapping logic
  const maxLineChars = Math.floor(width / (width * 0.025)); // Estimate chars per line based on font size
  const headlineLines = wrapText(headline, Math.floor(maxLineChars * 0.8));
  const subtextLines = wrapText(subtext, maxLineChars);

  // Dynamic font sizing
  const hSize = Math.floor(width * 0.045); // 4.5% of width
  const sSize = Math.floor(width * 0.022); // 2.2% of width
  const lineSpacing = 1.2;

  // Position logic
  let x = width * 0.05; // 5% margin
  let y_start = height * 0.75; // Default bottom-left
  let textAnchor = "start";

  if (position === 'center') {
    x = width / 2;
    y_start = height / 2 - (headlineLines.length * hSize) / 2;
    textAnchor = "middle";
  } else if (position === 'top-left') {
    x = width * 0.05;
    y_start = height * 0.15;
    textAnchor = "start";
  }

  // Escape XML
  const escapeXml = (str) => str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c]));

  // Build TSpan lines
  const headlineTSpan = headlineLines.map((line, i) => 
    `<tspan x="${x}" dy="${i === 0 ? 0 : hSize * lineSpacing}">${escapeXml(line)}</tspan>`
  ).join('');

  const subtextTSpan = subtextLines.map((line, i) => 
    `<tspan x="${x}" dy="${i === 0 ? (headlineLines.length > 0 ? hSize * 1.5 : 0) : sSize * lineSpacing}">${escapeXml(line)}</tspan>`
  ).join('');

  const svgImage = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:black;stop-opacity:0" />
          <stop offset="100%" style="stop-color:black;stop-opacity:0.6" />
        </linearGradient>
      </defs>
      
      <!-- Bottom Scrim for Readability (only if bottom positioned) -->
      ${position.includes('bottom') ? `<rect x="0" y="${height * 0.6}" width="${width}" height="${height * 0.4}" fill="url(#grad)" />` : ''}
      
      <style>
        .text-common {
          font-family: 'Helvetica', 'Arial', sans-serif;
          filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.8));
        }
        .headline {
          fill: ${primaryColor};
          font-size: ${hSize}px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -1px;
        }
        .subtext {
          fill: ${secondaryColor};
          font-size: ${sSize}px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
      </style>

      <text x="${x}" y="${y_start}" text-anchor="${textAnchor}" class="text-common headline">
        ${headlineTSpan}
      </text>
      
      <text x="${x}" y="${y_start + (headlineLines.length * hSize * lineSpacing) + (hSize * 0.2)}" text-anchor="${textAnchor}" class="text-common subtext">
        ${subtextTSpan}
      </text>
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svgImage), top: 0, left: 0 }])
    .png() // Convert to PNG for consistency
    .toBuffer();
};
