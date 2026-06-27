const parseRecipients = (textOrRows, isRows, mode, whatsappCountryCode) => {
  const emailPattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const phonePattern = /\+?\d[\d\s\-()]{7,15}\d/g;
  const results = [];

  const extractPhonesFromRow = (rowCells) => {
    let rowStr = rowCells.map(c => String(c || '').trim()).join(' ');
    // Try to find a country code cell or pattern in the row
    let rowCC = '';
    for (const cell of rowCells) {
      if (cell === null || cell === undefined) continue;
      const cellStr = String(cell).trim();
      // Look for cell starting with + followed by 1-4 digits
      const ccMatch = cellStr.match(/^\+(\d{1,4})/);
      if (ccMatch && cellStr.replace(/[^\d+]/g, '').length <= 5) {
        rowCC = '+' + ccMatch[1];
        break;
      }
    }
    
    // If not found in a specific cell, try a loose regex on the whole row
    if (!rowCC) {
      const looseMatch = rowStr.match(/(?:^|\s)\+(\d{1,4})(?:\s|\(|$)/);
      if (looseMatch) {
        rowCC = '+' + looseMatch[1];
      }
    }

    const matches = rowStr.match(phonePattern);
    if (matches) {
      for (const m of matches) {
        let cleaned = m.replace(/[\s\-()]/g, '');
        if (cleaned.length < 7) continue;

        if (cleaned.startsWith('+')) {
          results.push(cleaned);
        } else {
          if (cleaned.startsWith('0') && cleaned.length > 5) {
            cleaned = cleaned.substring(1);
          }
          if (rowCC) {
            const ccDigits = rowCC.replace('+', '');
            if (cleaned.startsWith(ccDigits)) {
              results.push('+' + cleaned);
            } else {
              results.push(rowCC + cleaned);
            }
          } else {
            const ccDigits = whatsappCountryCode.replace('+', '');
            if (cleaned.startsWith(ccDigits)) {
              results.push('+' + cleaned);
            } else {
              results.push(whatsappCountryCode + cleaned);
            }
          }
        }
      }
    }
  };

  const extractEmailsFromRow = (rowCells) => {
    let rowStr = rowCells.map(c => String(c || '').trim()).join(' ');
    const matches = rowStr.match(emailPattern);
    if (matches) {
      results.push(...matches);
    }
  };

  // Strip basic RTF for fallback string parsing
  let processedTextOrRows = textOrRows;
  if (typeof processedTextOrRows === 'string' && processedTextOrRows.includes('{\\rtf')) {
    // Very rudimentary RTF table parsing: split by \row to keep rows together
    const rows = processedTextOrRows.split('\\row');
    processedTextOrRows = rows.map(r => r.replace(/\\[a-z0-9]+[ ]?/g, '').replace(/[\{\}]/g, '').trim()).filter(r => r.length > 0);
    isRows = true;
  }

  if (isRows && Array.isArray(processedTextOrRows) && processedTextOrRows.length > 0) {
    for (const row of processedTextOrRows) {
      // row might be an array of cells, or a string if we just mapped RTF rows to strings
      const cells = Array.isArray(row) ? row : [row];
      
      if (mode === 'email') {
        extractEmailsFromRow(cells);
      } else {
        extractPhonesFromRow(cells);
      }
    }
  } else if (typeof processedTextOrRows === 'string') {
    if (mode === 'email') {
      const matches = processedTextOrRows.match(emailPattern);
      if (matches) results.push(...matches);
    } else {
      const lines = processedTextOrRows.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines) {
        extractPhonesFromRow([line]);
      }
    }
  }

  return Array.from(new Set(results));
};

const rtfStr = `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2867
\\cocoatextscaling0\\cocoaplatform0{\\fonttbl\\f0\\froman\\fcharset0 Times-Bold;\\f1\\froman\\fcharset0 Times-Roman;}
{\\colortbl;\\red255\\green255\\blue255;\\red0\\green0\\blue0;\\red0\\green0\\blue233;}
{\\*\\expandedcolortbl;;\\cssrgb\\c0\\c0\\c0;\\cssrgb\\c0\\c0\\c93333;}
\\paperw11900\\paperh16840\\margl1440\\margr1440\\vieww11520\\viewh8400\\viewkind0
\\deftab720

\\itap1\\trowd \\taflags0 \\trgaph108\\trleft-108 \\trbrdrt\\brdrnil \\trbrdrl\\brdrnil \\trbrdrr\\brdrnil 
\\clvertalc \\clshdrawnil \\clwWidth1741\\clftsWidth3 \\clmart10 \\clmarl10 \\clmarb10 \\clmarr10 \\clbrdrt\\brdrnil \\clbrdrl\\brdrnil \\clbrdrb\\brdrnil \\clbrdrr\\brdrnil \\clpadt20 \\clpadl20 \\clpadb20 \\clpadr20 \\gaph\\cellx2880
\\clvertalc \\clshdrawnil \\clwWidth1553\\clftsWidth3 \\clmart10 \\clmarl10 \\clmarb10 \\clmarr10 \\clbrdrt\\brdrnil \\clbrdrl\\brdrnil \\clbrdrb\\brdrnil \\clbrdrr\\brdrnil \\clpadt20 \\clpadl20 \\clpadb20 \\clpadr20 \\gaph\\cellx5760
\\clvertalc \\clshdrawnil \\clwWidth3073\\clftsWidth3 \\clmart10 \\clmarl10 \\clmarb10 \\clmarr10 \\clbrdrt\\brdrnil \\clbrdrl\\brdrnil \\clbrdrb\\brdrnil \\clbrdrr\\brdrnil \\clpadt20 \\clpadl20 \\clpadb20 \\clpadr20 \\gaph\\cellx8640
\\pard\\intbl\\itap1\\pardeftab720\\qc\\partightenfactor0

\\f0\\b\\fs24 \\cf0 \\expnd0\\expndtw0\\kerning0
\\outl0\\strokewidth0 \\strokec2 Country Code\\cell 
\\pard\\intbl\\itap1\\pardeftab720\\qc\\partightenfactor0
\\cf0 Phone Number\\cell 
\\pard\\intbl\\itap1\\pardeftab720\\qc\\partightenfactor0
\\cf0 Email\\cell \\row

\\itap1\\trowd \\taflags0 \\trgaph108\\trleft-108 \\trbrdrl\\brdrnil \\trbrdrr\\brdrnil 
\\clvertalc \\clshdrawnil \\clwWidth1741\\clftsWidth3 \\clmart10 \\clmarl10 \\clmarb10 \\clmarr10 \\clbrdrt\\brdrnil \\clbrdrl\\brdrnil \\clbrdrb\\brdrnil \\clbrdrr\\brdrnil \\clpadt20 \\clpadl20 \\clpadb20 \\clpadr20 \\gaph\\cellx2880
\\clvertalc \\clshdrawnil \\clwWidth1553\\clftsWidth3 \\clmart10 \\clmarl10 \\clmarb10 \\clmarr10 \\clbrdrt\\brdrnil \\clbrdrl\\brdrnil \\clbrdrb\\brdrnil \\clbrdrr\\brdrnil \\clpadt20 \\clpadl20 \\clpadb20 \\clpadr20 \\gaph\\cellx5760
\\clvertalc \\clshdrawnil \\clwWidth3073\\clftsWidth3 \\clmart10 \\clmarl10 \\clmarb10 \\clmarr10 \\clbrdrt\\brdrnil \\clbrdrl\\brdrnil \\clbrdrb\\brdrnil \\clbrdrr\\brdrnil \\clpadt20 \\clpadl20 \\clpadb20 \\clpadr20 \\gaph\\cellx8640
\\pard\\intbl\\itap1\\pardeftab720\\partightenfactor0

\\f1\\b0 \\cf0 +1 (USA/Canada)\\cell 
\\pard\\intbl\\itap1\\pardeftab720\\partightenfactor0
\\cf0 555-010-1234\\cell 
\\pard\\intbl\\itap1\\pardeftab720\\partightenfactor0
{\\field{\\*\\fldinst{HYPERLINK "mailto:alex.test01@example.com"}}{\\fldrslt \\cf3 \\ul \\ulc3 \\strokec3 alex.test01@example.com}}\\cell \\row
}`;

console.log(parseRecipients(rtfStr, false, 'whatsapp', '+91'));

