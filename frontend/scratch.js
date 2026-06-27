const parseRecipients = (textOrRows, isRows, mode, whatsappCountryCode) => {
  const emailPattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const phonePattern = /\+?\d[\d\s\-()]{7,15}\d/g;
  const results = [];

  const extractPhonesFromRow = (rowCells) => {
    let rowStr = rowCells.join(' ');
    // Try to find a country code cell or pattern in the row
    // Look for a cell that is JUST a country code like "+1", "+44", "+91", or "+1 (USA)"
    let rowCC = '';
    for (const cell of rowCells) {
      const cellStr = String(cell).trim();
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
        // Ignore strings that are too short to be a phone number
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
    let rowStr = rowCells.join(' ');
    const matches = rowStr.match(emailPattern);
    if (matches) {
      results.push(...matches);
    }
  };

  if (isRows && Array.isArray(textOrRows) && textOrRows.length > 0) {
    for (const row of textOrRows) {
      if (!Array.isArray(row)) continue;
      
      if (mode === 'email') {
        extractEmailsFromRow(row);
      } else {
        extractPhonesFromRow(row);
      }
    }
  } else if (typeof textOrRows === 'string') {
    if (mode === 'email') {
      const matches = textOrRows.match(emailPattern);
      if (matches) results.push(...matches);
    } else {
      // Split into lines and treat each line as a row to preserve row-level CC context
      const lines = textOrRows.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines) {
        extractPhonesFromRow([line]);
      }
    }
  }

  return Array.from(new Set(results));
};

const rows = [
  ['Country Code', 'Phone Number', 'Email'],
  ['+1 (USA/Canada)', '555-010-1234', 'alex.test01@example.com'],
  ['+44 (UK)', '7700-900-111', 'sophie@example.com'],
  ['+91', '98765-43210', 'rahul@example.com']
];

console.log(parseRecipients(rows, true, 'whatsapp', '+91'));

const strData = `+1 (USA/Canada) 555-010-1234 alex.test01@example.com
+44 (UK) 7700-900-111 sophie@example.com
+91 98765-43210 rahul@example.com`;

console.log(parseRecipients(strData, false, 'whatsapp', '+91'));

